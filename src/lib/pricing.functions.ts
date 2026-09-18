import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPublicClient } from "./supabase-public.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolvePricing, type PlanKey, type ProPricing } from "./pricing.server";

export type { ProPricing } from "./pricing.server";

const COLUMNS =
  "base_price, promo_price, promo_label, promo_starts_at, promo_ends_at, promo_active";

async function readPlan(plan: PlanKey): Promise<ProPricing> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("plan_pricing")
    .select(COLUMNS)
    .eq("plan", plan)
    .maybeSingle();
  return resolvePricing((data as Record<string, unknown> | null) ?? null, plan);
}

export const getProPricing = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProPricing> => readPlan("pro"),
);

/** Preço vigente dos dois planos pagos (Básica e PRO). */
export const getPlansPricing = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ basica: ProPricing; pro: ProPricing }> => ({
    basica: await readPlan("basica"),
    pro: await readPlan("pro"),
  }),
);

const pricingSchema = z.object({
  plan: z.enum(["basica", "pro"]).default("pro"),
  basePrice: z.number().min(0).max(9999),
  promoPrice: z.number().min(0).max(9999).nullable(),
  promoLabel: z.string().max(80).nullable(),
  promoStartsAt: z.string().nullable(),
  promoEndsAt: z.string().nullable(),
  promoActive: z.boolean(),
});

export const saveProPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => pricingSchema.parse(data))
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
      .eq("plan", data.plan)
      .select("base_price, promo_price, promo_label, promo_starts_at, promo_ends_at, promo_active")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return resolvePricing((saved as Record<string, unknown> | null) ?? null, data.plan);
  });
