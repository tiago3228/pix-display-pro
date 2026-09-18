import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { RevenueEntry } from "./periods";

const rangeSchema = z.object({ from: z.string(), to: z.string() });

const saleSchema = z.object({
  amount: z.number().min(0).max(1000000),
  soldAt: z.string(),
  method: z.string().max(30),
  description: z.string().max(160).optional().default(""),
  note: z.string().max(400).optional().default(""),
  storeId: z.string().uuid().nullable().optional(),
  customerName: z.string().max(120).optional().default(""),
});

/** Faturamento da plataforma: assinaturas por cartão, PRO via Pix e lançamentos manuais. */
export const getAdminRevenue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => rangeSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ entries: RevenueEntry[] }> => {
    const { assertAdmin } = await import("./admin-guard.server");
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [payments, pixRequests, manual, stores] = await Promise.all([
      supabaseAdmin
        .from("subscription_payments")
        .select("id, amount, paid_at, status, store_id")
        .in("status", ["approved", "paid", "accredited"])
        .gte("paid_at", data.from)
        .lte("paid_at", data.to),
      supabaseAdmin
        .from("pro_pix_requests")
        .select("id, amount, approved_at, store_id")
        .eq("status", "approved")
        .gte("approved_at", data.from)
        .lte("approved_at", data.to),
      supabaseAdmin
        .from("platform_sales")
        .select("id, amount, sold_at, method, description, note, store_id")
        .gte("sold_at", data.from)
        .lte("sold_at", data.to),
      supabaseAdmin.from("stores").select("id, name"),
    ]);

    const storeName = new Map((stores.data ?? []).map((s) => [s.id, s.name]));
    const entries: RevenueEntry[] = [
      ...(payments.data ?? []).map((row) => ({
        id: `mp-${row.id}`,
        source: "Assinatura (cartão)",
        label: storeName.get(row.store_id ?? "") ?? "Assinatura Mercado Pago",
        amount: Number(row.amount ?? 0),
        date: (row.paid_at ?? data.from) as string,
        method: "cartao",
        manual: false,
      })),
      ...(pixRequests.data ?? []).map((row) => ({
        id: `pix-${row.id}`,
        source: "PRO via Pix",
        label: storeName.get(row.store_id ?? "") ?? "Assinatura Pix",
        amount: Number(row.amount ?? 0),
        date: (row.approved_at ?? data.from) as string,
        method: "pix",
        manual: false,
      })),
      ...(manual.data ?? []).map((row) => ({
        id: row.id,
        source: "Lançamento manual",
        label:
          row.description ||
          storeName.get(row.store_id ?? "") ||
          row.note ||
          "Venda registrada manualmente",
        amount: Number(row.amount ?? 0),
        date: row.sold_at as string,
        method: row.method,
        manual: true,
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    return { entries };
  });

export const addPlatformSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => saleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin-guard.server");
    await assertAdmin(context.supabase as never, context.userId);
    const { error } = await context.supabase.from("platform_sales").insert({
      amount: data.amount,
      sold_at: data.soldAt,
      method: data.method,
      description: data.description || null,
      note: data.note || null,
      store_id: data.storeId ?? null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePlatformSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin-guard.server");
    await assertAdmin(context.supabase as never, context.userId);
    const { error } = await context.supabase.from("platform_sales").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function ownStore(context: { supabase: never; userId: string }) {
  const supabase = context.supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          col: string,
          v: string,
        ) => { maybeSingle: () => Promise<{ data: { id: string; plan: string } | null }> };
      };
    };
  };
  const { data } = await supabase
    .from("stores")
    .select("id, plan")
    .eq("owner_id", context.userId)
    .maybeSingle();
  if (!data) throw new Error("Crie sua loja antes de acessar o faturamento.");
  return data;
}

/** Faturamento do lojista: pedidos da vitrine + vendas registradas manualmente. */
export const getSellerRevenue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => rangeSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ entries: RevenueEntry[]; plan: string }> => {
    const store = await ownStore(context as never);
    const [orders, manual] = await Promise.all([
      context.supabase
        .from("orders")
        .select("id, number, customer_name, total, status, created_at, payment_method")
        .eq("store_id", store.id)
        .neq("status", "cancelado")
        .gte("created_at", data.from)
        .lte("created_at", data.to),
      context.supabase
        .from("manual_sales")
        .select("id, amount, sold_at, method, description, customer_name, note")
        .eq("store_id", store.id)
        .gte("sold_at", data.from)
        .lte("sold_at", data.to),
    ]);

    const entries: RevenueEntry[] = [
      ...(orders.data ?? []).map((row) => ({
        id: `order-${row.id}`,
        source: "Pedido da vitrine",
        label: `Pedido #${row.number}${row.customer_name ? ` · ${row.customer_name}` : ""}`,
        amount: Number(row.total ?? 0),
        date: row.created_at,
        method: row.payment_method ?? "pix",
        manual: false,
      })),
      ...(manual.data ?? []).map((row) => ({
        id: row.id,
        source: "Venda manual",
        label: row.description || row.customer_name || row.note || "Venda registrada manualmente",
        amount: Number(row.amount ?? 0),
        date: row.sold_at,
        method: row.method ?? "pix",
        manual: true,
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    return { entries, plan: store.plan };
  });

export const addManualSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => saleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const store = await ownStore(context as never);
    if (store.plan !== "pro") throw new Error("Recurso disponível no plano PRO.");
    const { error } = await context.supabase.from("manual_sales").insert({
      store_id: store.id,
      amount: data.amount,
      sold_at: data.soldAt,
      method: data.method,
      description: data.description || null,
      customer_name: data.customerName || null,
      note: data.note || null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteManualSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const store = await ownStore(context as never);
    const { error } = await context.supabase
      .from("manual_sales")
      .delete()
      .eq("id", data.id)
      .eq("store_id", store.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Devolve ao estoque as unidades de um pedido cancelado. */
export const restockOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ orderId: z.string().uuid(), direction: z.enum(["return", "consume"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const store = await ownStore(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, store_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order || order.store_id !== store.id) throw new Error("Pedido não encontrado.");

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_id, variant_label, quantity")
      .eq("order_id", order.id);

    const sign = data.direction === "return" ? 1 : -1;
    for (const item of items ?? []) {
      if (!item.product_id) continue;
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("id, stock, track_stock, has_variants")
        .eq("id", item.product_id)
        .maybeSingle();
      if (!product?.track_stock) continue;
      if (product.has_variants && item.variant_label) {
        const { data: variant } = await supabaseAdmin
          .from("product_variants")
          .select("id, stock")
          .eq("product_id", product.id)
          .eq("label", item.variant_label)
          .maybeSingle();
        if (variant) {
          await supabaseAdmin
            .from("product_variants")
            .update({ stock: Math.max(0, variant.stock + sign * item.quantity) })
            .eq("id", variant.id);
        }
      } else {
        await supabaseAdmin
          .from("products")
          .update({ stock: Math.max(0, product.stock + sign * item.quantity) })
          .eq("id", product.id);
      }
    }
    return { ok: true };
  });
