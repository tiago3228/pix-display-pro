import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  isSafeStoreAssetPath,
  isPremiumSectionKey,
  parsePremiumSection,
  projectPublicSection,
  type JsonValue,
} from "./premium-storefront.schemas";
import type { ServerSupabaseAdmin } from "./server-supabase.types";

// The generic query methods keep new tables typed until the generated schema is refreshed.
type AdminDb = ServerSupabaseAdmin;
type StoreRecord = { id: string; slug: string; owner_id: string; is_active: boolean };
type PremiumSectionRecord = {
  section_key: string;
  enabled: boolean;
  sort_order: number;
  content: JsonValue;
};

const inputSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9-]+$/i),
  })
  .strict();

async function hasProAccess(admin: AdminDb, storeId: string) {
  const { data, error } = await admin.rpc("store_has_pro_access", {
    target_store_id: storeId,
  });
  if (error) throw new Error("Não foi possível validar a disponibilidade Premium.");
  return data === true;
}

async function signStoreAsset(admin: AdminDb, ownerId: string, path: string) {
  if (!isSafeStoreAssetPath(path, ownerId)) return null;
  const { data, error } = await admin.storage.from("store-assets").createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl as string;
}

async function signAssetFields(
  admin: AdminDb,
  ownerId: string,
  value: JsonValue,
): Promise<JsonValue> {
  if (Array.isArray(value)) {
    return Promise.all(value.map((entry) => signAssetFields(admin, ownerId, entry)));
  }
  if (value === null || typeof value !== "object") return value;

  const entries = Object.entries(value);
  const result: Record<string, JsonValue> = {};
  for (const [key, child] of entries) {
    if (key === "image" && typeof child === "string") {
      result[key] = await signStoreAsset(admin, ownerId, child);
    } else {
      result[key] = await signAssetFields(admin, ownerId, child);
    }
  }
  return result;
}

/** Public read endpoint. It accepts a slug only and never returns raw JSONB or private consent. */
export const getPublicPremiumSections = createServerFn({ method: "GET" })
  .validator((value: unknown) => inputSchema.parse(value))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as AdminDb;
    const { data: store, error: storeError } = await admin
      .from<StoreRecord>("stores")
      .select("id, slug, owner_id, is_active")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();

    if (storeError) throw new Error("Não foi possível carregar a vitrine.");
    if (!store || !(await hasProAccess(admin, store.id))) return [];

    const { data: rows, error } = await admin
      .from<PremiumSectionRecord[]>("storefront_sections")
      .select("section_key, enabled, sort_order, content")
      .eq("store_id", store.id)
      .eq("enabled", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error("Não foi possível carregar a vitrine.");

    const publicSections: { key: string; sortOrder: number; content: JsonValue }[] = [];
    for (const row of rows ?? []) {
      if (!isPremiumSectionKey(row.section_key)) continue;
      const validated = parsePremiumSection(row.section_key, row.content);
      if (!validated) {
        // Do not log raw customer/merchant content.
        console.warn("[premium-storefront] seção inválida omitida", {
          storeId: store.id,
          key: row.section_key,
        });
        continue;
      }
      const projected = projectPublicSection(row.section_key, validated);
      if (!projected) continue;
      publicSections.push({
        key: row.section_key,
        sortOrder: Number(row.sort_order),
        content: await signAssetFields(admin, store.owner_id, projected),
      });
    }
    return publicSections;
  });
