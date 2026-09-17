import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  ManualSaleForm,
  PeriodFilter,
  RevenueList,
  RevenueSummary,
  usePeriodFilter,
} from "@/components/RevenuePanel";
import { useIsAdmin } from "@/hooks/useAuth";
import {
  addPlatformSale,
  deletePlatformSale,
  getAdminRevenue,
} from "@/lib/revenue.functions";

export const Route = createFileRoute("/_authenticated/admin/faturamento")({
  head: () => ({
    meta: [
      { title: "Faturamento da plataforma | Vitrini" },
      { name: "description", content: "Acompanhe as receitas do Vitrini e registre vendas administrativas." },
      { property: "og:title", content: "Faturamento da plataforma | Vitrini" },
      { property: "og:description", content: "Acompanhe assinaturas, pagamentos Pix e lançamentos manuais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminRevenue,
});

function AdminRevenue() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const filter = usePeriodFilter();
  const queryClient = useQueryClient();
  const fetchRevenue = useServerFn(getAdminRevenue);
  const addSale = useServerFn(addPlatformSale);
  const deleteSale = useServerFn(deletePlatformSale);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-revenue", filter.range],
    enabled: isAdmin === true,
    queryFn: () => fetchRevenue({ data: filter.range }),
  });

  const addMutation = useMutation({
    mutationFn: addSale,
    onSuccess: () => {
      toast.success("Venda registrada no faturamento.");
      queryClient.invalidateQueries({ queryKey: ["admin-revenue"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Não foi possível registrar a venda."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSale({ data: { id } }),
    onSuccess: () => {
      toast.success("Lançamento excluído.");
      queryClient.invalidateQueries({ queryKey: ["admin-revenue"] });
    },
    onError: () => toast.error("Não foi possível excluir o lançamento."),
  });

  if (adminLoading || (isAdmin && isLoading)) {
    return <AppShell title="Faturamento"><p className="text-sm text-muted-foreground">Carregando faturamento...</p></AppShell>;
  }
  if (!isAdmin) {
    return <AppShell title="Faturamento"><div className="surface p-10 text-center text-sm text-muted-foreground">Você não tem acesso a esta área.</div></AppShell>;
  }
  if (error) {
    return <AppShell title="Faturamento"><div className="surface p-10 text-center text-sm text-destructive">Não foi possível carregar o faturamento.</div></AppShell>;
  }

  return (
    <AppShell title="Faturamento" description="Receitas da plataforma">
      <PeriodFilter {...filter} />
      <RevenueSummary entries={data?.entries ?? []} label="Lançamentos" />
      <ManualSaleForm
        title="Adicionar venda manual"
        description="Registre uma receita recebida por Pix, presencial ou outra forma."
        saving={addMutation.isPending}
        onSubmit={(input) => addMutation.mutate({ data: input })}
      />
      <RevenueList entries={data?.entries ?? []} onDelete={(id) => deleteMutation.mutate(id)} />
    </AppShell>
  );
}
