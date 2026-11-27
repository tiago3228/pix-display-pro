import assert from "node:assert/strict";
import test from "node:test";
import {
  filterGuidedCategoryProducts,
  getGuidedCatalogSuggestions,
} from "./guided-product-flow.ts";

test("filtra produtos pelo ID da categoria sem excluir módulo legado divergente", () => {
  const products = [
    { id: "legacy", module: "roupas", category_id: "category-desserts" },
    { id: "current", module: "cafeteria", category_id: "category-desserts" },
    { id: "other-category", module: "cafeteria", category_id: "category-drinks" },
    { id: "uncategorized", module: "cafeteria", category_id: null },
  ];

  assert.deepEqual(
    filterGuidedCategoryProducts(products, "category-desserts").map((product) => product.id),
    ["legacy", "current"],
  );
  assert.deepEqual(filterGuidedCategoryProducts(products, "category-missing"), []);
  assert.deepEqual(filterGuidedCategoryProducts(products, ""), []);
  assert.deepEqual(filterGuidedCategoryProducts(products, null), []);
});

test("ativa o fallback pela categoria escolhida sem depender do segmento geral da loja", () => {
  const suggestions = getGuidedCatalogSuggestions("cafeteria", "🍰 Bolos e Doces", []);

  assert.equal(suggestions.length, 28);
  assert.deepEqual(getGuidedCatalogSuggestions("cafeteria", "categoria sem catálogo", []), []);
  assert.deepEqual(getGuidedCatalogSuggestions("roupas", "🍰 Bolos e Doces", []), []);
});

test("sugere os produtos genéricos de cafeteria pelas categorias correspondentes", () => {
  const namesFor = (category: string) =>
    getGuidedCatalogSuggestions("cafeteria", category, []).map((item) => item.name);

  assert.deepEqual(namesFor("☕ Cafés"), ["Café", "Cappuccino"]);
  assert.deepEqual(namesFor("Cappuccinos"), ["Cappuccino"]);
  assert.deepEqual(namesFor("🥟 Empadas"), ["Empada"]);
  assert.deepEqual(namesFor("🥐 Pastéis Assados"), ["Pastel Assado"]);
  assert.deepEqual(namesFor("🥧 Tortinhas"), ["Tortinha"]);
  assert.deepEqual(namesFor("🥤 Bebidas"), ["Cappuccino", "Bebida"]);
  assert.deepEqual(namesFor("Salgados e Lanches"), ["Empada", "Pastel Assado", "Tortinha"]);
  assert.deepEqual(getGuidedCatalogSuggestions("cafeteria", "Empadas", [{ name: "EMPADA" }]), []);
});
