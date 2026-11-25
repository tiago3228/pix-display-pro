import assert from "node:assert/strict";
import test from "node:test";
import { filterCategoriesWithProducts } from "./storefront-visibility.ts";

type Category = { id: string; name: string };
type Product = { category_id: string | null };

const categories: Category[] = [
  { id: "cat-a", name: "Categoria A" },
  { id: "cat-empty", name: "Categoria vazia" },
  { id: "cat-b", name: "Categoria B" },
];

const categoryForProduct = (product: Product) => product.category_id;

test("oculta categorias sem produtos sem alterar a ordem ou os registros das demais", () => {
  const products: Product[] = [{ category_id: "cat-b" }, { category_id: "cat-a" }];
  const result = filterCategoriesWithProducts(categories, products, categoryForProduct);

  assert.deepEqual(
    result.map((category) => category.id),
    ["cat-a", "cat-b"],
  );
  assert.equal(result[0], categories[0]);
  assert.equal(result[1], categories[2]);
});

test("mostra automaticamente a categoria quando um produto for associado depois", () => {
  const initiallyPopulated = filterCategoriesWithProducts(
    categories,
    [{ category_id: "cat-a" }],
    categoryForProduct,
  );
  const afterAddingItem = filterCategoriesWithProducts(
    categories,
    [{ category_id: "cat-a" }, { category_id: "cat-empty" }],
    categoryForProduct,
  );

  assert.deepEqual(
    initiallyPopulated.map((category) => category.id),
    ["cat-a"],
  );
  assert.deepEqual(
    afterAddingItem.map((category) => category.id),
    ["cat-a", "cat-empty"],
  );
});

test("não mostra categorias quando todos os produtos estão sem categoria", () => {
  const result = filterCategoriesWithProducts(
    categories,
    [{ category_id: null }],
    categoryForProduct,
  );

  assert.deepEqual(result, []);
});
