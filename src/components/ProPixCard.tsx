import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, MessageCircle, QrCode as QrCodeIcon } from "lucide-react";
import { toast } from "sonner";
import {
  createProPixRequest,
  getMyProPixRequests,
  getProPixCheckout,
} from "@/lib/pro-pix.functions";
import { brl, formatDate, formatDay, PRO_PLAN_PRICE } from "@/lib/format";
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
  pending: "🟡 Aguardando confirmação",
  approved: "🟢 Aprovado",
  rejected: "🔴 Recusado",
  canceled: "⚪ Cancelado",
};

/** WhatsApp do administrador master do Vitrini. */
const ADMIN_WHATSAPP = "5531975414498";

function adminWhatsAppUrl(requestId?: string | null) {
  const text = [
    "Olá! Acabei de pagar o Vitrini PRO via Pix.",
    `Valor: ${brl(PRO_PLAN_PRICE)}`,
    requestId ? `Solicitação: ${requestId}` : null,
    "Pode liberar meu PRO, por favor?",
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

export function ProPixCard({ hasPro }: { hasPro: boolean }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const fetchCheckout = useServerFn(getProPixCheckout);
  const fetchRequests = useServerFn(getMyProPixRequests);
  const createRequest = useServerFn(createProPixRequest);

  const { data: mine } = useQuery({
    queryKey: ["pro-pix-requests"],
    queryFn: () => fetchRequests(),
  });

  const { data: checkout, isLoading: checkoutLoading } = useQuery({
    queryKey: ["pro-pix-checkout"],
    enabled: open,
    queryFn: () => fetchCheckout(),
  });

  const requestMutation = useMutation({
    mutationFn: () => createRequest(),
    onSuccess: (result) => {
      if (result.created) {
        toast.success("Pagamento enviado para análise.");
        setOpen(false);
        window.open(adminWhatsAppUrl(result.requestId ?? null), "_blank", "noopener");
      } else {
        toast.info(result.message);
      }
      queryClient.invalidateQueries({ queryKey: ["pro-pix-requests"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "";
      toast.error(message || "Não foi possível registrar sua solicitação agora.");
    },
  });

  const latest = mine?.requests[0] ?? null;
  const pending = latest?.status === "pending";
  const activeUntil = mine?.activeUntil ?? null;

  const daysLeft = activeUntil
    ? Math.ceil((new Date(activeUntil).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  function copyPayload() {
    if (!checkout?.payload) return;
    void navigator.clipboard.writeText(checkout.payload).then(() => {
      toast.success("Código Pix copiado!");
    });
  }

  return (
    <section className="surface mt-5 space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">🟢 Pix — pagamento avulso</p>
          <p className="text-xs text-muted-foreground">
            {brl(PRO_PLAN_PRICE)} · validade de 30 dias · ativação após aprovação administrativa
          </p>
        </div>
        {activeUntil ? <Badge>PRO até {formatDay(activeUntil)}</Badge> : null}
      </div>

      {pending ? (
        <div className="rounded-lg border border-dashed p-3 text-sm">
          <p className="font-semibold">Pagamento enviado para análise</p>
          <dl className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            <div>Plano: Vitrini PRO</div>
            <div>Valor: {brl(latest!.amount)}</div>
            <div>Forma: Pix</div>
            <div>Status: {PIX_STATUS_LABEL[latest!.status]}</div>
            <div>Solicitado em: {formatDate(latest!.requestedAt)}</div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            Seu pedido foi enviado para análise. O PRO será liberado após o administrador confirmar
            o recebimento do Pix.
          </p>
          <Button asChild variant="outline" className="mt-2 h-10 w-full">
            <a href={adminWhatsAppUrl(latest!.id)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 size-4" /> Avisar o administrador no WhatsApp
            </a>
          </Button>
        </div>
      ) : null}

      {!pending && latest?.status === "rejected" ? (
        <div className="rounded-lg border border-destructive/40 p-3 text-sm">
          <p className="font-semibold text-destructive">
            Sua solicitação de pagamento via Pix foi recusada.
          </p>
          {latest.rejectionReason ? (
            <p className="mt-1 text-xs text-muted-foreground">Motivo: {latest.rejectionReason}</p>
          ) : null}
        </div>
      ) : null}

      {activeUntil && daysLeft !== null && daysLeft <= 7 ? (
        <p className="text-xs text-muted-foreground">
          Seu Vitrini PRO vence em {daysLeft} dia{daysLeft === 1 ? "" : "s"}.
        </p>
      ) : null}

      {!pending ? (
        <Button className="h-11 w-full" variant={hasPro ? "outline" : "default"} onClick={() => setOpen(true)}>
          <QrCodeIcon className="mr-2 size-4" />
          {activeUntil
            ? "Renovar via Pix"
            : latest?.status === "rejected"
              ? "Tentar novamente"
              : "Assinar via Pix"}
        </Button>
      ) : null}

      {(mine?.requests.length ?? 0) > 0 ? (
        <div>
          <p className="pt-2 text-sm font-semibold">Histórico Pix</p>
          <ul className="mt-2 space-y-2 text-xs">
            {mine!.requests.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">{formatDay(request.requestedAt)}</span>
                <span>{brl(request.amount)} · Pix</span>
                <span className="text-muted-foreground">
                  {request.periodStart && request.periodEnd
                    ? `${formatDay(request.periodStart)} → ${formatDay(request.periodEnd)}`
                    : "—"}
                </span>
                <span>{PIX_STATUS_LABEL[request.status] ?? request.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vitrini PRO via Pix</DialogTitle>
            <DialogDescription>
              Valor {brl(PRO_PLAN_PRICE)} · validade de 30 dias após aprovação
            </DialogDescription>
          </DialogHeader>

          {checkoutLoading ? (
            <p className="text-sm text-muted-foreground">Gerando código Pix...</p>
          ) : checkout?.configured && checkout.payload ? (
            <div className="space-y-3">
              <div className="flex justify-center">
                <QrImage value={checkout.payload} size={200} alt="QR Code Pix do Vitrini PRO" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Pix Copia e Cola</p>
                <p className="mt-1 break-all rounded-lg bg-muted p-2 text-[11px]">
                  {checkout.payload}
                </p>
                <Button variant="outline" className="mt-2 h-10 w-full" onClick={copyPayload}>
                  <Copy className="mr-2 size-4" /> Copiar código Pix
                </Button>
              </div>
              {checkout.receiverName ? (
                <p className="text-xs text-muted-foreground">
                  Recebedor: {checkout.receiverName}
                </p>
              ) : null}
              <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                <strong>Importante:</strong> o pagamento via Pix não é confirmado automaticamente
                pelo Vitrini. Após realizar o pagamento, clique em “Já fiz o pagamento”. A liberação
                do PRO ocorrerá somente após a confirmação do administrador.
              </p>
              <Button
                className="h-11 w-full"
                onClick={() => requestMutation.mutate()}
                disabled={requestMutation.isPending}
              >
                {requestMutation.isPending ? "Enviando..." : "Já fiz o pagamento"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              O pagamento via Pix ainda não foi configurado pelo administrador. Tente novamente mais
              tarde ou use o Mercado Pago.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
