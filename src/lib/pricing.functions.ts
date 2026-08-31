import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPublicClient } from "./supabase-public.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolvePricing, type ProPricing } from "./pricing.server";

export type { ProPricing } from "./pricing.server";

export const getProPricing = createServerFn({ method: "GET" }).handler(async (): Promise<ProPricing> => {
  const supabase = createPublicClient();
  const { data } = await supabase.from("plan_pricing").select("base_price, promo_price, promo_label, promo_starts_at, promo_ends_at, promo_active").eq("plan", "pro").maybeSingle();
  return resolvePricing((data as Record<string, unknown> | null) ?? null);
});

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
    const { data: saved, error } = await context.supabase.from("plan_pricing").update({
      base_price: data.basePrice,
      promo_price: data.promoPrice,
      promo_label: data.promoLabel,
      promo_starts_at: data.promoStartsAt,
      promo_ends_at: data.promoEndsAt,
      promo_active: data.promoActive,
      updated_by: context.userId,
    }).eq("plan", "pro").select("base_price, promo_price, promo_label, promo_starts_at, promo_ends_at, promo_active").maybeSingle();
    if (error) throw new Error(error.message);
    return resolvePricing((saved as Record<string, unknown> | null) ?? null);
  });
