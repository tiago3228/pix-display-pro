import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Copy, ExternalLink, QrCode as QrCodeIcon } from "lucide-react";
import { toast } from "sonner";
import {
  createMercadoPagoPixPayment,
  getMyMercadoPagoPixPayments,
  type MercadoPagoPixPaymentView,
} from "@/lib/mercadopago-pix.functions";
import { brl, formatDay } from "@/lib/format";
import { usePlansPricing } from "@/hooks/usePricing";
import { QrImage } from "@/components/QrCode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const PIX_STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  in_process: "Em processamento",
  approved: "Pago e aprovado",
  rejected: "Recusado",
  cancelled: "Cancelado",
  canceled: "Cancelado",
  expired: "Expirado",
};

type PlanKey = "basica" | "pro";

function isPending(payment: MercadoPagoPixPaymentView | null) {
  return Boolean(payment && ["pending", "in_process"].includes(payment.status));
}

export function ProPixCard({ hasPro, plan = "pro" }: { hasPro: boolean; plan?: PlanKey }) {
  const [open, setOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<MercadoPagoPixPaymentView | null>(null);
  const plans = usePlansPricing();
  const queryClient = useQueryClient();
  const planPrice = plan === "basica" ? plans.basicPrice : plans.proPrice;
  const planLabel = plan === "basica" ? "Básica" : "PRO";
  const fetchPayments = useServerFn(getMyMercadoPagoPixPayments);
  const createPayment = useServerFn(createMercadoPagoPixPayment);

  const { data } = useQuery({
    queryKey: ["mercadopago-pix-payments"],
    queryFn: () => fetchPayments(),
    refetchInterval: open ? 8_000 : false,
  });

  const createMutation = useMutation({
    mutationFn: () => createPayment({ data: { plan } }),
    onSuccess: (result) => {
      setSelectedPayment(result.payment);
      queryClient.invalidateQueries({ queryKey: ["mercadopago-pix-payments"] });
      toast.success(result.reused ? "Abrimos seu Pix pendente." : "Pix gerado pelo Mercado Pago.");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "";
      toast.error(message || "Não foi possível gerar o Pix agora.");
    },
  });

  const payments = data?.payments ?? [];
  const latestForPlan = payments.find((payment) => payment.plan === plan) ?? null;
  const payment =
    (selectedPayment && payments.find((item) => item.id === selectedPayment.id)) ??
    selectedPayment ??
    latestForPlan;
  const pending = isPending(payment);
  const activeUntil = payments.find(
    (item) => item.plan === "pro" && item.status === "approved" && item.expiresAt,
  )?.expiresAt;

  function copyPixCode() {
    if (!payment?.qrCode) return;
    void navigator.clipboard
      .writeText(payment.qrCode)
      .then(() => toast.success("Pix Copia e Cola copiado."));
  }

  function openCheckout() {
    setSelectedPayment(null);
    setOpen(true);
  }

  return (
    <section className="surface mt-5 space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Pix via Mercado Pago — plano {planLabel}</p>
          <p className="text-xs text-muted-foreground">
            {brl(planPrice)} · QR Code dinâmico · confirmação automática
          </p>
        </div>
        {activeUntil ? <Badge>PRO até {formatDay(activeUntil)}</Badge> : null}
      </div>

      {pending ? (
        <div className="rounded-lg border border-dashed p-3 text-sm">
          <p className="font-semibold">Pix aguardando pagamento</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pague pelo QR Code ou Pix Copia e Cola. A confirmação será recebida automaticamente pelo
            Mercado Pago.
          </p>
        </div>
      ) : null}

      {payment?.status === "approved" ? (
        <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">Pagamento aprovado</p>
            <p className="text-xs text-muted-foreground">
              Seu plano foi atualizado automaticamente após a confirmação do Mercado Pago.
            </p>
          </div>
        </div>
      ) : null}

      <Button
        className="h-11 w-full"
        variant={hasPro ? "outline" : "default"}
        onClick={openCheckout}
      >
        <QrCodeIcon className="mr-2 size-4" />
        {activeUntil ? "Gerar Pix para renovar" : `Pagar ${planLabel} com Pix`}
      </Button>

      {payments.filter((item) => item.plan === plan).length > 0 ? (
        <div>
          <p className="pt-2 text-sm font-semibold">Histórico Pix Mercado Pago</p>
          <ul className="mt-2 space-y-2 text-xs">
            {payments
              .filter((item) => item.plan === plan)
              .slice(0, 5)
              .map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">{formatDay(item.createdAt)}</span>
                  <span>{brl(item.amount)}</span>
                  <span>{PIX_STATUS_LABEL[item.status] ?? item.status}</span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pagamento {planLabel} via Pix</DialogTitle>
            <DialogDescription>
              {brl(payment?.amount ?? planPrice)} · processado com segurança pelo Mercado Pago
            </DialogDescription>
          </DialogHeader>

          {!payment ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Gere um QR Code Pix exclusivo para esta cobrança. O pagamento será confirmado
                automaticamente pelo Mercado Pago.
              </p>
              <Button
                className="h-11 w-full"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Gerando Pix..." : "Gerar QR Code Pix"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {payment.qrCodeBase64 ? (
                <div className="flex justify-center">
                  <img
                    src={`data:image/png;base64,${payment.qrCodeBase64}`}
                    alt={`QR Code Pix do plano ${planLabel}`}
                    className="size-52 rounded-lg border p-2"
                  />
                </div>
              ) : payment.qrCode ? (
                <div className="flex justify-center">
                  <QrImage
                    value={payment.qrCode}
                    size={208}
                    alt={`QR Code Pix do plano ${planLabel}`}
                  />
                </div>
              ) : null}

              {payment.qrCode ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Pix Copia e Cola</p>
                  <p className="mt-1 max-h-28 overflow-y-auto break-all rounded-lg bg-muted p-2 text-[11px]">
                    {payment.qrCode}
                  </p>
                  <Button variant="outline" className="mt-2 h-10 w-full" onClick={copyPixCode}>
                    <Copy className="mr-2 size-4" /> Copiar Pix Copia e Cola
                  </Button>
                </div>
              ) : null}

              {payment.ticketUrl ? (
                <Button asChild variant="outline" className="h-10 w-full">
                  <a href={payment.ticketUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 size-4" /> Abrir instruções de pagamento
                  </a>
                </Button>
              ) : null}

              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                <strong>Status:</strong> {PIX_STATUS_LABEL[payment.status] ?? payment.status}.
                {pending
                  ? " Após o pagamento, aguarde a confirmação automática nesta tela."
                  : " O status é atualizado pelo webhook do Mercado Pago."}
              </div>

              {payment.status !== "approved" && !pending ? (
                <Button
                  className="h-10 w-full"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Gerando..." : "Gerar novo Pix"}
                </Button>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
