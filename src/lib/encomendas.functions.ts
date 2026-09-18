import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OrderTier = { minQuantity: number; unitPrice: number };
export type EncomendaStatus =
  "aguardando_confirmacao" | "confirmada" | "em_producao" | "pronta" | "entregue" | "cancelada";

export type EncomendaQuote = {
  unitPrice: number;
  total: number;
  discount: number;
  regularUnitPrice: number;
  tierMinQuantity: number | null;
};

const planStatus = z.enum([
  "aguardando_confirmacao",
  "confirmada",
  "em_producao",
  "pronta",
  "entregue",
  "cancelada",
]);

export function quoteEncomenda(
  quantity: number,
  regularUnitPrice: number,
  orderUnitPrice: number,
  tiers: OrderTier[],
): EncomendaQuote {
  const applicable = tiers
    .filter((tier) => tier.minQuantity <= quantity)
    .sort((a, b) => a.minQuantity - b.minQuantity)
    .at(-1);
  const unitPrice = applicable?.unitPrice ?? orderUnitPrice;
  return {
    unitPrice,
    total: Number((quantity * unitPrice).toFixed(2)),
    discount: Number((quantity * Math.max(regularUnitPrice - unitPrice, 0)).toFixed(2)),
    regularUnitPrice,
    tierMinQuantity: applicable?.minQuantity ?? null,
  };
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const quoteInput = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const getEncomendaQuote = createServerFn({ method: "GET" })
  .validator((data: unknown) => quoteInput.parse(data))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: product, error } = await db
      .from("products")
      .select(
        "id, name, price, order_enabled, order_unit_price, order_min_quantity, order_max_quantity, order_lead_time, order_notes, order_progressive_pricing",
      )
      .eq("id", data.productId)
      .maybeSingle();
    if (error || !product || !product.order_enabled)
      throw new Error("Este produto não está disponível para encomenda.");
    if (data.quantity < product.order_min_quantity)
      throw new Error(`A quantidade mínima é ${product.order_min_quantity} unidades.`);
    if (product.order_max_quantity && data.quantity > product.order_max_quantity)
      throw new Error(`A quantidade máxima é ${product.order_max_quantity} unidades.`);
    const { data: tiers } = await db
      .from("product_order_tiers")
      .select("min_quantity, unit_price")
      .eq("product_id", data.productId)
      .order("min_quantity");
    const quote = quoteEncomenda(
      data.quantity,
      Number(product.price),
      Number(product.order_unit_price),
      product.order_progressive_pricing
        ? (tiers ?? []).map((tier) => ({
            minQuantity: tier.min_quantity,
            unitPrice: Number(tier.unit_price),
          }))
        : [],
    );
    return {
      product: {
        id: product.id,
        name: product.name,
        leadTime: product.order_lead_time,
        notes: product.order_notes,
        minQuantity: product.order_min_quantity,
        maxQuantity: product.order_max_quantity,
        progressive: product.order_progressive_pricing,
      },
      quote,
    };
  });

export const submitEncomenda = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
        customerName: z.string().trim().min(1, "Informe seu nome.").max(120),
        customerWhatsapp: z
          .string()
          .regex(/^\d{2}-\d{4}-\d{4}$/, "WhatsApp inválido. Use o formato 31-9999-9999."),
        customerNote: z.string().max(1000).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: product } = await db
      .from("products")
      .select(
        "id, store_id, name, price, order_enabled, order_unit_price, order_min_quantity, order_max_quantity, order_lead_time, order_progressive_pricing",
      )
      .eq("id", data.productId)
      .maybeSingle();
    if (!product || !product.order_enabled)
      throw new Error("Este produto não está disponível para encomenda.");
    if (data.quantity < product.order_min_quantity)
      throw new Error(`A quantidade mínima é ${product.order_min_quantity} unidades.`);
    if (product.order_max_quantity && data.quantity > product.order_max_quantity)
      throw new Error(`A quantidade máxima é ${product.order_max_quantity} unidades.`);
    const { data: tiers } = await db
      .from("product_order_tiers")
      .select("min_quantity, unit_price")
      .eq("product_id", data.productId)
      .order("min_quantity");
    const quote = quoteEncomenda(
      data.quantity,
      Number(product.price),
      Number(product.order_unit_price),
      product.order_progressive_pricing
        ? (tiers ?? []).map((tier) => ({
            minQuantity: tier.min_quantity,
            unitPrice: Number(tier.unit_price),
          }))
        : [],
    );
    let customerId: string | null = null;
    if (data.customerWhatsapp.trim()) {
      const { data: customer } = await db
        .from("customers")
        .upsert(
          {
            store_id: product.store_id,
            name: data.customerName.trim(),
            whatsapp: data.customerWhatsapp.trim(),
          },
          { onConflict: "store_id,whatsapp" },
        )
        .select("id")
        .maybeSingle();
      customerId = customer?.id ?? null;
    }
    const { data: created, error } = await db
      .from("encomendas")
      .insert({
        store_id: product.store_id,
        product_id: product.id,
        customer_id: customerId,
        customer_name: data.customerName.trim(),
        customer_whatsapp: data.customerWhatsapp.trim(),
        quantity: data.quantity,
        unit_price: quote.unitPrice,
        total: quote.total,
        regular_unit_price: quote.regularUnitPrice,
        discount: quote.discount,
        customer_note: data.customerNote.trim() || null,
        lead_time: product.order_lead_time,
        status: "aguardando_confirmacao",
      })
      .select("id, number, total, status")
      .single();
    if (error || !created) throw new Error("Não foi possível registrar a encomenda agora.");
    return { ...created, productName: product.name, leadTime: product.order_lead_time, quote };
  });

export const getMyEncomendas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: store } = await context.supabase
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!store) return { encomendas: [] };
    const { data } = await context.supabase
      .from("encomendas")
      .select(
        "id, number, customer_name, customer_whatsapp, quantity, unit_price, total, regular_unit_price, discount, customer_note, owner_note, lead_time, status, created_at, updated_at, products(name, image_url)",
      )
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });
    return { encomendas: data ?? [] };
  });

export const updateEncomenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: planStatus,
        ownerNote: z.string().max(1000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: store } = await context.supabase
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!store) throw new Error("Loja não encontrada.");
    const { data: updated, error } = await context.supabase
      .from("encomendas")
      .update({
        status: data.status,
        ...(data.ownerNote === undefined ? {} : { owner_note: data.ownerNote }),
      })
      .eq("id", data.id)
      .eq("store_id", store.id)
      .select("id, status")
      .maybeSingle();
    if (error || !updated) throw new Error("Não foi possível atualizar a encomenda.");
    return updated;
  });
