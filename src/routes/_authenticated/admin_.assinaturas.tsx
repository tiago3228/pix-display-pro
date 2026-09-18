import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, CreditCard, Search, Store as StoreIcon, Users } from "lucide-react";
import { AppShell, StatCard } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsAdmin } from "@/hooks/useAuth";
import { brl, formatDate } from "@/lib/format";
import { listAdminStoresOverview, type AdminStoreOverview } from "@/lib/admin-stores.functions";

export const Route = createFileRoute("/_authenticated/admin_/assinaturas")({
  head: () => ({
    meta: [
      { title: "Lojas e assinaturas | Vitrini" },
      {
        name: "description",
        content: "Painel do administrador com todas as lojas, planos e status de assinatura.",
      },
      { property: "og:title", content: "Lojas e assinaturas | Vitrini" },
      {
        property: "og:description",
        content: "Painel do administrador com todas as lojas, planos e status de assinatura.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminSubscriptions,
});

const STATUS_LABEL: Record<string, string> = {
  authorized: "Ativa",
  active: "Ativa",
  pending: "Pendente",
  paused: "Pausada",
  past_due: "Em atraso",
  cancelled: "Cancelada",
  canceled: "Cancelada",
  expired: "Expirada",
};

function statusInfo(store: AdminStoreOverview) {
  if (store.trialActive) {
    return { label: "Teste PRO", variant: "default" as const };
  }
  const status = store.subscription?.status;
  if (!status) return { label: "Sem assinatura", variant: "secondary" as const };
  const label = STATUS_LABEL[status] ?? status;
  const good = ["authorized", "active"].includes(status);
  const bad = ["cancelled", "canceled", "expired", "past_due"].includes(status);
  return {
    label,
    variant: good ? ("default" as const) : bad ? ("destructive" as const) : ("secondary" as const),
  };
}

function AdminSubscriptions() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const fetchOverview = useServerFn(listAdminStoresOverview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-stores-overview"],
    enabled: isAdmin === true,
    queryFn: () => fetchOverview(),
  });

  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("all");
  const [situation, setSituation] = useState("all");

  const stores = data?.stores ?? [];
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return stores.filter((store) => {
      const matchesTerm =
        !term ||
        [store.name, store.slug, store.sellerName, store.whatsapp].some((value) =>
          (value ?? "").toLowerCase().includes(term),
        );
      const matchesPlan =
        plan === "all" || (plan === "pro" ? store.plan === "pro" : store.plan !== "pro");
      const matchesSituation =
        situation === "all" ||
        (situation === "trial" && store.trialActive) ||
        (situation === "paying" &&
          !store.trialActive &&
          ["authorized", "active"].includes(store.subscription?.status ?? "")) ||
        (situation === "none" && !store.trialActive && !store.subscription) ||
        (situation === "inactive" && !store.isActive);
      return matchesTerm && matchesPlan && matchesSituation;
    });
  }, [plan, search, situation, stores]);

  if (adminLoading || isLoading) {
    return (
      <AppShell title="Lojas e assinaturas">
        <p className="text-sm text-muted-foreground">Carregando lojas...</p>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Lojas e assinaturas">
        <div className="surface p-10 text-center text-sm text-muted-foreground">
          Você não tem acesso a esta área.
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Lojas e assinaturas">
        <div className="surface p-10 text-center text-sm text-destructive">
          Não foi possível carregar as lojas.
        </div>
      </AppShell>
    );
  }

  const totals = data?.totals;

  return (
    <AppShell
      title="Lojas e assinaturas"
      description="Todas as lojas, planos e situação de pagamento"
    >
      <div className="space-y-5">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Lojas" value={String(totals?.stores ?? 0)} icon={StoreIcon} />
          <StatCard label="PRO" value={String(totals?.pro ?? 0)} icon={CreditCard} />
          <StatCard label="Básica" value={String(totals?.basica ?? 0)} icon={Users} />
          <StatCard label="Em teste PRO" value={String(totals?.trial ?? 0)} icon={CalendarClock} />
        </section>

        <section className="surface overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar loja, vendedor ou WhatsApp"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="lg:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os planos</SelectItem>
                <SelectItem value="pro">PRO</SelectItem>
                <SelectItem value="basica">Básica</SelectItem>
              </SelectContent>
            </Select>
            <Select value={situation} onValueChange={setSituation}>
              <SelectTrigger className="lg:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as situações</SelectItem>
                <SelectItem value="paying">Assinatura ativa</SelectItem>
                <SelectItem value="trial">Em teste PRO</SelectItem>
                <SelectItem value="none">Sem assinatura</SelectItem>
                <SelectItem value="inactive">Lojas inativas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="divide-y divide-border">
            {visible.map((store) => {
              const status = statusInfo(store);
              return (
                <div key={store.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{store.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {store.sellerName} · /s/{store.slug} · desde {formatDate(store.createdAt)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {store.trialActive && store.trialEndsAt
                        ? `Teste PRO até ${formatDate(store.trialEndsAt)}`
                        : store.subscription
                          ? `${store.subscription.provider === "pix_manual" ? "Pix manual" : store.subscription.provider === "mercadopago" ? "Mercado Pago" : "Assinatura"} · ${brl(store.subscription.amount)}${
                              store.subscription.currentPeriodEnd
                                ? ` · vence ${formatDate(store.subscription.currentPeriodEnd)}`
                                : ""
                            }`
                          : "Nenhuma assinatura registrada"}
                    </p>
                  </div>
                  <Badge variant={store.plan === "pro" ? "default" : "secondary"}>
                    {store.plan === "pro" ? "PRO" : "Básica"}
                  </Badge>
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <Badge variant={store.isActive ? "secondary" : "destructive"}>
                    {store.isActive ? "ativa" : "inativa"}
                  </Badge>
                </div>
              );
            })}
            {!visible.length ? (
              <p className="p-10 text-center text-sm text-muted-foreground">
                Nenhuma loja encontrada.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
