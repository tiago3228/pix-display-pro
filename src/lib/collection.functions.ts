import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type CollectionView = {
  storeName: string;
  storeSlug: string;
  sellerName: string;
  whatsapp: string;
  primaryColor: string;
  pixKey: string;
  pixKeyType: string;
  productName: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string;
  status: string;
  paidAt: string | null;
  customerName: string;
} | null;

/**
 * Página pública de cobrança: a leitura é feita pelo backend a partir de um
 * token aleatório. Nenhum ID interno é exposto na URL nem na resposta.
 */
export const getCollection = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ token: z.string().min(16).max(120) }).parse(data),
  )
  .handler(async ({ data }): Promise<CollectionView> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: installment } = await supabaseAdmin
      .from("installments")
      .select(
        "installment_number, total_installments, amount, due_date, status, paid_at, store_id, order_id",
      )
      .eq("public_token", data.token)
      .maybeSingle();
    if (!installment) return null;

    const [{ data: store }, { data: order }, { data: items }] = await Promise.all([
      supabaseAdmin
        .from("stores")
        .select("name, slug, seller_name, whatsapp, primary_color, pix_key, pix_key_type, is_active")
        .eq("id", installment.store_id)
        .maybeSingle(),
      supabaseAdmin
        .from("orders")
        .select("customer_name")
        .eq("id", installment.order_id)
        .maybeSingle(),
      supabaseAdmin
        .from("order_items")
        .select("product_name, variant_label, quantity")
        .eq("order_id", installment.order_id),
    ]);

    if (!store || !store.is_active) return null;

    const productName = (items ?? [])
      .map((i) => `${i.quantity}x ${i.product_name}${i.variant_label ? ` (${i.variant_label})` : ""}`)
      .join(", ");

    return {
      storeName: store.name,
      storeSlug: store.slug,
      sellerName: store.seller_name,
      whatsapp: store.whatsapp,
      primaryColor: store.primary_color,
      pixKey: store.pix_key,
      pixKeyType: store.pix_key_type,
      productName: productName || "Pedido",
      installmentNumber: installment.installment_number,
      totalInstallments: installment.total_installments,
      amount: Number(installment.amount),
      dueDate: installment.due_date,
      status: installment.status,
      paidAt: installment.paid_at,
      customerName: order?.customer_name ?? "",
    };
  });
