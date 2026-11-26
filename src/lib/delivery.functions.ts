import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasStoreProAccess, quoteForStore, resolveActiveStore } from "./delivery-config.server";
import { projectDeliveryQuote } from "./delivery-contract";

const cepSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .pipe(z.string().regex(/^\d{8}$/, "Informe um CEP válido com 8 dígitos."));

export const validateDeliveryOrigin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ cep: cepSchema }).strict().parse(data))
  .handler(async ({ data }) => {
    const { postalCoordinates } = await import("./delivery.server");
    await postalCoordinates(data.cep);
    return { ok: true };
  });

/** Public quote API. Private origin/radius/distance never leave the server. */
export const quoteDelivery = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        slug: z
          .string()
          .trim()
          .min(1)
          .max(120)
          .regex(/^[a-z0-9-]+$/i),
        cep: cepSchema,
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as import("./delivery-config.server").AdminDb;
    const store = await resolveActiveStore(admin, data.slug);
    if (!store || !(await hasStoreProAccess(admin, store.id))) return { allowed: false };

    try {
      const quote = await quoteForStore(admin, store.id, data.cep);
      return projectDeliveryQuote(quote);
    } catch (error) {
      console.warn("[delivery] cotação indisponível", {
        storeId: store.id,
        reason: error instanceof Error ? error.name : "unknown",
      });
      throw new Error("Não foi possível verificar a entrega agora. Tente novamente.");
    }
  });
