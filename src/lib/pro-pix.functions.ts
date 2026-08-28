import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProPixRequestView = {
  id: string;
  storeId: string;
  storeName: string | null;
  userId: string;
  amount: number;
  status: string;
  requestedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  periodStart: string | null;
  periodEnd: string | null;
};

export type ProPixCheckout = {
  configured: boolean;
  amount: number;
  payload: string | null;
  receiverName: string | null;
  pixKey: string | null;
  pixKeyType: string | null;
};

const AMOUNT = 9.9;
const PERIOD_DAYS = 30;

function mapRequest(row: Record<string, unknown>, storeName?: string | null): ProPixRequestView {
  return {
    id: row["id"] as string,
    storeId: row["store_id"] as string,
    storeName: storeName ?? null,
    userId: row["user_id"] as string,
    amount: Number(row["amount"] ?? 0),
    status: row["status"] as string,
    requestedAt: (row["requested_at"] ?? row["created_at"]) as string,
    approvedAt: (row["approved_at"] as string | null) ?? null,
    rejectedAt: (row["rejected_at"] as string | null) ?? null,
    rejectionReason: (row["rejection_reason"] as string | null) ?? null,
    periodStart: (row["period_start"] as string | null) ?? null,
    periodEnd: (row["period_end"] as string | null) ?? null,
  };
}

async function requireAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data } = await (
    context.supabase.rpc as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null }>
  )("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Acesso restrito a administradores.");
}

/** Dados para exibir o QR Code / Copia e Cola do PRO via Pix. */
export const getProPixCheckout = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<ProPixCheckout> => {
    const { getPixSettings } = await import("./pro-pix.server");
    const { buildPixPayload } = await import("./pix-brcode");
    const settings = await getPixSettings();
    if (!settings || !settings.is_active) {
      return {
        configured: false,
        amount: AMOUNT,
        payload: null,
        receiverName: null,
        pixKey: null,
        pixKeyType: null,
      };
    }
    const payload = buildPixPayload({
      key: settings.pix_key,
      receiverName: settings.receiver_name,
      receiverCity: settings.receiver_city,
      amount: AMOUNT,
      txid: "VITRINIPRO",
    });
    return {
      configured: true,
      amount: AMOUNT,
      payload,
      receiverName: settings.receiver_name,
      pixKey: settings.pix_key,
      pixKeyType: settings.pix_key_type,
    };
  });

/** Solicitações Pix da loja do usuário autenticado. */
export const getMyProPixRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: stores } = await context.supabase
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1);
    const store = stores?.[0] ?? null;
    if (!store) return { requests: [] as ProPixRequestView[], activeUntil: null as string | null };

    const { data } = await context.supabase
      .from("pro_pix_requests")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const { activePixGrant } = await import("./pro-pix.server");
    const grant = await activePixGrant(store.id);

    return {
      requests: (data ?? []).map((row) => mapRequest(row as Record<string, unknown>)),
      activeUntil: grant?.periodEnd ?? null,
    };
  });

/** Registra "já fiz o pagamento". Nunca libera o PRO — apenas cria a solicitação. */
export const createProPixRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: stores } = await context.supabase
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1);
    const store = stores?.[0] ?? null;
    if (!store) throw new Error("Crie sua loja em “Minha Loja” antes de assinar o PRO.");

    const { getPixSettings } = await import("./pro-pix.server");
    const { logAudit } = await import("./subscription.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pending } = await supabaseAdmin
      .from("pro_pix_requests")
      .select("id")
      .eq("store_id", store.id)
      .eq("status", "pending")
      .limit(1);
    if (pending?.[0]) {
      return {
        created: false,
        message: "Você já possui uma solicitação de pagamento via Pix aguardando análise.",
      };
    }

    const settings = await getPixSettings();
    const { data: inserted, error } = await supabaseAdmin
      .from("pro_pix_requests")
      .insert({
        store_id: store.id,
        user_id: context.userId,
        amount: AMOUNT,
        payment_method: "pix_manual",
        status: "pending",
        pix_key_snapshot: settings?.pix_key ? `${settings.pix_key_type}` : null,
      })
      .select("id")
      .single();
    if (error) throw new Error("Não foi possível registrar sua solicitação agora.");

    await logAudit({
      storeId: store.id,
      userId: context.userId,
      action: "pro_pix_request_created",
      resourceType: "pro_pix_request",
      resourceId: inserted.id,
      metadata: { amount: AMOUNT, method: "pix_manual" },
    });

    return { created: true, message: "Pagamento enviado para análise." };
  });

/** Lista administrativa das solicitações Pix. */
export const listProPixRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        status: z.enum(["all", "pending", "approved", "rejected", "canceled"]).default("all"),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("pro_pix_requests")
      .select("*, stores(name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") query = query.eq("status", data.status);

    const { data: rows } = await query;
    const requests = (rows ?? []).map((row) => {
      const record = row as Record<string, unknown>;
      const store = record["stores"] as { name?: string } | null;
      return mapRequest(record, store?.name ?? null);
    });
    return {
      requests,
      pendingCount: requests.filter((r) => r.status === "pending").length,
    };
  });

/** Contador de pendências para o alerta do painel administrativo. */
export const countPendingProPixRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("pro_pix_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    return { pending: count ?? 0 };
  });

