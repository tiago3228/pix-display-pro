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

function requireDatabaseResult<T>(
  result: { data: T; error: { code?: string; message: string; details?: string | null } | null },
  operation: string,
): T {
  if (result.error) {
    const error = new Error(`SUPABASE_${operation}_FAILED: ${result.error.message}`);
    Object.assign(error, {
      cause: result.error,
      code: result.error.code,
      details: result.error.details,
    });
    throw error;
  }
  return result.data;
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

  const { data: stored } = await db
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (stored?.value) return stored.value;

  const existing = await searchProPlan();
  const plan = existing ?? (await createProPlan(backUrl));

  await db.from("app_settings").upsert({ key, value: plan.id }, { onConflict: "key" });
  return plan.id;
}

/** Mantém `stores.plan` coerente com o status real da assinatura (e com o Pix manual aprovado). */
export async function applyPlanToStore(storeId: string, status: string, graceUntil: string | null) {
  const db = await admin();
  let plan = statusGrantsPro(status, graceUntil) ? "pro" : "basica";
  if (plan === "basica") {
    const { activePixGrant } = await import("./pro-pix.server");
    if (await activePixGrant(storeId)) plan = "pro";
  }
  const updated = await db
    .from("stores")
    .update({ plan })
    .eq("id", storeId)
    .select("id, plan")
    .maybeSingle();
  const row = requireDatabaseResult(updated, "STORE_PLAN_UPDATE");
  if (!row || row.id !== storeId || row.plan !== plan) {
    throw new Error(
      `SUPABASE_STORE_PLAN_UPDATE_FAILED: store ${storeId} was not updated to ${plan}`,
    );
  }
  console.info("[subscription] store plan updated", { storeId, status, plan });
  return plan;
}

/**
 * Fonte da verdade: aplica no banco o estado devolvido pela API do Mercado Pago.
 * Idempotente — pode ser chamada quantas vezes for necessário.
 */
export async function syncFromPreapproval(preapproval: Preapproval) {
  const db = await admin();

  const existingResult = await db
    .from("subscriptions")
    .select("*")
    .eq("provider", "mercadopago")
    .eq("provider_subscription_id", preapproval.id)
    .maybeSingle();
  const existing = requireDatabaseResult(existingResult, "SUBSCRIPTION_LOOKUP");

  const storeId = existing?.store_id ?? preapproval.external_reference ?? null;
  if (!storeId) return null;

  const externalStatus = preapproval.status ?? null;
  const status = mapPreapprovalStatus(externalStatus);

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
    canceled_at: status === "canceled" ? (existing?.canceled_at ?? new Date().toISOString()) : null,
    paused_at: status === "paused" ? (existing?.paused_at ?? new Date().toISOString()) : null,
  };

  if (existing) {
    const result = await db.from("subscriptions").update(patch).eq("id", existing.id);
    requireDatabaseResult(result, "SUBSCRIPTION_UPDATE");
  } else {
    // Encerra qualquer assinatura "viva" órfã da loja antes de inserir (índice único).
    const expireResult = await db
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("store_id", storeId)
      .in("status", LIVE_STATUSES as unknown as string[]);
    requireDatabaseResult(expireResult, "ORPHAN_SUBSCRIPTIONS_EXPIRE");
    const insertResult = await db.from("subscriptions").insert(patch);
    requireDatabaseResult(insertResult, "SUBSCRIPTION_INSERT");
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
  const currentResult = await db
    .from("subscriptions")
    .select("past_due_since, grace_until, status")
    .eq("id", subscriptionId)
    .maybeSingle();
  const current = requireDatabaseResult(currentResult, "SUBSCRIPTION_LOOKUP");

  if (current?.status === "canceled") return;

  const since = current?.past_due_since ?? new Date().toISOString();
  const grace =
    current?.grace_until ??
    new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const result = await db
    .from("subscriptions")
    .update({ status: "past_due", past_due_since: since, grace_until: grace })
    .eq("id", subscriptionId);
  requireDatabaseResult(result, "SUBSCRIPTION_PAST_DUE_UPDATE");

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

/**
 * Fonte única para autorização de recursos PRO no servidor.
 * PRO é válido se houver assinatura Mercado Pago viva (inclusive tolerância)
 * OU um pagamento Pix manual aprovado dentro do período de 30 dias.
 */
/** Teste grátis de PRO ainda vigente (concedido ao assinar o plano Básica). */
export async function activeProTrial(storeId: string): Promise<string | null> {
  const db = await admin();
  const { data } = await db
    .from("stores")
    .select("pro_trial_ends_at")
    .eq("id", storeId)
    .maybeSingle();
  const ends = data?.pro_trial_ends_at ?? null;
  if (!ends || new Date(ends).getTime() <= Date.now()) return null;
  return ends;
}

/** Liga o teste de 30 dias de PRO uma única vez por loja. */
export async function startProTrial(storeId: string, days = 30): Promise<string | null> {
  const db = await admin();
  const { data: store } = await db
    .from("stores")
    .select("pro_trial_used, pro_trial_ends_at")
    .eq("id", storeId)
    .maybeSingle();
  if (!store || store.pro_trial_used) return store?.pro_trial_ends_at ?? null;

  const endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  await db
    .from("stores")
    .update({ pro_trial_ends_at: endsAt, pro_trial_used: true })
    .eq("id", storeId);
  await logAudit({
    storeId,
    action: "pro_trial_started",
    resourceType: "store",
    resourceId: storeId,
    metadata: { ends_at: endsAt, days },
  });
  return endsAt;
}

export async function storeHasPro(storeId: string): Promise<boolean> {
  const db = await admin();

  if (await activeProTrial(storeId)) return true;

  const { activePixGrant } = await import("./pro-pix.server");
  if (await activePixGrant(storeId)) return true;

  const { data: rows } = await db
    .from("subscriptions")
    .select("id, store_id, status, grace_until")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(1);

  const sub = rows?.[0];
  if (sub) {
    const status = await enforceGracePeriod({
      id: sub.id,
      store_id: sub.store_id,
      status: sub.status,
      grace_until: sub.grace_until,
    });
    if (statusGrantsPro(status, sub.grace_until)) return true;
    await db.from("stores").update({ plan: "basica" }).eq("id", storeId);
    return false;
  }

  const { data: store } = await db.from("stores").select("plan").eq("id", storeId).maybeSingle();
  if (store?.plan === "pro") {
    // Sem assinatura e sem Pix válido: o plano gravado está obsoleto.
    await db.from("stores").update({ plan: "basica" }).eq("id", storeId);
  }
  return false;
}
