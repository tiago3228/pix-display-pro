import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bug, Lightbulb, MessageSquarePlus, Send, Wrench } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useMyStore } from "@/hooks/useAuth";
import { submitOwnerFeedback } from "@/lib/feedback.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/feedback")({ component: FeedbackPage });

const CATEGORY = [
  { value: "bug", label: "Reportar bug", description: "Algo não está funcionando como deveria.", icon: Bug },
  { value: "sugestao", label: "Enviar sugestão", description: "Uma ideia para melhorar o Vitrini.", icon: Lightbulb },
  { value: "melhoria", label: "Sugerir melhoria", description: "Uma melhoria em um recurso existente.", icon: Wrench },
] as const;
const STATUS: Record<string, string> = { novo: "Novo", em_analise: "Em análise", resolvido: "Resolvido", descartado: "Descartado" };

function FeedbackPage() {
  const { data: store } = useMyStore();
  const queryClient = useQueryClient();
  const sendFeedback = useServerFn(submitOwnerFeedback);
  const [category, setCategory] = useState<"bug" | "sugestao" | "melhoria">("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const mutation = useMutation({
    mutationFn: () => sendFeedback({ data: { storeId: store!.id, category, subject, message } }),
    onSuccess: () => {
      setSubject("");
      setMessage("");
      toast.success("Feedback enviado para a equipe do Vitrini.");
      queryClient.invalidateQueries({ queryKey: ["my-feedback", store?.id] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível enviar o feedback."),
  });
  const { data: history = [] } = useQuery({
    queryKey: ["my-feedback", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_feedback")
        .select("id, category, subject, message, status, admin_note, created_at")
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell title="Reportar problemas" description="Ajude a melhorar o Vitrini durante os testes gratuitos">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <section className="surface p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><MessageSquarePlus className="size-5" /></span>
            <div><h2 className="font-semibold">Como podemos melhorar?</h2><p className="mt-1 text-sm text-muted-foreground">Seu relato chega diretamente à conta de administrador master.</p></div>
          </div>
          <div className="mt-5 space-y-4">
            <div className="space-y-2"><Label>Tipo de feedback</Label><div className="grid gap-2 sm:grid-cols-3">{CATEGORY.map((item) => { const Icon = item.icon; return <button key={item.value} type="button" onClick={() => setCategory(item.value)} className={`rounded-xl border p-3 text-left transition ${category === item.value ? "border-primary bg-primary/10" : "hover:bg-muted/50"}`}><Icon className="size-4 text-primary" /><p className="mt-2 text-sm font-medium">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">{item.description}</p></button>; })}</div></div>
            <div className="space-y-2"><Label htmlFor="feedback-subject">Título</Label><Input id="feedback-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex.: botão de salvar não funciona" maxLength={120} /></div>
            <div className="space-y-2"><Label htmlFor="feedback-message">Detalhes</Label><Textarea id="feedback-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Explique o que aconteceu, em qual tela e como podemos reproduzir..." rows={7} maxLength={5000} /><p className="text-right text-xs text-muted-foreground">{message.length}/5000</p></div>
            <Button className="w-full sm:w-auto" disabled={mutation.isPending || !store?.id || subject.trim().length < 3 || message.trim().length < 10} onClick={() => mutation.mutate()}><Send className="mr-2 size-4" />{mutation.isPending ? "Enviando..." : "Enviar feedback"}</Button>
          </div>
        </section>
        <section className="surface p-5"><h2 className="font-semibold">Meus relatos</h2><p className="mt-1 text-sm text-muted-foreground">Acompanhe o andamento das mensagens enviadas.</p><div className="mt-4 space-y-3">{history.map((item) => <div key={item.id} className="rounded-xl border p-3"><div className="flex items-start justify-between gap-2"><p className="font-medium">{item.subject}</p><Badge variant="secondary">{STATUS[item.status] ?? item.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{item.category === "bug" ? "Bug" : item.category === "sugestao" ? "Sugestão" : "Melhoria"} · {formatDate(item.created_at)}</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.message}</p>{item.admin_note ? <div className="mt-3 rounded-lg bg-muted/50 p-2 text-xs"><strong>Resposta da equipe:</strong> {item.admin_note}</div> : null}</div>)}{!history.length ? <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">Você ainda não enviou nenhum relato.</p> : null}</div></section>
      </div>
    </AppShell>
  );
}
