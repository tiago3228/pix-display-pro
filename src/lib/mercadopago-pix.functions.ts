import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PixPlanKey = "basica" | "pro";

export type MercadoPagoPixPaymentView = {
  id: string;
  plan: PixPlanKey;
  amount: number;
  status: string;
  statusDetail: string | null;
  providerPaymentId: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type MercadoPagoPixCheckout = {
  payment: MercadoPagoPixPaymentView;
  reused: boolean;
};

const planInput = (data: unknown) =>
  z.object({ plan: z.enum(["basica", "pro"]).default("pro") }).parse(data ?? {});

function mapPayment(row: Record<string, unknown>): MercadoPagoPixPaymentView {
  return {
    id: row["id"] as string,
    plan: row["plan"] === "basica" ? "basica" : "pro",
    amount: Number(row["amount"] ?? 0),
    status: (row["status"] as string) ?? "pending",
    statusDetail: (row["status_detail"] as string | null) ?? null,
    providerPaymentId: row["provider_payment_id"] as string,
    qrCode: (row["qr_code"] as string | null) ?? null,
    qrCodeBase64: (row["qr_code_base64"] as string | null) ?? null,
    ticketUrl: (row["ticket_url"] as string | null) ?? null,
    expiresAt: (row["expires_at"] as string | null) ?? null,
    paidAt: (row["paid_at"] as string | null) ?? null,
    createdAt: row["created_at"] as string,
  };
}

/** Lista os pagamentos Pix dinâmicos do usuário para atualizar o estado da tela. */
export const getMyMercadoPagoPixPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ payments: MercadoPagoPixPaymentView[] }> => {
    const { data: stores } = await context.supabase
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1);
    const store = stores?.[0] ?? null;
    if (!store) return { payments: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("mercadopago_pix_payments")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error("Não foi possível consultar seus pagamentos Pix.");
    return { payments: (data ?? []).map((row) => mapPayment(row as Record<string, unknown>)) };
  });

/** Cria ou reutiliza uma cobrança Pix pendente no Mercado Pago. */
export const createMercadoPagoPixPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(planInput)
  .handler(async ({ data, context }): Promise<MercadoPagoPixCheckout> => {
    const { data: stores } = await context.supabase
      .from("stores")
      .select("id, name")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1);
    const store = stores?.[0] ?? null;
    if (!store) throw new Error("Crie sua loja em “Minha Loja” antes de pagar um plano.");
    const { getCurrentPlanPricing } = await import("./pricing.server");
    const pricing = await getCurrentPlanPricing(data.plan);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();

    const { data: pending } = await supabaseAdmin
      .from("mercadopago_pix_payments")
      .select("*")
      .eq("store_id", store.id)
      .eq("plan", data.plan)
      .in("status", ["pending", "in_process"])
      .gt("expires_at", now.toISOString())
      .order("created_at", { ascending: false })
      .limit(1);
    if (pending?.[0]) {
      return { payment: mapPayment(pending[0] as Record<string, unknown>), reused: true };
    }

    const email = (context.claims as { email?: string } | undefined)?.email;
    if (!email) throw new Error("E-mail do usuário indisponível para o pagamento Pix.");

    const { randomUUID } = await import("crypto");
    const externalReference = `vitrini-pix:${store.id}:${data.plan}:${randomUUID()}`;
    const { createPixPayment } = await import("./mercadopago.server");
    const remote = await createPixPayment({
      amount: pricing.price,
      description: `Vitrini ${data.plan === "pro" ? "PRO" : "Básica"} — mensalidade`,
      externalReference,
      payerEmail: email,
      idempotencyKey: `vitrini-pix-${store.id}-${data.plan}-${randomUUID()}`,
    });

    const transactionData = remote.point_of_interaction?.transaction_data;
    if (!transactionData?.qr_code && !transactionData?.ticket_url) {
      throw new Error("O Mercado Pago não retornou os dados do QR Code Pix.");
    }

    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const { data: inserted, error } = await supabaseAdmin
      .from("mercadopago_pix_payments")
      .insert({
        store_id: store.id,
        user_id: context.userId,
        plan: data.plan,
        amount: pricing.price,
        currency: "BRL",
        provider: "mercadopago",
        provider_payment_id: String(remote.id),
        external_reference: externalReference,
        status: remote.status ?? "pending",
        status_detail: remote.status_detail ?? null,
        qr_code: transactionData.qr_code ?? null,
        qr_code_base64: transactionData.qr_code_base64 ?? null,
        ticket_url: transactionData.ticket_url ?? null,
        payer_email: email,
        expires_at: expiresAt,
      })
      .select("*")
      .single();
    if (error || !inserted) throw new Error("Não foi possível registrar o pagamento Pix.");

    return { payment: mapPayment(inserted as Record<string, unknown>), reused: false };
  });
