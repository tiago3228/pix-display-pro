import assert from "node:assert/strict";
import test from "node:test";
import { filterGuidedCategoryProducts } from "./guided-product-flow.ts";

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
