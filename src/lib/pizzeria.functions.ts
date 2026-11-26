import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({ storeId: z.string().uuid() }).strict();

/**
 * O RPC legado permanece disponível no banco até a revisão do SQL. A aplicação
 * não o chama mais diretamente: o servidor confirma a propriedade antes de
 * encaminhar a chamada privilegiada.
 */
export const seedPizzeriaCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: store, error: storeError } = await context.supabase
      .from("stores")
      .select("id")
      .eq("id", data.storeId)
      .eq("owner_id", context.userId)
      .maybeSingle();

    if (storeError || !store) throw new Error("Loja não encontrada ou sem permissão.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("seed_pizzeria_catalog", {
      target_store_id: store.id,
    });
    if (error) throw new Error("Não foi possível preparar o catálogo da pizzaria.");
    return { ok: true };
  });
