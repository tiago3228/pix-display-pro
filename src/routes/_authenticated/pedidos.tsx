import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, MessageCircle, Search } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getOrderReceiptUrl } from "@/lib/storefront.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { ORDER_STATUS, brl, formatDate, statusLabel, whatsappLink } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/pedidos")({
  component: Orders,
});

function Orders() {
  const { data: store } = useMyStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const receiptUrl = useServerFn(getOrderReceiptUrl);

  const { data: orders } = useQuery({
    queryKey: ["orders", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, number, customer_name, customer_whatsapp, total, status, note, payment_declared, receipt_path, created_at, order_items(id, product_name, variant_label, quantity, unit_price, subtotal)",
        )
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function openReceipt(orderId: string) {
    try {
      const { url } = await receiptUrl({ data: { orderId } });
      if (!url) {
        toast.error("Comprovante indisponível.");
        return;
      }
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Não foi possível abrir o comprovante.");
    }
  }

  async function updateStatus(id: string, next: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Não foi possível atualizar o pedido.");
      return;
    }
    toast.success("Status atualizado.");
    queryClient.invalidateQueries({ queryKey: ["orders", store?.id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", store?.id] });
  }

  const filtered = (orders ?? []).filter((order) => {
    const matchesStatus = status === "todos" || order.status === status;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      order.customer_name.toLowerCase().includes(term) ||
      String(order.number).includes(term);
    return matchesStatus && matchesSearch;
  });

  return (
    <AppShell title="Pedidos" description="Acompanhe e atualize seus pedidos">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por cliente ou número"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {ORDER_STATUS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 space-y-3">
        {filtered.map((order) => (
          <div key={order.id} className="surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  Pedido #{order.number} · {order.customer_name}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                {order.payment_declared ? <Badge variant="secondary">Pix informado</Badge> : null}
                <span className="text-lg font-bold">{brl(Number(order.total))}</span>
              </div>
            </div>

            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {order.order_items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span className="truncate">
                    {item.quantity}x {item.product_name}
                    {item.variant_label ? ` (${item.variant_label})` : ""}
                  </span>
                  <span>{brl(Number(item.subtotal))}</span>
                </li>
              ))}
            </ul>

            {order.note ? (
              <p className="mt-2 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
                Observação: {order.note}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Select value={order.status} onValueChange={(next) => updateStatus(order.id, next)}>
                <SelectTrigger className="w-44">
                  <SelectValue>{statusLabel(order.status)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={whatsappLink(
                    order.customer_whatsapp,
                    `Olá, ${order.customer_name}! Sobre seu pedido #${order.number}...`,
                  )}
                  target="_blank"
                  rel="noopener"
                >
                  <MessageCircle className="mr-1.5 size-4" /> Falar no WhatsApp
                </a>
              </Button>
              {order.receipt_path ? (
                <Button variant="outline" size="sm" onClick={() => openReceipt(order.id)}>
                  <FileText className="mr-1.5 size-4" /> Ver comprovante
                </Button>
              ) : null}
            </div>
          </div>
        ))}
        {!filtered.length ? (
          <div className="surface p-10 text-center text-sm text-muted-foreground">
            Nenhum pedido encontrado.
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
