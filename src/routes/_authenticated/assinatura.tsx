import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useMyStore } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { ProPixCard } from "@/components/ProPixCard";

import {
  cancelProSubscription,
  getMySubscription,
  startProSubscription,
} from "@/lib/subscription.functions";
import { brl, formatDay, FREE_PLAN_PRODUCT_LIMIT, PRO_PLAN_PRICE } from "@/lib/format";
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

export const Route = createFileRoute("/_authenticated/assinatura")({
  head: () => ({
    meta: [
      { title: "Assinatura Vitrini PRO | Vitrini" },
      {
        name: "description",
        content:
          "Assine o Vitrini PRO por R$ 9,90/mês e libere produtos ilimitados, parcelamento e cobranças.",
      },
      { property: "og:title", content: "Assinatura Vitrini PRO" },
      {
        property: "og:description",
        content: "Produtos ilimitados, parcelamento e cobranças por R$ 9,90/mês.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Subscription,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando confirmação",
  active: "Ativo",
  authorized: "Ativo",
  past_due: "Pagamento pendente",
  paused: "Pausado",
  canceled: "Cancelado",
  expired: "Expirado",
};

const FREE_FEATURES = [
  `Até ${FREE_PLAN_PRODUCT_LIMIT} produtos`,
  "Vitrine pública com link e QR Code",
  "Pedidos pelo WhatsApp",
  "Pix à vista",
  "Painel de pedidos e clientes",
];

const PRO_FEATURES = [
  "Produtos ilimitados",
  "Variações e controle de estoque",
  "Parcelamento das vendas",
  "Controle de parcelas e links de cobrança",
  "Lembretes de cobrança pelo WhatsApp",
  "Dashboard financeiro e relatórios",
];

function Subscription() {
  const { data: store } = useMyStore();
  const queryClient = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const fetchSubscription = useServerFn(getMySubscription);
  const start = useServerFn(startProSubscription);
  const cancel = useServerFn(cancelProSubscription);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-subscription"],
    enabled: Boolean(store?.id),
    queryFn: () => fetchSubscription(),
  });

  const startMutation = useMutation({
    mutationFn: () => start({ data: { origin: window.location.origin } }),
    onSuccess: (result) => {
      if (result.alreadyActive) {
        toast.info("Sua assinatura PRO já está ativa.");
        queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
        return;
      }
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      toast.error("Não foi possível iniciar a assinatura agora.");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "";
      toast.error(message || "Não foi possível iniciar a assinatura agora.");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancel(),
    onSuccess: () => {
      toast.success("Cancelamento solicitado. O status será atualizado pelo Mercado Pago.");
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["my-store"] });
    },
    onError: () => toast.error("Não foi possível cancelar a assinatura agora."),
  });

  const subscription = data?.subscription ?? null;
  const isPro = data?.hasProAccess ?? false;

  return (
    <AppShell title="Assinatura" description="Plano Vitrini PRO">
      {data?.environment === "test" ? (
        <div className="mb-4 space-y-1 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
          <p>Ambiente de testes do Mercado Pago. Nenhuma cobrança real é feita.</p>
          <p>
            Importante: no checkout você precisa estar logado em uma conta Mercado Pago
            <strong> diferente da conta vendedora</strong> (a que recebe o pagamento). Com a mesma
            conta, o botão “Confirmar” fica desabilitado. Use uma conta de teste comprador ou uma
            janela anônima.
          </p>
          <p>
            Cartões reais são <strong>sempre recusados</strong> em teste. Use um cartão de teste:
            Mastercard <strong>5031 4332 1540 6351</strong>, validade <strong>11/30</strong>, CVV{" "}
            <strong>123</strong>, titular <strong>APRO</strong> (aprovado) e CPF{" "}
            <strong>123.456.789-09</strong>. Titular <strong>OTHE</strong> simula recusa.
          </p>
        </div>
      ) : null}



      {subscription ? (
        <section className="surface mb-5 space-y-2 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Minha assinatura</p>
            <Badge variant={isPro ? "default" : "secondary"}>
              {STATUS_LABEL[subscription.status] ?? subscription.status}
            </Badge>
          </div>
          <p className="text-2xl font-bold">
            {brl(subscription.amount)}
            <span className="text-sm font-normal text-muted-foreground">/mês</span>
          </p>
          <dl className="grid gap-1 text-sm text-muted-foreground">
            {subscription.nextBillingDate ? (
              <div>
                Próxima cobrança: <strong>{formatDay(subscription.nextBillingDate)}</strong>
              </div>
            ) : null}
            {subscription.lastPaymentAt ? (
              <div>Último pagamento: {formatDay(subscription.lastPaymentAt)}</div>
            ) : null}
            {subscription.status === "past_due" && subscription.graceUntil ? (
              <div className="text-destructive">
                Regularize até {formatDay(subscription.graceUntil)} para manter o PRO ativo.
              </div>
            ) : null}
            {subscription.canceledAt ? (
              <div>Cancelada em {formatDay(subscription.canceledAt)}</div>
            ) : null}
          </dl>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            {subscription.status === "pending" && subscription.initPoint ? (
              <Button asChild className="h-11 flex-1">
                <a href={subscription.initPoint}>
                  <ExternalLink className="mr-2 size-4" /> Concluir pagamento
                </a>
              </Button>
            ) : null}
            {["pending", "active", "authorized", "past_due", "paused"].includes(
              subscription.status,
            ) ? (
              <Button
                variant="outline"
                className="h-11 flex-1"
                onClick={() => setConfirmCancel(true)}
                disabled={cancelMutation.isPending}
              >
                Cancelar assinatura
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <PlanCard
          name="Gratuito"
          price="R$ 0"
          features={FREE_FEATURES}
          active={!isPro}
          footer={
            <Button className="mt-5 h-11 w-full" variant="outline" disabled>
              {isPro ? "Disponível ao cancelar" : "Plano atual"}
            </Button>
          }
        />
        <PlanCard
          name="PRO"
          price={`${brl(PRO_PLAN_PRICE)}/mês`}
          features={PRO_FEATURES}
          active={isPro}
          footer={
            isPro ? (
              <Button className="mt-5 h-11 w-full" disabled>
                Plano ativo
              </Button>
            ) : (
              <Button
                className="mt-5 h-11 w-full"
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending || isLoading}
              >
                <Sparkles className="mr-2 size-4" />
                {startMutation.isPending ? "Abrindo o Mercado Pago..." : "Assinar PRO"}
              </Button>
            )
          }
        />
      </div>

      <ProPixCard hasPro={isPro} />

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Assinatura recorrente de {brl(PRO_PLAN_PRICE)} por mês, cobrada automaticamente pelo Mercado
        Pago. Você pode cancelar quando quiser e o acesso permanece até o fim do período já pago. A
        liberação do PRO acontece apenas após a confirmação do Mercado Pago. No Pix, a liberação
        depende da confirmação manual do administrador.
      </p>


      {isError ? (
        <p className="mt-3 text-center text-xs text-destructive">
          Não foi possível consultar o status da assinatura agora.
        </p>
      ) : null}

      {(data?.payments.length ?? 0) > 0 ? (
        <section className="surface mt-5 p-5">
          <p className="text-sm font-semibold">Histórico de cobranças</p>
          <ul className="mt-3 space-y-2 text-sm">
            {data!.payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {formatDay(payment.paidAt ?? payment.createdAt)}
                </span>
                <span>{brl(payment.amount)}</span>
                <Badge variant={payment.status === "approved" ? "default" : "secondary"}>
                  {payment.status === "approved" ? "Pago" : payment.status}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja cancelar o PRO?</AlertDialogTitle>
            <AlertDialogDescription>
              O cancelamento é enviado ao Mercado Pago e novas cobranças deixam de ser feitas. Seu
              histórico é preservado e sua loja volta ao plano gratuito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter PRO</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelMutation.mutate()}>
              Cancelar assinatura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function PlanCard({
  name,
  price,
  features,
  active,
  footer,
}: {
  name: string;
  price: string;
  features: string[];
  active: boolean;
  footer: React.ReactNode;
}) {
  return (
    <div className={`surface flex flex-col p-5 ${active ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold">{name}</p>
        {active ? <Badge>Plano atual</Badge> : null}
      </div>
      <p className="mt-1 text-2xl font-bold">{price}</p>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            {feature}
          </li>
        ))}
      </ul>
      {footer}
    </div>
  );
}
