import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Check, MessageCircle, Search, Send, Store, Users, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useIsAdmin } from "@/hooks/useAuth";
import { formatDate, whatsappLink } from "@/lib/format";
import { ADMIN_TEMPLATES, fillTemplate } from "@/lib/campaigns";
import { listAdminCampaignStores, type AdminCampaignStore } from "@/lib/admin-campaigns.functions";

export const Route = createFileRoute("/_authenticated/admin/lojas")({
  head: () => ({
    meta: [
      { title: "Lojas e campanhas | Vitrini" },
      { name: "description", content: "Gerencie lojas e campanhas para vendedores do Vitrini." },
      { property: "og:title", content: "Lojas e campanhas | Vitrini" },
      { property: "og:description", content: "Gerencie lojas e campanhas para vendedores do Vitrini." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminStores,
});

function AdminStores() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const fetchStores = useServerFn(listAdminCampaignStores);
  const { data: stores = [], isLoading, error } = useQuery({
    queryKey: ["admin-campaign-stores"],
    enabled: isAdmin === true,
    queryFn: () => fetchStores(),
  });
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [template, setTemplate] = useState(ADMIN_TEMPLATES[0]?.value ?? "coupon");
  const [message, setMessage] = useState(ADMIN_TEMPLATES[0]?.text ?? "");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<string[]>([]);

  const visibleStores = useMemo(() => {
    const term = search.trim().toLowerCase();
    return stores.filter((store) => {
      const matchesSearch = !term || [store.name, store.slug, store.sellerName].some((value) => value.toLowerCase().includes(term));
      return matchesSearch && (plan === "all" || store.plan === plan) && (status === "all" || (store.isActive ? "active" : "inactive") === status);
    });
  }, [plan, search, status, stores]);
  const chosenStores = visibleStores.filter((store) => selected.includes(store.id));
  const currentTemplate = ADMIN_TEMPLATES.find((item) => item.value === template) ?? ADMIN_TEMPLATES[0];

  function selectVisible() {
    const ids = visibleStores.map((store) => store.id);
    setSelected((current) => ids.every((id) => current.includes(id)) ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]);
  }

  function changeTemplate(value: string) {
    const next = ADMIN_TEMPLATES.find((item) => item.value === value) ?? ADMIN_TEMPLATES[0];
    setTemplate(value);
    setMessage(next?.text ?? "");
    setFields({});
  }

  function openWhatsApp(store: AdminCampaignStore) {
    const text = fillTemplate(message, { lojista: store.sellerName || "vendedor", loja: store.name, ...fields });
    setSent((current) => [...new Set([...current, store.id])]);
    window.open(whatsappLink(store.whatsapp, text), "_blank", "noopener,noreferrer");
  }

  if (adminLoading || isLoading) return <AppShell title="Lojas e campanhas"><p className="text-sm text-muted-foreground">Carregando lojas...</p></AppShell>;
  if (!isAdmin) return <AppShell title="Lojas e campanhas"><div className="surface p-10 text-center text-sm text-muted-foreground">Você não tem acesso a esta área.</div></AppShell>;
  if (error) return <AppShell title="Lojas e campanhas"><div className="surface p-10 text-center text-sm text-destructive">Não foi possível carregar as lojas.</div></AppShell>;

  return (
    <AppShell title="Lojas e campanhas" description="Fale com os vendedores pelo WhatsApp">
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="surface flex items-center gap-3 p-4"><Building2 className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">Lojas cadastradas</p><p className="text-xl font-bold">{stores.length}</p></div></div>
          <div className="surface flex items-center gap-3 p-4"><Users className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">Selecionadas</p><p className="text-xl font-bold">{chosenStores.length}</p></div></div>
          <div className="surface flex items-center gap-3 p-4"><Send className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">Abertas nesta campanha</p><p className="text-xl font-bold">{sent.length}</p></div></div>
        </section>

        <section className="surface space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Campanha para vendedores</h2><p className="text-sm text-muted-foreground">Selecione as lojas e abra uma conversa pronta.</p></div><Badge variant="secondary">{chosenStores.length} selecionada(s)</Badge></div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5 md:col-span-1"><Label>Modelo</Label><Select value={template} onValueChange={changeTemplate}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ADMIN_TEMPLATES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
            {currentTemplate?.fields?.map((field) => <div className="space-y-1.5" key={field.key}><Label>{field.label}</Label><Input placeholder={field.placeholder} value={fields[field.key] ?? ""} onChange={(event) => setFields((current) => ({ ...current, [field.key]: event.target.value }))} /></div>)}
          </div>
          <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={6} aria-label="Mensagem da campanha" />
          <p className="text-xs text-muted-foreground">A mensagem será personalizada com o nome do vendedor e da loja.</p>
        </section>

        <section className="surface overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
            <div className="relative flex-1"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar loja ou vendedor" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            <Select value={plan} onValueChange={setPlan}><SelectTrigger className="lg:w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os planos</SelectItem><SelectItem value="pro">PRO</SelectItem><SelectItem value="free">Free</SelectItem></SelectContent></Select>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="lg:w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="active">Ativas</SelectItem><SelectItem value="inactive">Inativas</SelectItem></SelectContent></Select>
            <Button variant="outline" onClick={selectVisible}>{visibleStores.length > 0 && visibleStores.every((store) => selected.includes(store.id)) ? <X className="mr-2 size-4" /> : <Check className="mr-2 size-4" />} {visibleStores.length > 0 && visibleStores.every((store) => selected.includes(store.id)) ? "Limpar" : "Selecionar"}</Button>
          </div>
          <div className="divide-y divide-border">
            {visibleStores.map((store) => { const isSelected = selected.includes(store.id); const wasSent = sent.includes(store.id); return <div key={store.id} className="flex flex-wrap items-center gap-3 p-4"><button type="button" aria-label={`Selecionar ${store.name}`} onClick={() => setSelected((current) => isSelected ? current.filter((id) => id !== store.id) : [...current, store.id])} className={`flex size-5 items-center justify-center rounded border ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{isSelected ? <Check className="size-3" /> : null}</button><Store className="size-5 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="truncate font-medium">{store.name}</p><p className="truncate text-xs text-muted-foreground">{store.sellerName} · /s/{store.slug} · {formatDate(store.createdAt)}</p></div><Badge variant={store.plan === "pro" ? "default" : "secondary"}>{store.plan}</Badge><Badge variant={store.isActive ? "secondary" : "destructive"}>{store.isActive ? "ativa" : "inativa"}</Badge><Button size="sm" variant={wasSent ? "outline" : "default"} onClick={() => openWhatsApp(store)}><MessageCircle className="mr-1.5 size-4" />{wasSent ? "Abrir novamente" : "Abrir WhatsApp"}</Button></div>; })}
            {!visibleStores.length ? <p className="p-10 text-center text-sm text-muted-foreground">Nenhuma loja encontrada.</p> : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
