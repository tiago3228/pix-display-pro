import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getStoreModuleLabel,
  getStoreNicheModule,
  getStoreNicheLabel,
  isConfectioneryStoreCategory,
} from "./store-niche.ts";

test("Bolos no Pote & Doces usa o módulo cafeteria interno da loja", () => {
  assert.equal(getStoreNicheModule("Bolos no Pote & Doces"), "cafeteria");
  assert.equal(isConfectioneryStoreCategory("Bolos no Pote & Doces"), true);
  assert.equal(isConfectioneryStoreCategory("Informática & Tecnologia"), false);
});

test("o módulo cafeteria aparece com o rótulo Bolos no Pote & Doces na loja de confeitaria", () => {
  assert.equal(
    getStoreModuleLabel("Bolos no Pote & Doces", "cafeteria"),
    "🍰 Bolos no Pote & Doces",
  );
  assert.equal(getStoreNicheLabel("Confeitaria"), "🍰 Bolos no Pote & Doces");
});

test("Cafeteria mantém seu rótulo para lojas de cafeteria", () => {
  assert.equal(getStoreModuleLabel("Cafeteria", "cafeteria"), "☕ Cafeteria");
});
