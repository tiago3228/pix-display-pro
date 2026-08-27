/**
 * Mercado Pago — camada de acesso server-only.
 *
 * Regras:
 * - O Access Token NUNCA sai daqui (nunca é retornado, logado ou enviado ao frontend).
 * - O ambiente padrão é SEMPRE `test`. Produção só é usada quando
 *   MERCADOPAGO_ENVIRONMENT === "live" E as credenciais de produção existem.
 * - Endpoints usados (API oficial de Assinaturas):
 *     POST /preapproval_plan
 *     GET  /preapproval_plan/search
 *     POST /preapproval
 *     GET  /preapproval/{id}
 *     PUT  /preapproval/{id}
 *     GET  /authorized_payments/{id}
 *     GET  /v1/payments/{id}
 */

const API = "https://api.mercadopago.com";

export type MpEnvironment = "test" | "live";

export function mpEnvironment(): MpEnvironment {
  const configured = (process.env["MERCADOPAGO_ENVIRONMENT"] ?? "test").toLowerCase();
  if (configured === "live" || configured === "production" || configured === "prod") {
    // Só permite produção quando a credencial de produção realmente existe.
    if (process.env["MERCADOPAGO_PROD_ACCESS_TOKEN"]) return "live";
  }
  return "test";
}

function accessToken(): string {
  const env = mpEnvironment();
  const token =
    env === "live"
      ? process.env["MERCADOPAGO_PROD_ACCESS_TOKEN"]
      : process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!token) throw new Error("MERCADOPAGO_CREDENTIALS_MISSING");
  return token;
}

/** Nome interno do plano — usado para busca idempotente no Mercado Pago. */
export const PRO_PLAN_REASON = "Vitrini PRO";
export const PRO_PLAN_AMOUNT = 9.9;
export const PRO_PLAN_CURRENCY = "BRL";
/** Dias de tolerância após uma falha de cobrança antes de suspender o PRO. */
export const GRACE_PERIOD_DAYS = 3;

export class MercadoPagoError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "MercadoPagoError";
    this.status = status;
  }
}

async function mpFetch<T>(
  path: string,
  init: { method?: string; body?: unknown; idempotencyKey?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken()}`,
    "Content-Type": "application/json",
  };
  if (init.idempotencyKey) headers["X-Idempotency-Key"] = init.idempotencyKey;

  const request: RequestInit = { method: init.method ?? "GET", headers };
  if (init.body !== undefined) request.body = JSON.stringify(init.body);
  const response = await fetch(`${API}${path}`, request);

  const text = await response.text();
  if (!response.ok) {
    // Log sem credenciais — apenas status e corpo de erro da API.
    console.error("[mercadopago] request failed", {
      path,
      status: response.status,
      body: text.slice(0, 500),
    });
    throw new MercadoPagoError(`Mercado Pago respondeu ${response.status}`, response.status);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

// ---------------------------------------------------------------- Plano PRO

export type PreapprovalPlan = {
  id: string;
  reason: string;
  status: string;
  auto_recurring?: { transaction_amount?: number; currency_id?: string };
};

export async function searchProPlan(): Promise<PreapprovalPlan | null> {
  const result = await mpFetch<{ results?: PreapprovalPlan[] }>(
    `/preapproval_plan/search?status=active&limit=50`,
  );
  const match = (result.results ?? []).find(
    (plan) =>
      plan.reason === PRO_PLAN_REASON &&
      Number(plan.auto_recurring?.transaction_amount ?? 0) === PRO_PLAN_AMOUNT,
  );
  return match ?? null;
}

export async function createProPlan(backUrl: string): Promise<PreapprovalPlan> {
  return mpFetch<PreapprovalPlan>("/preapproval_plan", {
    method: "POST",
    idempotencyKey: `vitrini-pro-plan-${mpEnvironment()}`,
    body: {
      reason: PRO_PLAN_REASON,
      back_url: backUrl,
      // Assinaturas não permitem configurar o webhook pelo painel:
      // a notification_url precisa ser enviada na criação (doc oficial MP).
      notification_url: webhookUrl(),
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: PRO_PLAN_AMOUNT,
        currency_id: PRO_PLAN_CURRENCY,
      },
      payment_methods_allowed: {
        payment_types: [{ id: "credit_card" }],
      },
    },
  });
}

// --------------------------------------------------------------- Assinatura

export type Preapproval = {
  id: string;
  status: string;
  preapproval_plan_id?: string;
  external_reference?: string;
  init_point?: string;
  payer_email?: string;
  date_created?: string;
  next_payment_date?: string;
  last_modified?: string;
  auto_recurring?: { transaction_amount?: number; currency_id?: string };
  summarized?: { last_charged_date?: string; charged_quantity?: number };
};

export async function createPreapproval(input: {
  planId: string;
  externalReference: string;
  payerEmail: string;
  backUrl: string;
  idempotencyKey: string;
}): Promise<Preapproval> {
  return mpFetch<Preapproval>("/preapproval", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      preapproval_plan_id: input.planId,
      reason: PRO_PLAN_REASON,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      back_url: input.backUrl,
      notification_url: webhookUrl(),

      status: "pending",
    },
  });
}

export async function getPreapproval(id: string): Promise<Preapproval> {
  return mpFetch<Preapproval>(`/preapproval/${encodeURIComponent(id)}`);
}

export async function cancelPreapproval(id: string): Promise<Preapproval> {
  return mpFetch<Preapproval>(`/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: { status: "cancelled" },
  });
}

