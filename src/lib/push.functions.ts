import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const subscriptionSchema = z.object({
  storeId: z.string().uuid(),
  subscription: z.object({
    endpoint: z.string().url().max(2000),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({ p256dh: z.string().min(10).max(500), auth: z.string().min(5).max(500) }),
  }),
  userAgent: z.string().max(500).optional(),
});

function b64urlToBytes(value: string) {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
function bytesToB64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Confere se a chave privada pertence à pública: assina com a privada e verifica com a pública.
async function checkVapidPair(publicKey: string, privateKey: string): Promise<boolean> {
  const pub = b64urlToBytes(publicKey);
  if (pub.length !== 65 || pub[0] !== 4) return false;
  const x = bytesToB64url(pub.slice(1, 33));
  const y = bytesToB64url(pub.slice(33, 65));
  const priv = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d: privateKey, ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const pubKey = await crypto.subtle.importKey("raw", pub, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const msg = new TextEncoder().encode("vitrini-vapid-check");
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, priv, msg);
  return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pubKey, sig, msg);
}

export const getPushPublicKey = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const publicKey = process.env["VAPID_PUBLIC_KEY"]?.trim().replace(/^['"]|['"]$/g, "") ?? null;
    const privateKey = process.env["VAPID_PRIVATE_KEY"]?.trim().replace(/^['"]|['"]$/g, "");
    let keyPairValid: boolean | null = null;
    if (publicKey && privateKey) {
      try {
        keyPairValid = await checkVapidPair(publicKey, privateKey);
      } catch (error) {
        console.error("[push] falha ao validar par VAPID", error);
        keyPairValid = false;
      }
    }
    console.info("[push] chave pública solicitada", {
      publicLength: publicKey?.length ?? 0,
      hasPrivate: Boolean(privateKey),
      keyPairValid,
    });
    return { publicKey, keyPairValid };
  });

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => subscriptionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: store } = await context.supabase
      .from("stores")
      .select("id")
      .eq("id", data.storeId)
      .maybeSingle();
    if (!store) throw new Error("Loja não encontrada.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      {
        store_id: data.storeId,
        endpoint: data.subscription.endpoint,
        p256dh: data.subscription.keys.p256dh,
        auth: data.subscription.keys.auth,
        user_agent: data.userAgent ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id,endpoint" },
    );
    if (error) throw new Error(`Não foi possível salvar a assinatura Push: ${error.message}`);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ storeId: z.string().uuid(), endpoint: z.string().url() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: store } = await context.supabase
      .from("stores")
      .select("id")
      .eq("id", data.storeId)
      .maybeSingle();
    if (!store) throw new Error("Loja não encontrada.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("push_subscriptions").delete().eq("store_id", data.storeId).eq("endpoint", data.endpoint);
    return { ok: true };
  });
