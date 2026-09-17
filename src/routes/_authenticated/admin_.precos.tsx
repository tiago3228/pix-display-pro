import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useIsAdmin } from "@/hooks/useAuth";
import { useProPricing } from "@/hooks/usePricing";
import { getProPricing, saveProPricing } from "@/lib/pricing.functions";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin/precos")({
  head: () => ({
    meta: [
      { title: "Preços do Vitrini PRO | Vitrini" },
      { name: "description", content: "Atualize o preço e as promoções temporárias do Vitrini PRO." },
      { property: "og:title", content: "Preços do Vitrini PRO | Vitrini" },
      { property: "og:description", content: "Gerencie o preço mensal e promoções do plano PRO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPricing,
});

const toLocalDateTime = (value: string | null) => value ? value.slice(0, 16) : "";
const toIso = (value: string) => value ? new Date(value).toISOString() : null;

function AdminPricing() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const publicPricing = useProPricing();
  const fetchPricing = useServerFn(getProPricing);
  const savePricing = useServerFn(saveProPricing);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-pro-pricing"], enabled: isAdmin === true, queryFn: () => fetchPricing() });
  const [form, setForm] = useState({ basePrice: "", promoPrice: "", promoLabel: "", promoStartsAt: "", promoEndsAt: "", promoActive: false });

  useEffect(() => {
    if (!data) return;
    setForm({
      basePrice: String(data.basePrice),
      promoPrice: data.promoPrice === null ? "" : String(data.promoPrice),
      promoLabel: data.promoLabel ?? "",
      promoStartsAt: toLocalDateTime(data.promoStartsAt),
      promoEndsAt: toLocalDateTime(data.promoEndsAt),
      promoActive: data.promoActive,
    });
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => savePricing({ data: {
      basePrice: Number(form.basePrice.replace(",", ".")),
      promoPrice: form.promoPrice.trim() ? Number(form.promoPrice.replace(",", ".")) : null,
      promoLabel: form.promoLabel.trim() || null,
      promoStartsAt: toIso(form.promoStartsAt),
      promoEndsAt: toIso(form.promoEndsAt),
      promoActive: form.promoActive,
    }}),
    onSuccess: () => {
      toast.success("Preço do PRO atualizado.");
      queryClient.invalidateQueries({ queryKey: ["pro-pricing"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pro-pricing"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar o preço."),
  });

  if (adminLoading || (isAdmin && isLoading)) return <AppShell title="Preços"><p className="text-sm text-muted-foreground">Carregando configuração...</p></AppShell>;
  if (!isAdmin) return <AppShell title="Preços"><div className="surface p-10 text-center text-sm text-muted-foreground">Você não tem acesso a esta área.</div></AppShell>;

  return (
    <AppShell title="Preços" description="Gerencie o valor do Vitrini PRO">
      <section className="surface space-y-4 p-5">
        <div>
          <h2 className="text-base font-semibold">Preço da assinatura</h2>
          <p className="mt-1 text-sm text-muted-foreground">A alteração vale para novos checkouts e para o Pix PRO.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Preço original (R$)</Label><Input inputMode="decimal" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Preço promocional (R$)</Label><Input inputMode="decimal" placeholder="Opcional" value={form.promoPrice} onChange={(e) => setForm({ ...form, promoPrice: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Nome da promoção</Label><Input placeholder="Ex.: Oferta de lançamento" value={form.promoLabel} onChange={(e) => setForm({ ...form, promoLabel: e.target.value })} /></div>
          <div className="flex items-center gap-2 pt-6"><Switch checked={form.promoActive} onCheckedChange={(checked) => setForm({ ...form, promoActive: checked })} /><Label>Promoção ativa</Label></div>
          <div className="space-y-1.5"><Label>Começa em</Label><Input type="datetime-local" value={form.promoStartsAt} onChange={(e) => setForm({ ...form, promoStartsAt: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Termina em</Label><Input type="datetime-local" value={form.promoEndsAt} onChange={(e) => setForm({ ...form, promoEndsAt: e.target.value })} /></div>
        </div>
        <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Preço vigente agora: <strong className="text-foreground">{brl(publicPricing.price)}/mês</strong></div>
        <Button className="h-11 w-full sm:w-auto" disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Salvando..." : "Salvar preço"}</Button>
      </section>
    </AppShell>
  );
}
