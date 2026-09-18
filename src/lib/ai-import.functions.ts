import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AI_MAX_PAGES_PER_RUN, MAX_PRODUCT_IMAGES, aiPageLimitFor } from "./ai-import.config";

export type AiImportStatus = {
  hasStore: boolean;
  isPro: boolean;
  used: number;
  limit: number;
  remaining: number;
  period: string;
};

export type AiDuplicate = {
  productId: string;
  productName: string;
  matchedBy: "sku" | "name";
};

export type AiDraftProduct = {
  tempId: string;
  pageIndex: number;
  imagePath: string | null;
  name: string | null;
  price: number | null;
  originalPrice: number | null;
  sku: string | null;
  brand: string | null;
  category: string | null;
  description: string | null;
  variants: string[];
  confidence: "high" | "medium" | "low";
  warnings: string[];
  duplicate: AiDuplicate | null;
};

export type AnalyzeResult = {
  jobId: string | null;
  products: AiDraftProduct[];
  pagesAnalyzed: number;
  pagesFailed: number;
  status: AiImportStatus;
  error?: "limit" | "provider" | "no-store";
};

type AuthContext = { supabase: SupabaseClient; userId: string };

async function storeOf(context: AuthContext) {
  const { data } = await context.supabase
    .from("stores")
    .select("id, plan")
    .eq("owner_id", context.userId)
    .order("created_at", { ascending: true })
    .limit(1);
  return (data?.[0] ?? null) as { id: string; plan: string } | null;
}

async function buildStatus(store: { id: string; plan: string } | null): Promise<AiImportStatus> {
  const { countPagesUsed, currentPeriod, storeIsPro } = await import("./ai-import.server");
  const period = currentPeriod();
  if (!store) {
    return { hasStore: false, isPro: false, used: 0, limit: 0, remaining: 0, period };
  }
  const isPro = await storeIsPro(store.id, store.plan);
  const used = await countPagesUsed(store.id, period);
  const limit = aiPageLimitFor(isPro);
  return {
    hasStore: true,
    isPro,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    period,
  };
}

/** Consumo mensal de páginas de IA da loja do usuário. */
export const getAiImportStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiImportStatus> => {
    return buildStatus(await storeOf(context as never));
  });

const AnalyzeInput = z.object({
  pages: z
    .array(
      z.object({
        dataUrl: z.string().startsWith("data:image/").max(9_000_000),
        imagePath: z.string().max(300).nullable().default(null),
      }),
    )
    .min(1)
    .max(AI_MAX_PAGES_PER_RUN),
});

