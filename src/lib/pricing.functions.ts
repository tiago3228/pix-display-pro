import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPublicClient } from "./supabase-public.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProPricing = {
  basePrice: number;
  price: number;
  promoActive: boolean;
  promoPrice: number | null;
  promoLabel: string | null;
  promoStartsAt: string | null;
  promoEndsAt: string | null;
};

const DEFAULT_PRICE = 9.9;

function resolvePricing(row: Record<string, unknown> | null): ProPricing {
  const basePrice = Number(row?.["base_price"] ?? DEFAULT_PRICE) || DEFAULT_PRICE;
  const promoPrice = row?.["promo_price"] === null ? null : Number(row?.["promo_price"]);
  const startsAt = (row?.["promo_starts_at"] as string | null) ?? null;
  const endsAt = (row?.["promo_ends_at"] as string | null) ?? null;
  const now = Date.now();
  const withinWindow =
    (!startsAt || new Date(startsAt).getTime() <= now) &&
    (!endsAt || new Date(endsAt).getTime() >= now);
  const active = Boolean(
    row?.["promo_active"] && promoPrice !== null && promoPrice > 0 && withinWindow,
  );
  return {
    basePrice,
    price: active ? promoPrice! : basePrice,
    promoActive: active,
    promoPrice: promoPrice === null || Number.isNaN(promoPrice) ? null : promoPrice,
    promoLabel: (row?.["promo_label"] as string | null) ?? null,
    promoStartsAt: startsAt,
    promoEndsAt: endsAt,
  };
}

/** Preço vigente do PRO — leitura pública (landing, assinatura, Pix). */
export const getProPricing = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProPricing> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("plan_pricing")
      .select("base_price, promo_price, promo_label, promo_starts_at, promo_ends_at, promo_active")
      .eq("plan", "pro")
      .maybeSingle();
    return resolvePricing((data as Record<string, unknown> | null) ?? null);
  },
);

const pricingSchema = z.object({
  basePrice: z.number().min(0).max(9999),
  promoPrice: z.number().min(0).max(9999).nullable(),
  promoLabel: z.string().max(80).nullable(),
  promoStartsAt: z.string().nullable(),
  promoEndsAt: z.string().nullable(),
  promoActive: z.boolean(),
});

export const saveProPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => pricingSchema.parse(data))
  .handler(async ({ data, context }): Promise<ProPricing> => {
    const { assertAdmin } = await import("./admin-guard.server");
    await assertAdmin(context.supabase as never, context.userId);
    const { data: saved, error } = await context.supabase
      .from("plan_pricing")
      .update({
        base_price: data.basePrice,
        promo_price: data.promoPrice,
        promo_label: data.promoLabel,
        promo_starts_at: data.promoStartsAt,
        promo_ends_at: data.promoEndsAt,
        promo_active: data.promoActive,
        updated_by: context.userId,
      })
      .eq("plan", "pro")
      .select("base_price, promo_price, promo_label, promo_starts_at, promo_ends_at, promo_active")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return resolvePricing((saved as Record<string, unknown> | null) ?? null);
  });
