import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { brl, formatDate, whatsappLink } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: Customers,
});

function Customers() {
  const { data: store } = useMyStore();
  const { data: customers } = useQuery({
    queryKey: ["customers", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("store_id", store!.id)
        .order("last_order_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell title="Clientes" description="Quem já comprou com você">
      <div className="space-y-3">
        {(customers ?? []).map((customer) => (
          <div key={customer.id} className="surface flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{customer.name || "Cliente"}</p>
              <p className="text-xs text-muted-foreground">
                {customer.orders_count} pedido(s) · {brl(Number(customer.total_spent))}
                {customer.last_order_at ? ` · último em ${formatDate(customer.last_order_at)}` : ""}
              </p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <a
                href={whatsappLink(customer.whatsapp, `Olá, ${customer.name}!`)}
                target="_blank"
                rel="noopener"
              >
                <MessageCircle className="mr-1.5 size-4" /> WhatsApp
              </a>
            </Button>
          </div>
        ))}
        {!customers?.length ? (
          <div className="surface p-10 text-center text-sm text-muted-foreground">
            Nenhum cliente ainda.
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
