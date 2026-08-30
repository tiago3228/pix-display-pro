export type PeriodKey = "today" | "7d" | "30d" | "month" | "year" | "custom";

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "month", label: "Este mês" },
  { key: "year", label: "Este ano" },
  { key: "custom", label: "Personalizado" },
];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

/** Converte a escolha de período em um intervalo ISO para as consultas. */
export function periodRange(
  key: PeriodKey,
  custom?: { from?: string; to?: string },
): { from: string; to: string } {
  const now = new Date();
  if (key === "custom") {
    const from = custom?.from ? startOfDay(new Date(`${custom.from}T12:00:00`)) : startOfDay(now);
    const to = custom?.to ? endOfDay(new Date(`${custom.to}T12:00:00`)) : endOfDay(now);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  let from: Date;
  if (key === "today") from = startOfDay(now);
  else if (key === "7d") from = startOfDay(new Date(now.getTime() - 6 * 86400000));
  else if (key === "30d") from = startOfDay(new Date(now.getTime() - 29 * 86400000));
  else if (key === "month") from = new Date(now.getFullYear(), now.getMonth(), 1);
  else from = new Date(now.getFullYear(), 0, 1);
  return { from: from.toISOString(), to: endOfDay(now).toISOString() };
}

export const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "outro", label: "Outro" },
];

export const methodLabel = (value: string) =>
  PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;

export type RevenueEntry = {
  id: string;
  source: string;
  label: string;
  amount: number;
  date: string;
  method: string;
  manual: boolean;
};

export function summarize(entries: RevenueEntry[]) {
  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  const count = entries.length;
  return {
    total: Number(total.toFixed(2)),
    count,
    average: count ? Number((total / count).toFixed(2)) : 0,
  };
}

/** Série diária (yyyy-mm-dd) para o gráfico simples de barras. */
export function dailySeries(entries: RevenueEntry[]) {
  const map = new Map<string, number>();
  for (const entry of entries) {
    const day = entry.date.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + entry.amount);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, amount]) => ({ day, amount: Number(amount.toFixed(2)) }));
}
