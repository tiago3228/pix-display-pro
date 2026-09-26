import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPublicClient } from "./supabase-public.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./admin-guard.server";

const DIGITAL_PRODUCT_ASSET_BUCKET = "digital-product-assets";
const imagePath = z.string().trim().max(500).nullable();
const url = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine((value) => /^https?:\/\//i.test(value), "Use um endereço HTTP ou HTTPS.");
const optionalUrl = z.union([url, z.literal("")]).transform((value) => value || null);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const productType = z.enum([
  "software",
  "app",
  "saas",
  "course",
  "service",
  "digital_product",
  "tool",
  "other",
]);
const PRODUCT_TYPE_LABELS: Record<z.infer<typeof productType>, string> = {
  software: "Software",
  app: "Aplicativo",
  saas: "SaaS",
  course: "Curso",
  service: "Serviço digital",
  digital_product: "Produto digital",
  tool: "Ferramenta",
  other: "Personalizado",
};

const productSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(120),
  productType,
  customProductType: z.string().trim().max(80),
  categoryIds: z.array(z.string().uuid()).max(100),
  shortDescription: z.string().trim().max(240),
  description: z.string().trim().max(10000),
  mainImagePath: imagePath,
  logoImagePath: imagePath,
  galleryImagePaths: z.array(z.string().trim().max(500)).max(20),
  bannerImagePath: imagePath,
  shareImagePath: imagePath,
  url,
  contractUrl: optionalUrl,
  demoUrl: optionalUrl,
  supportUrl: optionalUrl,
  ctaLabel: z.string().trim().min(1).max(60),
  contractCtaLabel: z.string().trim().min(1).max(60),
  demoCtaLabel: z.string().trim().min(1).max(60),
  supportCtaLabel: z.string().trim().min(1).max(60),
  bannerTitle: z.string().trim().max(200),
  bannerSubtitle: z.string().trim().max(500),
  primaryColor: hexColor,
  secondaryColor: hexColor,
  backgroundColor: hexColor,
  features: z.array(z.string().trim().min(1).max(240)).max(20),
  benefits: z.array(z.string().trim().min(1).max(240)).max(20),
  plans: z
    .array(
      z.object({
        name: z.string().max(100),
        price: z.string().max(80),
        description: z.string().max(500),
        features: z.array(z.string().max(240)).max(20),
        url: optionalUrl,
      }),
    )
    .max(10),
  faqs: z
    .array(z.object({ question: z.string().min(1).max(240), answer: z.string().min(1).max(3000) }))
    .max(30),
  videoUrl: optionalUrl,
  seoTitle: z.string().trim().max(180),
  seoDescription: z.string().trim().max(320),
  cardClickable: z.boolean(),
  openNewTab: z.boolean(),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(100000),
});

export type DigitalProductView = {
  id: string;
  slug: string;
  name: string;
  product_type: string;
  product_type_label: string;
  short_description: string;
  description: string;
  main_image_url: string | null;
  logo_image_url: string | null;
  gallery_image_urls: string[];
  banner_image_url: string | null;
  share_image_url: string | null;
  url: string;
  contract_url: string | null;
  demo_url: string | null;
  support_url: string | null;
  cta_label: string;
  contract_cta_label: string;
  demo_cta_label: string;
  support_cta_label: string;
  banner_title: string | null;
  banner_subtitle: string | null;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  features: string[];
  benefits: string[];
  plans: Array<{
    name: string;
    price: string;
    description: string;
    features: string[];
    url: string | null;
  }>;
  faqs: Array<{ question: string; answer: string }>;
  video_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  card_clickable: boolean;
  open_new_tab: boolean;
  is_featured: boolean;
  sort_order: number;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  category_ids: string[];
  category_names: string[];
  category_slugs: string[];
};

function publicImage(client: ReturnType<typeof createPublicClient>, path: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return (
    client.storage.from(DIGITAL_PRODUCT_ASSET_BUCKET).getPublicUrl(path).data.publicUrl || null
  );
}

function mapProduct(
  row: Record<string, unknown>,
  categories: Array<Record<string, unknown>>,
): Omit<
  DigitalProductView,
  | "main_image_url"
  | "logo_image_url"
  | "gallery_image_urls"
  | "banner_image_url"
  | "share_image_url"
