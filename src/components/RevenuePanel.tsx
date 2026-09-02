import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { brl, formatDate } from "@/lib/format";
import {
  PAYMENT_METHODS,
  PERIOD_OPTIONS,
  dailySeries,
  methodLabel,
  periodRange,
  summarize,
  type PeriodKey,
  type RevenueEntry,
} from "@/lib/periods";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/AppShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ManualSaleInput = {
  amount: number;
  soldAt: string;
  method: string;
  description: string;
  note: string;
  customerName: string;
};

const todayInput = () => new Date().toISOString().slice(0, 10);

export function usePeriodFilter() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [from, setFrom] = useState(todayInput());
  const [to, setTo] = useState(todayInput());
  const range = useMemo(() => periodRange(period, { from, to }), [period, from, to]);
  return { period, setPeriod, from, setFrom, to, setTo, range };
}

export function PeriodFilter({
  period,
  setPeriod,
  from,
  setFrom,
  to,
  setTo,
}: ReturnType<typeof usePeriodFilter>) {
  return (
    <div className="surface space-y-3 p-4">
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <Button
            key={option.key}
            size="sm"
            variant={period === option.key ? "default" : "outline"}
            onClick={() => setPeriod(option.key)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {period === "custom" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="from">De</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">Até</Label>
            <Input id="to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RevenueSummary({ entries, label }: { entries: RevenueEntry[]; label: string }) {
  const summary = summarize(entries);
  const series = dailySeries(entries);
  const max = Math.max(1, ...series.map((point) => point.amount));

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Total faturado" value={brl(summary.total)} />
        <StatCard label={label} value={String(summary.count)} />
        <StatCard label="Ticket médio" value={brl(summary.average)} />
      </div>

      {series.length ? (
        <div className="surface mt-4 p-4">
          <p className="text-sm font-semibold">Evolução no período</p>
          <div className="mt-4 flex h-32 items-end gap-1">
            {series.map((point) => (
              <div key={point.day} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-primary/70"
                  style={{ height: `${Math.max(4, (point.amount / max) * 100)}%` }}
                  title={`${point.day}: ${brl(point.amount)}`}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function RevenueList({
  entries,
  onDelete,
}: {
  entries: RevenueEntry[];
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="surface mt-4 divide-y divide-border p-4">
      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhum lançamento no período selecionado.
        </p>
      ) : null}
      {entries.map((entry) => (
        <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{entry.label}</p>
            <p className="text-xs text-muted-foreground">
              {entry.source} · {methodLabel(entry.method)} · {formatDate(entry.date)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {entry.manual ? <Badge variant="secondary">manual</Badge> : null}
            <span className="text-sm font-semibold">{brl(entry.amount)}</span>
            {entry.manual && onDelete ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Excluir lançamento"
                onClick={() => onDelete(entry.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ManualSaleForm({
  title,
  description,
  withCustomer,
  saving,
  onSubmit,
}: {
  title: string;
  description: string;
  withCustomer?: boolean;
  saving: boolean;
  onSubmit: (input: ManualSaleInput) => void;
}) {
  const [amount, setAmount] = useState("");
  const [soldAt, setSoldAt] = useState(todayInput());
  const [method, setMethod] = useState("pix");
  const [descriptionText, setDescriptionText] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");

  function submit() {
    const value = Number(amount.replace(",", "."));
    if (!value || value <= 0) return;
    onSubmit({
      amount: value,
      soldAt: new Date(`${soldAt}T12:00:00`).toISOString(),
      method,
      description: descriptionText.trim(),
      note: note.trim(),
      customerName: customerName.trim(),
    });
    setAmount("");
    setDescriptionText("");
    setCustomerName("");
    setNote("");
  }

  return (
    <section className="surface mt-4 space-y-3 p-4">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Valor (R$)</Label>
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Data</Label>
          <Input type="date" value={soldAt} onChange={(e) => setSoldAt(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Forma de pagamento</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Input
            value={descriptionText}
            placeholder="Venda presencial"
            onChange={(e) => setDescriptionText(e.target.value)}
          />
        </div>
        {withCustomer ? (
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label>Observação</Label>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <Button className="h-11 w-full sm:w-auto" disabled={saving} onClick={submit}>
        {saving ? "Registrando..." : "Registrar venda"}
      </Button>
    </section>
  );
}
