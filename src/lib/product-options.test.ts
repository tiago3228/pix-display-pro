import assert from "node:assert/strict";
import test from "node:test";
import { missingOptionsMessage } from "./product-options.ts";

const options = [{ name: "Tamanho" }, { name: "Cor" }, { name: "Modelo" }];

test("pede para escolher a opção que está faltando", () => {
  assert.equal(
    missingOptionsMessage([options[0]!], {}),
    "Selecione uma opção de tamanho antes de adicionar o produto ao carrinho.",
  );
});

test("nomeia todas as opções que ainda faltam", () => {
  assert.equal(
    missingOptionsMessage(options, {}),
    "Selecione as opções de tamanho, cor e modelo antes de adicionar o produto ao carrinho.",
  );
});

test("informa somente a opção ausente após uma seleção parcial", () => {
  assert.equal(
    missingOptionsMessage(options, { Tamanho: "M", Modelo: "Clássico" }),
    "Selecione uma opção de cor antes de adicionar o produto ao carrinho.",
  );
});

test("não mostra mensagem quando todas as opções foram selecionadas", () => {
  assert.equal(
    missingOptionsMessage(options, { Tamanho: "M", Cor: "Azul", Modelo: "Clássico" }),
    null,
  );
});
