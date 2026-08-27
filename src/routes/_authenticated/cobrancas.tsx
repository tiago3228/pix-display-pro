import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, MessageCircle, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/hooks/useAuth";
import { AppShell, StatCard } from "@/components/AppShell";
import { Paywall } from "@/components/Paywall";
import { markInstallmentPaid, registerReminder } from "@/lib/billing.functions";
import {
  brl,
  collectionLink,
  daysLate,
  formatDay,
  installmentState,
  reminderMessage,
  whatsappLink,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/cobrancas")({
  head: () => ({
    meta: [
      { title: "Cobranças e parcelas | Vitrini" },
      {
        name: "description",
        content:
          "Acompanhe parcelas a receber, cobre seus clientes pelo WhatsApp e confirme pagamentos.",
      },
      { property: "og:title", content: "Cobranças e parcelas | Vitrini" },
      {
        property: "og:description",
        content: "Acompanhe parcelas a receber e cobre seus clientes pelo WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Collections,
});

type Row = {
  id: string;
  installment_number: number;
  total_installments: number;
  amount: number;
  due_date: string;
  status: string;
  public_token: string;
  paid_at: string | null;
  orders: {
    customer_name: string;
    customer_whatsapp: string;
    order_items: { product_name: string; quantity: number; variant_label: string | null }[];
  } | null;
};

function Collections() {
  const { data: store } = useMyStore();
  const isPro = store?.plan === "pro";
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [confirming, setConfirming] = useState<Row | null>(null);

  const markPaid = useServerFn(markInstallmentPaid);
  const saveReminder = useServerFn(registerReminder);

  const { data: rows } = useQuery({
    queryKey: ["installments", store?.id],
    enabled: Boolean(store?.id) && isPro,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installments")
        .select(
          "id, installment_number, total_installments, amount, due_date, status, public_token, paid_at, orders(customer_name, customer_whatsapp, order_items(product_name, quantity, variant_label))",
        )
        .eq("store_id", store!.id)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const paidMutation = useMutation({
    mutationFn: (row: Row) => markPaid({ data: { installmentId: row.id } }),
    onSuccess: () => {
      toast.success("Parcela marcada como paga.");
      queryClient.invalidateQueries({ queryKey: ["installments", store?.id] });
    },
    onError: () => toast.error("Não foi possível atualizar a parcela."),
  });

  const list = useMemo(() => {
    const all = (rows ?? []).map((row) => ({
      ...row,
      amount: Number(row.amount),
      state: installmentState(row.status, row.due_date),
    }));
    if (filter === "all") return all;
    if (filter === "open") return all.filter((r) => r.state === "pending");
    if (filter === "overdue") return all.filter((r) => r.state === "overdue");
    return all.filter((r) => r.state === "paid");
  }, [rows, filter]);

  const totals = useMemo(() => {
    const all = (rows ?? []).map((r) => ({
      amount: Number(r.amount),
      state: installmentState(r.status, r.due_date),
      due: r.due_date,
    }));
    const week = Date.now() + 7 * 86_400_000;
    return {
      total: all.reduce((s, r) => s + r.amount, 0),
      received: all.filter((r) => r.state === "paid").reduce((s, r) => s + r.amount, 0),
      pending: all
        .filter((r) => r.state === "pending" || r.state === "overdue")
        .reduce((s, r) => s + r.amount, 0),
      week: all
        .filter(
          (r) =>
            r.state === "pending" && new Date(`${r.due.slice(0, 10)}T12:00:00Z`).getTime() <= week,
        )
        .reduce((s, r) => s + r.amount, 0),
      overdue: all.filter((r) => r.state === "overdue").reduce((s, r) => s + r.amount, 0),
    };
  }, [rows]);

  async function charge(row: Row & { state: string }) {
    const origin = window.location.origin;
    const link = collectionLink(origin, row.public_token);
    const product =
      (row.orders?.order_items ?? [])
        .map((i) => `${i.product_name}${i.variant_label ? ` (${i.variant_label})` : ""}`)
        .join(", ") || "seu pedido";
    const message = reminderMessage({
      customerName: row.orders?.customer_name ?? "",
      productName: product,
      number: row.installment_number,
      total: row.total_installments,
      amount: Number(row.amount),
      dueDate: row.due_date,
      link,
      late: row.state === "overdue",
    });
    try {
      await saveReminder({ data: { installmentId: row.id, link, message } });
    } catch {
      /* o registro do histórico não deve bloquear a cobrança */
    }
    window.open(whatsappLink(row.orders?.customer_whatsapp ?? "", message), "_blank", "noopener");
  }

  if (store && !isPro) {
    return (
      <AppShell title="Cobranças" description="Parcelamento e controle de parcelas">
        <Paywall
          title="Cobranças e parcelamento"
          text="Controle de parcelas, links de cobrança e lembretes pelo WhatsApp fazem parte do plano PRO."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Cobranças" description="Parcelas a receber e lembretes">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total parcelado" value={brl(totals.total)} icon={Wallet} />
        <StatCard label="Recebido" value={brl(totals.received)} icon={CheckCircle2} />
        <StatCard label="A receber" value={brl(totals.pending)} icon={Clock} />
        <StatCard label="Em atraso" value={brl(totals.overdue)} icon={AlertTriangle} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Vencendo nos próximos 7 dias: <strong>{brl(totals.week)}</strong>
      </p>

      <Tabs value={filter} onValueChange={setFilter} className="mt-5">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="open">A vencer</TabsTrigger>
          <TabsTrigger value="overdue">Em atraso</TabsTrigger>
          <TabsTrigger value="paid">Pagas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 space-y-3">
        {list.length === 0 ? (
          <div className="surface p-8 text-center text-sm text-muted-foreground">
            Nenhuma parcela por aqui ainda. Ative o parcelamento em Minha Loja para começar.
          </div>
        ) : null}

        {list.map((row) => (
          <div key={row.id} className="surface space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {row.orders?.customer_name || "Cliente sem nome"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {(row.orders?.order_items ?? [])
                    .map((i) => `${i.quantity}x ${i.product_name}`)
                    .join(", ") || "Pedido"}
                </p>
              </div>
              <Badge
                variant={
                  row.state === "paid"
                    ? "default"
                    : row.state === "overdue"
                      ? "destructive"
                      : "secondary"
                }
              >
                {row.state === "paid"
                  ? "Pago"
                  : row.state === "overdue"
                    ? `🔴 ${daysLate(row.due_date)} dia(s) em atraso`
                    : "Pendente"}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-medium">
                Parcela {row.installment_number}/{row.total_installments}
              </span>
              <span className="text-lg font-bold">{brl(Number(row.amount))}</span>
              <span className="text-muted-foreground">Vence {formatDay(row.due_date)}</span>
            </div>

            {row.state !== "paid" ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="h-11 flex-1" variant="outline" onClick={() => charge(row)}>
                  <MessageCircle className="mr-2 size-4" /> Cobrar pelo WhatsApp
                </Button>
                <Button className="h-11 flex-1" onClick={() => setConfirming(row)}>
                  <CheckCircle2 className="mr-2 size-4" /> Marcar como pago
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Confirmado em {row.paid_at ? formatDay(row.paid_at) : "—"} · Pix
              </p>
            )}
          </div>
        ))}
      </div>

      <AlertDialog open={Boolean(confirming)} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar recebimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Marque como pago somente depois de conferir o Pix na sua conta. O Vitrini não confirma
              pagamentos automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirming) paidMutation.mutate(confirming);
                setConfirming(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
