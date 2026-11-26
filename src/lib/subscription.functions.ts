import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SubscriptionView = {
  plan: "basica" | "pro";
  hasProAccess: boolean;
  proSource: "mercadopago" | "mercadopago_pix" | "pix_manual" | "trial" | "diamond" | null;
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

/** Lê e agrega a assinatura PRO de todas as lojas pertencentes ao usuário. */
export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SubscriptionView> => {
    const { mpEnvironment, getPreapproval, statusGrantsPro } = await import("./mercadopago.server");
    const { syncFromPreapproval, enforceGracePeriod } = await import("./subscription.server");

    const { data: stores } = await context.supabase
      .from("stores")
      .select("id, diamond_access")
      .eq("owner_id", context.userId);
    const storeIds = (stores ?? []).map((store) => store.id);
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
    if (!storeIds.length) return empty;

    const { data: subscriptionRows } = await context.supabase
      .from("subscriptions")
      .select("*")
      .in("store_id", storeIds)
      .order("created_at", { ascending: false });
    const subscriptions = [...(subscriptionRows ?? [])];
    const relevance = (candidate: (typeof subscriptions)[number]) => {
      if (candidate.plan === "pro" && statusGrantsPro(candidate.status, candidate.grace_until))
        return 4;
      if (candidate.plan === "pro" && candidate.status === "pending") return 3;
      if (candidate.plan === "pro" && ["paused", "past_due"].includes(candidate.status)) return 2;
      return 1;
    };
    // Prioriza uma assinatura PRO que concede acesso, depois uma pendente; desempata pela mais recente.
    let sub =
      [...subscriptions].sort((a, b) => {
        const byRelevance = relevance(b) - relevance(a);
        return byRelevance || b.created_at.localeCompare(a.created_at);
      })[0] ?? null;

    if (sub?.provider_subscription_id && sub.status !== "canceled") {
      try {
        const remote = await getPreapproval(sub.provider_subscription_id);
        await syncFromPreapproval(remote);
        const { data: refreshed } = await context.supabase
          .from("subscriptions")
          .select("*")
          .eq("id", sub.id)
          .maybeSingle();
        if (refreshed) {
          const index = subscriptions.findIndex((row) => row.id === refreshed.id);
          if (index >= 0) subscriptions[index] = refreshed;
          sub = refreshed;
        }
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
      const index = subscriptions.findIndex((row) => row.id === sub!.id);
      if (index >= 0 && subscriptions[index]) subscriptions[index].status = status;
    }

    const { data: payments } = await context.supabase
      .from("subscription_payments")
      .select("id, amount, status, paid_at, created_at")
      .in("store_id", storeIds)
      .order("created_at", { ascending: false })
      .limit(12);
    const { activePixGrant } = await import("./pro-pix.server");
    const { activeProTrial } = await import("./subscription.server");
    const [pixResults, trialResults] = await Promise.all([
      Promise.all(storeIds.map((storeId) => activePixGrant(storeId))),
      Promise.all(storeIds.map((storeId) => activeProTrial(storeId))),
    ]);
    const pixGrant =
      pixResults
        .filter((grant): grant is NonNullable<typeof grant> => Boolean(grant))
        .sort((a, b) => Date.parse(b.periodEnd) - Date.parse(a.periodEnd))[0] ?? null;
    const trialEndsAt =
      trialResults
        .filter((endsAt): endsAt is string => Boolean(endsAt))
        .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
    const mpPro = subscriptions.some(
      (row) => row.plan === "pro" && statusGrantsPro(row.status, row.grace_until),
    );
    const hasDiamondAccess = (stores ?? []).some((store) => store.diamond_access);
    const hasProAccess = hasDiamondAccess || mpPro || Boolean(pixGrant) || Boolean(trialEndsAt);

    return {
      plan: hasProAccess ? "pro" : "basica",
      hasProAccess,
      proSource: hasDiamondAccess
        ? "diamond"
        : mpPro
          ? "mercadopago"
          : pixGrant
            ? pixGrant.source
            : trialEndsAt
              ? "trial"
              : null,
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
      payments: (payments ?? []).map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount ?? 0),
        status: payment.status,
        paidAt: payment.paid_at,
        createdAt: payment.created_at,
      })),
    };
  });

