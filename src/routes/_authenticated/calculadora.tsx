import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Calculator, Info, RotateCcw, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/calculadora")({
  head: () => ({
    meta: [
      { title: "Calculadora de preço | Vitrini" },
      {
        name: "description",
        content: "Calcule preço de venda, margem, lucro e impacto de descontos para seus produtos.",
      },
    ],
  }),
  component: CalculatorPage,
});

const initialValues = {
  cost: "",
  margin: "30",
  discount: "0",
};

function parseValue(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function CalculatorPage() {
  const [values, setValues] = useState(initialValues);
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

  function update(key: keyof typeof initialValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setValues(initialValues);
  }

  return (
    <AppShell
      title="Calculadora"
      description="Defina preços mais seguros para seus produtos"
      action={
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="size-4 sm:mr-1" />
          <span className="hidden sm:inline">Limpar</span>
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
              <p className="font-semibold">Calculadora de preço e margem</p>
              <p className="mt-1 text-sm leading-6 opacity-80">
                Informe o custo do produto e a margem que deseja obter. O Vitrini sugere um preço de
                venda e mostra quanto sobra depois de um possível desconto.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <section className="surface space-y-5 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-bold">Dados do produto</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use os valores reais para tomar uma decisão melhor.
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
                Inclua matéria-prima, embalagem e outros custos diretos.
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
              <p className="text-xs text-muted-foreground">
                Veja se ainda existe lucro ao oferecer uma promoção.
              </p>
            </div>
            <div className="flex gap-2 rounded-lg bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                Esta é uma simulação. Considere taxas, impostos, frete e despesas fixas antes de
                definir o preço final.
              </span>
            </div>
          </section>

          <section className="surface p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" />
              <div>
                <h2 className="text-lg font-bold">Resultado da simulação</h2>
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
          </section>
        </div>
      </div>
    </AppShell>
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
