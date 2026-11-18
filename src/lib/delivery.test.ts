import test from "node:test";
import assert from "node:assert/strict";
import { distanceKm, withinDeliveryRadius, deliveryTotal } from "./delivery.ts";

test("a distância usa o raio aproximado entre as coordenadas dos CEPs", () => {
  assert.equal(distanceKm({ latitude: -19, longitude: -43 }, { latitude: -19, longitude: -43 }), 0);
  assert.ok(Math.abs(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) - 111.195) < 0.01);
});
test("o limite definido pelo proprietário inclui a borda e recusa endereços mais distantes", () => {
  assert.equal(withinDeliveryRadius(5, 5), true);
  assert.equal(withinDeliveryRadius(5.001, 5), false);
  assert.equal(withinDeliveryRadius(NaN, 5), false);
});
test("a taxa de frete é somada uma única vez ao pedido", () => {
  assert.equal(deliveryTotal(54, 7.5), 61.5);
  assert.equal(deliveryTotal(54, 0), 54);
  assert.throws(() => deliveryTotal(54, -1));
});