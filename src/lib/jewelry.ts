export const JEWELRY_CATEGORIES = [
  "Geral",
  "💍 Anéis",
  "💎 Alianças",
  "📿 Colares",
  "⛓️ Correntes",
  "✨ Brincos",
  "🔗 Pulseiras",
  "💎 Pingentes",
  "👑 Conjuntos",
  "⌚ Relógios e Acessórios",
  "🎁 Presentes",
  "⭐ Lançamentos",
  "🔥 Ofertas",
] as const;

/** Usa a data civil local do comprador/visitante ao exibir uma promoção com validade. */
export function isJewelryOfferCurrent(
  offerActive: boolean,
  expiresAt: string | null | undefined,
  today?: string,
) {
  const currentDate = new Date();
  const localToday =
    today ??
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(currentDate);
  return offerActive && (!expiresAt || expiresAt >= localToday);
}

export function getJewelryDiscountPercent(originalPrice: number, offerPrice: number) {
  if (originalPrice <= 0 || offerPrice < 0 || offerPrice >= originalPrice) return 0;
  return Math.round((1 - offerPrice / originalPrice) * 100);
}
