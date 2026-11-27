import assert from "node:assert/strict";
import test from "node:test";
import { getCafeteriaCatalogSuggestions } from "./cafeteria-catalog.ts";

test("sugere itens de cafeteria conforme categorias de cafés, bebidas e salgados", () => {
  assert.deepEqual(
    getCafeteriaCatalogSuggestions("☕ Cafés").map((item) => item.name),
    ["Café", "Cappuccino"],
  );
  assert.deepEqual(
    getCafeteriaCatalogSuggestions("🥟 Empadas").map((item) => item.name),
    ["Empada"],
  );
  assert.deepEqual(
    getCafeteriaCatalogSuggestions("🥐 Pastéis Assados").map((item) => item.name),
    ["Pastel Assado"],
  );
  assert.deepEqual(
    getCafeteriaCatalogSuggestions("🥧 Tortinhas").map((item) => item.name),
    ["Tortinha"],
  );
  assert.deepEqual(
    getCafeteriaCatalogSuggestions("🥤 Bebidas").map((item) => item.name),
    ["Cappuccino", "Bebida"],
  );
  assert.deepEqual(
    getCafeteriaCatalogSuggestions("Salgados e lanches").map((item) => item.name),
    ["Empada", "Pastel Assado", "Tortinha"],
  );
});

test("não repete itens já cadastrados na categoria e reconhece variações de grafia", () => {
  const suggestions = getCafeteriaCatalogSuggestions("Cafés", [
    { name: "café" },
    { name: "Capuccino" },
  ]);

  assert.deepEqual(suggestions, []);
});

test("sugestões genéricas não incluem preço nem imagem de produto fictícios", () => {
  const suggestions = getCafeteriaCatalogSuggestions("Empadas");
  assert.equal(suggestions[0]?.description, "Empada assada com massa leve e recheio saboroso.");
  assert.equal(suggestions[0]?.imageUrl, null);
  assert.ok(!("price" in (suggestions[0] ?? {})));
});
