export type Coordinates = { latitude: number; longitude: number };

export function distanceKm(a: Coordinates, b: Coordinates): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export function withinDeliveryRadius(distance: number, radius: number): boolean {
  return Number.isFinite(distance) && Number.isFinite(radius) && distance >= 0 && radius > 0 && distance <= radius;
}

export function deliveryTotal(subtotal: number, fee: number): number {
  if (![subtotal, fee].every((v) => Number.isFinite(v) && v >= 0)) throw new Error("Valor de frete inválido.");
  return Math.round((subtotal + fee) * 100) / 100;
}