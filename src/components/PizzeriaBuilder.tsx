import { useMemo, useState } from "react";
import { Check, Pizza, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { pizzaItemName, pizzaUnitPrice } from "@/lib/pizzeria";
import type { PublicPizzeria } from "@/lib/storefront.functions";
import type { CartItem } from "@/lib/cart";

type Addon = PublicPizzeria["addons"][number];
type NewCartItem = Omit<CartItem, "quantity">;

const GROUP_LABELS: Record<Exclude<Addon["group"], "bebida">, string> = {
  borda: "Borda",
  molho: "Molho",
  adicional: "Adicionais",
};

/** Montador público: tamanho, sabores (até o limite do tamanho), borda/molho/adicionais e bebidas. */
export function PizzeriaBuilder({
  menu,
  color,
  onAdd,
}: {
  menu: PublicPizzeria;
  color: string;
  onAdd: (item: NewCartItem) => void;
}) {
  const [sizeId, setSizeId] = useState<string | null>(menu.sizes[0]?.id ?? null);
  const [flavorIds, setFlavorIds] = useState<string[]>([]);
  const [single, setSingle] = useState<{ borda: string | null; molho: string | null }>({
    borda: null,
    molho: null,
  });
  const [extras, setExtras] = useState<string[]>([]);
  const [category, setCategory] = useState("all");

  const size = menu.sizes.find((s) => s.id === sizeId) ?? null;
  const maxFlavors = !size
    ? 1
    : !menu.allowHalf
      ? 1
      : !menu.allowQuarter
        ? Math.min(2, size.maxFlavors)
        : size.maxFlavors;

  const flavorsForSize = useMemo(
    () => menu.flavors.filter((f) => size && f.prices[size.id] != null),
    [menu.flavors, size],
  );
  const categories = useMemo(
    () => Array.from(new Set(flavorsForSize.map((f) => f.category).filter(Boolean))),
    [flavorsForSize],
  );
  const visibleFlavors =
    category === "all" ? flavorsForSize : flavorsForSize.filter((f) => f.category === category);

  const byGroup = (group: Addon["group"]) => menu.addons.filter((a) => a.group === group);
  const drinks = byGroup("bebida");
  const chosenFlavors = flavorIds
    .map((id) => flavorsForSize.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => Boolean(f));
  const chosenAddons = [single.borda, single.molho, ...extras]
    .map((id) => menu.addons.find((a) => a.id === id))
    .filter((a): a is Addon => Boolean(a));
  const price = size
    ? pizzaUnitPrice(
        chosenFlavors.map((f) => f.prices[size.id]),
        chosenAddons.map((a) => a.price),
      )
    : 0;

  function chooseSize(id: string) {
    setSizeId(id);
    const next = menu.sizes.find((s) => s.id === id);
    const limit = !next
      ? 1
      : !menu.allowHalf
        ? 1
        : !menu.allowQuarter
          ? Math.min(2, next.maxFlavors)
          : next.maxFlavors;
    setFlavorIds((current) =>
      current.filter((fid) => menu.flavors.find((f) => f.id === fid)?.prices[id] != null).slice(0, limit),
    );
  }

  function toggleFlavor(id: string) {
    setFlavorIds((current) => {
      if (current.includes(id)) return current.filter((f) => f !== id);
      if (maxFlavors === 1) return [id];
      if (current.length >= maxFlavors) {
        toast.error(`Este tamanho aceita até ${maxFlavors} sabores.`);
        return current;
      }
      return [...current, id];
    });
  }

  function addPizza() {
    if (!size) return toast.error("Escolha o tamanho da pizza.");
    if (!chosenFlavors.length) return toast.error("Escolha pelo menos um sabor.");
    if (menu.requireBorder && byGroup("borda").length && !single.borda)
      return toast.error("Escolha a borda.");
    if (menu.requireSauce && byGroup("molho").length && !single.molho)
      return toast.error("Escolha o molho.");
    if (menu.requireAdditional && byGroup("adicional").length && !extras.length)
      return toast.error("Escolha pelo menos um adicional.");
    const addonIds = chosenAddons.map((a) => a.id);
    const key = `pizza:${size.id}:${[...flavorIds].sort().join(",")}:${[...addonIds].sort().join(",")}`;
    onAdd({
      key,
      productId: key,
      name: pizzaItemName(size.name, chosenFlavors.map((f) => f.name)),
      variantLabel: chosenAddons.length ? chosenAddons.map((a) => a.name).join(", ") : null,
      unitPrice: price,
      imageUrl: chosenFlavors[0]?.image ?? null,
      pizza: { sizeId: size.id, flavorIds, addonIds },
    });
    setFlavorIds([]);
    setSingle({ borda: null, molho: null });
    setExtras([]);
  }

  function addDrink(drink: Addon) {
    onAdd({
      key: `addon:${drink.id}`,
      productId: `addon:${drink.id}`,
      name: drink.name,
      unitPrice: drink.price,
      imageUrl: drink.image,
      addonId: drink.id,
    });
  }

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
      active ? "text-primary-foreground" : "bg-card",
    );
  const chipStyle = (active: boolean) =>
    active ? { backgroundColor: color, borderColor: color } : undefined;

  return (
    <section id="montar-pizza" className="surface space-y-5 rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <Pizza className="size-5" style={{ color }} />
        <div>
          <h2 className="text-base font-bold">Monte sua pizza</h2>
          {menu.instructions ? (
            <p className="text-xs text-muted-foreground">{menu.instructions}</p>
          ) : null}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">1. Tamanho</p>
        <div className="flex flex-wrap gap-2">
          {menu.sizes.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={sizeId === s.id}
              onClick={() => chooseSize(s.id)}
              className={chip(sizeId === s.id)}
              style={chipStyle(sizeId === s.id)}
            >
              {s.name}
              {s.diameterCm ? ` · ${s.diameterCm}cm` : ""}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">
          2. Sabores{" "}
          <span className="font-normal text-muted-foreground">
            ({chosenFlavors.length}/{maxFlavors}
            {maxFlavors > 1 ? " — cobra o sabor mais caro" : ""})
          </span>
        </p>
        {categories.length > 1 ? (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {["all", ...categories].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={chip(category === c)}
                style={chipStyle(category === c)}
              >
                {c === "all" ? "Todos" : c}
              </button>
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visibleFlavors.map((flavor) => {
            const active = flavorIds.includes(flavor.id);
            return (
              <button
                key={flavor.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleFlavor(flavor.id)}
                className={cn(
                  "relative overflow-hidden rounded-xl border bg-card text-left transition",
                  active && "ring-2",
                )}
                style={active ? { borderColor: color, ["--tw-ring-color" as string]: color } : undefined}
              >
                {flavor.image ? (
                  <img
                    src={flavor.image}
                    alt={flavor.name}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-muted">
                    <Pizza className="size-8 text-muted-foreground" />
                  </div>
                )}
                {active ? (
                  <span
                    className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full text-primary-foreground"
                    style={{ backgroundColor: color }}
                  >
                    <Check className="size-4" />
                  </span>
                ) : null}
                <div className="p-2">
                  <p className="text-sm font-semibold leading-tight">{flavor.name}</p>
                  {flavor.description ? (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                      {flavor.description}
                    </p>
                  ) : null}
                  {size ? (
                    <p className="mt-1 text-xs font-bold">{brl(flavor.prices[size.id])}</p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {(["borda", "molho"] as const).map((group) =>
        byGroup(group).length ? (
          <div key={group}>
            <p className="mb-2 text-sm font-semibold">
              {GROUP_LABELS[group]}{" "}
              <span className="font-normal text-muted-foreground">
                {(group === "borda" ? menu.requireBorder : menu.requireSauce)
                  ? "(obrigatório)"
                  : "(opcional)"}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {byGroup(group).map((addon) => {
                const active = single[group] === addon.id;
                return (
                  <button
                    key={addon.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setSingle((current) => ({ ...current, [group]: active ? null : addon.id }))
                    }
                    className={chip(active)}
                    style={chipStyle(active)}
                  >
                    {addon.name}
                    {addon.price > 0 ? ` +${brl(addon.price)}` : ""}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null,
      )}

      {byGroup("adicional").length ? (
        <div>
          <p className="mb-2 text-sm font-semibold">
            Adicionais{" "}
            <span className="font-normal text-muted-foreground">
              {menu.requireAdditional ? "(obrigatório)" : "(opcional)"}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {byGroup("adicional").map((addon) => {
              const active = extras.includes(addon.id);
              return (
                <button
                  key={addon.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setExtras((current) =>
                      active ? current.filter((id) => id !== addon.id) : [...current, addon.id],
                    )
                  }
                  className={chip(active)}
                  style={chipStyle(active)}
                >
                  {addon.name}
                  {addon.price > 0 ? ` +${brl(addon.price)}` : ""}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <div>
          <p className="text-xs text-muted-foreground">Valor da pizza</p>
          <p className="text-xl font-bold">{brl(price)}</p>
        </div>
        <Button
          onClick={addPizza}
          disabled={!size}
          className="text-primary-foreground"
          style={{ backgroundColor: color }}
        >
          <Plus className="size-4" /> Adicionar pizza
        </Button>
      </div>

      {drinks.length ? (
        <div className="border-t pt-4">
          <p className="mb-2 text-sm font-semibold">
            🥤 Bebidas{" "}
            <span className="font-normal text-muted-foreground">
              {menu.requireDrink ? "(escolha pelo menos uma)" : "(opcional)"}
            </span>
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {drinks.map((drink) => (
              <div key={drink.id} className="flex flex-col overflow-hidden rounded-xl border bg-card">
                {drink.image ? (
                  <img
                    src={drink.image}
                    alt={drink.name}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                ) : null}
                <div className="flex flex-1 flex-col p-2">
                  <p className="text-sm font-semibold leading-tight">{drink.name}</p>
                  <p className="mt-1 text-xs font-bold">{brl(drink.price)}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-8"
                    aria-label={`Adicionar ${drink.name}`}
                    onClick={() => addDrink(drink)}
                  >
                    <Plus className="size-3.5" /> Adicionar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
