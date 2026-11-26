import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getStoreModuleLabel,
  getStoreNicheModule,
  getStoreNicheLabel,
  isConfectioneryStoreCategory,
  isGuidedPremiumProductFlowEligible,
} from "./store-niche.ts";

test("Bolos no Pote & Doces usa o módulo cafeteria interno da loja", () => {
  assert.equal(getStoreNicheModule("Bolos no Pote & Doces"), "cafeteria");
  assert.equal(isConfectioneryStoreCategory("Bolos no Pote & Doces"), true);
  assert.equal(getStoreNicheModule("Doces"), "cafeteria");
  assert.equal(isConfectioneryStoreCategory("Doces"), true);
  assert.equal(isConfectioneryStoreCategory("Doces artesanais"), true);
  assert.equal(isConfectioneryStoreCategory("Informática & Tecnologia"), false);
});

test("o módulo cafeteria aparece com o rótulo Bolos no Pote & Doces na loja de confeitaria", () => {
  assert.equal(
    getStoreModuleLabel("Bolos no Pote & Doces", "cafeteria"),
    "🍰 Bolos no Pote & Doces",
  );
  assert.equal(getStoreModuleLabel("Doces", "cafeteria"), "🍰 Bolos no Pote & Doces");
  assert.equal(getStoreNicheLabel("Confeitaria"), "🍰 Bolos no Pote & Doces");
});

test("Cafeteria mantém seu rótulo para lojas de cafeteria", () => {
  assert.equal(getStoreModuleLabel("Cafeteria", "cafeteria"), "☕ Cafeteria");
});

test("o cadastro guiado está disponível em lojas PRO elegíveis", () => {
  assert.equal(isGuidedPremiumProductFlowEligible("pro", "Bolos no Pote & Doces"), true);
  assert.equal(isGuidedPremiumProductFlowEligible("pro", "Joias e Semijoias"), true);
  assert.equal(isGuidedPremiumProductFlowEligible("pro", "Roupas de Treino / Academia"), true);
  assert.equal(isGuidedPremiumProductFlowEligible("basic", "Bolos no Pote & Doces"), false);
  assert.equal(isGuidedPremiumProductFlowEligible(null, "Bolos no Pote & Doces"), false);
});

test("o cadastro guiado exclui os seis segmentos não abrangidos", () => {
  for (const category of [
    "Informática & Tecnologia",
    "Pizzaria",
    "Marmitaria",
    "Calçados",
    "Roupas",
    "Roupas Esportivas",
  ]) {
    assert.equal(isGuidedPremiumProductFlowEligible("pro", category), false, category);
  }
});
