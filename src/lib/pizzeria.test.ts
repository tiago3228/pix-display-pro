import { describe, expect, it } from "vitest";
import { pizzaItemName, pizzaUnitPrice } from "./pizzeria";

describe("pizzaUnitPrice", () => {
  it("cobra o sabor mais caro quando há meio a meio", () => {
    expect(pizzaUnitPrice([45, 52])).toBe(52);
  });

  it("soma borda e adicionais ao preço da pizza", () => {
    expect(pizzaUnitPrice([40], [8, 4.5])).toBe(52.5);
  });

  it("sem sabor não tem preço", () => {
    expect(pizzaUnitPrice([], [8])).toBe(0);
  });
});

describe("pizzaItemName", () => {
  it("mostra as frações dos sabores", () => {
    expect(pizzaItemName("Grande", ["Calabresa", "Portuguesa"])).toBe(
      "Pizza Grande — ½ Calabresa + ½ Portuguesa",
    );
  });
});