> & {
  main_image_path: string | null;
  logo_image_path: string | null;
  gallery_image_paths: string[];
  banner_image_path: string | null;
  share_image_path: string | null;
} {
  const type = String(row["product_type"]);
  const customType = String(row["custom_type_label"] ?? "").trim();
  const categoryIds =
    ((row["category_ids"] as string[] | null) ?? []).length > 0
      ? (row["category_ids"] as string[])
      : row["category_id"]
        ? [String(row["category_id"])]
        : [];
  const selectedCategories = categoryIds
    .map((id) => categories.find((category) => category["id"] === id))
    .filter((category): category is Record<string, unknown> => Boolean(category));
  return {
    id: String(row["id"]),
    slug: String(row["slug"]),
    name: String(row["name"]),
    product_type: type,
    product_type_label:
      type === "other" && customType
        ? customType
        : (PRODUCT_TYPE_LABELS[type as keyof typeof PRODUCT_TYPE_LABELS] ?? "Produto digital"),
    short_description: String(row["short_description"] ?? ""),
    description: String(row["description"] ?? ""),
    main_image_path: (row["main_image_path"] as string | null) ?? null,
    logo_image_path: (row["logo_image_path"] as string | null) ?? null,
    gallery_image_paths: (row["gallery_image_paths"] as string[] | null) ?? [],
    banner_image_path: (row["banner_image_path"] as string | null) ?? null,
    share_image_path: (row["share_image_path"] as string | null) ?? null,
    url: String(row["url"]),
    contract_url: (row["contract_url"] as string | null) ?? null,
    demo_url: (row["demo_url"] as string | null) ?? null,
    support_url: (row["support_url"] as string | null) ?? null,
    cta_label: String(row["cta_label"] ?? "Conhecer software"),
    contract_cta_label: String(row["contract_cta_label"] ?? "Assinar"),
    demo_cta_label: String(row["demo_cta_label"] ?? "Ver demonstração"),
    support_cta_label: String(row["support_cta_label"] ?? "Suporte"),
    banner_title: (row["banner_title"] as string | null) ?? null,
    banner_subtitle: (row["banner_subtitle"] as string | null) ?? null,
    primary_color: String(row["primary_color"] ?? "#2563EB"),
    secondary_color: String(row["secondary_color"] ?? "#0F172A"),
    background_color: String(row["background_color"] ?? "#FFFFFF"),
    features: (row["features"] as string[] | null) ?? [],
    benefits: (row["benefits"] as string[] | null) ?? [],
    plans: (row["plans"] as DigitalProductView["plans"] | null) ?? [],
    faqs: (row["faqs"] as DigitalProductView["faqs"] | null) ?? [],
    video_url: (row["video_url"] as string | null) ?? null,
    seo_title: (row["seo_title"] as string | null) ?? null,
    seo_description: (row["seo_description"] as string | null) ?? null,
    card_clickable: Boolean(row["card_clickable"]),
    open_new_tab: row["open_new_tab"] !== false,
    is_featured: Boolean(row["is_featured"]),
    sort_order: Number(row["sort_order"] ?? 0),
    category_id: categoryIds[0] ?? null,
    category_name: (selectedCategories[0]?.["name"] as string | undefined) ?? null,
    category_slug: (selectedCategories[0]?.["slug"] as string | undefined) ?? null,
    category_ids: categoryIds,
    category_names: selectedCategories.map((category) => String(category["name"])),
    category_slugs: selectedCategories.map((category) => String(category["slug"])),
  };
}

async function toPublicProduct(
  client: ReturnType<typeof createPublicClient>,
  row: Record<string, unknown>,
  categories: Array<Record<string, unknown>>,
): Promise<DigitalProductView> {
  const product = mapProduct(row, categories);
  const [main, logo, banner, share, ...gallery] = [
    publicImage(client, product.main_image_path),
    publicImage(client, product.logo_image_path),
    publicImage(client, product.banner_image_path),
    publicImage(client, product.share_image_path),
    ...product.gallery_image_paths.map((path) => publicImage(client, path)),
  ];
  return {
    ...product,
    main_image_url: main,
    logo_image_url: logo,
    banner_image_url: banner,
    share_image_url: share,
    gallery_image_urls: gallery.filter((image): image is string => Boolean(image)),
  };
}

export const listPublicDigitalProducts = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ categorySlug: z.string().max(100).optional() }).parse(data),
  )
  .handler(async ({ data }) => {
    const client = createPublicClient();
    const [{ data: rows, error }, { data: categories, error: categoryError }] = await Promise.all([
      client
        .from("digital_products")
        .select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      client.from("digital_product_categories").select("id, name, slug").eq("is_active", true),
    ]);
    if (error || categoryError) throw new Error("Não foi possível carregar os produtos digitais.");
    const visibleRows = (rows ?? []).filter((row) => {
      if (!data.categorySlug) return true;
      const categoryIds =
        ((row.category_ids as string[] | null) ?? []).length > 0
          ? (row.category_ids as string[])
          : row.category_id
            ? [row.category_id]
            : [];
      return categoryIds.some((id) =>
        (categories ?? []).some(
          (category) => category.id === id && category.slug === data.categorySlug,
        ),
      );
    });
    return Promise.all(
      visibleRows.map((row) =>
        toPublicProduct(
          client,
          row as unknown as Record<string, unknown>,
          (categories ?? []) as unknown as Array<Record<string, unknown>>,
        ),
      ),
    );
  });

