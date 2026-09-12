import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const pathSchema = z
  .string()
  .min(1)
  .max(500)
  .refine((path) => !path.startsWith("http"), "Caminho inválido");
const uploadSchema = z.object({
  contentType: z.string().regex(/^image\/(jpeg|png|webp|gif|avif)$/),
  extension: z.string().regex(/^[a-z0-9]{2,5}$/),
  base64: z.string().min(1).max(14_000_000),
});

/** Gera URL temporária sem depender do Storage client do navegador. */
export const getSignedAssetUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ path: pathSchema }).parse(data))
  .handler(async ({ data, context }) => {
    const firstSegment = data.path.split("/")[0];
    if (firstSegment !== context.userId) {
      throw new Error("Você não tem acesso a este arquivo.");
    }
    const { data: signed, error } = await context.supabase.storage
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

/** Envia uma imagem pelo backend, sem depender da política de INSERT no navegador. */
export const uploadAssetServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => uploadSchema.parse(data))
  .handler(async ({ data, context }) => {
    const bytes = Buffer.from(data.base64, "base64");
    if (!bytes.length || bytes.length > 10 * 1024 * 1024) {
      throw new Error("A imagem deve ter no máximo 10 MB.");
    }
    const path = `${context.userId}/${crypto.randomUUID()}.${data.extension}`;
    const { error } = await context.supabase.storage
      .from("store-assets")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (error) {
      console.error("[images] falha no upload server-side", {
        path,
        message: error.message,
      });
      throw new Error(`Não foi possível enviar a imagem: ${error.message}`);
    }
    return { path };
  });
