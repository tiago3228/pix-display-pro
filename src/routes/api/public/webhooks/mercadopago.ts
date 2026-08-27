import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Webhook oficial do Mercado Pago (Assinaturas).
 * URL pública: /api/public/webhooks/mercadopago
 *
 * - Valida a assinatura `x-signature` quando MERCADOPAGO_WEBHOOK_SECRET existir.
 * - É idempotente: cada notificação é registrada em `subscription_events`.
 * - Nunca confia no corpo recebido: sempre reconsulta a API do Mercado Pago.
 */

/** Janela máxima aceita entre o `ts` assinado e o horário de recebimento. */
const REPLAY_WINDOW_SECONDS = 300;

type SignatureResult = "ok" | "invalid" | "missing-secret" | "stale";

function verifySignature(request: Request, dataId: string | null): SignatureResult {
  // Em produção o segredo pode ser específico; cai para o segredo único quando não houver.
  const secret =
    process.env["MERCADOPAGO_PROD_WEBHOOK_SECRET"] || process.env["MERCADOPAGO_WEBHOOK_SECRET"];
  // Sem segredo configurado o webhook NUNCA aceita a requisição.
  if (!secret) return "missing-secret";

  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id") ?? "";
  if (!signature) return "invalid";

  const parts = Object.fromEntries(
    signature.split(",").map((chunk) => {
      const [k, ...rest] = chunk.split("=");
      return [(k ?? "").trim(), rest.join("=").trim()];
    }),
  ) as { ts?: string; v1?: string };
  if (!parts.ts || !parts.v1) return "invalid";

  const manifest = `id:${(dataId ?? "").toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "invalid";

  // Replay protection: o `ts` vem em segundos (ou milissegundos em alguns eventos).
  const raw = Number(parts.ts);
  if (!Number.isFinite(raw)) return "invalid";
  const seconds = raw > 1e12 ? raw / 1000 : raw;
  const drift = Math.abs(Date.now() / 1000 - seconds);
  if (drift > REPLAY_WINDOW_SECONDS) return "stale";

  return "ok";
}

export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        let body: {
          id?: string | number;
          type?: string;
          topic?: string;
          action?: string;
          data?: { id?: string | number };
        } = {};
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          return new Response("invalid payload", { status: 400 });
        }

        const url = new URL(request.url);
        const eventType = body.type ?? body.topic ?? url.searchParams.get("type") ?? "unknown";
        const resourceId = String(
          body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "",
        );

        const signature = verifySignature(request, resourceId || null);
        if (signature !== "ok") {
          console.warn("[mercadopago-webhook] notificação rejeitada", { eventType, signature });
          return new Response("unauthorized", { status: 401 });
        }

        if (!resourceId) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { createHash } = await import("crypto");
        const eventId = String(body.id ?? `${eventType}:${resourceId}:${body.action ?? ""}`);
        const payloadHash = createHash("sha256").update(raw).digest("hex");

        // Idempotência: a constraint única impede o reprocessamento.
        const { error: insertError } = await supabaseAdmin.from("subscription_events").insert({
          provider: "mercadopago",
          event_id: eventId,
          event_type: eventType,
          resource_id: resourceId,
          payload_hash: payloadHash,
        });
        if (insertError) {
          if (insertError.code === "23505") return new Response("ok (duplicate)");
          console.error("[mercadopago-webhook] falha ao registrar evento", insertError.message);
          return new Response("ok");
        }

        try {
          const mp = await import("@/lib/mercadopago.server");
          const svc = await import("@/lib/subscription.server");
          let storeId: string | null = null;

          if (eventType.includes("preapproval_plan")) {
            // Nada a fazer: o plano é gerenciado pelo backend.
          } else if (eventType.includes("authorized_payment")) {
            const authorized = await mp.getAuthorizedPayment(resourceId);
            const preapprovalId = authorized.preapproval_id;
            if (preapprovalId) {
              const remote = await mp.getPreapproval(preapprovalId);
              const synced = await svc.syncFromPreapproval(remote);
              storeId = synced?.storeId ?? null;

              const { data: sub } = await supabaseAdmin
                .from("subscriptions")
                .select("id, store_id")
                .eq("provider_subscription_id", preapprovalId)
                .maybeSingle();

              if (sub) {
                storeId = sub.store_id;
                const paymentStatus = (
                  authorized.payment?.status ??
                  authorized.status ??
                  ""
                ).toLowerCase();
                const approved = paymentStatus === "approved" || authorized.status === "processed";
                await supabaseAdmin.from("subscription_payments").upsert(
                  {
                    store_id: sub.store_id,
                    subscription_id: sub.id,
                    provider: "mercadopago",
                    provider_payment_id: String(authorized.payment?.id ?? authorized.id),
                    amount: Number(authorized.transaction_amount ?? 0),
                    currency: authorized.currency_id ?? "BRL",
                    status: approved ? "approved" : paymentStatus || "pending",
                    external_status: authorized.status ?? null,
                    paid_at: approved
                      ? (authorized.date_created ?? new Date().toISOString())
                      : null,
                    due_at: authorized.debit_date ?? null,
                  },
                  { onConflict: "provider,provider_payment_id" },
                );

                if (approved) {
                  await supabaseAdmin
                    .from("subscriptions")
                    .update({
                      last_payment_at: new Date().toISOString(),
                      past_due_since: null,
                      grace_until: null,
                    })
                    .eq("id", sub.id);
                  await svc.applyPlanToStore(sub.store_id, "active", null);
                } else if (["rejected", "cancelled", "recycling"].includes(paymentStatus)) {
                  await svc.markPastDue(sub.id, sub.store_id);
                }
              }
            }
          } else if (eventType.includes("preapproval")) {
            const remote = await mp.getPreapproval(resourceId);
            const synced = await svc.syncFromPreapproval(remote);
            storeId = synced?.storeId ?? null;
          } else if (eventType === "payment") {
            const payment = await mp.getPayment(resourceId);
            const meta = (payment.metadata ?? {}) as Record<string, unknown>;
            // O Mercado Pago nem sempre propaga external_reference nos pagamentos
            // de assinatura: quando existir, o preapproval_id é a referência confiável.
            const preapprovalId =
              (typeof meta["preapproval_id"] === "string" && meta["preapproval_id"]) ||
              (typeof meta["preapprovalId"] === "string" && meta["preapprovalId"]) ||
              null;

            let sub: { id: string; store_id: string } | null = null;

            if (preapprovalId) {
              const remote = await mp.getPreapproval(preapprovalId);
              await svc.syncFromPreapproval(remote);
              const { data } = await supabaseAdmin
                .from("subscriptions")
                .select("id, store_id")
                .eq("provider_subscription_id", preapprovalId)
                .maybeSingle();
              sub = data ?? null;
            }

            if (!sub && payment.external_reference) {
              const { data } = await supabaseAdmin
                .from("subscriptions")
                .select("id, store_id")
                .eq("external_reference", payment.external_reference)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              sub = data ?? null;
            }

            if (sub) {
              storeId = sub.store_id;
              const approved = payment.status === "approved";
              await supabaseAdmin.from("subscription_payments").upsert(
                {
                  store_id: sub.store_id,
                  subscription_id: sub.id,
                  provider: "mercadopago",
                  provider_payment_id: String(payment.id),
                  amount: Number(payment.transaction_amount ?? 0),
                  currency: payment.currency_id ?? "BRL",
                  status: payment.status ?? "pending",
                  external_status: payment.status_detail ?? null,
                  paid_at: approved ? (payment.date_approved ?? null) : null,
                },
                { onConflict: "provider,provider_payment_id" },
              );
              if (approved) {
                await supabaseAdmin
                  .from("subscriptions")
                  .update({
                    last_payment_at: payment.date_approved ?? new Date().toISOString(),
                    past_due_since: null,
                    grace_until: null,
                  })
                  .eq("id", sub.id);
                await svc.applyPlanToStore(sub.store_id, "active", null);
              } else if (payment.status === "rejected" || payment.status === "cancelled") {
                await svc.markPastDue(sub.id, sub.store_id);
              }
            }
          }

          await supabaseAdmin
            .from("subscription_events")
            .update({
              status: "processed",
              processed_at: new Date().toISOString(),
              store_id: storeId,
            })
            .eq("provider", "mercadopago")
            .eq("event_id", eventId);
        } catch (error) {
          const message = (error as Error).message?.slice(0, 300) ?? "erro desconhecido";
          console.error("[mercadopago-webhook] falha no processamento", { eventType, message });
          await supabaseAdmin
            .from("subscription_events")
            .update({ status: "error", error_message: message })
            .eq("provider", "mercadopago")
            .eq("event_id", eventId);
        }

        return new Response("ok");
      },
    },
  },
});
