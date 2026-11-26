import assert from "node:assert/strict";
import test from "node:test";
import {
  buildConfectioneryProductRows,
  CONFECTIONERY_CATALOG,
  CONFECTIONERY_CATEGORY_NAMES,
  searchConfectioneryCatalog,
  searchConfectionerySuggestions,
} from "./confeitaria-catalog.ts";

const categories = [
  { id: "cat-bolos", name: "Bolos no Pote" },
  { id: "cat-doces", name: "Doces" },
  { id: "cat-combos", name: "Combos" },
];

test("sugere sabores por trecho do nome sem diferenciar acentos ou caixa", () => {
  assert.deepEqual(
    searchConfectioneryCatalog("NINHO").map((item) => item.name),
    ["Leite Ninho", "Ninho com Nutella", "Ninho com Morango"],
  );
  assert.deepEqual(
    searchConfectioneryCatalog("pacoca").map((item) => item.name),
    ["Paçoca"],
  );
  assert.deepEqual(
    searchConfectioneryCatalog("", 3).map((item) => item.name),
    ["Brigadeiro", "Chocolate", "Dois Amores"],
  );
  assert.deepEqual(searchConfectioneryCatalog("sabor inexistente"), []);
  assert.deepEqual(
    searchConfectioneryCatalog("  ", 2).map((item) => item.name),
    ["Brigadeiro", "Chocolate"],
  );
});

test("sugere primeiro produtos já cadastrados na loja sem repetir itens do catálogo", () => {
  const suggestions = searchConfectionerySuggestions("brig", [
    { name: "Brigadeiro", category: "Bolos no Pote", description: "Descrição salva" },
    { name: "Brigadeiro de Café", category: "Doces", description: "Sabor da loja" },
  ]);

  assert.deepEqual(
    suggestions.map((item) => item.name),
    ["Brigadeiro", "Brigadeiro de Café", "Brigadeiro Gourmet"],
  );
  assert.equal(suggestions[0]?.description, "Descrição salva");
  assert.equal(suggestions[0]?.category, "Bolos no Pote");
});

test("pré-cadastra 28 itens ocultos, indisponíveis e sem preço definido", () => {
  const rows = buildConfectioneryProductRows("store-1", categories, []);
  const countsByCategory = Object.fromEntries(
    CONFECTIONERY_CATEGORY_NAMES.map((category) => [
      category,
      CONFECTIONERY_CATALOG.filter((item) => item.category === category).length,
    ]),
  );
  const categoryIds = new Map(categories.map((category) => [category.name, category.id]));
  const catalogByName = new Map(CONFECTIONERY_CATALOG.map((item) => [item.name, item]));
  const expectedFields = [
    "category_id",
    "description",
    "is_available",
    "is_hidden",
    "module",
    "name",
    "position",
    "price",
    "stock",
    "store_id",
    "track_stock",
  ].sort();

  assert.equal(rows.length, 28);
  assert.deepEqual(countsByCategory, {
    "Bolos no Pote": 21,
    Doces: 5,
    Combos: 2,
  });
  assert.deepEqual(CONFECTIONERY_CATEGORY_NAMES, ["Bolos no Pote", "Doces", "Combos"]);
  assert.ok(rows.every((row) => row.store_id === "store-1"));
  assert.ok(rows.every((row) => row.module === "cafeteria"));
  assert.ok(rows.every((row) => row.price === 0));
  assert.ok(rows.every((row) => row.is_hidden && !row.is_available));
  assert.ok(rows.every((row) => row.stock === 0 && !row.track_stock));

  for (const row of rows) {
    const item = catalogByName.get(row.name);
    assert.ok(item);
    assert.equal(row.description, item.description);
    assert.equal(row.category_id, categoryIds.get(item.category));
    assert.deepEqual(Object.keys(row).sort(), expectedFields);
  }
});

test("não duplica produtos existentes na mesma loja e mantém catálogo independente por store_id", () => {
  const initialRows = buildConfectioneryProductRows("store-1", categories, []);
  const repeatRows = buildConfectioneryProductRows(
    "store-1",
    categories,
    initialRows.map((row) => row.name),
  );
  const rowsWithExistingNames = buildConfectioneryProductRows("store-1", categories, [
    " brigadeiro ",
    "Brownie",
    "Pacoca",
  ]);
  const otherStoreRows = buildConfectioneryProductRows("store-2", categories, []);

  assert.equal(repeatRows.length, 0);
  assert.equal(rowsWithExistingNames.length, CONFECTIONERY_CATALOG.length - 3);
  assert.ok(!rowsWithExistingNames.some((row) => row.name === "Brigadeiro"));
  assert.ok(!rowsWithExistingNames.some((row) => row.name === "Brownie"));
  assert.ok(!rowsWithExistingNames.some((row) => row.name === "Paçoca"));
  assert.equal(otherStoreRows.length, CONFECTIONERY_CATALOG.length);
  assert.ok(otherStoreRows.every((row) => row.store_id === "store-2"));
});

test("normaliza caixa e espaços ao associar categorias e detectar itens existentes", () => {
  const rows = buildConfectioneryProductRows(
    "store-1",
    [
      { id: "cat-bolos", name: " bolos   no pote " },
      { id: "cat-doces", name: "DOCES" },
      { id: "cat-combos", name: "combos" },
    ],
    ["  BRIGADEIRO  "],
  );

  assert.equal(rows.length, CONFECTIONERY_CATALOG.length - 1);
  assert.ok(!rows.some((row) => row.name === "Brigadeiro"));
  assert.ok(rows.every((row) => row.category_id !== null));
});
