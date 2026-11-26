export type ConfectioneryCatalogItem = {
  name: string;
  category: "Bolos no Pote" | "Doces" | "Combos";
  description: string;
};

/** Catálogo inicial: descrições informativas, sem especificar tamanho, volume ou preço. */
export const CONFECTIONERY_CATALOG: ConfectioneryCatalogItem[] = [
  {
    name: "Brigadeiro",
    category: "Bolos no Pote",
    description: "Bolo no pote com camadas de massa de chocolate e brigadeiro cremoso.",
  },
  {
    name: "Chocolate",
    category: "Bolos no Pote",
    description: "Bolo no pote de chocolate com recheio cremoso.",
  },
  {
    name: "Dois Amores",
    category: "Bolos no Pote",
    description: "Combinação de brigadeiro tradicional e brigadeiro branco.",
  },
  {
    name: "Beijinho",
    category: "Bolos no Pote",
    description: "Bolo no pote com recheio cremoso de coco.",
  },
  {
    name: "Prestígio",
    category: "Bolos no Pote",
    description: "Chocolate com recheio cremoso de coco.",
  },
  {
    name: "Cenoura com Chocolate",
    category: "Bolos no Pote",
    description: "Massa de cenoura com cobertura e recheio de chocolate.",
  },
  {
    name: "Doce de Leite",
    category: "Bolos no Pote",
    description: "Bolo no pote com recheio de doce de leite.",
  },
  {
    name: "Leite Ninho",
    category: "Bolos no Pote",
    description: "Bolo no pote com creme de leite em pó.",
  },
  {
    name: "Ninho com Nutella",
    category: "Bolos no Pote",
    description: "Creme de leite em pó combinado com creme de avelã.",
  },
  {
    name: "Ninho com Morango",
    category: "Bolos no Pote",
    description: "Creme de leite em pó com morangos.",
  },
  {
    name: "Oreo",
    category: "Bolos no Pote",
    description: "Bolo no pote com creme e pedaços de biscoito tipo Oreo.",
  },
  {
    name: "Red Velvet",
    category: "Bolos no Pote",
    description: "Massa red velvet com recheio cremoso.",
  },
  {
    name: "Churros",
    category: "Bolos no Pote",
    description: "Bolo no pote com doce de leite e toque de canela.",
  },
  {
    name: "Paçoca",
    category: "Bolos no Pote",
    description: "Bolo no pote com creme e paçoca de amendoim.",
  },
  {
    name: "Sensação",
    category: "Bolos no Pote",
    description: "Combinação de chocolate e morango.",
  },
  {
    name: "Morango",
    category: "Bolos no Pote",
    description: "Bolo no pote com recheio cremoso e morangos.",
  },
  {
    name: "Maracujá",
    category: "Bolos no Pote",
    description: "Bolo no pote com creme de maracujá.",
  },
  { name: "Limão", category: "Bolos no Pote", description: "Bolo no pote com creme de limão." },
  {
    name: "Abacaxi com Coco",
    category: "Bolos no Pote",
    description: "Bolo no pote com abacaxi e creme de coco.",
  },
  {
    name: "Abacaxi com Doce de Leite",
    category: "Bolos no Pote",
    description: "Bolo no pote com abacaxi e doce de leite.",
  },
  {
    name: "Coco",
    category: "Bolos no Pote",
    description: "Bolo no pote com recheio cremoso de coco.",
  },
  { name: "Brigadeiro Gourmet", category: "Doces", description: "Brigadeiro gourmet artesanal." },
  { name: "Beijinho Gourmet", category: "Doces", description: "Doce artesanal de coco." },
  { name: "Brownie", category: "Doces", description: "Brownie de chocolate com interior macio." },
  {
    name: "Palha Italiana",
    category: "Doces",
    description: "Doce de brigadeiro com pedaços de biscoito.",
  },
  {
    name: "Pudim Individual",
    category: "Doces",
    description: "Pudim individual com calda de caramelo.",
  },
  {
    name: "Combo Degustação",
    category: "Combos",
    description: "Seleção de sabores em porções individuais. Personalize a composição e o preço.",
  },
  {
    name: "Combo Festa",
    category: "Combos",
    description:
      "Seleção de bolos no pote e doces para compartilhar. Personalize a composição e o preço.",
  },
];

export const CONFECTIONERY_CATEGORY_NAMES = ["Bolos no Pote", "Doces", "Combos"] as const;

function normalizeConfectioneryName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

export function searchConfectioneryCatalog(query: string, limit = 8) {
  const search = normalizeConfectioneryName(query);
  if (!search) return [];
  return CONFECTIONERY_CATALOG.filter((item) =>
    normalizeConfectioneryName(item.name).includes(search),
  ).slice(0, limit);
}

/**
 * Monta as linhas iniciais para uma loja. `existingNames` deve vir apenas da
 * mesma store_id; a comparação ignora caixa, acentos e espaços excedentes.
 */
export function buildConfectioneryProductRows(
  storeId: string,
  categories: { id: string; name: string }[],
  existingNames: string[],
) {
  const categoryIds = new Map(
    categories.map((category) => [normalizeConfectioneryName(category.name), category.id]),
  );
  const existing = new Set(existingNames.map(normalizeConfectioneryName));

  return CONFECTIONERY_CATALOG.filter(
    (item) => !existing.has(normalizeConfectioneryName(item.name)),
  ).map((item, position) => ({
    store_id: storeId,
    module: "cafeteria",
    name: item.name,
    description: item.description,
    // Placeholder técnico numérico; não representa preço definido para venda.
    price: 0,
    stock: 0,
    track_stock: false,
    is_available: false,
    is_hidden: true,
    category_id: categoryIds.get(normalizeConfectioneryName(item.category)) ?? null,
    position,
  }));
}
