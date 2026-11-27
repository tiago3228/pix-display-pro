import assert from "node:assert/strict";
import test from "node:test";
import {
  buildConfectioneryProductRows,
  CONFECTIONERY_CATALOG,
  CONFECTIONERY_CATEGORY_NAMES,
  getConfectioneryCatalogSuggestions,
  searchConfectioneryCatalog,
  searchConfectionerySuggestions,
} from "./confeitaria-catalog.ts";

const categories = [
  { id: "cat-bolos", name: "Bolos no Pote" },
  { id: "cat-doces", name: "Doces" },
  { id: "cat-combos", name: "Combos" },
];

const requiredNamesByGroup = {
  "Bolos no pote clássicos": [
    "Brigadeiro",
    "Chocolate",
    "Dois Amores",
    "Beijinho",
    "Prestígio",
    "Cenoura com Chocolate",
    "Doce de Leite",
  ],
  "Bolos no pote especiais": [
    "Leite Ninho",
    "Ninho com Nutella",
    "Ninho com Morango",
    "Oreo",
    "Red Velvet",
    "Churros",
    "Paçoca",
    "Sensação",
  ],
  "Bolos no pote de frutas": [
    "Morango",
    "Maracujá",
    "Limão",
    "Abacaxi com Coco",
    "Abacaxi com Doce de Leite",
    "Coco",
  ],
  "Outros doces": [
    "Brigadeiro Gourmet",
    "Beijinho",
    "Brownie",
    "Palha Italiana",
    "Pudim Individual",
  ],
};

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

test("catálogo contém os sabores solicitados, organizados por grupo e categoria", () => {
  for (const [group, names] of Object.entries(requiredNamesByGroup)) {
    assert.deepEqual(
      CONFECTIONERY_CATALOG.filter((item) => item.group === group).map((item) => item.name),
      names,
      group,
    );
  }

  assert.deepEqual(CONFECTIONERY_CATEGORY_NAMES, ["Bolos no Pote", "Doces", "Combos"]);
  assert.equal(
    CONFECTIONERY_CATALOG.filter((item) => item.category === "Bolos no Pote").length,
    21,
  );
  assert.equal(CONFECTIONERY_CATALOG.filter((item) => item.category === "Doces").length, 5);
  assert.equal(CONFECTIONERY_CATALOG.filter((item) => item.category === "Combos").length, 2);
  assert.equal(CONFECTIONERY_CATALOG.length, 28);
  assert.ok(CONFECTIONERY_CATALOG.every((item) => !("price" in item)));
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

test("oferece sugestões locais da categoria e omite produtos já cadastrados", () => {
  const cakeSuggestions = getConfectioneryCatalogSuggestions("Bolos no Pote", [
    { name: " brigadeiro " },
  ]);
  const sweetSuggestions = getConfectioneryCatalogSuggestions("Doces", [
    { name: "Beijinho Gourmet" },
  ]);

  assert.equal(cakeSuggestions.length, 20);
  assert.ok(!cakeSuggestions.some((item) => item.name === "Brigadeiro"));
  assert.ok(cakeSuggestions.every((item) => item.category === "Bolos no Pote"));
  assert.ok(!sweetSuggestions.some((item) => item.name === "Beijinho"));
  assert.equal(getConfectioneryCatalogSuggestions("categoria desconhecida").length, 0);
  assert.equal(getConfectioneryCatalogSuggestions("🍰 Bolos e Doces").length, 28);
  assert.equal(getConfectioneryCatalogSuggestions("Confeitaria").length, 28);
  assert.equal(getConfectioneryCatalogSuggestions(null).length, 0);
});

test("pré-cadastra 28 itens ocultos, indisponíveis e sem preço comercial ativo", () => {
  const rows = buildConfectioneryProductRows("store-1", categories, []);
  const categoryIds = new Map(categories.map((category) => [category.name, category.id]));
  const catalogByNameAndCategory = new Map(
    CONFECTIONERY_CATALOG.map((item) => [`${item.category}:${item.name}`, item]),
  );
  const expectedFields = [
    "category_id",
    "description",
    "image_url",
    "is_available",
    "is_hidden",
    "module",
    "name",
    "position",
    "price",
    "price_visible",
    "purchase_enabled",
    "quantity_enabled",
    "quote_enabled",
    "show_price_from",
    "stock",
    "store_id",
    "track_stock",
  ].sort();

  assert.equal(rows.length, 28);
  assert.ok(rows.every((row) => row.store_id === "store-1"));
  assert.ok(rows.every((row) => row.module === "cafeteria"));
  assert.ok(rows.every((row) => row.price === 0));
  assert.ok(rows.every((row) => row.price_visible === false));
  assert.ok(rows.every((row) => row.purchase_enabled === false));
  assert.ok(rows.every((row) => row.quantity_enabled === false));
  assert.ok(rows.every((row) => row.quote_enabled === false && row.show_price_from === false));
  assert.ok(rows.every((row) => row.is_hidden && !row.is_available));
  assert.ok(rows.every((row) => row.stock === 0 && !row.track_stock));

  for (const row of rows) {
    const item = catalogByNameAndCategory.get(
      `${row.category_id === "cat-bolos" ? "Bolos no Pote" : row.category_id === "cat-doces" ? "Doces" : "Combos"}:${row.name}`,
    );
    assert.ok(item);
    assert.equal(row.description, item.description);
    assert.equal(row.category_id, categoryIds.get(item.category));
    assert.equal(row.image_url, item.imageUrl);
    assert.deepEqual(Object.keys(row).sort(), expectedFields);
  }
});

test("as ilustrações do catálogo usam caminhos públicos seguros e nenhuma imagem é inventada por fallback", () => {
  const imagePaths = CONFECTIONERY_CATALOG.map((item) => item.imageUrl).filter(
    (path): path is string => path !== null,
  );
  assert.equal(imagePaths.length, 10);
  assert.ok(imagePaths.every((path) => /^\/assets\/confeitaria\/[a-z0-9-]+\.webp$/i.test(path)));
  assert.equal(new Set(imagePaths).size, imagePaths.length);
  assert.ok(CONFECTIONERY_CATALOG.filter((item) => item.imageUrl === null).length > 0);
});

test("não duplica produtos existentes na loja e mantém a detecção legacy sem categoria", () => {
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

test("deduplica Beijinho somente na categoria correspondente e reconhece o legado Gourmet", () => {
  const existingCake = buildConfectioneryProductRows("store-1", categories, [
    { name: "Beijinho", category_id: "cat-bolos" },
  ]);
  const existingSweet = buildConfectioneryProductRows("store-1", categories, [
    { name: "Beijinho Gourmet", category_id: "cat-doces" },
  ]);
  const rows = buildConfectioneryProductRows("store-1", categories, [
    { name: "Beijinho", category_id: "cat-bolos" },
    { name: "Beijinho Gourmet", category_id: "cat-doces" },
    { name: "Brownie", category_id: "cat-doces" },
  ]);

  assert.ok(
    !existingCake.some((row) => row.name === "Beijinho" && row.category_id === "cat-bolos"),
  );
  assert.ok(existingCake.some((row) => row.name === "Beijinho" && row.category_id === "cat-doces"));
  assert.ok(
    existingSweet.some((row) => row.name === "Beijinho" && row.category_id === "cat-bolos"),
  );
  assert.ok(
    !existingSweet.some((row) => row.name === "Beijinho" && row.category_id === "cat-doces"),
  );
  assert.ok(!rows.some((row) => row.name === "Brownie" && row.category_id === "cat-doces"));
  assert.equal(rows.length, CONFECTIONERY_CATALOG.length - 3);
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
