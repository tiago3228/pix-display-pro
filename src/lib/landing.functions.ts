import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPublicClient } from "./supabase-public.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_BANNER, type LandingBanner } from "./landing.server";

export type { LandingBanner } from "./landing.server";

export const getLandingBanner = createServerFn({ method: "GET" }).handler(async (): Promise<LandingBanner> => {
  const supabase = createPublicClient();
  const { data } = await supabase.from("landing_settings").select("badge, title, subtitle, cta_label, cta_href, image_url").limit(1).maybeSingle();
  const row = (data as Record<string, string | null> | null) ?? null;
  let image = row?.["image_url"] ?? null;
  if (image && !image.startsWith("http")) {
    const { data: signed } = await supabase.storage.from("store-assets").createSignedUrl(image, 60 * 60);
    image = signed?.signedUrl ?? null;
  }
  return { badge: row?.["badge"] || DEFAULT_BANNER.badge, title: row?.["title"] || DEFAULT_BANNER.title, subtitle: row?.["subtitle"] || DEFAULT_BANNER.subtitle, ctaLabel: row?.["cta_label"] || DEFAULT_BANNER.ctaLabel, ctaHref: row?.["cta_href"] || DEFAULT_BANNER.ctaHref, image };
});

export const getLandingBannerRaw = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { assertAdmin } = await import("./admin-guard.server");
  await assertAdmin(context.supabase as never, context.userId);
  const { data } = await context.supabase.from("landing_settings").select("badge, title, subtitle, cta_label, cta_href, image_url").limit(1).maybeSingle();
  const row = (data as Record<string, string | null> | null) ?? null;
  return { badge: row?.["badge"] ?? "", title: row?.["title"] ?? "", subtitle: row?.["subtitle"] ?? "", ctaLabel: row?.["cta_label"] ?? "", ctaHref: row?.["cta_href"] ?? "", imagePath: row?.["image_url"] ?? null };
});

const bannerSchema = z.object({ badge: z.string().max(120), title: z.string().max(200), subtitle: z.string().max(400), ctaLabel: z.string().max(60), ctaHref: z.string().max(200), imagePath: z.string().max(300).nullable() });

export const saveLandingBanner = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => bannerSchema.parse(data)).handler(async ({ data, context }) => {
  const { assertAdmin } = await import("./admin-guard.server");
  await assertAdmin(context.supabase as never, context.userId);
  const { error } = await context.supabase.from("landing_settings").update({ badge: data.badge || null, title: data.title || null, subtitle: data.subtitle || null, cta_label: data.ctaLabel || null, cta_href: data.ctaHref || null, image_url: data.imagePath, updated_by: context.userId }).eq("singleton", true);
  if (error) throw new Error(error.message);
  return { ok: true };
});
