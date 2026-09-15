import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPublicClient } from "./supabase-public.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StorefrontVariant = {
  id: string;
  label: string;
  price: number | null;
  stock: number;
  is_available: boolean;
};

export type StorefrontProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  images: string[];
  stock: number;
  track_stock: boolean;
  is_available: boolean;
  is_featured: boolean;
  has_variants: boolean;
  category_id: string | null;
  options: { id: string; name: string; values: string[] }[];
  variants: StorefrontVariant[];
  orderEnabled: boolean;
  orderUnitPrice: number | null;
  orderMinQuantity: number;
  orderMaxQuantity: number | null;
  orderLeadTime: string | null;
  orderNotes: string | null;
  orderProgressivePricing: boolean;
  orderTiers: { minQuantity: number; unitPrice: number }[];
};

export type Storefront = {
  store: {
    id: string;
    slug: string;
    name: string;
    seller_name: string;
    description: string;
    category: string;
    whatsapp: string;
    instagram: string | null;
    logo: string | null;
    banner: string | null;
    primary_color: string;
    welcome_message: string;
    pix_key: string;
    pix_key_type: string;
    accept_pix: boolean;
    allow_installments: boolean;
    max_installments: number;
    min_installment_amount: number;
  };
  categories: { id: string; name: string }[];
  products: StorefrontProduct[];
} | null;

export const getStorefront = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<Storefront> => {
    const supabase = createPublicClient();
    // A leitura pública passa por uma função segura que devolve apenas os
    // campos necessários para a vitrine (sem owner_id nem dados internos).
    const { data: stores } = await supabase.rpc("get_public_store", { _slug: data.slug });
    const store = stores?.[0] ?? null;

    if (!store) return null;

    const [{ data: categories }, { data: products }] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, position")
        .eq("store_id", store.id)
        .order("position"),
      supabase
        .from("products")
        .select(
          "id, name, description, price, image_url, stock, track_stock, is_available, is_featured, has_variants, category_id, position, order_enabled, order_unit_price, order_min_quantity, order_max_quantity, order_lead_time, order_notes, order_progressive_pricing",
        )
        .eq("store_id", store.id)
        .eq("is_hidden", false)
        .order("position"),
    ]);

    const productIds = (products ?? []).map((p) => p.id);
    const { data: gallery } = productIds.length
      ? await supabase
          .from("product_images")
          .select("product_id, image_url, position")
          .in("product_id", productIds)
          .order("position")
      : { data: [] as { product_id: string; image_url: string; position: number }[] };
    const [{ data: options }, { data: variants }, { data: orderTiers }] = await Promise.all([
      productIds.length
        ? supabase
            .from("product_options")
            .select("id, product_id, name, position, product_option_values(id, value, position)")
            .in("product_id", productIds)
            .order("position")
        : Promise.resolve({ data: [] as never[] }),
      productIds.length
        ? supabase
            .from("product_variants")
            .select("id, product_id, label, price, stock, is_available")
            .in("product_id", productIds)
        : Promise.resolve({ data: [] as never[] }),
      productIds.length
        ? supabase
            .from("product_order_tiers")
            .select("product_id, min_quantity, unit_price")
            .in("product_id", productIds)
            .order("min_quantity")
        : Promise.resolve({ data: [] as never[] }),
    ]);

    const paths = [
      store.logo_url,
      store.banner_url,
      ...(products ?? []).map((p) => p.image_url),
      ...(gallery ?? []).map((g) => g.image_url),
    ].filter((p): p is string => Boolean(p) && !p!.startsWith("http"));
    const signed = new Map<string, string>();
    if (paths.length) {
      // A vitrine não deve depender de uma secret administrativa. O bucket
      // possui política de leitura para anon, permitindo URLs assinadas aqui.
      const { data: urls, error: signingError } = await supabase.storage
        .from("store-assets")
        .createSignedUrls(paths, 60 * 60);
      if (signingError) {
        console.error("[storefront] falha ao assinar imagens", {
          bucket: "store-assets",
          count: paths.length,
          message: signingError.message,
        });
      }
      for (const entry of urls ?? []) {
        if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
      }
    }
    const resolve = (p: string | null) =>
      !p ? null : p.startsWith("http") ? p : (signed.get(p) ?? null);

    return {
      store: {
        id: store.id,
        slug: store.slug,
        name: store.name,
        seller_name: store.seller_name,
        description: store.description,
        category: store.category,
        whatsapp: store.whatsapp,
        instagram: store.instagram,
        logo: resolve(store.logo_url),
        banner: resolve(store.banner_url),
        primary_color: store.primary_color,
        welcome_message: store.welcome_message,
        pix_key: store.pix_key,
        pix_key_type: store.pix_key_type,
        accept_pix: store.accept_pix,
        // Parcelamento é um recurso PRO: a própria função do banco já aplica a regra.
        allow_installments: store.allow_installments,

        max_installments: store.max_installments,
        min_installment_amount: Number(store.min_installment_amount),
      },
      categories: (categories ?? []).map((c) => ({ id: c.id, name: c.name })),
      products: (products ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        image: resolve(p.image_url),
        images: (() => {
          const list = (gallery ?? [])
            .filter((g) => g.product_id === p.id)
            .map((g) => resolve(g.image_url))
            .filter((u): u is string => Boolean(u));
          const main = resolve(p.image_url);
          if (main && !list.includes(main)) list.unshift(main);
          return list;
        })(),
        stock: p.stock,
        track_stock: p.track_stock,
        is_available: p.is_available,
        is_featured: p.is_featured,
        has_variants: p.has_variants,
        category_id: p.category_id,
        options: (options ?? [])
          .filter((o) => o.product_id === p.id)
          .map((o) => ({
            id: o.id,
            name: o.name,
            values: (o.product_option_values ?? [])
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((v) => v.value),
          })),
        variants: (variants ?? [])
          .filter((v) => v.product_id === p.id)
          .map((v) => ({
            id: v.id,
            label: v.label,
            price: v.price === null ? null : Number(v.price),
            stock: v.stock,
            is_available: v.is_available,
          })),
        orderEnabled: Boolean(p.order_enabled),
        orderUnitPrice: p.order_unit_price === null ? null : Number(p.order_unit_price),
        orderMinQuantity: Number(p.order_min_quantity ?? 1),
        orderMaxQuantity: p.order_max_quantity === null ? null : Number(p.order_max_quantity),
        orderLeadTime: p.order_lead_time ?? null,
        orderNotes: p.order_notes ?? null,
        orderProgressivePricing: Boolean(p.order_progressive_pricing),
        orderTiers: (orderTiers ?? [])
          .filter((tier) => tier.product_id === p.id)
          .map((tier) => ({
            minQuantity: Number(tier.min_quantity),
            unitPrice: Number(tier.unit_price),
          })),
      })),
    };
  });

