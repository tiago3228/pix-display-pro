import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Copy,
  Instagram,
  Minus,
  MessageCircle,
  Plus,
  ShoppingBag,
  Store as StoreIcon,
  Trash2,
} from "lucide-react";
import {
  getStorefront,
  submitOrder,
  trackStoreEvent,
  type StorefrontProduct,
} from "@/lib/storefront.functions";
import { useCart, buildOrderMessage, type CartItem } from "@/lib/cart";
import { brl, whatsappLink, installmentOptions, PIX_KEY_TYPES } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/loja/$slug")({
  loader: ({ params }) => getStorefront({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Loja não encontrada | Vitrini" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { store } = loaderData;
    const title = `${store.name} | Loja Online`;
    const description =
      store.description || `Veja os produtos de ${store.name} e peça pelo WhatsApp.`;
    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ];
    return { meta };
  },
  errorComponent: () => (
    <EmptyState
      title="Não foi possível abrir esta loja"
      text="Tente novamente em alguns instantes."
    />
  ),
  notFoundComponent: () => (
    <EmptyState title="Loja não encontrada" text="Confira o link e tente novamente." />
  ),
  component: StorePage,
});

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <StoreIcon className="size-8 text-muted-foreground" />
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button asChild variant="outline" className="mt-2">
        <Link to="/">Ir para o Vitrini</Link>
      </Button>
    </div>
  );
}

type Step = "cart" | "checkout";

