import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2, Copy, MessageCircle, Store as StoreIcon } from "lucide-react";
import { getCollection } from "@/lib/collection.functions";
import { brl, formatDay, installmentState, daysLate, whatsappLink, PIX_KEY_TYPES } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/cobranca/$token")({
  loader: ({ params }) => getCollection({ data: { token: params.token } }),
  head: () => ({
    meta: [
      { title: "Pagamento da parcela | Vitrini" },
      {
        name: "description",
        content: "Consulte os dados da sua parcela e pague por Pix diretamente ao vendedor.",
      },
      { property: "og:title", content: "Pagamento da parcela | Vitrini" },
      {
        property: "og:description",
        content: "Consulte os dados da sua parcela e pague por Pix diretamente ao vendedor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => (
    <Fallback title="Não foi possível carregar a cobrança." text="Tente novamente em instantes." />
  ),
  notFoundComponent: () => <Fallback title="Cobrança não encontrada." text="Verifique o link." />,
  component: CollectionPage,
});

function Fallback({ title, text }: { title: string; text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="surface max-w-sm p-6 text-center">
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      </div>
    </main>
  );
}

function CollectionPage() {
  const data = Route.useLoaderData();

  if (!data) {
    return (
      <Fallback
        title="Cobrança não encontrada."
        text="O link pode ter expirado ou estar incorreto."
      />
    );
  }

  const state = installmentState(data.status, data.dueDate);
  const late = state === "overdue";
  const paid = state === "paid";
  const pixLabel = PIX_KEY_TYPES.find((t) => t.value === data.pixKeyType)?.label ?? "Chave Pix";

  const message = [
    `Olá! Acabei de realizar o pagamento da parcela ${data.installmentNumber}/${data.totalInstallments} referente ao produto "${data.productName}".`,
    `Valor: ${brl(data.amount)}`,
  ].join("\n");

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-4">
        <header className="surface flex items-center gap-3 p-4">
          <span
            className="flex size-11 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: data.primaryColor }}
          >
            <StoreIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold">{data.storeName}</h1>
            <p className="truncate text-xs text-muted-foreground">
              Cobrança de {data.customerName || "cliente"}
            </p>
          </div>
        </header>

        <section className="surface space-y-3 p-5">
          <div className="flex items-center justify-between">
            <Badge variant={paid ? "default" : late ? "destructive" : "secondary"}>
              {paid ? "Pago" : late ? `Em atraso · ${daysLate(data.dueDate)} dia(s)` : "Pendente"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Parcela {data.installmentNumber} de {data.totalInstallments}
            </span>
          </div>

          <p className="text-sm text-muted-foreground">{data.productName}</p>
          <p className="text-4xl font-bold">{brl(data.amount)}</p>
          <p className="text-sm text-muted-foreground">
            Vencimento: <strong>{formatDay(data.dueDate)}</strong>
          </p>
          {paid && data.paidAt ? (
            <p className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle2 className="size-4" /> Pagamento confirmado pelo vendedor.
            </p>
          ) : null}
        </section>

        {!paid ? (
          <section className="surface space-y-3 p-5">
            <p className="text-sm font-semibold">Pague com Pix</p>
            <p className="text-xs text-muted-foreground">{pixLabel} do vendedor</p>
            <p className="font-mono text-sm break-all">{data.pixKey || "Chave Pix não cadastrada"}</p>
            <Button
              className="h-12 w-full"
              disabled={!data.pixKey}
              onClick={async () => {
                await navigator.clipboard.writeText(data.pixKey);
                toast.success("Chave Pix copiada.");
              }}
            >
              <Copy className="mr-2 size-4" /> Copiar chave Pix
            </Button>
            <Button
              variant="outline"
              className="h-12 w-full"
              onClick={() =>
                window.open(whatsappLink(data.whatsapp, message), "_blank", "noopener")
              }
            >
              <MessageCircle className="mr-2 size-4" /> Já paguei, avisar vendedor
            </Button>
            <p className="text-xs text-muted-foreground">
              O pagamento vai direto para o vendedor. O Vitrini não recebe nem guarda esse valor —
              a confirmação é feita pelo vendedor após verificar o recebimento.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
