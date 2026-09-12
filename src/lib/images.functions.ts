import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const pathSchema = z
  .string()
  .min(1)
  .max(500)
  .refine((path) => !path.startsWith("http"), "Caminho inválido");

/** Gera URL temporária sem depender do Storage client do navegador. */
export const getSignedAssetUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ path: pathSchema }).parse(data))
  .handler(async ({ data, context }) => {
    const firstSegment = data.path.split("/")[0];
    if (firstSegment !== context.userId) {
      throw new Error("Você não tem acesso a este arquivo.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("store-assets")
      .createSignedUrl(data.path, 60 * 60);
    if (error || !signed?.signedUrl) {
      console.error("[images] falha ao gerar URL assinada do proprietário", {
        path: data.path,
        message: error?.message ?? "URL ausente",
      });
      throw new Error("Não foi possível carregar a imagem.");
    }
    return { url: signed.signedUrl };
  });
