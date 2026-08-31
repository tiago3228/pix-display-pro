import { createPublicClient } from "./supabase-public.server";

export const DEFAULT_PRO_PRICE = 9.9;

export type ProPricing = {
  basePrice: number;
  price: number;
  promoActive: boolean;
  promoPrice: number | null;
  promoLabel: string | null;
  promoStartsAt: string | null;
  promoEndsAt: string | null;
};

export function resolvePricing(row: Record<string, unknown> | null): ProPricing {
  const basePrice = Number(row?.["base_price"] ?? DEFAULT_PRO_PRICE) || DEFAULT_PRO_PRICE;
  const rawPromo = row?.["promo_price"];
  const promoPrice = rawPromo === null || rawPromo === undefined ? null : Number(rawPromo);
  const startsAt = (row?.["promo_starts_at"] as string | null) ?? null;
  const endsAt = (row?.["promo_ends_at"] as string | null) ?? null;
  const now = Date.now();
  const withinWindow = (!startsAt || new Date(startsAt).getTime() <= now) && (!endsAt || new Date(endsAt).getTime() >= now);
  const active = Boolean(row?.["promo_active"] && promoPrice !== null && promoPrice >= 0 && withinWindow);
  return {
    basePrice,
    price: active ? promoPrice : basePrice,
    promoActive: active,
    promoPrice: Number.isNaN(promoPrice ?? NaN) ? null : promoPrice,
    promoLabel: (row?.["promo_label"] as string | null) ?? null,
    promoStartsAt: startsAt,
    promoEndsAt: endsAt,
  };
}

export async function getCurrentProPricing() {
  const supabase = createPublicClient();
  const { data } = await supabase.from("plan_pricing").select("base_price, promo_price, promo_label, promo_starts_at, promo_ends_at, promo_active").eq("plan", "pro").maybeSingle();
  return resolvePricing((data as Record<string, unknown> | null) ?? null);
}
