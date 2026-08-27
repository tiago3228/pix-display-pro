/** Regras de negócio da assinatura PRO — server-only. */
import {
  GRACE_PERIOD_DAYS,
  PRO_PLAN_AMOUNT,
  PRO_PLAN_CURRENCY,
  createProPlan,
  mapPreapprovalStatus,
  mpEnvironment,
  searchProPlan,
  statusGrantsPro,
  type Preapproval,
} from "./mercadopago.server";

export const LIVE_STATUSES = ["pending", "active", "authorized", "past_due", "paused"] as const;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function logAudit(entry: {
  storeId: string | null;
  userId?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string | null;
  reference?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = await admin();
  await db.from("audit_logs").insert({
    store_id: entry.storeId,
    user_id: entry.userId ?? null,
    action: entry.action,
    resource_type: entry.resourceType ?? null,
    resource_id: entry.resourceId ?? null,
    reference: entry.reference ?? null,
    metadata: (entry.metadata ?? {}) as never,
  });
}

/** Cria (uma única vez) ou recupera o plano de assinatura PRO no Mercado Pago. */
export async function ensureProPlanId(backUrl: string): Promise<string> {
  const db = await admin();
  const key = `mercadopago_plan_id_${mpEnvironment()}`;

  const { data: stored } = await db.from("app_settings").select("value").eq("key", key).maybeSingle();
  if (stored?.value) return stored.value;

  const existing = await searchProPlan();
  const plan = existing ?? (await createProPlan(backUrl));

  await db.from("app_settings").upsert({ key, value: plan.id }, { onConflict: "key" });
  return plan.id;
}

/** Mantém `stores.plan` coerente com o status real da assinatura. */
export async function applyPlanToStore(storeId: string, status: string, graceUntil: string | null) {
  const db = await admin();
  const plan = statusGrantsPro(status, graceUntil) ? "pro" : "free";
  await db.from("stores").update({ plan }).eq("id", storeId);
  return plan;
}

/**
 * Fonte da verdade: aplica no banco o estado devolvido pela API do Mercado Pago.
 * Idempotente — pode ser chamada quantas vezes for necessário.
 */
export async function syncFromPreapproval(preapproval: Preapproval) {
  const db = await admin();

  const { data: existing } = await db
    .from("subscriptions")
    .select("*")
    .eq("provider", "mercadopago")
    .eq("provider_subscription_id", preapproval.id)
    .maybeSingle();

  const storeId = existing?.store_id ?? preapproval.external_reference ?? null;
  if (!storeId) return null;

  const externalStatus = preapproval.status ?? null;
  let status = mapPreapprovalStatus(externalStatus);

  // Uma falha de cobrança mantém o PRO durante o período de tolerância.
  let graceUntil: string | null = existing?.grace_until ?? null;
  let pastDueSince: string | null = existing?.past_due_since ?? null;
  if (status === "active") {
    graceUntil = null;
    pastDueSince = null;
  }

  const patch = {
    store_id: storeId,
    plan: "pro",
    provider: "mercadopago",
    provider_plan_id: preapproval.preapproval_plan_id ?? existing?.provider_plan_id ?? null,
    provider_subscription_id: preapproval.id,
    provider_ref: preapproval.id,
    external_reference: preapproval.external_reference ?? storeId,
    external_status: externalStatus,
    status,
    amount: Number(preapproval.auto_recurring?.transaction_amount ?? PRO_PLAN_AMOUNT),
    currency: preapproval.auto_recurring?.currency_id ?? PRO_PLAN_CURRENCY,
    started_at: existing?.started_at ?? preapproval.date_created ?? null,
    next_billing_date: preapproval.next_payment_date ?? null,
    last_payment_at: preapproval.summarized?.last_charged_date ?? existing?.last_payment_at ?? null,
    grace_until: graceUntil,
    past_due_since: pastDueSince,
    canceled_at:
      status === "canceled" ? (existing?.canceled_at ?? new Date().toISOString()) : null,
    paused_at: status === "paused" ? (existing?.paused_at ?? new Date().toISOString()) : null,
  };

  if (existing) {
    await db.from("subscriptions").update(patch).eq("id", existing.id);
  } else {
    // Encerra qualquer assinatura "viva" órfã da loja antes de inserir (índice único).
    await db
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("store_id", storeId)
      .in("status", LIVE_STATUSES as unknown as string[]);
    await db.from("subscriptions").insert(patch);
  }

  const plan = await applyPlanToStore(storeId, status, graceUntil);
  await logAudit({
    storeId,
    action: `subscription_${status}`,
    resourceType: "subscription",
    resourceId: preapproval.id,
    metadata: { external_status: externalStatus, plan },
  });

  return { storeId, status };
}

/** Marca a assinatura como inadimplente e inicia o período de tolerância. */
export async function markPastDue(subscriptionId: string, storeId: string) {
  const db = await admin();
  const { data: current } = await db
    .from("subscriptions")
    .select("past_due_since, grace_until, status")
    .eq("id", subscriptionId)
    .maybeSingle();

  if (current?.status === "canceled") return;

  const since = current?.past_due_since ?? new Date().toISOString();
  const grace =
    current?.grace_until ??
    new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await db
    .from("subscriptions")
    .update({ status: "past_due", past_due_since: since, grace_until: grace })
    .eq("id", subscriptionId);

  await applyPlanToStore(storeId, "past_due", grace);
  await logAudit({
    storeId,
    action: "subscription_past_due",
    resourceType: "subscription",
    resourceId: subscriptionId,
    metadata: { grace_until: grace },
  });
}

/**
 * Reavalia o período de tolerância. Chamado sempre que a assinatura é lida,
 * garantindo que o PRO caia sozinho quando a tolerância expira.
 */
export async function enforceGracePeriod(subscription: {
  id: string;
  store_id: string;
  status: string;
  grace_until: string | null;
}) {
  if (subscription.status !== "past_due" || !subscription.grace_until) return subscription.status;
  if (new Date(subscription.grace_until).getTime() > Date.now()) return subscription.status;

  const db = await admin();
  await db.from("subscriptions").update({ status: "expired" }).eq("id", subscription.id);
  await applyPlanToStore(subscription.store_id, "expired", null);
  await logAudit({
    storeId: subscription.store_id,
    action: "subscription_grace_expired",
    resourceType: "subscription",
    resourceId: subscription.id,
  });
  return "expired";
}
