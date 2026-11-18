/**
 * Regras de preço da Pizzaria, compartilhadas pelo montador público e pelo
 * servidor (que sempre recalcula com os preços do banco).
 */

/** Pizza com mais de um sabor cobra o preço do sabor mais caro no tamanho escolhido. */
export function pizzaUnitPrice(flavorPrices: number[], addonPrices: number[] = []): number {
  if (!flavorPrices.length) return 0;
  const base = Math.max(...flavorPrices);
  const extras = addonPrices.reduce((sum, value) => sum + value, 0);
  return Number((base + extras).toFixed(2));
}

/** Rótulo de fração usado no nome da pizza: 1 sabor, ½ ou ¼. */
export function flavorFractionLabel(count: number): string {
  if (count <= 1) return "";
  if (count === 2) return "½ ";
  if (count === 3) return "⅓ ";
  return "¼ ";
}

export function pizzaItemName(sizeName: string, flavorNames: string[]): string {
  const fraction = flavorFractionLabel(flavorNames.length);
  return `Pizza ${sizeName} — ${flavorNames.map((name) => `${fraction}${name}`).join(" + ")}`;
}
