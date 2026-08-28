import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { PIX_STATUS_LABEL } from "@/components/ProPixCard";
import {
  approveProPixRequest,
  getPixSettingsAdmin,
  grantProManually,
  listProPixRequests,
  listStoresForProGrant,
  rejectProPixRequest,
  savePixSettings,
  type ProPixRequestView,
} from "@/lib/pro-pix.functions";
import { brl, formatDate, formatDay, PIX_KEY_TYPES } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin_/solicitacoes-pro")({
  head: () => ({
    meta: [
      { title: "Solicitações PRO via Pix | Vitrini" },
      {
        name: "description",
        content: "Painel administrativo para conferir e aprovar pagamentos do Vitrini PRO via Pix.",
      },
      { property: "og:title", content: "Solicitações PRO via Pix" },
      {
        property: "og:description",
        content: "Aprove ou recuse pagamentos manuais do Vitrini PRO.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProPixAdmin,
});

const FILTERS = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "approved", label: "Aprovadas" },
  { value: "rejected", label: "Recusadas" },
  { value: "canceled", label: "Canceladas" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

function ProPixAdmin() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<ProPixRequestView | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const fetchList = useServerFn(listProPixRequests);
  const approve = useServerFn(approveProPixRequest);
  const reject = useServerFn(rejectProPixRequest);

  const { data } = useQuery({
    queryKey: ["admin-pro-pix", filter],
    enabled: isAdmin === true,
    queryFn: () => fetchList({ data: { status: filter } }),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin-pro-pix"] });
    queryClient.invalidateQueries({ queryKey: ["admin-pro-pix-pending"] });
  }

  const approveMutation = useMutation({
    mutationFn: (id: string) => approve({ data: { id } }),
    onSuccess: () => {
      toast.success("Pagamento aprovado. PRO liberado por 30 dias.");
      setApproveOpen(false);
      setSelected(null);
      refresh();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível aprovar."),
  });

  const rejectMutation = useMutation({
    mutationFn: (payload: { id: string; reason: string }) => reject({ data: payload }),
    onSuccess: () => {
      toast.success("Solicitação recusada.");
      setRejectOpen(false);
      setReason("");
      setSelected(null);
      refresh();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível recusar."),
  });

  if (isLoading) {
    return (
      <AppShell title="Solicitações PRO">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Solicitações PRO">
        <div className="surface p-10 text-center text-sm text-muted-foreground">
          Você não tem acesso a esta área.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Solicitações PRO" description="Pagamentos do Vitrini PRO via Pix">
      {(data?.pendingCount ?? 0) > 0 ? (
        <div className="mb-4 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          🔔 <strong>Nova solicitação PRO via Pix</strong> — {data!.pendingCount} solicitação(ões) de{" "}
          {brl(9.9)} aguardando confirmação.
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={filter === item.value ? "default" : "outline"}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="surface divide-y divide-border p-4">
        {(data?.requests ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma solicitação encontrada.
          </p>
        ) : null}
        {(data?.requests ?? []).map((request) => (
          <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{request.storeName ?? "Loja"}</p>
              <p className="text-xs text-muted-foreground">
                Pix · {brl(request.amount)} · {formatDate(request.requestedAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={request.status === "approved" ? "default" : "secondary"}>
                {PIX_STATUS_LABEL[request.status] ?? request.status}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => setSelected(request)}>
                Ver
              </Button>
              {request.status === "pending" ? (
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate(request.id)}
                  disabled={approveMutation.isPending}
                >
                  Liberar PRO
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <ManualGrantSection />

      <PixSettingsSection />

      <Dialog open={Boolean(selected)} onOpenChange={(open) => (open ? null : setSelected(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dados da solicitação</DialogTitle>
            <DialogDescription>Confira antes de aprovar ou recusar.</DialogDescription>
          </DialogHeader>
          {selected ? (
            <dl className="space-y-1 text-sm">
              <div>Loja: {selected.storeName ?? "—"}</div>
              <div className="break-all text-xs text-muted-foreground">
                Usuário: {selected.userId}
              </div>
              <div>Valor: {brl(selected.amount)}</div>
              <div>Método: Pix (manual)</div>
              <div>Data: {formatDate(selected.requestedAt)}</div>
              <div>Status: {PIX_STATUS_LABEL[selected.status] ?? selected.status}</div>
              <div>
                Período:{" "}
                {selected.periodStart && selected.periodEnd
                  ? `${formatDay(selected.periodStart)} → ${formatDay(selected.periodEnd)}`
                  : "definido na aprovação (30 dias)"}
              </div>
              {selected.rejectionReason ? (
                <div className="text-destructive">Motivo da recusa: {selected.rejectionReason}</div>
              ) : null}
            </dl>
          ) : null}
          {selected?.status === "pending" ? (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRejectOpen(true)}>
                ❌ Recusar
              </Button>
              <Button onClick={() => setApproveOpen(true)}>✅ Aprovar pagamento</Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar que o Pix de {brl(9.9)} foi recebido?</DialogTitle>
            <DialogDescription>
              Ao aprovar, você confirma que verificou o recebimento do Pix de {brl(9.9)} fora do
              Vitrini. Essa ação libera o plano PRO por 30 dias.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={approveMutation.isPending}
              onClick={() => selected && approveMutation.mutate(selected.id)}
            >
              Confirmar aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informe o motivo da recusa</DialogTitle>
            <DialogDescription>
              Ex.: Pix não localizado, valor incorreto, pagamento não identificado.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Motivo da recusa"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending || reason.trim().length < 3}
              onClick={() =>
                selected && rejectMutation.mutate({ id: selected.id, reason: reason.trim() })
              }
            >
              Recusar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function PixSettingsSection() {
  const fetchSettings = useServerFn(getPixSettingsAdmin);
  const save = useServerFn(savePixSettings);
  const queryClient = useQueryClient();

  const { data } = useQuery({ queryKey: ["pix-settings"], queryFn: () => fetchSettings() });

  const [form, setForm] = useState<{
    pixKey: string;
    pixKeyType: string;
    receiverName: string;
    receiverCity: string;
    isActive: boolean;
  } | null>(null);

  const state = form ?? {
    pixKey: data?.pixKey ?? "",
    pixKeyType: data?.pixKeyType ?? "aleatoria",
    receiverName: data?.receiverName ?? "",
    receiverCity: data?.receiverCity ?? "",
    isActive: data?.isActive ?? true,
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          pixKey: state.pixKey.trim(),
          pixKeyType: state.pixKeyType as "cpf" | "cnpj" | "email" | "telefone" | "aleatoria",
          receiverName: state.receiverName.trim(),
          receiverCity: state.receiverCity.trim(),
          isActive: state.isActive,
        },
      }),
    onSuccess: () => {
      toast.success("Configuração do Pix salva.");
      queryClient.invalidateQueries({ queryKey: ["pix-settings"] });
      queryClient.invalidateQueries({ queryKey: ["pro-pix-checkout"] });
    },
    onError: () => toast.error("Verifique os dados informados."),
  });

  return (
    <section className="surface mt-4 space-y-3 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Configuração do PRO via Pix</p>
        <Badge variant={state.isActive && state.pixKey ? "default" : "secondary"}>
          {state.isActive && state.pixKey ? "Pix ativo" : "Pix inativo"}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="pix-key">Chave Pix</Label>
          <Input
            id="pix-key"
            value={state.pixKey}
            onChange={(event) => setForm({ ...state, pixKey: event.target.value })}
          />
        </div>
        <div>
          <Label>Tipo da chave</Label>
          <Select
            value={state.pixKeyType}
            onValueChange={(value) => setForm({ ...state, pixKeyType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIX_KEY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="pix-name">Nome do recebedor</Label>
          <Input
            id="pix-name"
            value={state.receiverName}
            onChange={(event) => setForm({ ...state, receiverName: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="pix-city">Cidade</Label>
          <Input
            id="pix-city"
            value={state.receiverCity}
            onChange={(event) => setForm({ ...state, receiverCity: event.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="pix-active"
          checked={state.isActive}
          onCheckedChange={(checked) => setForm({ ...state, isActive: checked })}
        />
        <Label htmlFor="pix-active">Pagamento via Pix ativo</Label>
      </div>

      <Button
        className="h-11 w-full sm:w-auto"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
      >
        Salvar configuração
      </Button>
    </section>
  );
}

/** Liberação manual: o Pix caiu na conta mas o lojista não registrou a solicitação. */
function ManualGrantSection() {
  const fetchStores = useServerFn(listStoresForProGrant);
  const grant = useServerFn(grantProManually);
  const queryClient = useQueryClient();
  const [storeId, setStoreId] = useState("");
  const [note, setNote] = useState("");

  const { data: stores } = useQuery({
    queryKey: ["admin-stores-pro"],
    queryFn: () => fetchStores(),
  });

  const grantMutation = useMutation({
    mutationFn: () => grant({ data: { storeId, note: note.trim() || undefined } }),
    onSuccess: () => {
      toast.success("PRO liberado por 30 dias para a loja.");
      setStoreId("");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-pro-pix"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stores-pro"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível liberar o PRO."),
  });

  return (
    <section className="surface mt-4 space-y-3 p-4">
      <div>
        <h2 className="text-sm font-semibold">Liberar PRO manualmente</h2>
        <p className="text-xs text-muted-foreground">
          Use quando o Pix de {brl(9.9)} já caiu na sua conta, mas o lojista não enviou a
          solicitação pelo app. Libera 30 dias e fica registrado na auditoria.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Loja</Label>
          <Select value={storeId} onValueChange={setStoreId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione a loja" />
            </SelectTrigger>
            <SelectContent>
              {(stores ?? []).map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name} · {store.plan === "pro" ? "PRO" : "Free"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Observação (opcional)</Label>
          <Input
            className="mt-1"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ex.: Pix recebido em 27/08 às 21h"
          />
        </div>
      </div>

      <Button
        className="h-11 w-full sm:w-auto"
        disabled={!storeId || grantMutation.isPending}
        onClick={() => grantMutation.mutate()}
      >
        {grantMutation.isPending ? "Liberando..." : "Liberar PRO por 30 dias"}
      </Button>
    </section>
  );
}
