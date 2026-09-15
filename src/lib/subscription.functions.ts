import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SubscriptionView = {
  plan: "basica" | "pro";
  hasProAccess: boolean;
  proSource: "mercadopago" | "pix_manual" | "trial" | null;
  pixActiveUntil: string | null;
  trialEndsAt: string | null;
  environment: "test" | "live";
  subscription: {
    id: string;
    status: string;
    externalStatus: string | null;
    amount: number;
    currency: string;
    providerSubscriptionId: string | null;
    initPoint: string | null;
    startedAt: string | null;
    nextBillingDate: string | null;
    lastPaymentAt: string | null;
    graceUntil: string | null;
    canceledAt: string | null;
  } | null;
  payments: {
    id: string;
    amount: number;
    status: string;
    paidAt: string | null;
    createdAt: string;
  }[];
};

/** Lê a assinatura da loja do usuário, revalidando no Mercado Pago quando necessário. */
export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SubscriptionView> => {
    const { mpEnvironment, getPreapproval, statusGrantsPro } = await import("./mercadopago.server");
    const { syncFromPreapproval, enforceGracePeriod } = await import("./subscription.server");

    const { data: store } = await context.supabase
      .from("stores")
      .select("id, plan")
      .eq("owner_id", context.userId)
      .maybeSingle();

    const empty: SubscriptionView = {
      plan: "basica",
      hasProAccess: false,
      proSource: null,
      pixActiveUntil: null,
      trialEndsAt: null,
      environment: mpEnvironment(),
      subscription: null,
      payments: [],
    };
    if (!store) return empty;

    const { data: rows } = await context.supabase
      .from("subscriptions")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(1);
    let sub = rows?.[0] ?? null;

    if (sub?.provider_subscription_id && sub.status !== "canceled") {
      try {
        const remote = await getPreapproval(sub.provider_subscription_id);
        await syncFromPreapproval(remote);
        const { data: refreshed } = await context.supabase
          .from("subscriptions")
          .select("*")
          .eq("id", sub.id)
          .maybeSingle();
        if (refreshed) sub = refreshed;
      } catch (error) {
        console.error("[subscription] revalidation failed", (error as Error).message);
      }
    }

    if (sub) {
      const status = await enforceGracePeriod({
        id: sub.id,
        store_id: sub.store_id,
        status: sub.status,
        grace_until: sub.grace_until,
      });
      sub = { ...sub, status };
    }

    const { data: payments } = await context.supabase
      .from("subscription_payments")
      .select("id, amount, status, paid_at, created_at")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(12);

    const mpPro = sub?.plan === "pro" ? statusGrantsPro(sub.status, sub.grace_until) : false;

    const { activePixGrant } = await import("./pro-pix.server");
    const { activeProTrial } = await import("./subscription.server");
    const pixGrant = await activePixGrant(store.id);
    const trialEndsAt = await activeProTrial(store.id);
    const hasProAccess = mpPro || Boolean(pixGrant) || Boolean(trialEndsAt);

    return {
      plan: hasProAccess ? "pro" : "basica",
      hasProAccess,
      proSource: mpPro ? "mercadopago" : pixGrant ? "pix_manual" : trialEndsAt ? "trial" : null,
      pixActiveUntil: pixGrant?.periodEnd ?? null,
      trialEndsAt,
      environment: mpEnvironment(),
      subscription: sub
        ? {
            id: sub.id,
            status: sub.status,
            externalStatus: sub.external_status,
            amount: Number(sub.amount ?? 0),
            currency: sub.currency ?? "BRL",
            providerSubscriptionId: sub.provider_subscription_id,
            initPoint: sub.init_point,
            startedAt: sub.started_at,
            nextBillingDate: sub.next_billing_date,
            lastPaymentAt: sub.last_payment_at,
            graceUntil: sub.grace_until,
            canceledAt: sub.canceled_at,
          }
        : null,
      payments: (payments ?? []).map((p) => ({
        id: p.id,
        amount: Number(p.amount ?? 0),
        status: p.status,
        paidAt: p.paid_at,
        createdAt: p.created_at,
      })),
    };
  });

/** Inicia (ou reaproveita) a assinatura PRO no Mercado Pago. Idempotente por loja. */
export const startProSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        origin: z.string().max(200).optional(),
        plan: z.enum(["basica", "pro"]).default("pro"),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { createPreapproval, resolveBaseUrl } = await import("./mercadopago.server");
    const { syncFromPreapproval, LIVE_STATUSES } = await import("./subscription.server");

    const { data: stores } = await context.supabase
      .from("stores")
      .select("id, name")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1);
    const store = stores?.[0] ?? null;
    if (!store) throw new Error("Crie sua loja em “Minha Loja” antes de assinar um plano.");

    // Idempotência: nunca criar duas assinaturas vivas para a mesma loja.
    const { data: liveRows } = await context.supabase
      .from("subscriptions")
      .select("id, status, init_point, provider_subscription_id")
      .eq("store_id", store.id)
      .in("status", LIVE_STATUSES as unknown as string[])
      .order("created_at", { ascending: false })
      .limit(1);
    const live = liveRows?.[0] ?? null;

    if (live && (live.status === "active" || live.status === "authorized")) {
      return { alreadyActive: true, checkoutUrl: null as string | null };
    }
    if (live?.init_point && live.status === "pending") {
      return { alreadyActive: false, checkoutUrl: live.init_point };
    }

    const baseUrl = resolveBaseUrl(data.origin ?? null);
    const backUrl = `${baseUrl}/assinatura`;
    const email = (context.claims as { email?: string } | undefined)?.email;
    if (!email) throw new Error("E-mail do usuário indisponível.");

    const { getCurrentPlanPricing } = await import("./pricing.server");
    const pricing = await getCurrentPlanPricing(data.plan);

    const preapproval = await createPreapproval({
      externalReference: store.id,
      payerEmail: email,
      backUrl,
      amount: pricing.price,
      idempotencyKey: `vitrini-sub-${store.id}-${new Date().toISOString().slice(0, 10)}`,
    });

    await syncFromPreapproval(preapproval, data.plan);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("subscriptions")
      .update({ init_point: preapproval.init_point ?? null, user_id: context.userId })
      .eq("provider_subscription_id", preapproval.id);

    return { alreadyActive: false, checkoutUrl: preapproval.init_point ?? null };
  });

/** Cancela a assinatura no Mercado Pago e reflete o status real no banco. */
export const cancelProSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { cancelPreapproval } = await import("./mercadopago.server");
    const { syncFromPreapproval, applyPlanToStore, logAudit, LIVE_STATUSES } =
      await import("./subscription.server");

    const { data: store } = await context.supabase
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!store) throw new Error("Loja não encontrada.");

    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("id, provider_subscription_id, status")
      .eq("store_id", store.id)
      .in("status", LIVE_STATUSES as unknown as string[])
      .maybeSingle();
    if (!sub) return { ok: true, alreadyCanceled: true };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (sub.provider_subscription_id) {
      const remote = await cancelPreapproval(sub.provider_subscription_id);
      await syncFromPreapproval(remote);
    } else {
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "canceled", canceled_at: new Date().toISOString() })
        .eq("id", sub.id);
      await applyPlanToStore(store.id, "canceled", null);
    }

    await logAudit({
      storeId: store.id,
      userId: context.userId,
      action: "subscription_cancel_requested",
      resourceType: "subscription",
      resourceId: sub.id,
    });

    return { ok: true, alreadyCanceled: false };
  });
