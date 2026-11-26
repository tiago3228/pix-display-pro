export type ConfectioneryCategory = "Bolos no Pote" | "Doces" | "Combos";
export type ConfectioneryGroup =
  | "Bolos no pote clássicos"
  | "Bolos no pote especiais"
  | "Bolos no pote de frutas"
  | "Outros doces"
  | "Combos";

export type ConfectioneryCatalogItem = {
  name: string;
  category: ConfectioneryCategory;
  group: ConfectioneryGroup;
  description: string;
  imageUrl: string | null;
};

export type ConfectionerySuggestion = {
  name: string;
  category: string | null;
  description: string;
};

export type ExistingConfectioneryProduct = string | { name: string; category_id: string | null };

/**
 * Catálogo inicial com grupos para facilitar a escolha. As descrições não
 * definem preço, tamanho ou volume; ilustrações são apenas referências visuais.
 */
export const CONFECTIONERY_CATALOG: ConfectioneryCatalogItem[] = [
  {
    name: "Brigadeiro",
    category: "Bolos no Pote",
    group: "Bolos no pote clássicos",
    description: "Bolo no pote com camadas de massa de chocolate e brigadeiro cremoso.",
    imageUrl: "/assets/confeitaria/bolo-brigadeiro.webp",
  },
  {
    name: "Chocolate",
    category: "Bolos no Pote",
    group: "Bolos no pote clássicos",
    description: "Bolo no pote de chocolate com recheio cremoso.",
    imageUrl: "/assets/confeitaria/bolo-chocolate.webp",
  },
  {
    name: "Dois Amores",
    category: "Bolos no Pote",
    group: "Bolos no pote clássicos",
    description: "Combinação de brigadeiro tradicional e brigadeiro branco.",
    imageUrl: "/assets/confeitaria/bolo-dois-amores.webp",
  },
  {
    name: "Beijinho",
    category: "Bolos no Pote",
    group: "Bolos no pote clássicos",
    description: "Bolo no pote com recheio cremoso de coco.",
    imageUrl: "/assets/confeitaria/bolo-beijinho.webp",
  },
  {
    name: "Prestígio",
    category: "Bolos no Pote",
    group: "Bolos no pote clássicos",
    description: "Bolo no pote com chocolate e recheio cremoso de coco.",
    imageUrl: "/assets/confeitaria/bolo-prestigio.webp",
  },
  {
    name: "Cenoura com Chocolate",
    category: "Bolos no Pote",
    group: "Bolos no pote clássicos",
    description: "Massa de cenoura com cobertura e recheio de chocolate.",
    imageUrl: "/assets/confeitaria/bolo-cenoura-chocolate.webp",
  },
  {
    name: "Doce de Leite",
    category: "Bolos no Pote",
    group: "Bolos no pote clássicos",
    description: "Bolo no pote com recheio de doce de leite.",
    imageUrl: "/assets/confeitaria/bolo-doce-de-leite.webp",
  },
  {
    name: "Leite Ninho",
    category: "Bolos no Pote",
    group: "Bolos no pote especiais",
    description: "Bolo no pote com creme de leite em pó.",
    imageUrl: "/assets/confeitaria/bolo-leite-ninho.webp",
  },
  {
    name: "Ninho com Nutella",
    category: "Bolos no Pote",
    group: "Bolos no pote especiais",
    description: "Creme de leite em pó combinado com creme de avelã.",
    imageUrl: "/assets/confeitaria/bolo-ninho-nutella.webp",
  },
  {
    name: "Ninho com Morango",
    category: "Bolos no Pote",
    group: "Bolos no pote especiais",
    description: "Creme de leite em pó com morangos.",
    imageUrl: "/assets/confeitaria/bolo-ninho-morango.webp",
  },
  {
    name: "Oreo",
    category: "Bolos no Pote",
    group: "Bolos no pote especiais",
    description: "Bolo no pote com creme e pedaços de biscoito tipo Oreo.",
    imageUrl: null,
  },
  {
    name: "Red Velvet",
    category: "Bolos no Pote",
    group: "Bolos no pote especiais",
    description: "Massa red velvet com recheio cremoso.",
    imageUrl: null,
  },
  {
    name: "Churros",
    category: "Bolos no Pote",
    group: "Bolos no pote especiais",
    description: "Bolo no pote com doce de leite e toque de canela.",
    imageUrl: null,
  },
  {
    name: "Paçoca",
    category: "Bolos no Pote",
    group: "Bolos no pote especiais",
    description: "Bolo no pote com creme e paçoca de amendoim.",
    imageUrl: null,
  },
  {
    name: "Sensação",
    category: "Bolos no Pote",
    group: "Bolos no pote especiais",
    description: "Bolo no pote com combinação de chocolate e morango.",
    imageUrl: null,
  },
  {
    name: "Morango",
    category: "Bolos no Pote",
    group: "Bolos no pote de frutas",
    description: "Bolo no pote com recheio cremoso e morangos.",
    imageUrl: null,
  },
  {
    name: "Maracujá",
    category: "Bolos no Pote",
    group: "Bolos no pote de frutas",
    description: "Bolo no pote com creme de maracujá.",
    imageUrl: null,
  },
  {
    name: "Limão",
    category: "Bolos no Pote",
    group: "Bolos no pote de frutas",
    description: "Bolo no pote com creme de limão.",
    imageUrl: null,
  },
  {
    name: "Abacaxi com Coco",
    category: "Bolos no Pote",
    group: "Bolos no pote de frutas",
    description: "Bolo no pote com abacaxi e creme de coco.",
    imageUrl: null,
  },
  {
    name: "Abacaxi com Doce de Leite",
    category: "Bolos no Pote",
    group: "Bolos no pote de frutas",
    description: "Bolo no pote com abacaxi e doce de leite.",
    imageUrl: null,
  },
  {
    name: "Coco",
    category: "Bolos no Pote",
    group: "Bolos no pote de frutas",
    description: "Bolo no pote com recheio cremoso de coco.",
    imageUrl: null,
  },
  {
    name: "Brigadeiro Gourmet",
    category: "Doces",
    group: "Outros doces",
    description: "Brigadeiro gourmet artesanal.",
    imageUrl: null,
  },
  {
    name: "Beijinho",
    category: "Doces",
    group: "Outros doces",
    description: "Doce artesanal de coco.",
    imageUrl: null,
  },
  {
    name: "Brownie",
    category: "Doces",
    group: "Outros doces",
    description: "Brownie de chocolate com interior macio.",
    imageUrl: null,
  },
  {
    name: "Palha Italiana",
    category: "Doces",
    group: "Outros doces",
    description: "Doce de brigadeiro com pedaços de biscoito.",
    imageUrl: null,
  },
  {
    name: "Pudim Individual",
    category: "Doces",
    group: "Outros doces",
    description: "Pudim individual com calda de caramelo.",
    imageUrl: null,
  },
  {
    name: "Combo Degustação",
    category: "Combos",
    group: "Combos",
    description: "Seleção de sabores em porções individuais. Personalize a composição e o preço.",
    imageUrl: null,
  },
  {
    name: "Combo Festa",
    category: "Combos",
    group: "Combos",
    description:
      "Seleção de bolos no pote e doces para compartilhar. Personalize a composição e o preço.",
    imageUrl: null,
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
  return CONFECTIONERY_CATALOG.filter(
    (item) => !search || normalizeConfectioneryName(item.name).includes(search),
  ).slice(0, limit);
}

export function searchConfectionerySuggestions(
  query: string,
  existingProducts: ConfectionerySuggestion[] = [],
  limit = 8,
): ConfectionerySuggestion[] {
  const search = normalizeConfectioneryName(query);
  const existingMatches = existingProducts.filter(
    (product) => !search || normalizeConfectioneryName(product.name).includes(search),
  );
  const catalogMatches = searchConfectioneryCatalog(query, CONFECTIONERY_CATALOG.length);
  const unique = new Map<string, ConfectionerySuggestion>();

  for (const suggestion of [...existingMatches, ...catalogMatches]) {
    const key = normalizeConfectioneryName(suggestion.name);
    if (!unique.has(key)) unique.set(key, suggestion);
  }

  return [...unique.values()].slice(0, limit);
}

/**
 * Monta as linhas iniciais para uma loja. `existingProducts` deve vir apenas
 * da mesma store_id; itens com mesmo nome em categorias diferentes continuam
 * distintos, como o bolo no pote e o doce de beijinho.
 */
export function buildConfectioneryProductRows(
  storeId: string,
  categories: { id: string; name: string }[],
  existingProducts: ExistingConfectioneryProduct[],
) {
  const categoryIds = new Map(
    categories.map((category) => [normalizeConfectioneryName(category.name), category.id]),
  );
  const existing = existingProducts.map((product) =>
    typeof product === "string"
      ? { name: normalizeConfectioneryName(product), category_id: null, matchesAnyCategory: true }
      : {
          name: normalizeConfectioneryName(product.name),
          category_id: product.category_id,
          matchesAnyCategory: product.category_id === null,
        },
  );

  return CONFECTIONERY_CATALOG.filter((item) => {
    const targetCategoryId = categoryIds.get(normalizeConfectioneryName(item.category)) ?? null;
    const name = normalizeConfectioneryName(item.name);
    const aliases =
      item.name === "Beijinho" && item.category === "Doces" ? [name, "beijinho gourmet"] : [name];
    return !existing.some(
      (product) =>
        aliases.includes(product.name) &&
        (product.matchesAnyCategory || product.category_id === targetCategoryId),
    );
  }).map((item, position) => ({
    store_id: storeId,
    module: "cafeteria",
    name: item.name,
    description: item.description,
    // Valor técnico neutro; o lojista informa o preço real antes de publicar.
    price: 0,
    purchase_enabled: false,
    quantity_enabled: false,
    price_visible: false,
    show_price_from: false,
    quote_enabled: false,
    stock: 0,
    track_stock: false,
    is_available: false,
    is_hidden: true,
    category_id: categoryIds.get(normalizeConfectioneryName(item.category)) ?? null,
    image_url: item.imageUrl,
    position,
  }));
}