export const getPublicDigitalProduct = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ slug: z.string().min(1).max(100) }).parse(data))
  .handler(async ({ data }) => {
    const client = createPublicClient();
    const [{ data: row, error }, { data: categories, error: categoryError }] = await Promise.all([
      client
        .from("digital_products")
        .select("*")
        .eq("slug", data.slug)
        .eq("is_active", true)
        .maybeSingle(),
      client.from("digital_product_categories").select("id, name, slug").eq("is_active", true),
    ]);
    if (error || categoryError || !row) return null;
    return toPublicProduct(
      client,
      row as unknown as Record<string, unknown>,
      (categories ?? []) as unknown as Array<Record<string, unknown>>,
    );
  });

export const listDigitalProductCategories = createServerFn({ method: "GET" }).handler(async () => {
  const client = createPublicClient();
  const { data, error } = await client
    .from("digital_product_categories")
    .select("id, name, slug, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error("Não foi possível carregar as categorias.");
  return data ?? [];
});

export const getDigitalProductAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const [{ data: products, error: productError }, { data: categories, error: categoryError }] =
      await Promise.all([
        context.supabase
          .from("digital_products")
          .select("*, digital_product_categories(name, slug)")
          .order("sort_order")
          .order("name"),
        context.supabase
          .from("digital_product_categories")
          .select("id, name, slug, sort_order, is_active")
          .order("sort_order"),
      ]);
    if (productError || categoryError)
      throw new Error("Não foi possível carregar os dados do catálogo.");
    return { products: products ?? [], categories: categories ?? [] };
  });

export const saveDigitalProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => productSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const row = {
      slug: data.slug,
      name: data.name,
      product_type: data.productType,
      custom_type_label: data.productType === "other" ? data.customProductType || null : null,
      category_ids: data.categoryIds,
      category_id: data.categoryIds[0] ?? null,
      short_description: data.shortDescription,
      description: data.description,
      main_image_path: data.mainImagePath,
      logo_image_path: data.logoImagePath,
      gallery_image_paths: data.galleryImagePaths,
      banner_image_path: data.bannerImagePath,
      share_image_path: data.shareImagePath,
      url: data.url,
      contract_url: data.contractUrl,
      demo_url: data.demoUrl,
      support_url: data.supportUrl,
      cta_label: data.ctaLabel,
      contract_cta_label: data.contractCtaLabel,
      demo_cta_label: data.demoCtaLabel,
      support_cta_label: data.supportCtaLabel,
      banner_title: data.bannerTitle || null,
      banner_subtitle: data.bannerSubtitle || null,
      primary_color: data.primaryColor,
      secondary_color: data.secondaryColor,
      background_color: data.backgroundColor,
      features: data.features,
      benefits: data.benefits,
      plans: data.plans,
      faqs: data.faqs,
      video_url: data.videoUrl,
      seo_title: data.seoTitle || null,
      seo_description: data.seoDescription || null,
      card_clickable: data.cardClickable,
      open_new_tab: data.openNewTab,
      is_featured: data.isFeatured,
      is_active: data.isActive,
      sort_order: data.sortOrder,
      updated_by: context.userId,
    };
    const { data: saved, error } = data.id
      ? await context.supabase
          .from("digital_products")
          .update(row)
          .eq("id", data.id)
          .select("id, slug")
          .single()
      : await context.supabase
          .from("digital_products")
          .insert({ ...row, created_by: context.userId })
          .select("id, slug")
          .single();
    if (error)
      throw new Error(
        error.code === "23505" ? "Este endereço público já está em uso." : error.message,
      );
    return saved;
  });

export const saveDigitalProductCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(80),
        slug: z
          .string()
          .trim()
          .min(1)
          .max(100)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        isActive: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { id, isActive, ...fields } = data;
    const { data: category, error } = id
      ? await context.supabase
          .from("digital_product_categories")
          .update({ ...fields, ...(isActive === undefined ? {} : { is_active: isActive }) })
          .eq("id", id)
          .select("id, name, slug, sort_order, is_active")
          .single()
      : await context.supabase
          .from("digital_product_categories")
          .insert(fields)
          .select("id, name, slug, sort_order, is_active")
          .single();
    if (error)
      throw new Error(error.code === "23505" ? "Essa categoria já existe." : error.message);
    return category;
  });

export const updateDigitalProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        changes: z.object({
          is_active: z.boolean().optional(),
          is_featured: z.boolean().optional(),
          sort_order: z.number().int().min(0).max(100000).optional(),
        }),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const changes: {
      is_active?: boolean;
      is_featured?: boolean;
      sort_order?: number;
      updated_by: string;
    } = { updated_by: context.userId };
    if (data.changes.is_active !== undefined) changes.is_active = data.changes.is_active;
    if (data.changes.is_featured !== undefined) changes.is_featured = data.changes.is_featured;
    if (data.changes.sort_order !== undefined) changes.sort_order = data.changes.sort_order;
    const { error } = await context.supabase
      .from("digital_products")
      .update(changes)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDigitalProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { error } = await context.supabase.from("digital_products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
