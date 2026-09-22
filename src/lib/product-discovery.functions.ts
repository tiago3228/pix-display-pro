import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AuthContext = { supabase: SupabaseClient; userId: string };
export type DiscoveryResult = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  description: string | null;
  image: string | null;
  sourceName: string;
  sourceUrl: string | null;
  characteristics: string[];
  priceReference: number | null;
};

const SearchInput = z.object({ query: z.string().trim().min(2).max(180) });
const ProviderResult = z.object({
  id: z.string().optional(),
  name: z.string(),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  image: z.string().url().nullable().optional(),
  sourceName: z.string().default("Fonte externa"),
  sourceUrl: z.string().url().nullable().optional(),
  characteristics: z.array(z.string()).default([]),
  priceReference: z.number().nullable().optional(),
});

async function configuredProvider(query: string): Promise<DiscoveryResult[]> {
  const endpoint = process.env['PRODUCT_DISCOVERY_PROVIDER_URL'];
  if (!endpoint) return [];
  try {
    const response = await fetch(
      `${endpoint.replace(/\/$/, "")}/search?q=${encodeURIComponent(query)}`,
      { headers: { accept: "application/json" } },
    );
    if (!response.ok) return [];
    const parsed = z.array(ProviderResult).safeParse(await response.json());
    if (!parsed.success) return [];
    return parsed.data.map((item, index) => ({
      id: item.id ?? `provider-${index}`,
      name: item.name,
      brand: item.brand ?? null,
      model: item.model ?? null,
      category: item.category ?? null,
      description: item.description ?? null,
      image: item.image ?? null,
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl ?? null,
      characteristics: item.characteristics,
      priceReference: item.priceReference ?? null,
    }));
  } catch {
    return [];
  }
}

export const searchProductDiscovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => SearchInput.parse(data))
  .handler(async ({ data, context }): Promise<{ results: DiscoveryResult[]; provider: string }> => {
    const ctx = context as unknown as AuthContext;
    const external = await configuredProvider(data.query);
    if (external.length) return { results: external.slice(0, 8), provider: "provider-configurado" };
    const store = await ctx.supabase
      .from("stores")
      .select("id")
      .eq("owner_id", ctx.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!store.data?.id) return { results: [], provider: "catalogo-local" };
    const terms = data.query
      .split(/\s+/)
      .filter((term) => term.length > 2)
      .slice(0, 5);
    const models = await ctx.supabase
      .from("shoe_models")
      .select("id,name,brand_id,shoe_brands(name)")
      .eq("store_id", store.data.id)
      .eq("is_active", true)
      .limit(80);
    const normalized = data.query.toLocaleLowerCase("pt-BR");
    const matched = (models.data ?? [])
      .filter((item) => {
        const brand = (item.shoe_brands as { name?: string } | null)?.name ?? "";
        const haystack = `${brand} ${item.name}`.toLocaleLowerCase("pt-BR");
        return (
          terms.some((term) => haystack.includes(term.toLocaleLowerCase("pt-BR"))) ||
          normalized.includes(haystack)
        );
      })
      .slice(0, 8);
    return {
      provider: "catalogo-local",
      results: matched.map((item) => {
        const brand = (item.shoe_brands as { name?: string } | null)?.name ?? null;
        return {
          id: item.id,
          name: `${brand ? `${brand} ` : ""}${item.name}`,
          brand,
          model: item.name,
          category: "Tênis",
          description: null,
          image: null,
          sourceName: "Catálogo da sua loja",
          sourceUrl: null,
          characteristics: ["Sugestão baseada no catálogo cadastrado"],
          priceReference: null,
        };
      }),
    };
  });
