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
