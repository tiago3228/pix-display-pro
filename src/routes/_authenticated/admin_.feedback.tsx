import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bug, Lightbulb, Wrench } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useIsAdmin } from "@/hooks/useAuth";
import { getAdminFeedback, updateAdminFeedback } from "@/lib/feedback.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin_/feedback")({ component: AdminFeedback });
const STATUS = [{ value: "novo", label: "Novo" }, { value: "em_analise", label: "Em análise" }, { value: "resolvido", label: "Resolvido" }, { value: "descartado", label: "Descartado" }];
const CATEGORY: Record<string, { label: string; icon: typeof Bug }> = { bug: { label: "Bug", icon: Bug }, sugestao: { label: "Sugestão", icon: Lightbulb }, melhoria: { label: "Melhoria", icon: Wrench } };

function AdminFeedback() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const queryClient = useQueryClient();
  const fetchFeedback = useServerFn(getAdminFeedback);
  const saveFeedback = useServerFn(updateAdminFeedback);
  const [filter, setFilter] = useState("todos");
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-feedback"], enabled: isAdmin === true, queryFn: () => fetchFeedback() });
  const mutation = useMutation({ mutationFn: (input: { id: string; status: "novo" | "em_analise" | "resolvido" | "descartado"; adminNote: string }) => saveFeedback({ data: input }), onSuccess: () => { toast.success("Feedback atualizado."); queryClient.invalidateQueries({ queryKey: ["admin-feedback"] }); }, onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o feedback.") });
  if (adminLoading) return <AppShell title="Feedbacks"><p className="text-sm text-muted-foreground">Carregando...</p></AppShell>;
  if (!isAdmin) return <AppShell title="Feedbacks"><div className="surface p-10 text-center text-sm text-muted-foreground">Você não tem acesso a esta área.</div></AppShell>;
  const rows = data.filter((item) => filter === "todos" || item.status === filter);
  return <AppShell title="Feedbacks dos proprietários" description="Bugs, sugestões e melhorias recebidos pelo administrador master"><div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">{data.filter((item) => item.status === "novo").length} relato(s) novo(s)</p><Select value={filter} onValueChange={setFilter}><SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os status</SelectItem>{STATUS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-3">{isLoading ? <div className="surface p-8 text-center text-sm text-muted-foreground">Carregando feedbacks...</div> : null}{rows.map((item) => { const category = CATEGORY[item.category] ?? CATEGORY.sugestao; const Icon = category.icon; const store = Array.isArray(item.stores) ? item.stores[0] : item.stores; return <FeedbackCard key={item.id} item={item} storeName={store?.name ?? "Loja"} category={category.label} Icon={Icon} pending={mutation.isPending} onSave={(status, adminNote) => mutation.mutate({ id: item.id, status, adminNote })} />; })}{!isLoading && !rows.length ? <div className="surface p-10 text-center text-sm text-muted-foreground">Nenhum feedback encontrado.</div> : null}</div></AppShell>;
}

function FeedbackCard({ item, storeName, category, Icon, pending, onSave }: { item: any; storeName: string; category: string; Icon: typeof Bug; pending: boolean; onSave: (status: "novo" | "em_analise" | "resolvido" | "descartado", note: string) => void }) {
  const [status, setStatus] = useState(item.status as "novo" | "em_analise" | "resolvido" | "descartado");
  const [note, setNote] = useState(item.admin_note ?? "");
  return <article className="surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span><div className="min-w-0"><h2 className="font-semibold">{item.subject}</h2><p className="text-xs text-muted-foreground">{category} · {storeName} · {formatDate(item.created_at)}</p></div></div><Badge variant={status === "novo" ? "default" : "secondary"}>{STATUS.find((s) => s.value === status)?.label}</Badge></div><p className="mt-4 whitespace-pre-wrap text-sm">{item.message}</p><div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto]"><Select value={status} onValueChange={(value) => setStatus(value as typeof status)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Resposta interna opcional..." rows={2} maxLength={2000} /><Button disabled={pending} onClick={() => onSave(status, note)}>Salvar</Button></div></article>;
}
