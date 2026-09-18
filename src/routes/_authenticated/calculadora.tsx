import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Calculator, ChevronDown, ChevronUp, Info, RotateCcw, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/calculadora")({
  head: () => ({
    meta: [
      { title: "Calculadoras | Vitrini" },
      {
        name: "description",
        content: "Use a calculadora comum ou calcule preço de venda, margem, lucro e descontos.",
      },
    ],
  }),
  component: CalculatorPage,
});

const initialValues = { cost: "", margin: "30", discount: "0" };
type OpenPanel = "price" | "common" | null;

function parseValue(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function CalculatorPage() {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [values, setValues] = useState(initialValues);

  function update(key: keyof typeof initialValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setValues(initialValues);
  }

  return (
    <AppShell
      title="Calculadora"
      description="Escolha a calculadora que deseja usar"
      action={
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="size-4 sm:mr-1" />
          <span className="hidden sm:inline">Limpar preço</span>
        </Button>
      }
    >
      <div className="space-y-5">
        <section className="rounded-2xl border border-amber-300/40 bg-amber-50 p-5 text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/20 dark:text-amber-100 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950">
              <Calculator className="size-5" />
            </div>
            <div>
              <p className="font-semibold">Ferramentas de cálculo</p>
              <p className="mt-1 text-sm leading-6 opacity-80">
                Escolha uma opção abaixo. Cada calculadora abre somente quando você clicar, deixando
                o menu organizado e fácil de usar.
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-3">
          <ExpandablePanel
            open={openPanel === "common"}
            onClick={() => setOpenPanel((current) => (current === "common" ? null : "common"))}
            icon={<Calculator className="size-5" />}
            title="Calculadora"
            description="Faça contas comuns de soma, subtração, multiplicação e divisão."
            tone="amber"
          >
            <CommonCalculator />
          </ExpandablePanel>

          <ExpandablePanel
            open={openPanel === "price"}
            onClick={() => setOpenPanel((current) => (current === "price" ? null : "price"))}
            icon={<TrendingUp className="size-5" />}
            title="Calculadora de preço e margem"
            description="Defina preço de venda, margem, lucro e desconto para seus produtos."
            tone="primary"
          >
            <PriceCalculator values={values} update={update} />
          </ExpandablePanel>
        </div>
      </div>
    </AppShell>
  );
}

function ExpandablePanel({
  open,
  onClick,
  icon,
  title,
  description,
  tone,
  children,
}: {
  open: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  description: string;
  tone: "primary" | "amber";
  children: ReactNode;
}) {
  return (
    <section className="surface overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={onClick}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-accent/40 sm:p-5"
      >
        <span
          className={
            tone === "amber"
              ? "flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950"
              : "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
          }
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
        </span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground">
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
      </button>
      {open ? <div className="border-t border-border p-4 sm:p-6">{children}</div> : null}
    </section>
  );
}

function PriceCalculator({
  values,
  update,
}: {
  values: typeof initialValues;
  update: (key: keyof typeof initialValues, value: string) => void;
}) {
  const cost = parseValue(values.cost);
  const margin = Math.min(parseValue(values.margin), 99.99);
  const discount = Math.min(parseValue(values.discount), 99.99);
  const result = useMemo(() => {
    const suggestedPrice = cost > 0 ? cost / (1 - margin / 100) : 0;
    const profit = suggestedPrice - cost;
    const priceAfterDiscount = suggestedPrice * (1 - discount / 100);
    const profitAfterDiscount = priceAfterDiscount - cost;
    const actualMargin =
      priceAfterDiscount > 0 ? (profitAfterDiscount / priceAfterDiscount) * 100 : 0;
    const markup = cost > 0 ? (suggestedPrice / cost - 1) * 100 : 0;
    return {
      suggestedPrice,
      profit,
      priceAfterDiscount,
      profitAfterDiscount,
      actualMargin,
      markup,
    };
  }, [cost, margin, discount]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="space-y-5">
        <div>
          <h3 className="text-lg font-bold">Dados do produto</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Informe os valores para simular um preço mais seguro.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="calculator-cost">Custo total do produto (R$)</Label>
          <Input
            id="calculator-cost"
            inputMode="decimal"
            placeholder="Ex.: 25,00"
            value={values.cost}
            onChange={(event) => update("cost", event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Inclua matéria-prima, embalagem e custos diretos.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="calculator-margin">Margem de lucro desejada (%)</Label>
          <Input
            id="calculator-margin"
            type="number"
            min="0"
            max="99.99"
            step="0.1"
            value={values.margin}
            onChange={(event) => update("margin", event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Margem é o lucro como percentual do preço final.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="calculator-discount">Desconto simulado (%)</Label>
          <Input
            id="calculator-discount"
            type="number"
            min="0"
            max="99.99"
            step="0.1"
            value={values.discount}
            onChange={(event) => update("discount", event.target.value)}
          />
        </div>
        <div className="flex gap-2 rounded-lg bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Considere taxas, impostos, frete e despesas fixas antes de definir o preço final.
          </span>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <TrendingUp className="size-5 text-primary" />
          <div>
            <h3 className="text-lg font-bold">Resultado da simulação</h3>
            <p className="text-sm text-muted-foreground">Atualizado automaticamente</p>
          </div>
        </div>
        {cost > 0 ? (
          <div className="mt-5 space-y-3">
            <ResultCard
              label="Preço de venda sugerido"
              value={brl(result.suggestedPrice)}
              emphasis
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <ResultCard label="Lucro por unidade" value={brl(result.profit)} />
              <ResultCard label="Markup sobre o custo" value={`${result.markup.toFixed(1)}%`} />
              <ResultCard
                label={`Preço com ${discount}% de desconto`}
                value={brl(result.priceAfterDiscount)}
              />
              <ResultCard
                label="Lucro após desconto"
                value={brl(result.profitAfterDiscount)}
                tone={result.profitAfterDiscount < 0 ? "danger" : "default"}
              />
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium">Margem depois do desconto</p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {result.actualMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Informe o custo do produto para visualizar os resultados.
          </div>
        )}
      </div>
    </div>
  );
}

function CommonCalculator() {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);

  function inputDigit(digit: string) {
    if (waiting || display === "0") {
      setDisplay(digit);
      setWaiting(false);
    } else setDisplay((current) => current + digit);
  }
  function inputDecimal() {
    if (waiting) {
      setDisplay("0,");
      setWaiting(false);
      return;
    }
    if (!display.includes(",")) setDisplay((current) => `${current},`);
  }
  function clear() {
    setDisplay("0");
    setStored(null);
    setOperator(null);
    setWaiting(false);
  }
  function calculate(left: number, right: number, op: string) {
    if (op === "+") return left + right;
    if (op === "−") return left - right;
    if (op === "×") return left * right;
    return right === 0 ? null : left / right;
  }
  function chooseOperator(next: string) {
    const current = Number(display.replace(",", "."));
    if (stored !== null && operator && !waiting) {
      const result = calculate(stored, current, operator);
      if (result === null) {
        setDisplay("Erro");
        setStored(null);
        setOperator(null);
        return;
      }
      setStored(result);
      setDisplay(formatNumber(result));
    } else setStored(current);
    setOperator(next);
    setWaiting(true);
  }
  function equals() {
    if (stored === null || !operator) return;
    const result = calculate(stored, Number(display.replace(",", ".")), operator);
    if (result === null) {
      setDisplay("Erro");
    } else setDisplay(formatNumber(result));
    setStored(null);
    setOperator(null);
    setWaiting(true);
  }
  function formatNumber(value: number) {
    return Number.isInteger(value)
      ? String(value)
      : value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",");
  }
  const keys = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "0", ",", "C", "+"];
  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-xl bg-slate-900 p-4 text-right text-3xl font-semibold tracking-wide text-white">
        <span className="block min-h-10 break-all">{display}</span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {keys.map((key) => (
          <Button
            key={key}
            type="button"
            variant={
              key === "C"
                ? "destructive"
                : ["÷", "×", "−", "+"].includes(key)
                  ? "secondary"
                  : "outline"
            }
            className="h-12 text-lg"
            onClick={() =>
              key === "C"
                ? clear()
                : key === ","
                  ? inputDecimal()
                  : ["÷", "×", "−", "+"].includes(key)
                    ? chooseOperator(key)
                    : inputDigit(key)
            }
          >
            {key}
          </Button>
        ))}
        <Button type="button" className="col-span-4 h-12 text-lg" onClick={equals}>
          =
        </Button>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Use esta calculadora para contas rápidas do dia a dia.
      </p>
    </div>
  );
}

function ResultCard({
  label,
  value,
  emphasis = false,
  tone = "default",
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <div
      className={
        emphasis
          ? "rounded-xl bg-primary p-4 text-primary-foreground"
          : "rounded-xl border border-border p-4"
      }
    >
      <p className={emphasis ? "text-xs opacity-80" : "text-xs text-muted-foreground"}>{label}</p>
      <p
        className={`mt-1 font-bold ${emphasis ? "text-2xl" : "text-lg"} ${tone === "danger" ? "text-destructive" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