/** Aprovação atômica: libera o PRO por 30 dias. */
export const approveProPixRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("./subscription.server");

    const start = new Date();
    const end = new Date(start.getTime() + PERIOD_DAYS * 24 * 60 * 60 * 1000);

    const { data: updated } = await supabaseAdmin
      .from("pro_pix_requests")
      .update({
        status: "approved",
        approved_at: start.toISOString(),
        approved_by: context.userId,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
        amount: AMOUNT,
      })
      .eq("id", data.id)
      .eq("status", "pending")
      .select("id, store_id")
      .maybeSingle();

    if (!updated) throw new Error("Solicitação já foi processada por outro administrador.");

    await supabaseAdmin.from("stores").update({ plan: "pro" }).eq("id", updated.store_id);

    await logAudit({
      storeId: updated.store_id,
      userId: context.userId,
      action: "pro_pix_approved",
      resourceType: "pro_pix_request",
      resourceId: updated.id,
      metadata: {
        previous_status: "pending",
        new_status: "approved",
        approved_by: context.userId,
        approved_at: start.toISOString(),
        period_end: end.toISOString(),
      },
    });

    return { ok: true, periodEnd: end.toISOString() };
  });

/** Recusa com motivo obrigatório. Nunca libera o PRO. */
export const rejectProPixRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), reason: z.string().trim().min(3).max(300) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("./subscription.server");

    const now = new Date().toISOString();
    const { data: updated } = await supabaseAdmin
      .from("pro_pix_requests")
      .update({
        status: "rejected",
        rejected_at: now,
        rejected_by: context.userId,
        rejection_reason: data.reason,
      })
      .eq("id", data.id)
      .eq("status", "pending")
      .select("id, store_id")
      .maybeSingle();

    if (!updated) throw new Error("Solicitação já foi processada por outro administrador.");

    await logAudit({
      storeId: updated.store_id,
      userId: context.userId,
      action: "pro_pix_rejected",
      resourceType: "pro_pix_request",
      resourceId: updated.id,
      metadata: {
        previous_status: "pending",
        new_status: "rejected",
        rejected_by: context.userId,
        rejected_at: now,
        rejection_reason: data.reason,
      },
    });

    return { ok: true };
  });

/** Lojas disponíveis para liberação manual do PRO (uso administrativo). */
export const listStoresForProGrant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("stores")
      .select("id, name, slug, plan, owner_id")
      .order("name", { ascending: true })
      .limit(300);
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      plan: row.plan,
      ownerId: row.owner_id,
    }));
  });

/**
 * Liberação manual do PRO por 30 dias quando o Pix chegou mas o lojista
 * não registrou a solicitação no app. Cria a solicitação já aprovada.
 */
export const grantProManually = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ storeId: z.string().uuid(), note: z.string().trim().max(300).optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("./subscription.server");

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("id, owner_id, name")
      .eq("id", data.storeId)
      .maybeSingle();
    if (!store) throw new Error("Loja não encontrada.");

    const start = new Date();
    const end = new Date(start.getTime() + PERIOD_DAYS * 24 * 60 * 60 * 1000);

    // Encerra qualquer solicitação pendente da loja para não duplicar análise.
    await supabaseAdmin
      .from("pro_pix_requests")
      .update({ status: "canceled" })
      .eq("store_id", store.id)
      .eq("status", "pending");

    const { data: inserted, error } = await supabaseAdmin
      .from("pro_pix_requests")
      .insert({
        store_id: store.id,
        user_id: store.owner_id ?? context.userId,
        amount: AMOUNT,
        payment_method: "pix_manual",
        status: "approved",
        approved_at: start.toISOString(),
        approved_by: context.userId,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error("Não foi possível liberar o PRO agora.");

    await supabaseAdmin.from("stores").update({ plan: "pro" }).eq("id", store.id);

    await logAudit({
      storeId: store.id,
      userId: context.userId,
      action: "pro_pix_manual_grant",
      resourceType: "pro_pix_request",
      resourceId: inserted.id,
      metadata: {
        granted_by: context.userId,
        period_end: end.toISOString(),
        note: data.note ?? null,
      },
    });

    return { ok: true, periodEnd: end.toISOString() };
  });

/** Configuração administrativa da chave Pix (visível apenas para administradores). */
export const getPixSettingsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { getPixSettings } = await import("./pro-pix.server");
    const settings = await getPixSettings();
    if (!settings) return null;
    return {
      id: settings.id,
      pixKey: settings.pix_key,
      pixKeyType: settings.pix_key_type,
      receiverName: settings.receiver_name,
      receiverCity: settings.receiver_city,
      isActive: settings.is_active,
    };
  });

export const savePixSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        pixKey: z.string().trim().min(3).max(120),
        pixKeyType: z.enum(["cpf", "cnpj", "email", "telefone", "aleatoria"]),
        receiverName: z.string().trim().min(2).max(60),
        receiverCity: z.string().trim().min(2).max(40),
        isActive: z.boolean().default(true),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getPixSettings } = await import("./pro-pix.server");

    const existing = await getPixSettings();
    const patch = {
      pix_key: data.pixKey,
      pix_key_type: data.pixKeyType,
      receiver_name: data.receiverName,
      receiver_city: data.receiverCity,
      is_active: data.isActive,
    };

    if (existing) {
      await supabaseAdmin.from("pix_settings").update(patch).eq("id", existing.id);
    } else {
      await supabaseAdmin.from("pix_settings").insert(patch);
    }
    return { ok: true };
  });
