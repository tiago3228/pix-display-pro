export const CAFETERIA_GUIDED_DESCRIPTION_DEFAULTS: Record<string, string> = {
  Café: "Café preparado na hora com sabor e aroma especiais.",
  Cappuccino: "Cappuccino cremoso para acompanhar seu momento de pausa.",
  Empada: "Empada assada com massa leve e recheio saboroso.",
  "Pastel Assado": "Pastel assado com massa dourada e recheio caprichado.",
  Tortinha: "Tortinha artesanal com recheio especial e massa crocante.",
  Bolo: "Bolo caseiro macio e saboroso, feito com carinho.",
  Doce: "Doce especial para adoçar seu dia.",
  Bebida: "Bebida refrescante para acompanhar seu pedido.",
  Combo: "Combo especial com itens selecionados por um preço diferenciado.",
};

type CafeteriaCatalogItem = {
  name: string;
  categoryAliases: string[];
  nameAliases?: string[];
};

export type CafeteriaCatalogSuggestion = {
  category: string;
  name: string;
  description: string;
  imageUrl: null;
};

const CAFETERIA_CATALOG: CafeteriaCatalogItem[] = [
  {
    name: "Café",
    categoryAliases: ["cafe", "cafes"],
  },
  {
    name: "Cappuccino",
    categoryAliases: [
      "cafe",
      "cafes",
      "cappuccino",
      "cappuccinos",
      "capuccino",
      "capuccinos",
      "capputino",
      "capputinos",
      "bebida",
      "bebidas",
    ],
    nameAliases: ["capuccino", "capputino"],
  },
  {
    name: "Empada",
    categoryAliases: ["empada", "empadas", "salgado", "salgados", "lanche", "lanches"],
  },
  {
    name: "Pastel Assado",
    categoryAliases: [
      "pastel",
      "pasteis",
      "pastel assado",
      "pasteis assados",
      "salgado",
      "salgados",
      "lanche",
      "lanches",
    ],
  },
  {
    name: "Tortinha",
    categoryAliases: ["tortinha", "tortinhas", "salgado", "salgados", "lanche", "lanches"],
  },
  {
    name: "Bebida",
    categoryAliases: ["bebida", "bebidas"],
  },
];

function normalizeCafeteriaName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

function getCategorySegments(categoryName: string) {
  const normalized = normalizeCafeteriaName(categoryName).replace(/^[^a-z0-9]+/i, "");
  const combined = normalized.split(/\s+(?:e|and)\s+|\s*&\s*|\s*\/\s*/);
  return new Set([normalized, ...combined.map((part) => part.trim()).filter(Boolean)]);
}

export function getCafeteriaCatalogSuggestions(
  categoryName: string | null | undefined,
  existingProducts: Pick<CafeteriaCatalogSuggestion, "name">[] = [],
): CafeteriaCatalogSuggestion[] {
  if (!categoryName?.trim()) return [];
  const categorySegments = getCategorySegments(categoryName);
  const existingNames = new Set(
    existingProducts.map((product) => normalizeCafeteriaName(product.name)),
  );

  return CAFETERIA_CATALOG.filter(
    (item) =>
      item.categoryAliases.some((alias) => categorySegments.has(alias)) &&
      ![item.name, ...(item.nameAliases ?? [])].some((name) =>
        existingNames.has(normalizeCafeteriaName(name)),
      ),
  ).map((item) => ({
    category: categoryName,
    name: item.name,
    description: CAFETERIA_GUIDED_DESCRIPTION_DEFAULTS[item.name] ?? "",
    imageUrl: null,
  }));
}
