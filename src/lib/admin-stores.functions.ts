import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard.server";

export type AdminStoreOverview = {
  id: string;
  name: string;
  slug: string;
  sellerName: string;
  whatsapp: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  trialEndsAt: string | null;
  trialActive: boolean;
  subscription: {
    status: string;
    plan: string;
    provider: string | null;
    amount: number;
    currentPeriodEnd: string | null;
    canceledAt: string | null;
    lastPaymentAt: string | null;
  } | null;
};

export type AdminStoresOverview = {
  stores: AdminStoreOverview[];
  totals: {
    stores: number;
    pro: number;
    basica: number;
    trial: number;
    inactive: number;
  };
};

export const listAdminStoresOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminStoresOverview> => {
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [storesResult, subsResult] = await Promise.all([
      supabaseAdmin
        .from("stores")
        .select(
          "id, name, slug, seller_name, whatsapp, plan, is_active, created_at, pro_trial_ends_at",
        )
        .order("created_at", { ascending: false })
        .limit(2000),
      supabaseAdmin
        .from("subscriptions")
        .select(
          "store_id, status, plan, provider, amount, current_period_end, canceled_at, last_payment_at, updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(5000),
    ]);

    if (storesResult.error) throw new Error("Não foi possível carregar as lojas.");
    if (subsResult.error) throw new Error("Não foi possível carregar as assinaturas.");

    const latestByStore = new Map<string, (typeof subsResult.data)[number]>();
    for (const sub of subsResult.data ?? []) {
      if (!latestByStore.has(sub.store_id)) latestByStore.set(sub.store_id, sub);
    }

    const now = Date.now();
    const stores: AdminStoreOverview[] = (storesResult.data ?? []).map((store) => {
      const sub = latestByStore.get(store.id) ?? null;
      const trialEndsAt = store.pro_trial_ends_at ?? null;
      return {
        id: store.id,
        name: store.name,
        slug: store.slug,
        sellerName: store.seller_name,
        whatsapp: store.whatsapp,
        plan: store.plan,
        isActive: store.is_active,
        createdAt: store.created_at,
        trialEndsAt,
        trialActive: Boolean(trialEndsAt && new Date(trialEndsAt).getTime() > now),
        subscription: sub
          ? {
              status: sub.status,
              plan: sub.plan,
              provider: sub.provider ?? null,
              amount: Number(sub.amount ?? 0),
              currentPeriodEnd: sub.current_period_end ?? null,
              canceledAt: sub.canceled_at ?? null,
              lastPaymentAt: sub.last_payment_at ?? null,
            }
          : null,
      };
    });

    return {
      stores,
      totals: {
        stores: stores.length,
        pro: stores.filter((s) => s.plan === "pro").length,
        basica: stores.filter((s) => s.plan !== "pro").length,
        trial: stores.filter((s) => s.trialActive).length,
        inactive: stores.filter((s) => !s.isActive).length,
      },
    };
  });
