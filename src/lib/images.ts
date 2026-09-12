import { supabase } from "@/integrations/supabase/client";

export const ASSET_BUCKET = "store-assets";

const cache = new Map<string, string>();

/** Storage paths are private; resolve them to temporary signed URLs. */
export async function resolveAsset(path?: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (cache.has(path)) return cache.get(path)!;
  const { data, error } = await supabase.storage.from(ASSET_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) {
    console.error("[images] falha ao gerar URL assinada", {
      bucket: ASSET_BUCKET,
      path,
      message: error.message,
    });
    return null;
  }
  if (!data?.signedUrl) return null;
  cache.set(path, data.signedUrl);
  return data.signedUrl;
}

export async function uploadAsset(userId: string, file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem válido.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("A imagem deve ter no máximo 10 MB.");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(ASSET_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) {
    console.error("[images] falha no upload", {
      bucket: ASSET_BUCKET,
      path,
      type: file.type,
      size: file.size,
      message: error.message,
    });
    throw error;
  }
  return path;
}

/**
 * Reduz e comprime a imagem no navegador antes de enviar para análise,
 * preservando qualidade suficiente para leitura e removendo metadados.
 */
export async function compressImage(
  file: File,
  maxSide: number,
  quality: number,
): Promise<{ dataUrl: string; blob: Blob }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", quality),
  );
  return { dataUrl, blob };
}

/** Envia uma página de catálogo para a pasta privada do vendedor. */
export async function uploadAiPage(userId: string, blob: Blob) {
  const path = `${userId}/ai-imports/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(ASSET_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}
