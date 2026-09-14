import { createPublicClient } from "./supabase-public.server";

export const DEFAULT_PRO_PRICE = 19.9;
export const DEFAULT_BASIC_PRICE = 9.9;

export type PlanKey = "basica" | "pro";

export const defaultPlanPrice = (plan: PlanKey) =>
  plan === "pro" ? DEFAULT_PRO_PRICE : DEFAULT_BASIC_PRICE;

export type ProPricing = {
  basePrice: number;
  price: number;
  promoActive: boolean;
  promoPrice: number | null;
  promoLabel: string | null;
  promoStartsAt: string | null;
  promoEndsAt: string | null;
};

export function resolvePricing(
  row: Record<string, unknown> | null,
  plan: PlanKey = "pro",
): ProPricing {
  const fallback = defaultPlanPrice(plan);
  const basePrice = Number(row?.["base_price"] ?? fallback) || fallback;
  const rawPromo = row?.["promo_price"];
  const promoPrice = rawPromo === null || rawPromo === undefined ? null : Number(rawPromo);
  const startsAt = (row?.["promo_starts_at"] as string | null) ?? null;
  const endsAt = (row?.["promo_ends_at"] as string | null) ?? null;
  const now = Date.now();
  const withinWindow = (!startsAt || new Date(startsAt).getTime() <= now) && (!endsAt || new Date(endsAt).getTime() >= now);
  const active = Boolean(row?.["promo_active"] && promoPrice !== null && promoPrice >= 0 && withinWindow);
  return {
    basePrice,
    price: active && promoPrice !== null ? promoPrice : basePrice,
    promoActive: active,
    promoPrice: Number.isNaN(promoPrice ?? NaN) ? null : promoPrice,
    promoLabel: (row?.["promo_label"] as string | null) ?? null,
    promoStartsAt: startsAt,
    promoEndsAt: endsAt,
  };
}

export async function getCurrentPlanPricing(plan: PlanKey) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("plan_pricing")
    .select("base_price, promo_price, promo_label, promo_starts_at, promo_ends_at, promo_active")
    .eq("plan", plan)
    .maybeSingle();
  return resolvePricing((data as Record<string, unknown> | null) ?? null, plan);
}

export async function getCurrentProPricing() {
  return getCurrentPlanPricing("pro");
}
