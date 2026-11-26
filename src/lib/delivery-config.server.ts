import { checkPostalDelivery } from "./delivery.server";
import type { ServerSupabaseAdmin } from "./server-supabase.types";

export type AdminDb = Pick<ServerSupabaseAdmin, "from" | "rpc">;

type StoreRecord = { id: string; slug: string; owner_id: string; is_active: boolean };
type IdRecord = { id: string };
type DeliverySettingsRecord = {
  enabled?: boolean | null;
  origin_cep?: string | null;
  radius_km?: number | string | null;
  delivery_fee?: number | string | null;
  updated_at?: string | null;
  delivery_enabled?: boolean | null;
  delivery_origin_cep?: string | null;
  delivery_radius_km?: number | string | null;
};

export type DeliveryConfig = {
  enabled: boolean;
  originCep: string;
  radiusKm: number;
  fee: number;
  updatedAt: string | null;
};

export async function resolveActiveStore(admin: AdminDb, slug: string) {
  const { data, error } = await admin
    .from<StoreRecord>("stores")
    .select("id, slug, owner_id, is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error("Não foi possível validar a loja.");
  return data ?? null;
}

export async function hasStoreProAccess(admin: AdminDb, storeId: string) {
  const { data, error } = await admin.rpc("store_has_pro_access", {
    target_store_id: storeId,
  });
  if (error) throw new Error("Não foi possível validar a disponibilidade Premium.");
  return data === true;
}

function isValidConfig(config: DeliveryConfig) {
  return (
    /^\d{8}$/.test(config.originCep) &&
    Number.isFinite(config.radiusKm) &&
    config.radiusKm > 0 &&
    Number.isFinite(config.fee) &&
    config.fee >= 0
  );
}

/**
 * `legacy` is the safe pre-migration adapter for Pizzeria stores. Switch to
 * `generic` only after store_delivery_settings exists and has passed staging.
 * A generic-mode error/missing row never falls back to stale legacy values.
 */
export async function readCanonicalDeliveryConfig(
  admin: AdminDb,
  storeId: string,
): Promise<DeliveryConfig | null> {
  const source = process.env["DELIVERY_CONFIG_SOURCE"] ?? "legacy";
  if (source === "generic") {
    const { data, error } = await admin
      .from<DeliverySettingsRecord>("store_delivery_settings")
      .select("enabled, origin_cep, radius_km, delivery_fee, updated_at")
      .eq("store_id", storeId)
      .maybeSingle();
    if (error) throw new Error("Configuração de entrega indisponível.");
    if (!data) return null;
    const config: DeliveryConfig = {
      enabled: data.enabled === true,
      originCep: String(data.origin_cep ?? "").replace(/\D/g, ""),
      radiusKm: Number(data.radius_km),
      fee: Number(data.delivery_fee),
      updatedAt: data.updated_at ?? null,
    };
    return isValidConfig(config) ? config : null;
  }
  if (source !== "legacy") throw new Error("Fonte de entrega não configurada.");

  const { data: module, error: moduleError } = await admin
    .from<IdRecord>("store_modules")
    .select("id")
    .eq("store_id", storeId)
    .eq("module", "pizzaria")
    .eq("is_active", true)
    .maybeSingle();
  if (moduleError) throw new Error("Configuração de entrega indisponível.");
  if (!module) return null;

  const { data, error } = await admin
    .from<DeliverySettingsRecord>("pizzeria_settings")
    .select("delivery_enabled, delivery_origin_cep, delivery_radius_km, delivery_fee, updated_at")
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) throw new Error("Configuração de entrega indisponível.");
  if (!data) return null;
  const config: DeliveryConfig = {
    enabled: data.delivery_enabled === true,
    originCep: String(data.delivery_origin_cep ?? "").replace(/\D/g, ""),
    radiusKm: Number(data.delivery_radius_km),
    fee: Number(data.delivery_fee),
    updatedAt: data.updated_at ?? null,
  };
  return isValidConfig(config) ? config : null;
}

export async function quoteForStore(admin: AdminDb, storeId: string, destinationCep: string) {
  const config = await readCanonicalDeliveryConfig(admin, storeId);
  if (!config?.enabled) return { allowed: false as const };
  const result = await checkPostalDelivery(config.originCep, destinationCep, config.radiusKm);
  if (!result.allowed) return { allowed: false as const };
  return {
    allowed: true as const,
    fee: config.fee,
    distanceKm: result.distanceKm,
    settingsUpdatedAt: config.updatedAt,
  };
}
