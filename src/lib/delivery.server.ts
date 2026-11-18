import { distanceKm, withinDeliveryRadius, type Coordinates } from "./delivery";

const cache = new Map<string, { expires: number; coordinates: Coordinates }>();
export async function postalCoordinates(raw: string): Promise<Coordinates> {
  const cep = raw.replace(/\D/g, "");
  if (!/^\d{8}$/.test(cep)) throw new Error("Informe um CEP válido com 8 dígitos.");
  const cached = cache.get(cep);
  if (cached && cached.expires > Date.now()) return cached.coordinates;
  const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("Não foi possível localizar esse CEP. Confira o CEP e tente novamente.");
  const result = await response.json() as { location?: { coordinates?: { latitude?: string; longitude?: string } } };
  const rawLat = result.location?.coordinates?.latitude;
  const rawLon = result.location?.coordinates?.longitude;
  const latitude = Number(rawLat);
  const longitude = Number(rawLon);
  if (!rawLat || !rawLon || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || (latitude === 0 && longitude === 0)) {
    throw new Error("Esse CEP não possui localização precisa para verificar a entrega. Confirme outro CEP com o vendedor.");
  }
  const coordinates = { latitude, longitude };
  if (cache.size >= 500) cache.clear();
  cache.set(cep, { coordinates, expires: Date.now() + 86400000 });
  return coordinates;
}

export async function checkPostalDelivery(origin: string, destination: string, radius: number) {
  const [a, b] = await Promise.all([postalCoordinates(origin), postalCoordinates(destination)]);
  const distance = distanceKm(a, b);
  return { allowed: withinDeliveryRadius(distance, radius), distanceKm: Math.round(distance * 100) / 100 };
}