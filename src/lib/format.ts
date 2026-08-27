export const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Keeps only digits and makes sure the number has the Brazilian country code. */
export function normalizePhone(input: string) {
  const digits = (input || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

export function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}

export const PIX_KEY_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
  { value: "aleatoria", label: "Chave aleatória" },
] as const;

export const STORE_CATEGORIES = [
  "Doces",
  "Roupas",
  "Joias e acessórios",
  "Cosméticos",
  "Alimentação",
  "Artesanato",
  "Beleza",
  "Outros",
] as const;

export const ORDER_STATUS = [
  { value: "novo", label: "Novo" },
  { value: "negociacao", label: "Em negociação" },
  { value: "pagamento_informado", label: "Pagamento informado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "entregue", label: "Entregue" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export const statusLabel = (value: string) =>
  ORDER_STATUS.find((s) => s.value === value)?.label ?? value;

export const FREE_PLAN_PRODUCT_LIMIT = 5;

// ------------------------------------------------------------- Parcelamento

export const PRO_PLAN_PRICE = 9.9;

export const formatDay = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(
    new Date(iso.length <= 10 ? `${iso}T12:00:00Z` : iso),
  );

export type InstallmentPlan = { count: number; amount: number; label: string };

/** Opções de parcelamento permitidas pelas regras do vendedor. */
export function installmentOptions(
  total: number,
  max: number,
  minAmount: number,
): InstallmentPlan[] {
  const options: InstallmentPlan[] = [];
  for (let count = 2; count <= Math.min(max, 12); count += 1) {
    const amount = Math.floor((total / count) * 100) / 100;
    if (amount < minAmount) break;
    options.push({ count, amount, label: `${count}x de ${brl(amount)}` });
  }
  return options;
}

/** Divide o total em parcelas fechadas (a última absorve os centavos restantes). */
export function splitInstallments(total: number, count: number): number[] {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const values = Array.from({ length: count }, () => base);
  values[count - 1] = (values[count - 1] ?? 0) + (cents - base * count);
  return values.map((v) => v / 100);
}

export const INSTALLMENT_STATUS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  overdue: "Em atraso",
  canceled: "Cancelada",
};

export function installmentState(status: string, dueDate: string) {
  if (status === "paid" || status === "canceled") return status;
  const due = new Date(`${dueDate.slice(0, 10)}T23:59:59Z`).getTime();
  return due < Date.now() ? "overdue" : "pending";
}

export function daysLate(dueDate: string) {
  const due = new Date(`${dueDate.slice(0, 10)}T23:59:59Z`).getTime();
  return Math.max(0, Math.floor((Date.now() - due) / 86_400_000));
}

export function collectionLink(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/cobranca/${token}`;
}

export function reminderMessage(opts: {
  customerName: string;
  productName: string;
  number: number;
  total: number;
  amount: number;
  dueDate: string;
  link: string;
  late: boolean;
}) {
  const head = opts.late
    ? `Identificamos que a parcela referente ao produto "${opts.productName}" está em atraso.`
    : `Passando para lembrar que a parcela referente ao produto "${opts.productName}" está próxima do vencimento.`;
  return [
    `Olá, ${opts.customerName || "tudo bem"}! 😊`,
    "",
    head,
    "",
    `📦 Parcela: ${opts.number} de ${opts.total}`,
    `💰 Valor: ${brl(opts.amount)}`,
    `📅 Vencimento: ${formatDay(opts.dueDate)}`,
    "",
    "Segue o link para facilitar o pagamento:",
    opts.link,
    "",
    "Caso já tenha realizado o pagamento, desconsidere esta mensagem. ❤️",
  ].join("\n");
}

/**
 * Vencimento da primeira parcela, em dias após a compra.
 * Configurável no futuro por loja — hoje é a regra comercial padrão (+30 dias).
 */
export const FIRST_DUE_OFFSET_DAYS = 30;
/** Intervalo entre as parcelas seguintes, em dias. */
export const INSTALLMENT_INTERVAL_DAYS = 30;