export type AuthorizedPayment = {
  id: number | string;
  preapproval_id?: string;
  status?: string;
  transaction_amount?: number;
  currency_id?: string;
  date_created?: string;
  debit_date?: string;
  payment?: { id?: number | string; status?: string; status_detail?: string };
};

export async function getAuthorizedPayment(id: string): Promise<AuthorizedPayment> {
  return mpFetch<AuthorizedPayment>(`/authorized_payments/${encodeURIComponent(id)}`);
}

export type MpPayment = {
  id: number | string;
  status?: string;
  status_detail?: string;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string;
  date_approved?: string;
  metadata?: Record<string, unknown>;
};

export async function getPayment(id: string): Promise<MpPayment> {
  return mpFetch<MpPayment>(`/v1/payments/${encodeURIComponent(id)}`);
}

// ------------------------------------------------------------ Mapeamentos

/** Traduz o status oficial do Mercado Pago para o status interno do Vitrini. */
export function mapPreapprovalStatus(external: string | undefined | null): string {
  switch ((external ?? "").toLowerCase()) {
    case "authorized":
      return "active";
    case "pending":
      return "pending";
    case "paused":
      return "paused";
    case "cancelled":
    case "canceled":
      return "canceled";
    default:
      return "pending";
  }
}

/** Status interno que dá acesso aos recursos PRO. */
export function statusGrantsPro(status: string, graceUntil: string | null): boolean {
  if (status === "active" || status === "authorized") return true;
  if (status === "past_due" && graceUntil) return new Date(graceUntil).getTime() > Date.now();
  return false;
}

/** URL base pública usada nos back_url do Mercado Pago (precisa ser HTTPS). */
export function resolveBaseUrl(candidate?: string | null): string {
  const configured = process.env["APP_BASE_URL"];
  const allowed = (value: string) =>
    /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.(lovable\.app|lovableproject\.com)$/i.test(value) ||
    (configured ? value === configured.replace(/\/$/, "") : false);

  const clean = (candidate ?? "").replace(/\/$/, "");
  if (clean && allowed(clean)) return clean;
  if (configured) return configured.replace(/\/$/, "");
  return "https://pix-display-pro.lovable.app";
}

/** Caminho público do webhook oficial do Mercado Pago. */
export const MP_WEBHOOK_PATH = "/api/public/webhooks/mercadopago";

/**
 * URL absoluta informada ao Mercado Pago na criação do plano e da assinatura.
 * Integrações de Assinaturas não permitem configurar o webhook pelo painel,
 * portanto a `notification_url` precisa viajar no payload de criação.
 */
export function webhookUrl(): string {
  return `${resolveBaseUrl(null)}${MP_WEBHOOK_PATH}`;
}