const orderSchema = z.object({
  storeId: z.string().uuid(),
  customerName: z.string().max(120).optional().default(""),
  customerWhatsapp: z.string().max(30).optional().default(""),
  note: z.string().max(500).optional().default(""),
  paymentDeclared: z.boolean().default(false),
  paymentMethod: z.enum(["pix_avista", "parcelado"]).default("pix_avista"),
  installments: z.number().int().min(1).max(12).default(1),
  receiptPath: z
    .string()
    .max(300)
    .regex(/^receipts\/[0-9a-f-]{36}\/[0-9a-zA-Z._-]+$/)
    .nullable()
    .optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().nullable().optional(),
        variantLabel: z.string().max(120).nullable().optional(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
});

/** Public endpoint: the buyer has no account, so the order is written server-side. */
export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select(
        "id, is_active, plan, pro_trial_ends_at, allow_installments, max_installments, min_installment_amount",
      )
      .eq("id", data.storeId)
      .maybeSingle();
    if (!store || !store.is_active) throw new Error("Loja indisponível");

    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, name, price, store_id, is_hidden, stock, track_stock, has_variants")
      .in(
        "id",
        data.items.map((i) => i.productId),
      );
    const { data: variants } = await supabaseAdmin
      .from("product_variants")
      .select("id, product_id, label, price, stock")
      .in(
        "id",
        data.items.map((i) => i.variantId).filter((v): v is string => Boolean(v)),
      );

    // Prices always come from the database, never from the browser payload.
    const items = data.items.map((item) => {
      const product = (products ?? []).find(
        (p) => p.id === item.productId && p.store_id === store.id && !p.is_hidden,
      );
      if (!product) throw new Error("Produto inválido");
      const variant = (variants ?? []).find((v) => v.id === item.variantId);
      const unitPrice = Number(variant?.price ?? product.price);
      return {
        product_id: product.id,
        product_name: product.name,
        variant_label: variant?.label ?? item.variantLabel ?? null,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal: Number((unitPrice * item.quantity).toFixed(2)),
      };
    });

    // Baixa de estoque atômica: só desconta quando ainda há unidades suficientes.
    const taken: { table: "products" | "product_variants"; id: string; quantity: number }[] = [];
    const rollback = async () => {
      for (const entry of taken) {
        const { data: row } = await supabaseAdmin
          .from(entry.table)
          .select("stock")
          .eq("id", entry.id)
          .maybeSingle();
        if (row)
          await supabaseAdmin
            .from(entry.table)
            .update({ stock: row.stock + entry.quantity })
            .eq("id", entry.id);
      }
    };

    for (const item of data.items) {
      const product = (products ?? []).find((p) => p.id === item.productId);
      if (!product?.track_stock) continue;
      const variant = (variants ?? []).find((v) => v.id === item.variantId);
      const table = variant ? ("product_variants" as const) : ("products" as const);
      const rowId = variant ? variant.id : product.id;
      const current = variant ? variant.stock : product.stock;
      const { data: updated } = await supabaseAdmin
        .from(table)
        .update({ stock: current - item.quantity })
        .eq("id", rowId)
        .gte("stock", item.quantity)
        .select("id")
        .maybeSingle();
      if (!updated) {
        await rollback();
        throw new Error(`Estoque insuficiente para "${product.name}".`);
      }
      taken.push({ table, id: rowId, quantity: item.quantity });
    }

    const total = Number(items.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2));

    let customerId: string | null = null;
    if (data.customerWhatsapp) {
      const { data: customer } = await supabaseAdmin
        .from("customers")
        .upsert(
          {
            store_id: store.id,
            whatsapp: data.customerWhatsapp,
            name: data.customerName || "",
            last_order_at: new Date().toISOString(),
          },
          { onConflict: "store_id,whatsapp" },
        )
        .select("id, orders_count, total_spent")
        .maybeSingle();
      if (customer) {
        customerId = customer.id;
        await supabaseAdmin
          .from("customers")
          .update({
            orders_count: (customer.orders_count ?? 0) + 1,
            total_spent: Number(customer.total_spent ?? 0) + total,
          })
          .eq("id", customer.id);
      }
    }

    // O parcelamento é validado no servidor contra as regras reais do vendedor.
    const installmentsAllowed =
      (store.plan === "pro" ||
        (store.pro_trial_ends_at !== null &&
          new Date(store.pro_trial_ends_at).getTime() > Date.now())) &&
      store.allow_installments &&
      data.paymentMethod === "parcelado";
    let installmentCount = 1;
    if (installmentsAllowed) {
      const maxByRules = Math.min(store.max_installments, 12);
      const candidate = Math.min(Math.max(data.installments, 1), maxByRules);
      const perInstallment = total / candidate;
      installmentCount =
        candidate > 1 && perInstallment >= Number(store.min_installment_amount) ? candidate : 1;
    }
    const paymentMethod = installmentCount > 1 ? "parcelado" : "pix_avista";

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        store_id: store.id,
        customer_id: customerId,
        customer_name: data.customerName,
        customer_whatsapp: data.customerWhatsapp,
        note: data.note,
        total,
        payment_declared: data.paymentDeclared,
        receipt_path: data.receiptPath ?? null,
        payment_method: paymentMethod,
        installments_count: installmentCount,
        status: data.paymentDeclared ? "pagamento_informado" : "novo",
      })
      .select("id, number")
      .single();
    if (error) {
      await rollback();
      throw new Error(error.message);
    }

    await supabaseAdmin
      .from("order_items")
      .insert(items.map((i) => ({ ...i, order_id: order.id })));

    if (installmentCount > 1) {
      const { splitInstallments, FIRST_DUE_OFFSET_DAYS, INSTALLMENT_INTERVAL_DAYS } =
        await import("./format");
      const values = splitInstallments(total, installmentCount);
      const today = new Date();
      await supabaseAdmin.from("installments").insert(
        values.map((amount, index) => {
          const due = new Date(today);
          // Parcela 1 vence em +30 dias, parcela 2 em +60, e assim por diante.
          due.setDate(due.getDate() + FIRST_DUE_OFFSET_DAYS + index * INSTALLMENT_INTERVAL_DAYS);

          return {
            store_id: store.id,
            order_id: order.id,
            customer_id: customerId,
            installment_number: index + 1,
            total_installments: installmentCount,
            amount,
            due_date: due.toISOString().slice(0, 10),
          };
        }),
      );
      await supabaseAdmin.from("audit_logs").insert({
        store_id: store.id,
        action: "installments_created",
        resource_type: "order",
        resource_id: order.id,
        metadata: { count: installmentCount, total } as never,
      });
    }

    await supabaseAdmin
      .from("store_events")
      .insert({ store_id: store.id, type: "order_submitted" });

    return { orderId: order.id, number: order.number, total };
  });

