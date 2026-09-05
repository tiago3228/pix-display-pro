import { supabase } from "@/integrations/supabase/client";

export const ASSET_BUCKET = "store-assets";

const cache = new Map<string, string>();

/** Storage paths are private; resolve them to temporary signed URLs. */
export async function resolveAsset(path?: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (cache.has(path)) return cache.get(path)!;
  const { data } = await supabase.storage.from(ASSET_BUCKET).createSignedUrl(path, 60 * 60);
  if (!data?.signedUrl) return null;
  cache.set(path, data.signedUrl);
  return data.signedUrl;
}

export async function uploadAsset(userId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(ASSET_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
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

/** Envia uma página de catálogo para a pasta privada da loja. */
export async function uploadAiPage(storeId: string, blob: Blob) {
  const path = `${storeId}/ai-imports/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(ASSET_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}
