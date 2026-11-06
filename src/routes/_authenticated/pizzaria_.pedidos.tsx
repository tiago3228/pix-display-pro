import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, MapPin, MessageCircle, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { brl, formatDate, statusLabel, whatsappLink } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/pizzaria_/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos da Pizzaria — Vitrini" },
      { name: "description", content: "Acompanhe cada pedido da pizzaria e atualize o status." },
      { property: "og:title", content: "Pedidos da Pizzaria — Vitrini" },
      { property: "og:description", content: "Acompanhe cada pedido da pizzaria e atualize o status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PizzeriaOrders,
});

/** Etapas do pedido na pizzaria, em ordem. */
const STAGES = [
  { value: "novo", label: "Novos" },
  { value: "confirmado", label: "Confirmados" },
  { value: "em_preparo", label: "Em preparo" },
  { value: "saiu_entrega", label: "Saiu para entrega" },
  { value: "entregue", label: "Entregues" },
] as const;

const stageOf = (status: string) => {
  if (status === "negociacao" || status === "pagamento_informado") return "novo";
  return status;
};

function PizzeriaOrders() {
  const { data: store } = useMyStore();
  const queryClient = useQueryClient();
  const [showClosed, setShowClosed] = useState(false);

  const { data: orders, refetch, isFetching } = useQuery({
    queryKey: ["pizzeria-orders", store?.id],
    enabled: Boolean(store?.id),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, number, customer_name, customer_whatsapp, total, status, note, payment_declared, created_at, delivery_address, delivery_number, delivery_neighborhood, delivery_city, order_items(id, product_name, variant_label, quantity, subtotal)",
        )
        .eq("store_id", store!.id)
        .neq("status", "teste_cancelado")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  async function setStatus(id: string, next: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("store_id", store!.id);
    if (error) {
      toast.error("Não foi possível atualizar o pedido.");
      return;
    }
    toast.success(`Pedido agora está: ${statusLabel(next)}`);
    queryClient.invalidateQueries({ queryKey: ["pizzeria-orders", store?.id] });
    queryClient.invalidateQueries({ queryKey: ["orders", store?.id] });
  }

  const all = orders ?? [];
  const canceled = all.filter((o) => o.status === "cancelado");
  const visibleStages = showClosed ? STAGES : STAGES.filter((s) => s.value !== "entregue");

  return (
    <AppShell
      title="🍕 Pedidos da Pizzaria"
      description="Acompanhe cada pedido e avance o status até a entrega."
      action={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link to="/pizzaria">
              <ArrowLeft className="mr-1.5 size-4" /> Pizzaria
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-1.5 size-4 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <Badge key={s.value} variant="secondary">
            {s.label}: {all.filter((o) => stageOf(o.status) === s.value).length}
          </Badge>
        ))}
        <Button size="sm" variant="ghost" onClick={() => setShowClosed((v) => !v)}>
          {showClosed ? "Ocultar entregues" : "Mostrar entregues"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleStages.map((stage) => {
          const list = all.filter((o) => stageOf(o.status) === stage.value);
          const idx = STAGES.findIndex((s) => s.value === stage.value);
          const next = STAGES[idx + 1];
          return (
            <section key={stage.value} className="rounded-2xl bg-muted/40 p-3">
              <h2 className="mb-3 flex items-center justify-between text-sm font-semibold">
                {stage.label} <span className="text-muted-foreground">{list.length}</span>
              </h2>
              <div className="space-y-3">
                {list.map((order) => {
                  const address = [order.delivery_address, order.delivery_number, order.delivery_neighborhood, order.delivery_city]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <article key={order.id} className="surface p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">#{order.number} · {order.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                        </div>
                        <span className="font-bold">{brl(Number(order.total))}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{statusLabel(order.status)}</p>
                      <ul className="mt-2 space-y-0.5 text-sm">
                        {order.order_items.map((item) => (
                          <li key={item.id}>
                            {item.quantity}x {item.product_name}
                            {item.variant_label ? ` (${item.variant_label})` : ""}
                          </li>
                        ))}
                      </ul>
                      {order.note ? (
                        <p className="mt-2 rounded-lg bg-muted/60 p-2 text-xs">Obs.: {order.note}</p>
                      ) : null}
                      {address ? (
                        <p className="mt-2 flex gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0" /> {address}
                        </p>
                      ) : null}
                      {order.payment_declared ? (
                        <Badge variant="secondary" className="mt-2">Pix informado</Badge>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {next ? (
                          <Button size="sm" onClick={() => void setStatus(order.id, next.value)}>
                            {statusLabel(next.value)} <ChevronRight className="ml-1 size-4" />
                          </Button>
                        ) : null}
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={whatsappLink(
                              order.customer_whatsapp,
                              `Olá, ${order.customer_name}! Seu pedido #${order.number} está: ${statusLabel(order.status)}.`,
                            )}
                            target="_blank"
                            rel="noopener"
                            aria-label="Falar no WhatsApp"
                          >
                            <MessageCircle className="size-4" />
                          </a>
                        </Button>
                        {stage.value !== "entregue" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            aria-label="Cancelar pedido"
                            onClick={() => {
                              if (window.confirm(`Cancelar o pedido #${order.number}?`))
                                void setStatus(order.id, "cancelado");
                            }}
                          >
                            <X className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
                {!list.length ? (
                  <p className="p-4 text-center text-xs text-muted-foreground">Nenhum pedido.</p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      {canceled.length ? (
        <p className="mt-4 text-xs text-muted-foreground">
          {canceled.length} pedido(s) cancelado(s) — veja em Pedidos.
        </p>
      ) : null}
    </AppShell>
  );
}