/** Inicia (ou reaproveita) a assinatura PRO do proprietário, usando a loja mais antiga como âncora. */
export const startProSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        origin: z.string().max(200).optional(),
        plan: z.enum(["basica", "pro"]).default("pro"),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { createPreapproval, resolveBaseUrl, statusGrantsPro } =
      await import("./mercadopago.server");
    const { syncFromPreapproval, LIVE_STATUSES } = await import("./subscription.server");

    const { data: stores, error: storesError } = await context.supabase
      .from("stores")
      .select("id, name, diamond_access")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: true });
    if (storesError) throw new Error("Não foi possível verificar as lojas da conta.");
    const store = stores?.[0] ?? null;
    if (!store) throw new Error("Crie sua loja em “Minha Loja” antes de assinar um plano.");
    if (stores?.some((ownedStore) => ownedStore.diamond_access)) {
      throw new Error("Sua conta possui acesso Diamante permanente e não precisa de assinatura.");
    }

    const storeIds = (stores ?? []).map((ownedStore) => ownedStore.id);
    const { data: liveRows, error: subscriptionsError } = await context.supabase
      .from("subscriptions")
      .select(
        "id, store_id, plan, status, grace_until, init_point, provider_subscription_id, created_at",
      )
      .in("store_id", storeIds)
      .eq("plan", "pro")
      .in("status", LIVE_STATUSES as unknown as string[])
      .order("created_at", { ascending: false });
    if (subscriptionsError) {
      throw new Error("Não foi possível verificar a assinatura PRO existente.");
    }
    const liveProRows = liveRows ?? [];
    const active = liveProRows.find((row) => statusGrantsPro(row.status, row.grace_until));
    if (active) {
      return { alreadyActive: true, alreadyPending: false, checkoutUrl: null as string | null };
    }
    const pending = liveProRows.find((row) => row.status === "pending");
    if (pending?.init_point) {
      return { alreadyActive: false, alreadyPending: false, checkoutUrl: pending.init_point };
    }
    if (pending) {
      return { alreadyActive: false, alreadyPending: true, checkoutUrl: null as string | null };
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

    return {
      alreadyActive: false,
      alreadyPending: false,
      checkoutUrl: preapproval.init_point ?? null,
    };
  });

/** Cancela todas as assinaturas PRO live do proprietário, verificando cada loja antes de alterar dados. */
export const cancelProSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { cancelPreapproval } = await import("./mercadopago.server");
    const { syncFromPreapproval, applyPlanToStore, logAudit, LIVE_STATUSES } =
      await import("./subscription.server");

    const { data: stores, error: storesError } = await context.supabase
      .from("stores")
      .select("id, diamond_access")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: true });
    if (storesError) throw new Error("Não foi possível verificar as lojas da conta.");
    const storeIds = (stores ?? []).map((store) => store.id);
    if (!storeIds.length) throw new Error("Loja não encontrada.");
    if (stores?.every((store) => store.diamond_access)) {
      return { ok: true, alreadyCanceled: true };
    }
    const ownedStoreIds = new Set(storeIds);
    const { data: liveRows, error: subscriptionsError } = await context.supabase
      .from("subscriptions")
      .select("id, store_id, plan, provider_subscription_id, status")
      .in("store_id", storeIds)
      .eq("plan", "pro")
      .in("status", LIVE_STATUSES as unknown as string[])
      .order("created_at", { ascending: false });
    if (subscriptionsError)
      throw new Error("Não foi possível consultar as assinaturas PRO da conta.");
    const subscriptions = (liveRows ?? []).filter((row) => ownedStoreIds.has(row.store_id));
    if (!subscriptions.length) return { ok: true, alreadyCanceled: true };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const processedProviderIds = new Set<string>();
    let canceledCount = 0;
    for (const sub of subscriptions) {
      if (!ownedStoreIds.has(sub.store_id)) continue;
      if (sub.provider_subscription_id) {
        if (processedProviderIds.has(sub.provider_subscription_id)) continue;
        processedProviderIds.add(sub.provider_subscription_id);
        const { data: ownedRow, error: ownershipError } = await supabaseAdmin
          .from("subscriptions")
          .select("id, store_id")
          .eq("id", sub.id)
          .eq("store_id", sub.store_id)
          .maybeSingle();
        if (ownershipError || !ownedRow || !ownedStoreIds.has(ownedRow.store_id)) {
          throw new Error("Não foi possível verificar a propriedade da assinatura.");
        }
        const remote = await cancelPreapproval(sub.provider_subscription_id);
        await syncFromPreapproval(remote);
      } else {
        const { error: updateError } = await supabaseAdmin
          .from("subscriptions")
          .update({ status: "canceled", canceled_at: new Date().toISOString() })
          .eq("id", sub.id)
          .eq("store_id", sub.store_id);
        if (updateError) throw new Error("Não foi possível cancelar a assinatura PRO.");
        await applyPlanToStore(sub.store_id, "canceled", null);
      }
      await logAudit({
        storeId: sub.store_id,
        userId: context.userId,
        action: "subscription_cancel_requested",
        resourceType: "subscription",
        resourceId: sub.id,
      });
      canceledCount += 1;
    }
    return { ok: true, alreadyCanceled: false, canceledCount };
  });