export const trackStoreEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        storeId: z.string().uuid(),
        type: z.enum(["store_view", "product_view", "add_to_cart", "checkout_started"]),
        productId: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("store_events").insert({
      store_id: data.storeId,
      product_id: data.productId ?? null,
      type: data.type,
    });
    return { ok: true };
  });

const RECEIPT_TYPES = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

/**
 * Comprovante enviado pelo comprador (sem conta). O arquivo é validado e
 * gravado no bucket privado; só o vendedor dono da loja consegue visualizar.
 */
export const uploadOrderReceipt = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        storeId: z.string().uuid(),
        contentType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
        base64: z.string().min(16).max(14_000_000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("id, is_active")
      .eq("id", data.storeId)
      .maybeSingle();
    if (!store || !store.is_active) throw new Error("Loja indisponível");

    const bytes = Buffer.from(data.base64, "base64");
    if (!bytes.length || bytes.length > MAX_RECEIPT_BYTES) {
      throw new Error("Arquivo inválido ou maior que 8 MB.");
    }

    const ext = RECEIPT_TYPES[data.contentType];
    const path = `receipts/${store.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("store-assets")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (error) throw new Error("Não foi possível enviar o comprovante.");

    return { path };
  });

/** O vendedor autenticado obtém um link temporário do comprovante do seu pedido. */
export const getOrderReceiptUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    // RLS garante que o pedido pertence a uma loja do usuário autenticado.
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, receipt_path")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order?.receipt_path) return { url: null };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin.storage
      .from("store-assets")
      .createSignedUrl(order.receipt_path, 60 * 10);
    return { url: signed?.signedUrl ?? null };
  });
