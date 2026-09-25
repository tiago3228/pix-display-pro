import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Calculator,
  ChevronDown,
  ChevronUp,
  Package,
  Plus,
  Repeat2,
  RotateCcw,
  ShoppingCart,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/calculadora")({
  head: () => ({
    meta: [
      { title: "Calculadora de Negócios | Vitrini" },
      {
        name: "description",
        content:
          "Simule margem de lucro, receita recorrente de assinaturas e combinações de venda de produtos para alcançar suas metas.",
      },
    ],
  }),
  component: CalculatorPage,
});

const initialValues = {
  unitCost: "",
  margin: "30",
  discount: "0",
  quantity: "1",
  targetRevenue: "",
};
type OpenPanel = "price" | "common" | null;
type BusinessMode = "products" | "subscriptions" | "mix";
type SubscriptionPlan = { id: string; name: string; price: string; clients: string };
type MixProduct = { id: string; name: string; price: string; quantity: string };

const initialSubscriptionPlans: SubscriptionPlan[] = [
  { id: "plan-basic", name: "Plano Basic", price: "9,90", clients: "137" },
];
const initialMixProducts: MixProduct[] = [
  { id: "product-1", name: "Produto 1", price: "30,90", quantity: "405" },
  { id: "product-2", name: "Produto 2", price: "25,40", quantity: "493" },
];
const initialMixTarget = "25.000,00";

