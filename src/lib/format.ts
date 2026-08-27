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
