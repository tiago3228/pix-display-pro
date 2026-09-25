export type StoreModule =
  | "roupas"
  | "roupas_esportivas"
  | "roupas_treino"
  | "calcados"
  | "cafeteria"
  | "marmitaria"
  | "joias";

const MODULE_LABELS: Record<StoreModule, string> = {
  roupas: "👕 Roupas",
  roupas_esportivas: "⚽ Roupas Esportivas",
  roupas_treino: "🏋️ Roupas de Treino / Academia",
  calcados: "👟 Calçados",
  cafeteria: "☕ Cafeteria",
  marmitaria: "🍱 Marmitaria",
  joias: "💎 Joias e Semijoias",
};

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("pt-BR");
}

/** Relaciona as categorias gerais de uma loja ao módulo compatível com seu nicho. */
export function getStoreNicheModule(category: string | null | undefined): StoreModule {
  const value = normalized(category);
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
    value.includes("padaria") ||
    value.includes("confeitaria")
  ) {
    return "cafeteria";
  }
  if (value.includes("calçado") || value.includes("calcado")) return "calcados";
  if (value.includes("treino") || value.includes("academia")) return "roupas_treino";
  if (value.includes("esport")) return "roupas_esportivas";
  return "roupas";
}

/** Apresenta o nome do nicho escolhido em vez do rótulo técnico do módulo roupas. */
export function getStoreNicheLabel(category: string | null | undefined): string {
  const raw = category?.trim();
  if (!raw) return "🛍️ Loja";
  const value = normalized(raw);
  if (value.includes("joia") || value.includes("acessório") || value.includes("acessorio")) {
    return `💎 ${raw}`;
  }
  if (value.includes("beleza") || value.includes("cosmético") || value.includes("cosmetico")) {
    return `💄 ${raw}`;
  }
  if (
    value.includes("aliment") ||
    value.includes("doces") ||
    value.includes("padaria") ||
    value.includes("confeitaria")
  ) {
    return `🍽️ ${raw}`;
  }
  const module = getStoreNicheModule(raw);
  return module === "roupas" && !value.includes("roup")
    ? `🛍️ ${raw}`
    : `${MODULE_LABELS[module].split(" ")[0]} ${raw}`;
}

/** Mostra o nicho próprio para o módulo padrão e nomes técnicos nos módulos adicionais. */
export function getStoreModuleLabel(
  category: string | null | undefined,
  module: StoreModule,
): string {
  if (module === getStoreNicheModule(category)) return getStoreNicheLabel(category);
  return MODULE_LABELS[module];
}

/** Marca como neutras somente as categorias destinadas a todos os nichos. */
export function isNeutralCategoryName(name: string): boolean {
  return ["geral", "outros", "diversos", "sem categoria", "uncategorized"].includes(
    normalized(name),
  );
}
