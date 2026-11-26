const MODULE_KEYS: Record<string, string> = {
  "roupas-esportivas": "roupas_esportivas",
  "roupas-treino": "roupas_treino",
  "joias-semijoias": "joias",
  confeitaria: "cafeteria",
};

/** Resolve o slug exibido no catálogo para o módulo já armazenado em store_modules. */
export function getPremiumStoreModuleKey(slug: string): string {
  return MODULE_KEYS[slug] ?? slug;
}