function parseValue(value: string) {
  const cleaned = value.trim().replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : /^-?\d{1,3}(?:\.\d{3})+$/.test(cleaned)
      ? cleaned.replace(/\./g, "")
      : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function CalculatorPage() {
  const [openPanel, setOpenPanel] = useState<OpenPanel>("price");
  const [businessMode, setBusinessMode] = useState<BusinessMode>("products");
  const [values, setValues] = useState(initialValues);
  const [subscriptionPlans, setSubscriptionPlans] = useState(initialSubscriptionPlans);
  const [subscriptionTarget, setSubscriptionTarget] = useState("50.000,00");
  const [mixProducts, setMixProducts] = useState(initialMixProducts);
  const [mixTarget, setMixTarget] = useState(initialMixTarget);

  function update(key: keyof typeof initialValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    if (businessMode === "products") setValues(initialValues);
    if (businessMode === "subscriptions") {
      setSubscriptionPlans(initialSubscriptionPlans);
      setSubscriptionTarget("50.000,00");
    }
    if (businessMode === "mix") {
      setMixProducts(initialMixProducts);
      setMixTarget(initialMixTarget);
    }
  }

  return (
    <AppShell
      title="Calculadora de Negócios"
      description="Simule vendas, assinaturas, planos e metas de faturamento."
      action={
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="size-4 sm:mr-1" />
          <span className="hidden sm:inline">
            {businessMode === "products" ? "Limpar calculadora" : "Restaurar exemplo"}
          </span>
        </Button>
      }
    >
      <div className="space-y-5">
        <section className="surface p-4 sm:p-5">
          <h2 className="font-semibold">O que você deseja calcular?</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <ModeButton
              active={businessMode === "products"}
              icon={<ShoppingCart className="size-4" />}
              label="Venda de produtos"
              onClick={() => setBusinessMode("products")}
            />
            <ModeButton
              active={businessMode === "subscriptions"}
              icon={<Repeat2 className="size-4" />}
              label="Assinaturas recorrentes"
              onClick={() => setBusinessMode("subscriptions")}
            />
            <ModeButton
              active={businessMode === "mix"}
              icon={<Target className="size-4" />}
              label="Mix de produtos"
              onClick={() => setBusinessMode("mix")}
            />
          </div>
        </section>

        {businessMode === "products" ? (
          <>
            <p className="text-sm text-muted-foreground">
              Preencha os dados da sua mercadoria. O Vitrini fará as simulações automaticamente.
            </p>
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
                title="Calculadora de margem de lucro"
                description="Preço sugerido, lucro, estoque e meta de faturamento."
                tone="primary"
              >
                <PriceCalculator values={values} update={update} />
              </ExpandablePanel>
            </div>
          </>
        ) : businessMode === "subscriptions" ? (
          <SubscriptionCalculator
            plans={subscriptionPlans}
            setPlans={setSubscriptionPlans}
            target={subscriptionTarget}
            setTarget={setSubscriptionTarget}
          />
        ) : (
          <ProductMixCalculator
            products={mixProducts}
            setProducts={setMixProducts}
            target={mixTarget}
            setTarget={setMixTarget}
          />
        )}
      </div>
    </AppShell>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card hover:bg-accent"}`}
    >
      {icon}
      {label}
    </button>
  );
}

function SubscriptionCalculator({
  plans,
  setPlans,
  target,
  setTarget,
}: {
  plans: SubscriptionPlan[];
  setPlans: React.Dispatch<React.SetStateAction<SubscriptionPlan[]>>;
  target: string;
  setTarget: (value: string) => void;
}) {
  const parsedTarget = parseValue(target);
  const targetInvalid = parsedTarget === null || parsedTarget < 0;
  const targetValue = targetInvalid ? 0 : (parsedTarget ?? 0);
  const calculations = useMemo(
    () =>
      plans.map((plan) => {
        const price = parseValue(plan.price);
        const clients = parseValue(plan.clients);
        const valid =
          plan.price.trim() !== "" &&
          plan.clients.trim() !== "" &&
          price !== null &&
          price >= 0 &&
          clients !== null &&
          clients >= 0 &&
          Number.isInteger(clients);
        return {
          id: plan.id,
          price: valid ? (price ?? 0) : 0,
          clients: valid ? (clients ?? 0) : 0,
          monthly: valid ? roundCurrency((price ?? 0) * (clients ?? 0)) : 0,
          valid,
        };
      }),
    [plans],
  );
  const monthly = roundCurrency(calculations.reduce((sum, plan) => sum + plan.monthly, 0));
  const annual = roundCurrency(monthly * 12);
  const months = targetValue > 0 && monthly > 0 ? Math.ceil(targetValue / monthly) : 0;
  const accumulated = roundCurrency(monthly * months);

  function updatePlan(id: string, key: keyof Omit<SubscriptionPlan, "id">, value: string) {
    setPlans((current) =>
      current.map((plan) => (plan.id === id ? { ...plan, [key]: value } : plan)),
    );
  }
  function addPlan() {
    setPlans((current) => [
      ...current,
      {
        id: `plan-${Date.now()}-${current.length}`,
        name: `Plano ${current.length + 1}`,
        price: "",
        clients: "",
      },
    ]);
  }

  return (
    <div className="space-y-5">
      <section className="surface p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Repeat2 className="size-5" />
          </span>
          <div>
            <h2 className="font-bold">Receita de assinaturas</h2>
            <p className="text-sm text-muted-foreground">
              Simule planos recorrentes e metas de receita acumulada.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div className="w-full max-w-sm space-y-1.5">
            <Label htmlFor="subscription-target">Meta de faturamento acumulado (R$)</Label>
            <Input
              id="subscription-target"
              inputMode="decimal"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="50.000,00"
              aria-invalid={targetInvalid}
            />
            {targetInvalid ? (
              <p className="text-xs text-destructive">
                Informe uma meta válida, igual ou maior que zero.
              </p>
            ) : null}
          </div>
          <Button type="button" variant="outline" onClick={addPlan}>
            <Plus className="mr-2 size-4" />
            Adicionar plano
          </Button>
        </div>
        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Plano</th>
                <th className="p-3">Valor da assinatura</th>
                <th className="p-3">Clientes ativos</th>
                <th className="p-3 text-right">Receita mensal</th>
                <th className="w-12 p-3" />
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => {
                const calculated = calculations.find((item) => item.id === plan.id);
                return (
                  <tr key={plan.id} className="border-t border-border">
                    <td className="p-2">
                      <Input
                        aria-label="Nome do plano"
                        value={plan.name}
                        onChange={(event) => updatePlan(plan.id, "name", event.target.value)}
                        placeholder="Ex.: Plano Basic"
                      />
                    </td>
                    <td className="p-2">
                      <div className="relative">
                        <Input
                          aria-label="Valor da assinatura"
                          inputMode="decimal"
                          value={plan.price}
                          onChange={(event) => updatePlan(plan.id, "price", event.target.value)}
                          placeholder="9,90"
                          className="pl-9"
                        />
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground">
                          R$
                        </span>
                      </div>
                    </td>
                    <td className="p-2">
                      <Input
                        aria-label="Quantidade de clientes ativos"
                        type="number"
                        min="0"
                        step="1"
                        value={plan.clients}
                        onChange={(event) => updatePlan(plan.id, "clients", event.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td className="p-3 text-right font-semibold tabular-nums">
                      {brl(calculated?.monthly ?? 0)}/mês
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Excluir plano"
                        aria-label="Excluir plano"
                        disabled={plans.length === 1}
                        onClick={() =>
                          setPlans((current) => current.filter((item) => item.id !== plan.id))
                        }
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {calculations.some((plan) => !plan.valid) ? (
          <p className="mt-2 text-xs text-destructive">
            Revise valores e quantidades: clientes ativos devem ser números inteiros a partir de
            zero.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-6">
        <h3 className="text-lg font-bold">📊 Receita recorrente</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const calc = calculations.find((item) => item.id === plan.id);
            return (
              <ResultCard
                key={plan.id}
                label={`${plan.name || "Plano"} · mensal`}
                value={`${brl(calc?.monthly ?? 0)}/mês`}
              />
            );
          })}
          <ResultCard
            label="Receita recorrente mensal total"
            value={`${brl(monthly)}/mês`}
            emphasis
          />
          <ResultCard label="Receita anual estimada" value={brl(annual)} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Receita anual = receita recorrente mensal × 12, mantendo os clientes ativos.
        </p>
      </section>

      <section className="rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/20 dark:text-amber-100 sm:p-6">
        <div className="flex items-center gap-2">
          <Target className="size-5" />
          <h3 className="font-semibold">Tempo até a meta acumulada</h3>
        </div>
        {targetValue > 0 && monthly > 0 && !targetInvalid ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <ResultCard label="Meta" value={brl(targetValue)} />
            <ResultCard
              label="Meses estimados"
              value={`${months} ${months === 1 ? "mês" : "meses"}`}
              emphasis
            />
            <ResultCard label={`Acumulado no ${months}º mês`} value={brl(accumulated)} />
          </div>
        ) : (
          <p className="mt-2 text-sm">
            {monthly <= 0
              ? "Informe ao menos um plano com valor e clientes ativos para estimar o tempo."
              : "Informe uma meta acima de zero para calcular o prazo."}
          </p>
        )}
        {monthly > 0 && targetValue > 0 ? (
          <p className="mt-3 text-sm">
            Com a receita atual de {brl(monthly)} por mês, serão necessários {months} meses
            completos para alcançar a meta.
          </p>
        ) : null}
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div>
          <p className="font-semibold">Como interpretar a estimativa</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Essa simulação considera os clientes permanecendo ativos durante todo o período, sem
            cancelamentos, novos clientes, reajustes, impostos ou taxas. Receita recorrente mensal é
            diferente da receita acumulada ao longo dos meses.
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-border p-4 text-sm">
        <p className="font-semibold">Exemplo didático</p>
        <p className="mt-1 text-muted-foreground">
          137 clientes × R$ 9,90 = R$ 1.356,30/mês. Isso equivale a R$ 16.275,60 em 12 meses. Para
          acumular R$ 50.000,00, são necessários 37 meses completos; no 37º mês, a receita acumulada
          estimada é R$ 50.183,10.
        </p>
      </div>
    </div>
  );
}

function ProductMixCalculator({
  products,
  setProducts,
  target,
  setTarget,
}: {
  products: MixProduct[];
  setProducts: React.Dispatch<React.SetStateAction<MixProduct[]>>;
  target: string;
  setTarget: (value: string) => void;
}) {
  const parsedTarget = parseValue(target);
  const targetInvalid = parsedTarget === null || parsedTarget < 0;
  const targetValue = targetInvalid ? 0 : (parsedTarget ?? 0);
  const calculations = useMemo(
    () =>
      products.map((product) => {
        const price = parseValue(product.price);
        const quantity = product.quantity.trim() === "" ? 0 : parseValue(product.quantity);
        const priceValid = price !== null && price > 0;
        const quantityValid = quantity !== null && quantity >= 0 && Number.isInteger(quantity);
        return {
          id: product.id,
          price: priceValid ? (price ?? 0) : 0,
          quantity: quantityValid ? (quantity ?? 0) : 0,
          revenue: priceValid && quantityValid ? roundCurrency((price ?? 0) * (quantity ?? 0)) : 0,
          priceValid,
          quantityValid,
        };
      }),
    [products],
  );
  const currentRevenue = roundCurrency(calculations.reduce((sum, item) => sum + item.revenue, 0));
  const remaining = roundCurrency(Math.max(0, targetValue - currentRevenue));
  const achieved = targetValue > 0 && currentRevenue >= targetValue;

  function updateProduct(id: string, key: keyof Omit<MixProduct, "id">, value: string) {
    setProducts((current) =>
      current.map((product) => (product.id === id ? { ...product, [key]: value } : product)),
    );
  }
  function addProduct() {
    setProducts((current) => [
      ...current,
      {
        id: `product-${Date.now()}-${current.length}`,
        name: `Produto ${current.length + 1}`,
        price: "",
        quantity: "",
      },
    ]);
  }
  function calculateQuantity(id: string) {
    const calculation = calculations.find((item) => item.id === id);
    if (!calculation?.priceValid || remaining <= 0) return;
    const quantity = Math.ceil(remaining / calculation.price);
    setProducts((current) =>
      current.map((product) =>
        product.id === id ? { ...product, quantity: String(quantity) } : product,
      ),
    );
  }

  return (
    <div className="space-y-5">
      <section className="surface p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Target className="size-5" />
          </span>
          <div>
            <h2 className="font-bold">Mix de produtos</h2>
            <p className="text-sm text-muted-foreground">
              Teste diferentes quantidades e veja quanto faturamento cada combinação pode gerar.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="mix-target">🎯 Meta de faturamento (R$)</Label>
            <Input
              id="mix-target"
              inputMode="decimal"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="25.000,00"
              aria-invalid={targetInvalid}
            />
            {targetInvalid ? (
              <p className="text-xs text-destructive">
                Informe uma meta válida, igual ou maior que zero.
              </p>
            ) : null}
          </div>
          <Button type="button" variant="outline" onClick={addProduct}>
            <Plus className="mr-2 size-4" />
            Adicionar produto
          </Button>
        </div>
        <div className="mt-5 space-y-3">
          {products.map((product) => {
            const calculated = calculations.find((item) => item.id === product.id);
            const canCalculate =
              product.quantity.trim() === "" && (calculated?.priceValid ?? false) && remaining > 0;
            return (
              <div
                key={product.id}
                className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(110px,0.8fr)_minmax(100px,0.7fr)_minmax(125px,0.8fr)_auto] sm:items-end"
              >
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input
                    value={product.name}
                    onChange={(event) => updateProduct(product.id, "name", event.target.value)}
                    placeholder="Produto"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Preço (R$)</Label>
                  <Input
                    inputMode="decimal"
                    value={product.price}
                    onChange={(event) => updateProduct(product.id, "price", event.target.value)}
                    placeholder="0,00"
                    aria-invalid={product.price.trim() !== "" && !(calculated?.priceValid ?? false)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={product.quantity}
                    onChange={(event) => updateProduct(product.id, "quantity", event.target.value)}
                    placeholder="0"
                    aria-label={`Quantidade de ${product.name || "produto"}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Faturamento</Label>
                  <p className="h-10 rounded-md bg-muted/50 px-3 py-2 text-sm font-semibold tabular-nums">
                    {brl(calculated?.revenue ?? 0)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {canCalculate ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => calculateQuantity(product.id)}
                      title={`Calcular quantidade necessária de ${product.name}`}
                    >
                      <Target className="mr-1.5 size-4" />
                      Calcular
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Excluir produto"
                    aria-label="Excluir produto"
                    disabled={products.length === 1}
                    onClick={() =>
                      setProducts((current) => current.filter((item) => item.id !== product.id))
                    }
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        {calculations.some(
          (item) =>
            !item.priceValid && products.find((product) => product.id === item.id)?.price.trim(),
        ) ? (
          <p className="mt-2 text-xs text-destructive">
            Informe um preço válido maior que zero para cada produto preenchido.
          </p>
        ) : null}
        {calculations.some((item) => !item.quantityValid) ? (
          <p className="mt-2 text-xs text-destructive">
            As quantidades devem ser números inteiros a partir de zero.
          </p>
        ) : null}
      </section>

      <section
        className={`rounded-2xl border p-4 sm:p-6 ${achieved ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-950/20 dark:text-emerald-100" : "border-amber-300/60 bg-amber-50 text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/20 dark:text-amber-100"}`}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <ResultCard label="🎯 Meta" value={brl(targetValue)} />
          <ResultCard label="💰 Faturamento estimado atual" value={brl(currentRevenue)} emphasis />
          <ResultCard
            label={achieved ? "Situação" : "Falta para a meta"}
            value={achieved ? "✅ Meta atingida" : brl(remaining)}
          />
        </div>
        {targetValue > 0 && !achieved ? (
          <p className="mt-4 text-sm">
            Você ainda precisa faturar <strong>{brl(remaining)}</strong> para atingir sua meta.
          </p>
        ) : null}
        {achieved ? (
          <p className="mt-4 text-sm">
            A combinação informada atingiu a meta
            {currentRevenue > targetValue
              ? ` e passou ${brl(currentRevenue - targetValue)} do valor desejado`
              : ""}
            .
          </p>
        ) : null}
        {targetValue === 0 ? (
          <p className="mt-4 text-sm">
            Informe uma meta acima de zero para acompanhar o progresso.
          </p>
        ) : null}
      </section>

      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Uma meta pode ter várias combinações</p>
        <p className="mt-1">
          Quando você possui vários produtos, existem diferentes combinações de vendas que podem
          atingir a mesma meta. A calculadora não escolhe uma combinação como “melhor”: informe e
          teste as quantidades que fazem sentido para o seu negócio. O botão Calcular estima a
          quantidade de um produto vazio se ele fosse usado para cobrir sozinho o valor que falta.
        </p>
      </div>
    </div>
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
  const parsedCost = parseValue(values.unitCost);
  const parsedMargin = parseValue(values.margin);
  const parsedQuantity = parseValue(values.quantity);
  const parsedTarget = parseValue(values.targetRevenue);
  const parsedDiscount = parseValue(values.discount);
  const costInvalid = parsedCost === null || parsedCost < 0;
  const marginInvalid = parsedMargin === null || parsedMargin < 0 || parsedMargin >= 100;
  const quantityInvalid =
    parsedQuantity === null || parsedQuantity < 1 || !Number.isInteger(parsedQuantity);
  const targetInvalid = parsedTarget === null || parsedTarget < 0;
  const discountInvalid = parsedDiscount === null || parsedDiscount < 0 || parsedDiscount >= 100;
  const unitCost = costInvalid ? 0 : (parsedCost ?? 0);
  const margin = marginInvalid ? 0 : (parsedMargin ?? 0);
  const quantity = quantityInvalid ? 0 : (parsedQuantity ?? 0);
  const targetRevenue = targetInvalid ? 0 : (parsedTarget ?? 0);
  const discount = discountInvalid ? 0 : (parsedDiscount ?? 0);

  const result = useMemo(() => {
    const totalCost = roundCurrency(unitCost * quantity);
    const suggestedPrice = unitCost > 0 ? roundCurrency(unitCost / (1 - margin / 100)) : 0;
    const unitProfit = roundCurrency(suggestedPrice - unitCost);
    const markup = unitCost > 0 ? (unitProfit / unitCost) * 100 : 0;
    const currentRevenue = roundCurrency(suggestedPrice * quantity);
    const currentProfit = roundCurrency(currentRevenue - totalCost);
    const unitsForTarget =
      targetRevenue > 0 && suggestedPrice > 0 ? Math.ceil(targetRevenue / suggestedPrice) : 0;
    const targetEstimatedRevenue = roundCurrency(unitsForTarget * suggestedPrice);
    const targetCost = roundCurrency(unitsForTarget * unitCost);
    const targetProfit = roundCurrency(targetEstimatedRevenue - targetCost);
    const discountedPrice = roundCurrency(suggestedPrice * (1 - discount / 100));
    const discountedUnitProfit = roundCurrency(discountedPrice - unitCost);
    const discountedMargin =
      discountedPrice > 0 ? (discountedUnitProfit / discountedPrice) * 100 : 0;
    return {
      totalCost,
      suggestedPrice,
      unitProfit,
      markup,
      currentRevenue,
      currentProfit,
      unitsForTarget,
      targetEstimatedRevenue,
      targetCost,
      targetProfit,
      discountedPrice,
      discountedUnitProfit,
      discountedMargin,
    };
  }, [unitCost, margin, quantity, targetRevenue, discount]);

  const canShowResults =
    values.unitCost.trim().length > 0 &&
    !costInvalid &&
    !marginInvalid &&
    !quantityInvalid &&
    !targetInvalid;
  const number = (value: number) =>
    new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package className="size-5" />
            </span>
            <div>
              <h3 className="font-bold">Dados da sua mercadoria</h3>
              <p className="text-sm text-muted-foreground">Informe os dados para simular.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="calculator-cost">Valor da mercadoria por unidade (R$)</Label>
            <Input
              id="calculator-cost"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={values.unitCost}
              onChange={(event) => update("unitCost", event.target.value)}
              aria-invalid={costInvalid}
            />
            <p className="text-xs text-muted-foreground">
              Quanto você pagou por cada unidade. Ex.: R$ 50,00.
            </p>
            {costInvalid ? (
              <p className="text-xs text-destructive">
                Informe um valor válido, igual ou maior que zero.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="calculator-quantity">Quantidade de mercadorias</Label>
            <Input
              id="calculator-quantity"
              type="number"
              min="1"
              step="1"
              value={values.quantity}
              onChange={(event) => update("quantity", event.target.value)}
              aria-invalid={quantityInvalid}
            />
            <p className="text-xs text-muted-foreground">
              Quantas unidades você comprou ou pretende analisar. Ex.: 100.
            </p>
            {quantityInvalid ? (
              <p className="text-xs text-destructive">
                Informe uma quantidade inteira de pelo menos 1 unidade.
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Custo total da mercadoria</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {brl(unitCost)} × {number(quantity)} {quantity === 1 ? "unidade" : "unidades"}
                </p>
              </div>
              <p className="text-right font-semibold tabular-nums">{brl(result.totalCost)}</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Calculado automaticamente: valor por unidade × quantidade.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="calculator-margin">Margem de lucro desejada (%)</Label>
            <div className="relative">
              <Input
                id="calculator-margin"
                type="number"
                min="0"
                max="99.99"
                step="0.1"
                value={values.margin}
                onChange={(event) => update("margin", event.target.value)}
                className="pr-8"
                aria-invalid={marginInvalid}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              O lucro como parte do preço final. Com 30%, R$ 30 de cada R$ 100 vendidos é lucro.
            </p>
            {marginInvalid ? (
              <p className="text-xs text-destructive">Informe uma margem inferior a 100%.</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="calculator-target-revenue">Quanto você pretende faturar? (R$)</Label>
            <Input
              id="calculator-target-revenue"
              type="text"
              inputMode="decimal"
              placeholder="Ex.: 100.000,00"
              value={values.targetRevenue}
              onChange={(event) => update("targetRevenue", event.target.value)}
              aria-invalid={targetInvalid}
            />
            <p className="text-xs text-muted-foreground">
              Sua meta total de vendas. Ex.: “Quero faturar R$ 100 mil”.
            </p>
            {targetInvalid ? (
              <p className="text-xs text-destructive">
                A meta deve ser um valor válido igual ou maior que zero.
              </p>
            ) : null}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="size-5" />
            </span>
            <div>
              <h3 className="font-bold">Resultado da simulação</h3>
              <p className="text-sm text-muted-foreground">
                Atualizado automaticamente enquanto você digita.
              </p>
            </div>
          </div>

          {canShowResults ? (
            <div className="space-y-4">
              <div>
                <ResultCard
                  label="Preço de venda sugerido"
                  value={brl(result.suggestedPrice)}
                  emphasis
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Preço estimado por unidade para atingir a margem informada.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ResultCard label="Lucro por unidade" value={brl(result.unitProfit)} />
                <ResultCard
                  label="Markup sobre o custo"
                  value={`${result.markup.toFixed(2).replace(".", ",")}%`}
                />
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">
                O lucro por unidade é antes de outros custos, como impostos, taxas e frete.
              </p>
              <p className="-mt-2 text-xs text-muted-foreground">
                Margem é calculada sobre o preço final; markup compara o lucro com o custo. Uma
                margem de 30% equivale a cerca de 42,86% de markup.
              </p>

              <div className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Package className="size-4 text-primary" />
                  <h4 className="font-semibold">Sua quantidade atual</h4>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Projeção se vender as {number(quantity)} {quantity === 1 ? "unidade" : "unidades"}{" "}
                  informadas.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ResultCard label="Custo total" value={brl(result.totalCost)} />
                  <ResultCard label="Faturamento estimado" value={brl(result.currentRevenue)} />
                  <ResultCard label="Lucro estimado" value={brl(result.currentProfit)} />
                </div>
              </div>

              <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/20 dark:text-amber-100">
                <div className="flex items-center gap-2">
                  <Target className="size-5" />
                  <h4 className="font-semibold">Sua meta de faturamento</h4>
                </div>
                {targetRevenue > 0 && result.suggestedPrice > 0 ? (
                  <>
                    <p className="mt-2 text-sm">
                      Para faturar {brl(targetRevenue)}, você precisa vender aproximadamente:
                    </p>
                    <p className="my-2 text-3xl font-bold tabular-nums">
                      {number(result.unitsForTarget)} unidades
                    </p>
                    <div className="grid gap-2 text-sm sm:grid-cols-3">
                      <p>
                        Faturamento: <strong>{brl(result.targetEstimatedRevenue)}</strong>
                      </p>
                      <p>
                        Custo: <strong>{brl(result.targetCost)}</strong>
                      </p>
                      <p>
                        Lucro: <strong>{brl(result.targetProfit)}</strong>
                      </p>
                    </div>
                    <p className="mt-3 text-xs opacity-80">
                      O faturamento pode ultrapassar um pouco a meta porque não é possível vender
                      frações de unidade.
                    </p>
                  </>
                ) : targetRevenue > 0 ? (
                  <p className="mt-2 text-sm">
                    Com preço de venda igual a R$ 0,00, não é possível atingir uma meta de
                    faturamento.
                  </p>
                ) : (
                  <p className="mt-2 text-sm">
                    Informe uma meta acima de zero para ver quantas unidades precisa vender.
                  </p>
                )}
              </div>

              <CollapsibleSection
                title="Simular desconto (opcional)"
                description="Veja como uma promoção muda sua margem."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="calculator-discount">Desconto simulado (%)</Label>
                    <div className="relative">
                      <Input
                        id="calculator-discount"
                        type="number"
                        min="0"
                        max="99.99"
                        step="0.1"
                        value={values.discount}
                        onChange={(event) => update("discount", event.target.value)}
                        className="pr-8"
                        aria-invalid={discountInvalid}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                    {discountInvalid ? (
                      <p className="text-xs text-destructive">Use um desconto entre 0% e 99,99%.</p>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ResultCard label="Preço após desconto" value={brl(result.discountedPrice)} />
                    <ResultCard
                      label="Lucro por unidade após desconto"
                      value={brl(result.discountedUnitProfit)}
                      tone={result.discountedUnitProfit < 0 ? "danger" : "default"}
                    />
                    <ResultCard
                      label="Margem após desconto"
                      value={`${result.discountedMargin.toFixed(2).replace(".", ",")}%`}
                      tone={result.discountedUnitProfit < 0 ? "danger" : "default"}
                    />
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              {marginInvalid
                ? "Informe uma margem inferior a 100% para continuar."
                : "Informe o valor por unidade e uma quantidade válida para visualizar os resultados."}
            </div>
          )}
        </section>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/20 dark:text-amber-100">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-semibold">Importante</p>
          <p className="mt-1 text-xs leading-5">
            O preço sugerido é uma simulação. Antes de definir o preço final, considere impostos,
            taxas de cartão e marketplace, frete, embalagem, comissão, custos fixos e outras
            despesas. Esses custos podem reduzir o lucro real.
          </p>
        </div>
      </div>

      <CollapsibleSection
        title="Entenda os resultados"
        description="Explicações simples sobre custo, margem, preço, faturamento e lucro."
      >
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="font-semibold">O que é margem de lucro?</p>
            <p className="mt-1 text-muted-foreground">
              É a parte do preço de venda que corresponde ao lucro.
            </p>
          </div>
          <div>
            <p className="font-semibold">O que é custo por unidade?</p>
            <p className="mt-1 text-muted-foreground">
              É quanto você pagou por cada unidade do produto.
            </p>
          </div>
          <div>
            <p className="font-semibold">O que é custo total?</p>
            <p className="mt-1 text-muted-foreground">
              É o valor investido em todas as unidades: custo por unidade × quantidade.
            </p>
          </div>
          <div>
            <p className="font-semibold">O que é preço de venda sugerido?</p>
            <p className="mt-1 text-muted-foreground">
              Uma estimativa baseada no custo e na margem que você informou.
            </p>
          </div>
          <div>
            <p className="font-semibold">O que é faturamento?</p>
            <p className="mt-1 text-muted-foreground">
              É o total recebido pelas vendas, antes de descontar custos e despesas.
            </p>
          </div>
          <div>
            <p className="font-semibold">O que é lucro?</p>
            <p className="mt-1 text-muted-foreground">
              É o que sobra depois do custo da mercadoria. Impostos, taxas, frete e despesas também
              reduzem o lucro real.
            </p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Exemplo prático"
        description="Veja como a calculadora chega aos valores."
      >
        <div className="space-y-2 text-sm">
          <p>
            Imagine que você comprou 100 camisetas por R$ 50,00 cada. Seu investimento é{" "}
            <strong>100 × R$ 50,00 = R$ 5.000,00</strong>.
          </p>
          <p>
            Com margem de 30%, o preço sugerido é <strong>R$ 50,00 ÷ (1 − 0,30) = R$ 71,43</strong>{" "}
            por unidade.
          </p>
          <p>
            Vendendo as 100 unidades, o faturamento é aproximadamente <strong>R$ 7.143,00</strong> e
            o lucro antes de outros custos é <strong>R$ 2.143,00</strong>.
          </p>
          <p>
            Para faturar R$ 100.000,00, você precisaria vender cerca de{" "}
            <strong>1.400 unidades</strong>; o faturamento pode passar um pouco da meta por causa do
            arredondamento para unidades inteiras.
          </p>
          <div className="mt-3 rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
            Margem não é a mesma coisa que markup: somar 30% ao custo de R$ 50,00 resulta em R$
            65,00, mas esse preço não gera margem de 30% sobre a venda. Para atingir margem de 30%,
            o preço precisa ser aproximadamente R$ 71,43.
          </div>
        </div>
      </CollapsibleSection>
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
