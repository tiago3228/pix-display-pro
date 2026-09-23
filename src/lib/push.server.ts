type PushSubscriptionRow = { id: string; endpoint: string; p256dh: string; auth: string };

export async function notifyStoreOfNewOrder(input: {
  storeId: string;
  orderNumber: number;
  total: number;
}) {
  const vapidPublicKey = process.env["VAPID_PUBLIC_KEY"];
  const vapidPrivateKey = process.env["VAPID_PRIVATE_KEY"];
  const vapidSubject = process.env["VAPID_SUBJECT"] ?? "mailto:suporte@vitrini.app";
  if (!vapidPublicKey || !vapidPrivateKey) return;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: subscriptions } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("store_id", input.storeId);
  if (!subscriptions?.length) return;

  const webpush = await import("web-push");
  webpush.default?.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  if (webpush.setVapidDetails) webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const payload = JSON.stringify({
    title: "Novo pedido recebido",
    body: `Pedido #${input.orderNumber} · R$ ${input.total.toFixed(2).replace(".", ",")}`,
    url: "/pedidos",
  });

  await Promise.all(
    (subscriptions as PushSubscriptionRow[]).map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          payload,
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", row.id);
        }
      }
    }),
  );
}
