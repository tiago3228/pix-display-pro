/** Regras do PRO via Pix com aprovação manual — server-only. */

export const PRO_PIX_AMOUNT = 9.9;
export const PRO_PIX_PERIOD_DAYS = 30;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type PixGrant = {
  id: string;
  periodStart: string;
  periodEnd: string;
};

/** Última aprovação Pix ainda dentro do período de 30 dias. */
export async function activePixGrant(storeId: string): Promise<PixGrant | null> {
  const db = await admin();
  const nowIso = new Date().toISOString();
  const { data } = await db
    .from("pro_pix_requests")
    .select("id, period_start, period_end")
    .eq("store_id", storeId)
    .eq("status", "approved")
    .gt("period_end", nowIso)
    .order("period_end", { ascending: false })
    .limit(1);

  const row = data?.[0];
  if (!row?.period_end) return null;
  return {
    id: row.id,
    periodStart: row.period_start ?? row.period_end,
    periodEnd: row.period_end,
  };
}

export async function getPixSettings() {
  const db = await admin();
  const { data } = await db
    .from("pix_settings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}
