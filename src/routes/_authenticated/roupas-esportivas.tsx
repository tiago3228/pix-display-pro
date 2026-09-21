import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronRight,
  Edit3,
  FolderTree,
  LockKeyhole,
  Palette,
  Plus,
  Settings2,
  Trash2,
  Trophy,
} from "lucide-react";
import { AppShell, StatCard } from "@/components/AppShell";
import { useMyStore } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  childrenOf,
  getSportsSettings,
  listSportsNodes,
  sportsDb,
  sportsNodeTypes,
  sportsTypeLabel,
  type SportsNode,
  type SportsNodeType,
  type SportsSettings,
} from "@/lib/sports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
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

export const Route = createFileRoute("/_authenticated/roupas-esportivas")({
  component: SportsModule,
});

type NodeForm = {
  name: string;
  node_type: SportsNodeType;
  parent_id: string;
  description: string;
  short_name: string;
  logo_url: string;
  banner_url: string;
  primary_color: string;
  secondary_color: string;
  sort_order: string;
};

const emptyForm: NodeForm = {
  name: "",
  node_type: "sport",
  parent_id: "none",
  description: "",
  short_name: "",
  logo_url: "",
  banner_url: "",
  primary_color: "",
  secondary_color: "",
  sort_order: "0",
};

type SportsCompetitionLink = { node_id: string; competition_id: string };

