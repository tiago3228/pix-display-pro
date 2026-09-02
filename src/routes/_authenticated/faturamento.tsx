import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ManualSaleForm, PeriodFilter, RevenueList, RevenueSummary, usePeriodFilter } from "@/components/RevenuePanel";
import { Paywall } from "@/components/Paywall";
import { useMyStore } from "@/hooks/useAuth";
import { addManualSale, deleteManualSale, getSellerRevenue } from "@/lib/revenue.functions";

export const Route = createFileRoute("/_authenticated/faturamento")({
  head: () => ({
    meta: [
      { title: "Faturamento da loja | Vitrini" },
      { name: "description", content: "Acompanhe pedidos, vendas manuais e o faturamento da sua loja." },
      { property: "og:title", content: "Faturamento da loja | Vitrini" },
      { property: "og:description", content: "Veja suas vendas da vitrine e lançamentos manuais em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SellerRevenue,
});

function SellerRevenue() {
  const { data: store, isLoading: storeLoading } = useMyStore();
  const filter = usePeriodFilter();
  const queryClient = useQueryClient();
  const fetchRevenue = useServerFn(getSellerRevenue);
  const addSale = useServerFn(addManualSale);
  const deleteSale = useServerFn(deleteManualSale);

  const { data, isLoading, error } = useQuery({
    queryKey: ["seller-revenue", filter.range],
    enabled: Boolean(store?.id && store.plan === "pro"),
    queryFn: () => fetchRevenue({ data: filter.range }),
  });

  const addMutation = useMutation({
    mutationFn: addSale,
    onSuccess: () => {
      toast.success("Venda registrada no faturamento.");
      queryClient.invalidateQueries({ queryKey: ["seller-revenue"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Não foi possível registrar a venda."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSale({ data: { id } }),
    onSuccess: () => {
      toast.success("Lançamento excluído.");
      queryClient.invalidateQueries({ queryKey: ["seller-revenue"] });
    },
    onError: () => toast.error("Não foi possível excluir o lançamento."),
  });

  if (storeLoading || (store?.plan === "pro" && isLoading)) {
    return <AppShell title="Faturamento"><p className="text-sm text-muted-foreground">Carregando faturamento...</p></AppShell>;
  }

  if (!store || store.plan !== "pro") {
    return <AppShell title="Faturamento" description="Disponível no plano PRO"><Paywall title="Faturamento PRO" text="Acompanhe pedidos e vendas manuais juntos em um painel financeiro." /></AppShell>;
  }

  if (error) {
    return <AppShell title="Faturamento"><div className="surface p-10 text-center text-sm text-destructive">Não foi possível carregar o faturamento.</div></AppShell>;
  }

  return (
    <AppShell title="Faturamento" description="Pedidos e vendas da sua loja">
      <PeriodFilter {...filter} />
      <RevenueSummary entries={data?.entries ?? []} label="Vendas" />
      <ManualSaleForm
        title="Registrar venda manual"
        description="Inclua vendas feitas por Pix, dinheiro, cartão ou presencialmente."
        withCustomer
        saving={addMutation.isPending}
        onSubmit={(input) => addMutation.mutate({ data: input })}
      />
      <RevenueList entries={data?.entries ?? []} onDelete={(id) => deleteMutation.mutate(id)} />
    </AppShell>
  );
}
