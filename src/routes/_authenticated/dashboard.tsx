import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Copy,
  Eye,
  ExternalLink,
  Package,
  Plus,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/hooks/useAuth";
import { AppShell, StatCard } from "@/components/AppShell";
import { brl, formatDate, statusLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: store } = useMyStore();

  const { data } = useQuery({
    queryKey: ["dashboard", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const storeId = store!.id;
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [orders, products, views] = await Promise.all([
        supabase
          .from("orders")
          .select("id, number, customer_name, total, status, created_at")
          .eq("store_id", storeId)
          .order("created_at", { ascending: false }),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("store_id", storeId),
        supabase
          .from("store_events")
          .select("id", { count: "exact", head: true })
          .eq("store_id", storeId)
          .eq("type", "view"),
      ]);

      const allOrders = orders.data ?? [];
      const monthOrders = allOrders.filter((o) => new Date(o.created_at) >= monthStart);
      const revenue = monthOrders
        .filter((o) => o.status !== "cancelado")
        .reduce((sum, o) => sum + Number(o.total), 0);

      return {
        orders: allOrders.slice(0, 5),
        totalOrders: allOrders.length,
        monthOrders: monthOrders.length,
        revenue,
        products: products.count ?? 0,
        views: views.count ?? 0,
      };
    },
  });

  const storeUrl =
    typeof window !== "undefined" && store ? `${window.location.origin}/s/${store.slug}` : "";

  return (
    <AppShell
      title={`Olá, ${store?.seller_name || "vendedor"}!`}
      description="Resumo da sua loja"
      action={
        <Button asChild size="sm">
          <Link to="/produtos">
            <Plus className="mr-1.5 size-4" /> Produto
          </Link>
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Pedidos do mês"
          value={String(data?.monthOrders ?? 0)}
          icon={ShoppingBag}
        />
        <StatCard label="Faturamento do mês" value={brl(data?.revenue ?? 0)} icon={Wallet} />
        <StatCard label="Produtos" value={String(data?.products ?? 0)} icon={Package} />
        <StatCard label="Visitas na vitrine" value={String(data?.views ?? 0)} icon={Eye} />
      </div>

      <div className="surface mt-4 p-4">
        <p className="text-sm font-semibold">Link da sua vitrine</p>
        <p className="mt-1 font-mono text-xs break-all text-muted-foreground">{storeUrl}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(storeUrl);
              toast.success("Link copiado!");
            }}
          >
            <Copy className="mr-1.5 size-4" /> Copiar
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={storeUrl} target="_blank" rel="noopener">
              <ExternalLink className="mr-1.5 size-4" /> Ver loja
            </a>
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link to="/qrcodes">QR Codes</Link>
          </Button>
        </div>
      </div>

      <div className="surface mt-4 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Últimos pedidos</p>
          <Link to="/pedidos" className="text-xs font-medium text-primary">
            Ver todos
          </Link>
        </div>
        <div className="mt-3 divide-y divide-border">
          {(data?.orders ?? []).map((order) => (
            <div key={order.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  #{order.number} · {order.customer_name}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="secondary">{statusLabel(order.status)}</Badge>
                <span className="text-sm font-semibold">{brl(Number(order.total))}</span>
              </div>
            </div>
          ))}
          {!data?.orders?.length ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <TrendingUp className="mx-auto mb-2 size-6 text-muted-foreground/60" />
              Nenhum pedido ainda. Compartilhe sua loja para começar a vender.
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
