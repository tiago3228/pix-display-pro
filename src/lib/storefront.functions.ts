import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPublicClient } from "./supabase-public.server";

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
  stock: number;
  track_stock: boolean;
  is_available: boolean;
  is_featured: boolean;
  has_variants: boolean;
  category_id: string | null;
  options: { id: string; name: string; values: string[] }[];
  variants: StorefrontVariant[];
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
  };
  categories: { id: string; name: string }[];
  products: StorefrontProduct[];
} | null;

export const getStorefront = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<Storefront> => {
    const supabase = createPublicClient();
    const { data: store } = await supabase
      .from("stores")
      .select(
        "id, slug, name, seller_name, description, category, whatsapp, instagram, logo_url, banner_url, primary_color, welcome_message, pix_key, pix_key_type",
      )
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();

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
          "id, name, description, price, image_url, stock, track_stock, is_available, is_featured, has_variants, category_id, position",
        )
        .eq("store_id", store.id)
        .eq("is_hidden", false)
        .order("position"),
    ]);

    const productIds = (products ?? []).map((p) => p.id);
    const [{ data: options }, { data: variants }] = await Promise.all([
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
    ]);

    const paths = [store.logo_url, store.banner_url, ...(products ?? []).map((p) => p.image_url)]
      .filter((p): p is string => Boolean(p) && !p!.startsWith("http"));
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data: urls } = await supabase.storage
        .from("store-assets")
        .createSignedUrls(paths, 60 * 60);
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
      },
      categories: (categories ?? []).map((c) => ({ id: c.id, name: c.name })),
      products: (products ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        image: resolve(p.image_url),
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
      })),
    };
  });

const orderSchema = z.object({
  storeId: z.string().uuid(),
  customerName: z.string().max(120).optional().default(""),
  customerWhatsapp: z.string().max(30).optional().default(""),
  note: z.string().max(500).optional().default(""),
  paymentDeclared: z.boolean().default(false),
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
      .select("id, is_active")
      .eq("id", data.storeId)
      .maybeSingle();
    if (!store || !store.is_active) throw new Error("Loja indisponível");

    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, name, price, store_id, is_hidden")
      .in(
        "id",
        data.items.map((i) => i.productId),
      );
    const { data: variants } = await supabaseAdmin
      .from("product_variants")
      .select("id, product_id, label, price")
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
        status: data.paymentDeclared ? "pagamento_informado" : "novo",
      })
      .select("id, number")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("order_items")
      .insert(items.map((i) => ({ ...i, order_id: order.id })));

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