function SportsModule() {
  const { data: store, isLoading: storeLoading } = useMyStore();
  const queryClient = useQueryClient();
  const isPro = store?.plan === "pro";
  const [tab, setTab] = useState("overview");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SportsNode | null>(null);
  const [form, setForm] = useState<NodeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const nodesQuery = useQuery({
    queryKey: ["sports-nodes", store?.id],
    enabled: Boolean(store?.id && isPro),
    queryFn: () => listSportsNodes(store!.id),
  });
  const settingsQuery = useQuery({
    queryKey: ["sports-settings", store?.id],
    enabled: Boolean(store?.id && isPro),
    queryFn: () => getSportsSettings(store!.id),
  });
  const competitionLinksQuery = useQuery({
    queryKey: ["sports-competition-links", store?.id],
    enabled: Boolean(store?.id && isPro),
    queryFn: async () => {
      const { data, error } = await sportsDb
        .from("sports_node_competitions")
        .select("node_id, competition_id");
      if (error) throw error;
      return (data ?? []) as SportsCompetitionLink[];
    },
  });

  const nodes = useMemo(() => nodesQuery.data ?? [], [nodesQuery.data]);
  const roots = useMemo(() => childrenOf(nodes, null), [nodes]);
  const settings = settingsQuery.data;
  const competitionLinks = competitionLinksQuery.data ?? [];

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["sports-nodes", store?.id] });
    void queryClient.invalidateQueries({ queryKey: ["sports-settings", store?.id] });
  }

  function openNew(parentId = "none") {
    setEditing(null);
    setForm({ ...emptyForm, parent_id: parentId });
    setDialogOpen(true);
  }

  function openEdit(node: SportsNode) {
    setEditing(node);
    setForm({
      name: node.name,
      node_type: node.node_type,
      parent_id: node.parent_id ?? "none",
      description: node.description,
      short_name: node.short_name ?? "",
      logo_url: node.logo_url ?? "",
      banner_url: node.banner_url ?? "",
      primary_color: node.primary_color ?? "",
      secondary_color: node.secondary_color ?? "",
      sort_order: String(node.sort_order ?? 0),
    });
    setDialogOpen(true);
  }

  async function saveNode() {
    if (!store || !form.name.trim()) {
      toast.error("Informe o nome do item.");
      return;
    }
    setSaving(true);
    const payload = {
      store_id: store.id,
      name: form.name.trim(),
      node_type: form.node_type,
      parent_id: form.parent_id === "none" ? null : form.parent_id,
      description: form.description.trim(),
      short_name: form.short_name.trim() || form.name.trim(),
      logo_url: form.logo_url.trim() || null,
      banner_url: form.banner_url.trim() || null,
      primary_color: form.primary_color.trim() || null,
      secondary_color: form.secondary_color.trim() || null,
      sort_order: Number(form.sort_order) || 0,
    };
    const result = editing
      ? await sportsDb.from("sports_nodes").update(payload).eq("id", editing.id)
      : await sportsDb.from("sports_nodes").insert(payload);
    setSaving(false);
    if (result.error) {
      toast.error("Não foi possível salvar o item. Verifique seu plano PRO.");
      return;
    }
    setDialogOpen(false);
    refresh();
    toast.success(editing ? "Item atualizado." : "Item adicionado.");
  }

  async function toggleNode(node: SportsNode) {
    const { error } = await sportsDb
      .from("sports_nodes")
      .update({ is_active: !node.is_active })
      .eq("id", node.id);
    if (error) toast.error("Não foi possível alterar o status.");
    else refresh();
  }

  async function removeNode(node: SportsNode) {
    if (
      !window.confirm(`Excluir “${node.name}”? Os produtos classificados nele ficarão sem vínculo.`)
    )
      return;
    const { error } = await sportsDb.from("sports_nodes").delete().eq("id", node.id);
    if (error) toast.error("Não foi possível excluir. Remova primeiro os itens dependentes.");
    else {
      refresh();
      toast.success("Item excluído.");
    }
  }

  async function saveSettings(patch: Partial<SportsSettings>) {
    if (!store) return;
    setSettingsSaving(true);
    const { error } = await sportsDb.from("sports_settings").update(patch).eq("store_id", store.id);
    setSettingsSaving(false);
    if (error) toast.error("Não foi possível salvar a personalização.");
    else {
      refresh();
      toast.success("Personalização salva.");
    }
  }

  if (storeLoading)
    return <div className="p-10 text-center text-sm text-muted-foreground">Carregando...</div>;

  if (!store) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        Crie sua loja antes de acessar este módulo.
      </div>
    );
  }

  if (!isPro) return <ProLock />;

  return (
    <AppShell
      title="⚽ Roupas Esportivas"
      description="Ecossistema configurável da sua loja PRO"
      action={
        <Button size="sm" onClick={() => openNew()}>
          <Plus className="mr-1.5 size-4" /> Novo item
        </Button>
      }
    >
      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
        <p className="font-semibold">Sua estrutura é editável</p>
        <p className="mt-1 opacity-80">
          Adicione esportes, clubes, seleções, países e campeonatos conforme a identidade da sua
          loja.
        </p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 grid h-auto w-full grid-cols-4">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="structure">Estrutura</TabsTrigger>
          <TabsTrigger value="collections">Coleções</TabsTrigger>
          <TabsTrigger value="customize">Personalização</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Overview nodes={nodes} settings={settings} onOpenStructure={() => setTab("structure")} />
        </TabsContent>
        <TabsContent value="structure">
          <StructureView
            nodes={nodes}
            roots={roots}
            competitionLinks={competitionLinks}
            onAdd={openNew}
            onEdit={openEdit}
            onToggle={toggleNode}
            onRemove={removeNode}
          />
        </TabsContent>
        <TabsContent value="collections">
          <CollectionsView storeId={store.id} />
        </TabsContent>
        <TabsContent value="customize">
          <Customize
            settings={settings}
            nodes={nodes}
            saving={settingsSaving}
            onSave={saveSettings}
          />
        </TabsContent>
      </Tabs>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar item" : "Adicionar item esportivo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="sports-name">Nome</Label>
              <Input
                id="sports-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Vasco da Gama"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={form.node_type}
                onValueChange={(value) => setForm({ ...form, node_type: value as SportsNodeType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sportsNodeTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Dentro de</Label>
              <Select
                value={form.parent_id}
                onValueChange={(value) => setForm({ ...form, parent_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Raiz da estrutura" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Raiz da estrutura</SelectItem>
                  {nodes
                    .filter((node) => node.id !== editing?.id)
                    .map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {"— ".repeat(node.parent_id ? 1 : 0)}
                        {node.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sports-description">Descrição</Label>
              <Textarea
                id="sports-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrição opcional"
              />
            </div>
            <div>
              <Label htmlFor="sports-short-name">Nome curto</Label>
              <Input
                id="sports-short-name"
                value={form.short_name}
                onChange={(e) => setForm({ ...form, short_name: e.target.value })}
                placeholder="Ex.: PSV"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="sports-logo-url">URL do escudo/logo</Label>
                <Input
                  id="sports-logo-url"
                  value={form.logo_url}
                  onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="sports-node-banner-url">URL do banner</Label>
                <Input
                  id="sports-node-banner-url"
                  value={form.banner_url}
                  onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ColorField
                label="Cor principal"
                value={form.primary_color || "#14532d"}
                onChange={(value) => setForm({ ...form, primary_color: value })}
              />
              <ColorField
                label="Cor secundária"
                value={form.secondary_color || "#facc15"}
                onChange={(value) => setForm({ ...form, secondary_color: value })}
              />
            </div>
            <div>
              <Label htmlFor="sports-sort-order">Ordem manual</Label>
              <Input
                id="sports-sort-order"
                inputMode="numeric"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Itens com a mesma ordem aparecem alfabeticamente.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={saving} onClick={() => void saveNode()}>
              {saving ? "Salvando..." : "Salvar item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function ProLock() {
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="surface p-8 text-center">
          <LockKeyhole className="mx-auto size-10 text-primary" />
          <Badge className="mt-4">Exclusivo PRO</Badge>
          <h1 className="mt-4 text-2xl font-bold">⚽ Roupas Esportivas</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Crie uma loja especializada em clubes, seleções, esportes e categorias personalizadas.
          </p>
          <Button asChild className="mt-6">
            <Link to="/assinatura">Conhecer o Vitrini PRO</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Overview({
  nodes,
  settings,
  onOpenStructure,
}: {
  nodes: SportsNode[];
  settings: SportsSettings | null | undefined;
  onOpenStructure: () => void;
}) {
  const productsCount = 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Itens da estrutura" value={String(nodes.length)} icon={FolderTree} />
        <StatCard
          label="Esportes"
          value={String(nodes.filter((n) => n.node_type === "sport").length)}
          icon={Trophy}
        />
        <StatCard
          label="Clubes"
          value={String(nodes.filter((n) => n.node_type === "club").length)}
          icon={Trophy}
        />
        <StatCard label="Produtos esportivos" value={String(productsCount)} icon={FolderTree} />
      </div>
      <div className="surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{settings?.name ?? "Roupas Esportivas"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {settings?.description ?? "Configure a estrutura da sua loja."}
            </p>
          </div>
          <Button variant="outline" onClick={onOpenStructure}>
            Editar estrutura <ChevronRight className="ml-1 size-4" />
          </Button>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {nodes
            .filter((node) => !node.parent_id)
            .slice(0, 8)
            .map((node) => (
              <div
                key={node.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>{node.name}</span>
                <Badge variant="secondary">{sportsTypeLabel(node.node_type)}</Badge>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function StructureView({
  nodes,
  roots,
  competitionLinks,
  onAdd,
  onEdit,
  onToggle,
  onRemove,
}: {
  nodes: SportsNode[];
  roots: SportsNode[];
  competitionLinks: SportsCompetitionLink[];
  onAdd: (parentId?: string) => void;
  onEdit: (node: SportsNode) => void;
  onToggle: (node: SportsNode) => void;
  onRemove: (node: SportsNode) => void;
}) {
  return (
    <div className="space-y-3">
      {roots.map((root) => (
        <NodeBranch
          key={root.id}
          node={root}
          nodes={nodes}
          competitionLinks={competitionLinks}
          onAdd={onAdd}
          onEdit={onEdit}
          onToggle={onToggle}
          onRemove={onRemove}
        />
      ))}
      {!roots.length ? (
        <div className="surface p-8 text-center text-sm text-muted-foreground">
          Nenhum item cadastrado.
        </div>
      ) : null}
      <Button variant="outline" className="w-full" onClick={() => onAdd()}>
        <Plus className="mr-1.5 size-4" /> Adicionar item na raiz
      </Button>
    </div>
  );
}

function NodeBranch({
  node,
  nodes,
  competitionLinks,
  onAdd,
  onEdit,
  onToggle,
  onRemove,
}: {
  node: SportsNode;
  nodes: SportsNode[];
  competitionLinks: SportsCompetitionLink[];
  onAdd: (parentId?: string) => void;
  onEdit: (node: SportsNode) => void;
  onToggle: (node: SportsNode) => void;
  onRemove: (node: SportsNode) => void;
}) {
  const directChildren = childrenOf(nodes, node.id);
  const linkedChildren = nodes.filter(
    (candidate) =>
      competitionLinks.some(
        (link) => link.node_id === candidate.id && link.competition_id === node.id,
      ) && !directChildren.some((child) => child.id === candidate.id),
  );
  const children = [...directChildren, ...linkedChildren].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "pt-BR"),
  );
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="surface p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 text-left transition hover:bg-accent/60"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Recolher" : "Expandir"} ${node.name}`}
        >
          <ChevronRight
            className={`size-4 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{node.name}</p>
              <Badge variant="secondary">{sportsTypeLabel(node.node_type)}</Badge>
              {!node.is_active ? <Badge variant="outline">Inativo</Badge> : null}
            </div>
            {node.description ? (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{node.description}</p>
            ) : null}
          </div>
        </button>
        <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => onEdit(node)}>
          <Edit3 className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={node.is_active ? "Desativar" : "Ativar"}
          onClick={() => void onToggle(node)}
        >
          <Settings2 className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Excluir"
          onClick={() => void onRemove(node)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      {expanded ? (
        <div className="mt-3 space-y-2 border-l-2 border-primary/20 pl-3">
          {children.map((child) => (
            <NodeBranch
              key={child.id}
              node={child}
              nodes={nodes}
              competitionLinks={competitionLinks}
              onAdd={onAdd}
              onEdit={onEdit}
              onToggle={onToggle}
              onRemove={onRemove}
            />
          ))}
          <Button size="sm" variant="outline" onClick={() => onAdd(node.id)}>
            <Plus className="mr-1 size-3.5" /> Adicionar abaixo
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Customize({
  settings,
  nodes,
  saving,
  onSave,
}: {
  settings: SportsSettings | null | undefined;
  nodes: SportsNode[];
  saving: boolean;
  onSave: (patch: Partial<SportsSettings>) => Promise<void>;
}) {
  const [name, setName] = useState(settings?.name ?? "Roupas Esportivas");
  const [description, setDescription] = useState(settings?.description ?? "");
  const [primaryNode, setPrimaryNode] = useState(settings?.primary_node_id ?? "none");
  const [bannerUrl, setBannerUrl] = useState(settings?.banner_url ?? "");
  const [primaryColor, setPrimaryColor] = useState(settings?.primary_color ?? "#14532d");
  const [secondaryColor, setSecondaryColor] = useState(settings?.secondary_color ?? "#facc15");
  const [backgroundColor, setBackgroundColor] = useState(settings?.background_color ?? "#f7fee7");
  const [textColor, setTextColor] = useState(settings?.text_color ?? "#172015");
  useEffect(() => {
    if (!settings) return;
    setName(settings.name);
    setDescription(settings.description);
    setPrimaryNode(settings.primary_node_id ?? "none");
    setBannerUrl(settings.banner_url ?? "");
    setPrimaryColor(settings.primary_color);
    setSecondaryColor(settings.secondary_color);
    setBackgroundColor(settings.background_color);
    setTextColor(settings.text_color);
  }, [settings]);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
      <div className="surface space-y-4 p-5">
        <div>
          <Label htmlFor="sports-title">Nome do módulo</Label>
          <Input id="sports-title" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="sports-desc">Descrição</Label>
          <Textarea
            id="sports-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <Label>Clube ou esporte principal</Label>
          <Select value={primaryNode} onValueChange={setPrimaryNode}>
            <SelectTrigger>
              <SelectValue placeholder="Nenhum selecionado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum selecionado</SelectItem>
              {nodes
                .filter(
                  (n) =>
                    n.node_type === "club" ||
                    n.node_type === "sport" ||
                    n.node_type === "selection",
                )
                .map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          disabled={saving}
          onClick={() =>
            void onSave({
              name,
              description,
              primary_node_id: primaryNode === "none" ? null : primaryNode,
              banner_url: bannerUrl.trim() || null,
              primary_color: primaryColor,
              secondary_color: secondaryColor,
              background_color: backgroundColor,
              text_color: textColor,
            })
          }
        >
          {saving ? "Salvando..." : "Salvar personalização"}
        </Button>
      </div>
      <div className="surface p-5">
        <div className="flex items-center gap-2">
          <Palette className="size-5 text-primary" />
          <p className="font-semibold">Identidade visual</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <ColorField label="Cor principal" value={primaryColor} onChange={setPrimaryColor} />
          <ColorField label="Cor secundária" value={secondaryColor} onChange={setSecondaryColor} />
          <ColorField
            label="Fundo da área esportiva"
            value={backgroundColor}
            onChange={setBackgroundColor}
          />
          <ColorField label="Cor do texto" value={textColor} onChange={setTextColor} />
        </div>
        <div className="mt-5 space-y-1.5">
          <Label htmlFor="sports-banner-url">Banner do módulo (URL da imagem)</Label>
          <Input
            id="sports-banner-url"
            value={bannerUrl}
            onChange={(event) => setBannerUrl(event.target.value)}
            placeholder="https://.../banner-esportivo.jpg"
          />
          <p className="text-xs text-muted-foreground">
            Esse banner aparece no topo esportivo da vitrine pública. Para usar uma imagem do
            computador, envie-a primeiro em um serviço de imagens ou use o banner geral de Minha
            Loja.
          </p>
        </div>
        <div className="mt-5 rounded-xl p-5" style={{ background: primaryColor, color: "white" }}>
          <p className="text-xs uppercase tracking-widest opacity-80">Prévia</p>
          <p className="mt-2 text-xl font-bold">{name || "Roupas Esportivas"}</p>
          <p className="mt-1 text-sm opacity-80">
            {description || "Sua loja esportiva personalizada."}
          </p>
        </div>
      </div>
    </div>
  );
}

type SportsCollection = {
  id: string;
  store_id: string;
  name: string;
  description: string;
  image_url: string | null;
  banner_url: string | null;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
};

function CollectionsView({ storeId }: { storeId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SportsCollection | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    image_url: "",
    banner_url: "",
    is_featured: false,
  });
  const { data: collections = [] } = useQuery({
    queryKey: ["sports-collections", storeId],
    queryFn: async () => {
      const { data, error } = await sportsDb
        .from("sports_collections")
        .select("*")
        .eq("store_id", storeId)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []) as SportsCollection[];
    },
  });
  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["sports-collections", storeId] });
  }
  function newCollection() {
    setEditing(null);
    setForm({ name: "", description: "", image_url: "", banner_url: "", is_featured: false });
    setOpen(true);
  }
  function editCollection(collection: SportsCollection) {
    setEditing(collection);
    setForm({
      name: collection.name,
      description: collection.description,
      image_url: collection.image_url ?? "",
      banner_url: collection.banner_url ?? "",
      is_featured: collection.is_featured,
    });
    setOpen(true);
  }
  async function saveCollection() {
    if (!form.name.trim()) {
      toast.error("Informe o nome da coleção.");
      return;
    }
    const payload = {
      store_id: storeId,
      name: form.name.trim(),
      description: form.description.trim(),
      image_url: form.image_url.trim() || null,
      banner_url: form.banner_url.trim() || null,
      is_featured: form.is_featured,
    };
    const result = editing
      ? await sportsDb.from("sports_collections").update(payload).eq("id", editing.id)
      : await sportsDb.from("sports_collections").insert(payload);
    if (result.error) toast.error("Não foi possível salvar a coleção.");
    else {
      setOpen(false);
      invalidate();
      toast.success("Coleção salva.");
    }
  }
  async function removeCollection(collection: SportsCollection) {
    if (!window.confirm(`Excluir “${collection.name}”?`)) return;
    const { error } = await sportsDb.from("sports_collections").delete().eq("id", collection.id);
    if (error) toast.error("Não foi possível excluir a coleção.");
    else {
      invalidate();
      toast.success("Coleção excluída.");
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Coleções personalizadas</h2>
          <p className="text-sm text-muted-foreground">
            Agrupe produtos existentes em lançamentos como Vasco 2026, Retrô ou Nova Temporada.
          </p>
        </div>
        <Button onClick={newCollection}>
          <Plus className="mr-1.5 size-4" /> Nova coleção
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {collections.map((collection) => (
          <div key={collection.id} className="surface overflow-hidden p-4">
            {collection.banner_url ? (
              <img
                src={collection.banner_url}
                alt=""
                className="mb-3 h-24 w-full rounded-lg object-cover"
              />
            ) : null}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{collection.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {collection.description || "Sem descrição"}
                </p>
              </div>
              {collection.is_featured ? <Badge>Destaque</Badge> : null}
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => editCollection(collection)}>
                <Edit3 className="mr-1 size-3.5" /> Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void removeCollection(collection)}>
                <Trash2 className="mr-1 size-3.5" /> Excluir
              </Button>
            </div>
          </div>
        ))}
        {!collections.length ? (
          <div className="surface col-span-full p-8 text-center text-sm text-muted-foreground">
            Crie sua primeira coleção para organizar a vitrine.
          </div>
        ) : null}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar coleção" : "Nova coleção"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Coleção Vasco 2026"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label>URL da imagem</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>URL do banner</Label>
              <Input
                value={form.banner_url}
                onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <ToggleRow
              label="Destacar na loja"
              checked={form.is_featured}
              onChange={(value) => setForm({ ...form, is_featured: value })}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => void saveCollection()}>Salvar coleção</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span>{label}</span>
      <div className="flex gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 p-1"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  );
}
