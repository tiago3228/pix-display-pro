import assert from "node:assert/strict";
import test from "node:test";
import { pizzaItemName, pizzaUnitPrice } from "./pizzeria.ts";

test("meio a meio cobra o sabor mais caro", () => {
  assert.equal(pizzaUnitPrice([45, 52]), 52);
});

test("borda e adicionais somam ao preço da pizza", () => {
  assert.equal(pizzaUnitPrice([40], [8, 4.5]), 52.5);
});

test("sem sabor não tem preço", () => {
  assert.equal(pizzaUnitPrice([], [8]), 0);
});

test("nome mostra as frações dos sabores", () => {
  assert.equal(
    pizzaItemName("Grande", ["Calabresa", "Portuguesa"]),
    "Pizza Grande — ½ Calabresa + ½ Portuguesa",
  );
});
