import assert from "node:assert/strict";
import { test } from "node:test";
import { getPremiumStoreModuleKey } from "./premium-store-modules.ts";

test("Confeitaria do catálogo usa o módulo de produtos cafeteria existente", () => {
  assert.equal(getPremiumStoreModuleKey("confeitaria"), "cafeteria");
});

test("slugs legados do catálogo continuam mapeados para os módulos existentes", () => {
  assert.equal(getPremiumStoreModuleKey("roupas-esportivas"), "roupas_esportivas");
  assert.equal(getPremiumStoreModuleKey("roupas-treino"), "roupas_treino");
  assert.equal(getPremiumStoreModuleKey("joias-semijoias"), "joias");
});

test("slugs sem alias permanecem como chaves do módulo", () => {
  assert.equal(getPremiumStoreModuleKey("cafeteria"), "cafeteria");
  assert.equal(getPremiumStoreModuleKey("pizzaria"), "pizzaria");
});