/** Analisa as páginas enviadas. Cada página consome um crédito apenas quando a IA é chamada. */
export const analyseCatalogPages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => AnalyzeInput.parse(data))
  .handler(async ({ data, context }): Promise<AnalyzeResult> => {
    const ctx = context as unknown as AuthContext;
    const store = await storeOf(ctx);
    let status = await buildStatus(store);
    if (!store) {
      return {
        jobId: null,
        products: [],
        pagesAnalyzed: 0,
        pagesFailed: 0,
        status,
        error: "no-store",
      };
    }
    if (status.remaining <= 0) {
      return {
        jobId: null,
        products: [],
        pagesAnalyzed: 0,
        pagesFailed: 0,
        status,
        error: "limit",
      };
    }

    const { analyzePageImage, currentPeriod } = await import("./ai-import.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const period = currentPeriod();

    const allowed = data.pages.slice(0, Math.min(status.remaining, AI_MAX_PAGES_PER_RUN));

    const { data: job } = await supabaseAdmin
      .from("ai_import_jobs")
      .insert({
        store_id: store.id,
        user_id: ctx.userId,
        plan: status.isPro ? "pro" : "basica",
        pages: 0,
        status: "processing",
      })
      .select("id")
      .single();
    const jobId = (job?.id as string | undefined) ?? null;

    const drafts: AiDraftProduct[] = [];
    let analyzed = 0;
    let failed = 0;

    for (let index = 0; index < allowed.length; index += 1) {
      const page = allowed[index]!;
      const outcome = await analyzePageImage(page.dataUrl);

      if (!outcome.ok) {
        // Falha do provedor não consome crédito do vendedor.
        failed += 1;
        await supabaseAdmin.from("ai_page_usage").insert({
          store_id: store.id,
          user_id: ctx.userId,
          job_id: jobId,
          period,
          status: "failed",
        });
        continue;
      }

      analyzed += 1;
      await supabaseAdmin.from("ai_page_usage").insert({
        store_id: store.id,
        user_id: ctx.userId,
        job_id: jobId,
        period,
        status: "success",
      });

      for (const product of outcome.products) {
        drafts.push({
          tempId: crypto.randomUUID(),
          pageIndex: index,
          imagePath: page.imagePath,
          name: product.name,
          price: product.price,
          originalPrice: product.original_price,
          sku: product.sku,
          brand: product.brand,
          category: product.category,
          description: product.description,
          variants: product.variants,
          confidence: product.confidence,
          warnings: product.warnings,
          duplicate: null,
        });
      }
    }

    // Detecção de duplicados dentro da própria loja (código tem prioridade).
    const { data: existing } = await ctx.supabase
      .from("products")
      .select("id, name, sku")
      .eq("store_id", store.id);

    const bySku = new Map<string, { id: string; name: string }>();
    const byName = new Map<string, { id: string; name: string }>();
    for (const row of (existing ?? []) as { id: string; name: string; sku: string | null }[]) {
      if (row.sku) bySku.set(row.sku.trim().toLowerCase(), { id: row.id, name: row.name });
      byName.set(row.name.trim().toLowerCase(), { id: row.id, name: row.name });
    }
    for (const draft of drafts) {
      const skuHit = draft.sku ? bySku.get(draft.sku.trim().toLowerCase()) : undefined;
      const nameHit = draft.name ? byName.get(draft.name.trim().toLowerCase()) : undefined;
      const hit = skuHit ?? nameHit;
      if (hit) {
        draft.duplicate = {
          productId: hit.id,
          productName: hit.name,
          matchedBy: skuHit ? "sku" : "name",
        };
      }
    }

    if (jobId) {
      await supabaseAdmin
        .from("ai_import_jobs")
        .update({
          pages: analyzed,
          products_found: drafts.length,
          status: analyzed === 0 ? "failed" : "analyzed",
          error_message: analyzed === 0 && failed > 0 ? "Falha do provedor de IA" : null,
        })
        .eq("id", jobId);
    }

    status = await buildStatus(store);
    return {
      jobId,
      products: drafts,
      pagesAnalyzed: analyzed,
      pagesFailed: failed,
      status,
      ...(analyzed === 0 && failed > 0 ? { error: "provider" as const } : {}),
    };
  });

const CreateInput = z.object({
  jobId: z.string().uuid().nullable().default(null),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(160),
        price: z.number().nonnegative().max(9_999_999).default(0),
        originalPrice: z.number().nonnegative().max(9_999_999).nullable().default(null),
        sku: z.string().trim().max(64).nullable().default(null),
        brand: z.string().trim().max(80).nullable().default(null),
        description: z.string().trim().max(600).default(""),
        categoryName: z.string().trim().max(80).nullable().default(null),
        variants: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
        stock: z.number().int().min(0).max(1_000_000).default(0),
        imagePaths: z.array(z.string().max(300)).max(MAX_PRODUCT_IMAGES).default([]),
        mode: z.enum(["create", "update"]).default("create"),
        existingProductId: z.string().uuid().nullable().default(null),
      }),
    )
    .min(1)
    .max(60),
});

export type CreateAiProductsResult = { created: number; updated: number; failed: number };