function StorePage() {
  const data = Route.useLoaderData();
  const params = Route.useParams();
  const cart = useCart(params.slug);
  const track = useServerFn(trackStoreEvent);
  const sendOrder = useServerFn(submitOrder);

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selected, setSelected] = useState<StorefrontProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [step, setStep] = useState<Step>("cart");
  const [paid, setPaid] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [customer, setCustomer] = useState({ name: "", whatsapp: "", note: "" });
  const [sending, setSending] = useState(false);

  const products = useMemo(() => {
    if (!data) return [];
    if (activeCategory === "all") return data.products;
    if (activeCategory === "featured") return data.products.filter((p) => p.is_featured);
    return data.products.filter((p) => p.category_id === activeCategory);
  }, [data, activeCategory]);

  const plans = useMemo(() => {
    if (!data?.store.allow_installments) return [];
    return installmentOptions(
      cart.total,
      data.store.max_installments,
      data.store.min_installment_amount,
    );
  }, [data, cart.total]);


  if (!data) {
    return (
      <EmptyState
        title="Esta loja não está disponível no momento."
        text="O link pode estar incorreto ou a loja foi desativada."
      />
    );
  }

  const { store } = data;

  function stockOf(product: StorefrontProduct) {
    if (!product.track_stock) return Infinity;
    if (product.has_variants)
      return product.variants.reduce((sum, v) => sum + Math.max(v.stock, 0), 0);
    return product.stock;
  }

  function statusOf(product: StorefrontProduct) {
    if (!product.is_available) return "unavailable" as const;
    const stock = stockOf(product);
    if (stock <= 0) return "sold_out" as const;
    if (stock === 1) return "last" as const;
    return "ok" as const;
  }

  function addSimple(product: StorefrontProduct) {
    cart.add({
      key: product.id,
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      imageUrl: product.image,
      maxQuantity: product.track_stock ? product.stock : null,
    });
    void track({ data: { storeId: store.id, type: "add_to_cart", productId: product.id } });
    toast.success(`${product.name} adicionado!`);
  }

  async function handleSend() {
    if (!cart.items.length) return;
    setSending(true);
    const message = buildOrderMessage({
      sellerName: store.seller_name || store.name,
      items: cart.items,
      total: cart.total,
      paid,
      customerName: customer.name,
      note: customer.note,
    });
    try {
      await sendOrder({
        data: {
          storeId: store.id,
          customerName: customer.name,
          customerWhatsapp: customer.whatsapp,
          note: customer.note,
          paymentDeclared: paid,
          items: cart.items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId ?? null,
            variantLabel: i.variantLabel ?? null,
            quantity: i.quantity,
          })),
        },
      });
    } catch {
      // The WhatsApp message is the core flow, so it should open even if the
      // order could not be recorded.
      toast.warning("Registramos seu pedido apenas no WhatsApp.");
    }
    setSending(false);
    window.open(whatsappLink(store.whatsapp, message), "_blank", "noopener");
    cart.clear();
    setCartOpen(false);
    setStep("cart");
    setPaid(false);
    toast.success("Pedido enviado para o WhatsApp da loja!");
  }

  const pixTypeLabel =
    PIX_KEY_TYPES.find((t) => t.value === store.pix_key_type)?.label ?? "Chave Pix";

  return (
    <div
      className="min-h-screen bg-muted/30 pb-28"
      style={{ ["--brand" as string]: store.primary_color }}
    >
      <header className="relative">
        <div
          className="h-28 w-full sm:h-40"
          style={{
            background: store.banner
              ? `center/cover url(${store.banner})`
              : `linear-gradient(120deg, ${store.primary_color}, ${store.primary_color}88)`,
          }}
        />
        <div className="mx-auto max-w-3xl px-4">
          <div className="surface -mt-10 flex items-start gap-4 p-4">
            <div
              className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl text-2xl font-bold text-white"
              style={{ backgroundColor: store.primary_color }}
            >
              {store.logo ? (
                <img src={store.logo} alt={store.name} className="size-full object-cover" />
              ) : (
                store.name.charAt(0)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold">{store.name}</h1>
              <p className="text-sm text-muted-foreground">{store.description}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={whatsappLink(store.whatsapp, `Olá, ${store.seller_name || store.name}!`)}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--whatsapp)] px-3 py-1 text-xs font-semibold text-[var(--whatsapp-foreground)]"
                >
                  <MessageCircle className="size-3.5" /> WhatsApp
                </a>
                {store.instagram ? (
                  <a
                    href={`https://instagram.com/${store.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium"
                  >
                    <Instagram className="size-3.5" /> Instagram
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          {store.welcome_message ? (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              {store.welcome_message}
            </p>
          ) : null}
        </div>
      </header>

      <div className="sticky top-0 z-20 mt-4 bg-muted/80 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          <CategoryChip
            label="Todos"
            active={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
            color={store.primary_color}
          />
          {data.products.some((p) => p.is_featured) ? (
            <CategoryChip
              label="Destaques"
              active={activeCategory === "featured"}
              onClick={() => setActiveCategory("featured")}
              color={store.primary_color}
            />
          ) : null}
          {data.categories.map((c) => (
            <CategoryChip
              key={c.id}
              label={c.name}
              active={activeCategory === c.id}
              onClick={() => setActiveCategory(c.id)}
              color={store.primary_color}
            />
          ))}
        </div>
      </div>

      <main className="mx-auto mt-4 max-w-3xl px-4">
        {products.length === 0 ? (
          <div className="surface p-8 text-center text-sm text-muted-foreground">
            Nenhum produto por aqui ainda.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((product) => {
              const status = statusOf(product);
              return (
                <article key={product.id} className="surface flex gap-3 p-3">
                  <div className="size-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <ShoppingBag className="size-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h2 className="font-semibold">{product.name}</h2>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {product.description}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-base font-bold">{brl(product.price)}</span>
                      {status === "last" ? (
                        <Badge variant="secondary">Última unidade</Badge>
                      ) : null}
                      {status === "sold_out" || status === "unavailable" ? (
                        <Badge variant="outline">Esgotado</Badge>
                      ) : null}
                    </div>
                    <div className="mt-auto pt-2">
                      <Button
                        size="sm"
                        className="w-full"
                        style={{ backgroundColor: store.primary_color }}
                        disabled={status === "sold_out" || status === "unavailable"}
                        onClick={() =>
                          product.has_variants ? setSelected(product) : addSimple(product)
                        }
                      >
                        {product.has_variants ? "Escolher opções" : "Adicionar"}
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Pagamento realizado diretamente para o vendedor via Pix.
        </p>
      </main>

      {cart.count > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="flex-1 text-sm">
              <p className="text-muted-foreground">
                {cart.count} {cart.count === 1 ? "item" : "itens"}
              </p>
              <p className="text-lg font-bold">{brl(cart.total)}</p>
            </div>
            <Button
              size="lg"
              className="h-12 flex-1"
              style={{ backgroundColor: store.primary_color }}
              onClick={() => {
                setCartOpen(true);
                void track({ data: { storeId: store.id, type: "checkout_started" } });
              }}
            >
              Ver carrinho
            </Button>
          </div>
        </div>
      ) : null}

      <VariantDialog
        product={selected}
        color={store.primary_color}
        onClose={() => setSelected(null)}
        onAdd={(item) => {
          cart.add(item);
          void track({
            data: { storeId: store.id, type: "add_to_cart", productId: item.productId },
          });
          toast.success("Adicionado ao carrinho!");
          setSelected(null);
        }}
      />

      <Sheet
        open={cartOpen}
        onOpenChange={(open) => {
          setCartOpen(open);
          if (!open) setStep("cart");
        }}
      >
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{step === "cart" ? "Seu carrinho" : "Confira seu pedido"}</SheetTitle>
          </SheetHeader>

          <div className="space-y-3 px-4">
            {cart.items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Seu carrinho está vazio.
              </p>
            ) : (
              cart.items.map((item) => (
                <div key={item.key} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    {item.variantLabel ? (
                      <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {brl(item.unitPrice)} · subtotal {brl(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                  {step === "cart" ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-8"
                        aria-label="Diminuir"
                        onClick={() => cart.setQuantity(item.key, item.quantity - 1)}
                      >
                        <Minus className="size-3.5" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-8"
                        aria-label="Aumentar"
                        disabled={
                          item.maxQuantity != null && item.quantity >= item.maxQuantity
                        }
                        onClick={() => cart.setQuantity(item.key, item.quantity + 1)}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive"
                        aria-label="Remover"
                        onClick={() => cart.remove(item.key)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold">
                      {item.quantity}x {brl(item.unitPrice * item.quantity)}
                    </span>
                  )}
                </div>
              ))
            )}

            {cart.items.length > 0 ? (
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">TOTAL</span>
                <span className="text-xl font-bold">{brl(cart.total)}</span>
              </div>
            ) : null}

            {step === "checkout" && cart.items.length > 0 ? (
              <div className="space-y-4 pt-2">
                {plans.length > 0 ? (
                  <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm font-semibold">Como você quer pagar?</p>
                    <div className="mt-3 space-y-2">
                      <button
                        type="button"
                        onClick={() => setInstallments(1)}
                        className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                          installments === 1 ? "border-foreground" : "border-border"
                        }`}
                      >
                        <span className="font-medium">Pix à vista</span>
                        <span className="block text-xs text-muted-foreground">
                          {brl(cart.total)}
                        </span>
                      </button>
                      {plans.map((plan) => (
                        <button
                          key={plan.count}
                          type="button"
                          onClick={() => setInstallments(plan.count)}
                          className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                            installments === plan.count ? "border-foreground" : "border-border"
                          }`}
                        >
                          <span className="font-medium">{plan.label}</span>
                          <span className="block text-xs text-muted-foreground">
                            Total {brl(cart.total)} · sem juros
                          </span>
                        </button>
                      ))}
                    </div>
                    {installments > 1 ? (
                      <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                        Parcelamento combinado diretamente com o vendedor. Não é parcelamento
                        bancário nem cartão de crédito: você paga cada parcela por Pix nas datas
                        combinadas e recebe lembretes pelo WhatsApp.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-xl border bg-card p-4">
                  <p className="text-sm font-semibold">
                    {installments > 1 ? "Pix das parcelas" : "Pagamento via Pix"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pixTypeLabel} do vendedor
                  </p>
                  <p className="mt-1 font-mono text-sm break-all">
                    {store.pix_key || "Chave Pix não cadastrada"}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-3 h-11 w-full"
                    disabled={!store.pix_key}
                    onClick={async () => {
                      await navigator.clipboard.writeText(store.pix_key);
                      toast.success("Chave Pix copiada!");
                    }}
                  >
                    <Copy className="mr-2 size-4" /> Copiar chave Pix
                  </Button>
                  {installments === 1 ? (
                    <label className="mt-3 flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={paid}
                        onCheckedChange={(value) => setPaid(value === true)}
                        className="mt-0.5"
                      />
                      <span>Já fiz o pagamento (opcional)</span>
                    </label>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      A primeira parcela vence hoje e as demais a cada 30 dias.
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    O pagamento é feito diretamente para o vendedor. O Vitrini não recebe nem
                    guarda esse valor.
                  </p>
                </div>


                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cname">Seu nome (opcional)</Label>
                    <Input
                      id="cname"
                      value={customer.name}
                      onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cwhats">Seu WhatsApp (opcional)</Label>
                    <Input
                      id="cwhats"
                      inputMode="tel"
                      value={customer.whatsapp}
                      onChange={(e) => setCustomer((c) => ({ ...c, whatsapp: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cnote">Observação (opcional)</Label>
                    <Textarea
                      id="cnote"
                      rows={2}
                      value={customer.note}
                      onChange={(e) => setCustomer((c) => ({ ...c, note: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <SheetFooter className="gap-2">
            {cart.items.length > 0 ? (
              step === "cart" ? (
                <>
                  <Button
                    className="h-12"
                    style={{ backgroundColor: store.primary_color }}
                    onClick={() => setStep("checkout")}
                  >
                    Finalizar pedido
                  </Button>
                  <Button variant="ghost" onClick={() => setCartOpen(false)}>
                    Continuar comprando
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    className="h-12 bg-[var(--whatsapp)] text-[var(--whatsapp-foreground)] hover:bg-[var(--whatsapp)]/90"
                    disabled={sending}
                    onClick={handleSend}
                  >
                    <MessageCircle className="mr-2 size-4" />
                    {sending ? "Enviando..." : "Pedir pelo WhatsApp"}
                  </Button>
                  <Button variant="ghost" onClick={() => setStep("cart")}>
                    <ArrowLeft className="mr-2 size-4" /> Voltar ao carrinho
                  </Button>
                </>
              )
            ) : (
              <Button variant="outline" onClick={() => setCartOpen(false)}>
                Ver produtos
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition",
        active ? "border-transparent text-white" : "border-border bg-card text-foreground",
      )}
      style={active ? { backgroundColor: color } : undefined}
    >
      {label}
    </button>
  );
}

function VariantDialog({
  product,
  color,
  onClose,
  onAdd,
}: {
  product: StorefrontProduct | null;
  color: string;
  onClose: () => void;
  onAdd: (item: Omit<CartItem, "quantity">) => void;
}) {
  const [choices, setChoices] = useState<Record<string, string>>({});

  const label = product
    ? product.options.map((o) => choices[o.name]).filter(Boolean).join(" / ")
    : "";
  const variant = product?.variants.find((v) => v.label === label) ?? null;
  const complete = product ? product.options.every((o) => choices[o.name]) : false;
  const outOfStock = complete && (!variant || variant.stock <= 0 || !variant.is_available);

  return (
    <Dialog
      open={Boolean(product)}
      onOpenChange={(open) => {
        if (!open) {
          setChoices({});
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product?.name}</DialogTitle>
        </DialogHeader>
        {product ? (
          <div className="space-y-4">
            {product.options.map((option) => (
              <div key={option.id}>
                <p className="mb-2 text-sm font-medium">{option.name}</p>
                <div className="flex flex-wrap gap-2">
                  {option.values.map((value) => {
                    const active = choices[option.name] === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setChoices((c) => ({ ...c, [option.name]: value }))}
                        className={cn(
                          "min-w-12 rounded-lg border px-3 py-2 text-sm font-medium",
                          active ? "border-transparent text-white" : "border-border bg-card",
                        )}
                        style={active ? { backgroundColor: color } : undefined}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-lg font-bold">
                {brl(variant?.price ?? product.price)}
              </span>
              {complete ? (
                outOfStock ? (
                  <Badge variant="outline">Esgotado</Badge>
                ) : variant && variant.stock === 1 ? (
                  <Badge variant="secondary">Última unidade</Badge>
                ) : (
                  <Badge variant="secondary">
                    <Check className="mr-1 size-3" /> Disponível
                  </Badge>
                )
              ) : null}
            </div>
            <Button
              className="h-12 w-full"
              style={{ backgroundColor: color }}
              disabled={!complete || outOfStock}
              onClick={() => {
                if (!variant) return;
                onAdd({
                  key: `${product.id}:${variant.id}`,
                  productId: product.id,
                  variantId: variant.id,
                  variantLabel: variant.label,
                  name: product.name,
                  unitPrice: variant.price ?? product.price,
                  imageUrl: product.image,
                  maxQuantity: variant.stock,
                });
                setChoices({});
              }}
            >
              {complete ? "Adicionar ao carrinho" : "Escolha as opções"}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
