export type StoreModule =
  | "roupas"
  | "roupas_esportivas"
  | "roupas_treino"
  | "calcados"
  | "cafeteria"
  | "marmitaria"
  | "joias"
  | "pizzaria"
  | "informatica";

const MODULE_LABELS: Record<StoreModule, string> = {
  roupas: "👕 Roupas",
  roupas_esportivas: "⚽ Roupas Esportivas",
  roupas_treino: "🏋️ Roupas de Treino / Academia",
  calcados: "👟 Calçados",
  cafeteria: "☕ Cafeteria",
  marmitaria: "🍱 Marmitaria",
  joias: "💎 Joias e Semijoias",
  pizzaria: "🍕 Pizzaria",
  informatica: "💻 Informática & Tecnologia",
};

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("pt-BR");
}

/** Relaciona as categorias gerais de uma loja ao módulo compatível com seu nicho. */
export function getStoreNicheModule(category: string | null | undefined): StoreModule {
  const value = normalized(category);
  if (
    value.includes("informát") ||
    value.includes("informat") ||
    value.includes("comput") ||
    value.includes("tecnolog")
  )
    return "informatica";
  if (value.includes("pizzar")) return "pizzaria";
  if (
    value.includes("joia") ||
    value.includes("semijoia") ||
    value.includes("bijuteria") ||
    value.includes("acessório") ||
    value.includes("acessorio")
  )
    return "joias";
  if (value.includes("marmit")) return "marmitaria";
  if (
    value.includes("cafeteria") ||
    value.includes("aliment") ||
    value.includes("doces") ||
    value.includes("bolos no pote") ||
    value.includes("padaria") ||
    value.includes("confeitaria")
  )
    return "cafeteria";
  if (value.includes("calçado") || value.includes("calcado")) return "calcados";
  if (value.includes("treino") || value.includes("academia")) return "roupas_treino";
  if (value.includes("esport")) return "roupas_esportivas";
  return "roupas";
}

export function isConfectioneryStoreCategory(category: string | null | undefined): boolean {
  const value = normalized(category);
  return value.includes("bolo") || value.includes("doce") || value.includes("confeit");
}

/** Indica se o cadastro guiado de produtos está disponível para o segmento Premium atual. */
export function isGuidedPremiumProductFlowEligible(
  plan: string | null | undefined,
  categoryOrModule: string | null | undefined,
): boolean {
  if (plan !== "pro") return false;

  const value = normalized(categoryOrModule)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_&/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    /informat|tecnolog|computador|pizzar|marmit|calcad/.test(value) ||
    /\broupas? esportiv/.test(value)
  ) {
    return false;
  }

  const isGenericClothingSegment = /\broupas?\b/.test(value);
  const isTrainingClothingSegment = /\b(treino|academia)\b/.test(value);
  return !isGenericClothingSegment || isTrainingClothingSegment;
}

export function getStoreNicheLabel(category: string | null | undefined): string {
  const raw = category?.trim();
  if (!raw) return "🛍️ Loja";
  const value = normalized(raw);
  if (isConfectioneryStoreCategory(raw)) return "🍰 Bolos no Pote & Doces";
  if (value.includes("joia") || value.includes("acessório") || value.includes("acessorio"))
    return `💎 ${raw}`;
  if (
    value.includes("informát") ||
    value.includes("informat") ||
    value.includes("comput") ||
    value.includes("tecnolog")
  )
    return `💻 ${raw}`;
  if (value.includes("beleza") || value.includes("cosmético") || value.includes("cosmetico"))
    return `💄 ${raw}`;
  if (value.includes("pizzar")) return `🍕 ${raw}`;
  if (
    value.includes("aliment") ||
    value.includes("doces") ||
    value.includes("padaria") ||
    value.includes("confeitaria")
  )
    return `🍽️ ${raw}`;
  const module = getStoreNicheModule(raw);
  return module === "roupas" && !value.includes("roup")
    ? `🛍️ ${raw}`
    : `${MODULE_LABELS[module].split(" ")[0]} ${raw}`;
}

export function getStoreModuleLabel(
  category: string | null | undefined,
  module: StoreModule,
): string {
  if (module === getStoreNicheModule(category)) return getStoreNicheLabel(category);
  return MODULE_LABELS[module];
}

export function isNeutralCategoryName(name: string): boolean {
  return ["geral", "outros", "diversos", "sem categoria", "uncategorized"].includes(
    normalized(name),
  );
}