/** Salva os produtos revisados pelo vendedor usando a estrutura de produtos existente. */
export const createProductsFromAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => CreateInput.parse(data))
  .handler(async ({ data, context }): Promise<CreateAiProductsResult> => {
    const ctx = context as unknown as AuthContext;
    const store = await storeOf(ctx);
    if (!store) throw new Error("Crie sua loja antes de cadastrar produtos.");

    const { data: categoryRows } = await ctx.supabase
      .from("categories")
      .select("id, name")
      .eq("store_id", store.id);
    const categories = new Map<string, string>(
      ((categoryRows ?? []) as { id: string; name: string }[]).map((c) => [
        c.name.trim().toLowerCase(),
        c.id,
      ]),
    );

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const item of data.items) {
      try {
        let categoryId: string | null = null;
        if (item.categoryName) {
          const key = item.categoryName.trim().toLowerCase();
          categoryId = categories.get(key) ?? null;
          if (!categoryId) {
            const { data: newCategory } = await ctx.supabase
              .from("categories")
              .insert({ store_id: store.id, name: item.categoryName.trim() })
              .select("id")
              .single();
            if (newCategory?.id) {
              categoryId = newCategory.id as string;
              categories.set(key, categoryId);
            }
          }
        }

        // Multi-tenancy: só aceita caminhos dentro da pasta privada do próprio usuário.
        const safePaths = item.imagePaths.filter((path) => path.startsWith(`${ctx.userId}/`));

        const payload = {
          store_id: store.id,
          name: item.name,
          description: item.description ?? "",
          price: item.price,
          original_price: item.originalPrice,
          sku: item.sku,
          brand: item.brand,
          stock: item.stock,
          track_stock: true,
          has_variants: item.variants.length > 0,
          category_id: categoryId,
          created_via: "ai",
          image_url: safePaths[0] ?? null,
          updated_at: new Date().toISOString(),
        };

        let productId: string | null = null;
        if (item.mode === "update" && item.existingProductId) {
          const { data: row, error } = await ctx.supabase
            .from("products")
            .update(payload)
            .eq("id", item.existingProductId)
            .eq("store_id", store.id)
            .select("id")
            .single();
          if (error || !row) throw error ?? new Error("update");
          productId = row.id as string;
          updated += 1;
        } else {
          const { data: row, error } = await ctx.supabase
            .from("products")
            .insert(payload)
            .select("id")
            .single();
          if (error || !row) throw error ?? new Error("insert");
          productId = row.id as string;
          created += 1;
        }

        if (item.variants.length && productId) {
          const { data: option } = await ctx.supabase
            .from("product_options")
            .insert({ product_id: productId, name: "Opção" })
            .select("id")
            .single();
          if (option?.id) {
            await ctx.supabase.from("product_option_values").insert(
              item.variants.map((value, position) => ({
                option_id: option.id,
                value,
                position,
              })),
            );
          }
          await ctx.supabase.from("product_variants").insert(
            item.variants.map((label) => ({
              product_id: productId,
              label,
              price: null,
              stock: 0,
            })),
          );
        }

        if (safePaths.length && productId) {
          await ctx.supabase.from("product_images").delete().eq("product_id", productId);
          await ctx.supabase.from("product_images").insert(
            safePaths.slice(0, MAX_PRODUCT_IMAGES).map((path, position) => ({
              product_id: productId,
              store_id: store.id,
              image_url: path,
              position,
            })),
          );
        }
      } catch {
        failed += 1;
      }
    }

    if (data.jobId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("ai_import_jobs")
        .update({ products_created: created + updated, status: "completed" })
        .eq("id", data.jobId)
        .eq("store_id", store.id);
    }

    return { created, updated, failed };
  });

export type AiImportHistoryRow = {
  id: string;
  createdAt: string;
  pages: number;
  productsFound: number;
  productsCreated: number;
  status: string;
};

/** Histórico de importações com IA da loja do usuário. */
export const listAiImports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiImportHistoryRow[]> => {
    const ctx = context as unknown as AuthContext;
    const store = await storeOf(ctx);
    if (!store) return [];
    const { data } = await ctx.supabase
      .from("ai_import_jobs")
      .select("id, created_at, pages, products_found, products_created, status")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(15);
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: row["id"] as string,
      createdAt: row["created_at"] as string,
      pages: Number(row["pages"] ?? 0),
      productsFound: Number(row["products_found"] ?? 0),
      productsCreated: Number(row["products_created"] ?? 0),
      status: row["status"] as string,
    }));
  });
