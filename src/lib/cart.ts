import { useCallback, useEffect, useState } from "react";

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  variantId?: string | null;
  variantLabel?: string | null;
  unitPrice: number;
  quantity: number;
  maxQuantity?: number | null;
  imageUrl?: string | null;
};

const storageKey = (slug: string) => `vitrini:cart:${slug}`;

function read(slug: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function useCart(slug: string) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(read(slug));
    setHydrated(true);
  }, [slug]);

  const persist = useCallback(
    (next: CartItem[]) => {
      setItems(next);
      try {
        window.localStorage.setItem(storageKey(slug), JSON.stringify(next));
      } catch {
        /* storage may be unavailable */
      }
    },
    [slug],
  );

  const add = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      const current = read(slug);
      const existing = current.find((i) => i.key === item.key);
      let next: CartItem[];
      if (existing) {
        const max = item.maxQuantity ?? Infinity;
        next = current.map((i) =>
          i.key === item.key
            ? { ...i, quantity: Math.min(i.quantity + quantity, max as number) }
            : i,
        );
      } else {
        next = [...current, { ...item, quantity }];
      }
      persist(next);
    },
    [persist, slug],
  );

  const setQuantity = useCallback(
    (key: string, quantity: number) => {
      const next = read(slug)
        .map((i) => (i.key === key ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0);
      persist(next);
    },
    [persist, slug],
  );

  const remove = useCallback((key: string) => setQuantity(key, 0), [setQuantity]);
  const clear = useCallback(() => persist([]), [persist]);

  const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, add, setQuantity, remove, clear, total, count, hydrated };
}

export function buildOrderMessage(opts: {
  sellerName: string;
  items: CartItem[];
  total: number;
  paid: boolean;
  customerName?: string;
  note?: string;
}) {
  const lines: string[] = [];
  lines.push(`Olá, ${opts.sellerName || "tudo bem"}! 😊`);
  lines.push("");
  lines.push("Gostaria de fazer este pedido:");
  lines.push("");
  for (const item of opts.items) {
    const variant = item.variantLabel ? ` (${item.variantLabel})` : "";
    const value = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(item.unitPrice * item.quantity);
    lines.push(`• ${item.quantity}x ${item.name}${variant} — ${value}`);
  }
  lines.push("");
  lines.push(
    `💰 Total: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
      opts.total,
    )}`,
  );
  if (opts.customerName) {
    lines.push("");
    lines.push(`Meu nome: ${opts.customerName}`);
  }
  if (opts.note) {
    lines.push(`Observação: ${opts.note}`);
  }
  lines.push("");
  lines.push(
    opts.paid ? "Já realizei o pagamento via Pix." : "Vou realizar o pagamento via Pix.",
  );
  return lines.join("\n");
}
