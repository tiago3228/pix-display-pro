import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createPublicClient } from "./supabase-public.server";

export const validateDeliveryOrigin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ cep: z.string().regex(/^\d{8}$/) }).parse(data))
  .handler(async ({ data }) => {
    const { postalCoordinates } = await import("./delivery.server");
    await postalCoordinates(data.cep);
    return { ok: true };
  });

export const quoteDelivery = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(1).max(120), cep: z.string().regex(/^\d{8}$/) }).parse(data))
  .handler(async ({ data }) => {
    const db = createPublicClient();
    const { data: stores } = await db.rpc("get_public_store", { _slug: data.slug });
    const store = stores?.[0];
    if (!store) throw new Error("Loja indisponível.");
    const { data: settings, error } = await db.from("pizzeria_settings").select("delivery_enabled, delivery_origin_cep, delivery_radius_km, delivery_fee").eq("store_id", store.id).maybeSingle();
    if (error || !settings?.delivery_enabled) throw new Error("Entrega indisponível nesta loja.");
    const { checkPostalDelivery } = await import("./delivery.server");
    const result = await checkPostalDelivery(settings.delivery_origin_cep, data.cep, Number(settings.delivery_radius_km));
    return { ...result, fee: Number(settings.delivery_fee), radiusKm: Number(settings.delivery_radius_km), cep: data.cep };
  });