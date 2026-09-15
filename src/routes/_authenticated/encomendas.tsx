import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PackageOpen, Search, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brl, formatDate, whatsappLink } from "@/lib/format";
import { getMyEncomendas, updateEncomenda, type EncomendaStatus } from "@/lib/encomendas.functions";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/encomendas")({ component: Encomendas });

const STATUS: Record<EncomendaStatus, string> = {
  aguardando_confirmacao: "Aguardando confirmação",
  confirmada: "Confirmada",
  em_producao: "Em produção",
  pronta: "Pronta",
  entregue: "Entregue",
  cancelada: "Cancelada",
};

function Encomendas() {
  const queryClient = useQueryClient();
  const fetch = useServerFn(getMyEncomendas);
  const update = useServerFn(updateEncomenda);
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("all");
  const { data, isLoading } = useQuery({ queryKey: ["encomendas"], queryFn: () => fetch() });
  const mutation = useMutation({
    mutationFn: (input: { id: string; status: EncomendaStatus }) => update({ data: input }),
    onSuccess: () => {
      toast.success("Status atualizado.");
      queryClient.invalidateQueries({ queryKey: ["encomendas"] });
    },
    onError: () => toast.error("Não foi possível atualizar a encomenda."),
  });
  const rows = useMemo(
    () =>
      (data?.encomendas ?? []).filter((row) => {
        const matchesTerm =
          !term ||
          `${row.number} ${row.customer_name} ${row.customer_whatsapp} ${row.products?.name ?? ""}`
            .toLowerCase()
            .includes(term.toLowerCase());
        return matchesTerm && (status === "all" || row.status === status);
      }),
    [data, status, term],
  );
  return (
    <AppShell title="Encomendas" description="Solicitações de produção sob encomenda">
      <div className="surface mb-4 flex flex-col gap-2 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por número, cliente ou produto"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="surface p-8 text-center text-sm text-muted-foreground">
          Carregando encomendas...
        </div>
      ) : rows.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-muted-foreground">
          <PackageOpen className="mx-auto mb-2 size-8" />
          Nenhuma encomenda encontrada.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="surface space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">Encomenda #{row.number}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.products?.name ?? "Produto removido"} · {row.quantity} unidades
                  </p>
                </div>
                <Badge>{STATUS[row.status as EncomendaStatus] ?? row.status}</Badge>
              </div>
              <div className="grid gap-1 text-sm sm:grid-cols-4">
                <span>
                  <b>Cliente:</b> {row.customer_name || "Não informado"}
                </span>
                <span>
                  <b>Valor:</b> {brl(Number(row.total))}
                </span>
                <span>
                  <b>Data:</b> {formatDate(row.created_at)}
                </span>
                <span>
                  <b>Prazo:</b> {row.lead_time || "A combinar"}
                </span>
              </div>
              {row.customer_note ? (
                <p className="rounded-md bg-muted p-2 text-sm">
                  <b>Observações:</b> {row.customer_note}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Select
                  value={row.status}
                  onValueChange={(value) =>
                    mutation.mutate({ id: row.id, status: value as EncomendaStatus })
                  }
                >
                  <SelectTrigger className="w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {row.customer_whatsapp ? (
                  <Button size="sm" variant="outline" asChild>
                    <a
                      href={whatsappLink(
                        row.customer_whatsapp,
                        `Olá, ${row.customer_name}! Sobre sua encomenda #${row.number}...`,
                      )}
                      target="_blank"
                      rel="noopener"
                    >
                      <MessageCircle className="mr-1 size-4" /> WhatsApp
                    </a>
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
