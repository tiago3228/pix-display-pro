import assert from "node:assert/strict";
import test from "node:test";
import { projectDeliveryQuote } from "./delivery-contract.ts";

test("cotação permitida expõe apenas o estado e a taxa", () => {
  const projected = projectDeliveryQuote({
    allowed: true,
    fee: 12.5,
    distanceKm: 4.2,
    radiusKm: 8,
    originCep: "01001000",
    settingsUpdatedAt: "2026-01-01T00:00:00.000Z",
  });
  assert.deepEqual(projected, { allowed: true, fee: 12.5 });
  assert.deepEqual(Object.keys(projected).sort(), ["allowed", "fee"]);
});

test("cotação negada não revela detalhes privados e taxa inválida não é publicada", () => {
  assert.deepEqual(
    projectDeliveryQuote({ allowed: false, fee: 20, radiusKm: 5, originCep: "01001000" }),
    { allowed: false },
  );
  assert.deepEqual(projectDeliveryQuote({ allowed: true, fee: Number.NaN }), { allowed: false });
  assert.deepEqual(projectDeliveryQuote({ allowed: true, fee: -1 }), { allowed: false });
});
