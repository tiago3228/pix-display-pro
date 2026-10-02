import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gem, Store as StoreIcon } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useAuth";
import { AppShell, StatCard } from "@/components/AppShell";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { countPendingProPixRequests } from "@/lib/pro-pix.functions";
import { setAdminDiamondAccess } from "@/lib/admin-stores.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: Admin,
});

function Admin() {
  const { data: isAdmin, isLoading } = useIsAdmin();

  const { data } = useQuery({
    queryKey: ["admin-overview"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const [stores, orders] = await Promise.all([
        supabase
          .from("stores")
          .select("id, name, slug, plan, is_active, created_at, diamond_access")
          .order("created_at", { ascending: false }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
      ]);
      return { stores: stores.data ?? [], orders: orders.count ?? 0 };
    },
  });

  const fetchPending = useServerFn(countPendingProPixRequests);
  const setDiamond = useServerFn(setAdminDiamondAccess);
  const queryClient = useQueryClient();
  const [diamondBusy, setDiamondBusy] = useState<string | null>(null);
  const { data: pixPending } = useQuery({
    queryKey: ["admin-pro-pix-pending"],
    enabled: isAdmin === true,
    queryFn: () => fetchPending(),
  });

  if (isLoading) {
    return (
      <AppShell title="Administração">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Administração">
        <div className="surface p-10 text-center text-sm text-muted-foreground">
          Você não tem acesso a esta área.
        </div>
      </AppShell>
    );
  }

  const pendingPix = pixPending?.pending ?? 0;

  async function toggleDiamond(store: { id: string; diamond_access: boolean }) {
    setDiamondBusy(store.id);
    try {
      await setDiamond({ data: { storeId: store.id, enabled: !store.diamond_access } });
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-stores-overview"] });
    } finally {
      setDiamondBusy(null);
    }
  }

  const pro = (data?.stores ?? []).filter((s) => s.plan === "pro").length;

  return (
    <AppShell title="Administração" description="Visão geral da plataforma">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
        <p className="text-sm">
          {pendingPix > 0
            ? `🔔 ${pendingPix} nova(s) solicitação(ões) PRO via Pix aguardando confirmação.`
            : "Solicitações PRO via Pix"}
        </p>
        <Button asChild size="sm" variant={pendingPix > 0 ? "default" : "outline"}>
          <Link to="/admin/solicitacoes-pro">Ver solicitações</Link>
        </Button>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <Button asChild variant="outline" size="sm">
          <a href="/admin/assinaturas">Lojas e assinaturas</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/admin/faturamento">Faturamento</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/admin/precos">Preços e promoções</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/admin/landing">Banner principal</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/admin/lojas">Lojas e campanhas</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/admin/feedback">Feedbacks dos proprietários</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/admin/notificacoes">FAQ de notificações</a>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Lojas" value={String(data?.stores.length ?? 0)} icon={StoreIcon} />
        <StatCard label="Assinantes Pro" value={String(pro)} />
        <StatCard label="Pedidos" value={String(data?.orders ?? 0)} />
      </div>

      <div className="surface mt-4 divide-y divide-border p-4">
        {(data?.stores ?? []).map((store) => (
          <div key={store.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{store.name}</p>
              <p className="text-xs text-muted-foreground">
                /s/{store.slug} · {formatDate(store.created_at)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Badge variant={store.plan === "pro" ? "default" : "secondary"}>
                {store.diamond_access ? (
                  <>
                    <Gem className="mr-1 inline size-3" /> Diamante
                  </>
                ) : (
                  store.plan
                )}
              </Badge>
              <Badge variant={store.is_active ? "secondary" : "destructive"}>
                {store.is_active ? "ativa" : "inativa"}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                disabled={diamondBusy === store.id}
                onClick={() => void toggleDiamond(store)}
              >
                {store.diamond_access ? "Desabilitar Diamante" : "Habilitar Diamante"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
