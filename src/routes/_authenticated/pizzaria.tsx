import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ImagePlus, Pencil, Pizza, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useMyStore } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/pizzaria")({ component: PizzeriaSettings });

type PizzeriaSettingsRow = {
  store_id: string;
  display_name: string | null;
  address: string;
  whatsapp: string | null;
  order_instructions: string;
  allow_half_flavors: boolean;
  allow_quarter_flavors: boolean;
  require_size: boolean;
  require_flavors: boolean;
  require_border: boolean;
  require_drink: boolean;
  require_sauce: boolean;
  require_additional: boolean;
};
type PizzeriaSize = {
  id: string;
  name: string;
  diameter_cm: number | null;
  max_flavors: number;
  is_active: boolean;
};
type PizzeriaFlavor = {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  image_url: string | null;
  image_credit: string | null;
  image_source_url: string | null;
};
type PizzeriaFlavorPrice = { size_id: string; flavor_id: string; price: number };
type PizzeriaAddon = {
  id: string;
  group_key: "borda" | "bebida" | "molho" | "adicional";
  name: string;
  description: string;
  price: number;
  is_active: boolean;
  image_url: string | null;
  image_credit: string | null;
  image_source_url: string | null;
};

const db = {
  from: supabase.from.bind(supabase) as (table: string) => ReturnType<typeof supabase.from>,
  rpc: supabase.rpc.bind(supabase) as (
    functionName: string,
    params: Record<string, unknown>,
  ) => ReturnType<typeof supabase.rpc>,
};

const emptySettings = (storeId: string): PizzeriaSettingsRow => ({
  store_id: storeId,
  display_name: null,
  address: "",
  whatsapp: null,
  order_instructions: "Pedido realizado pelo cardápio online.",
  allow_half_flavors: true,
  allow_quarter_flavors: true,
  require_size: true,
  require_flavors: true,
  require_border: false,
  require_drink: false,
  require_sauce: false,
  require_additional: false,
});

function PizzeriaSettings() {
  const { data: store } = useMyStore();
  const client = useQueryClient();
  const [form, setForm] = useState<PizzeriaSettingsRow | null>(null);
  const [editingSize, setEditingSize] = useState<string | null>(null);
  const [sizeDraft, setSizeDraft] = useState({ name: "", diameter_cm: "", max_flavors: "1" });
  const [newSize, setNewSize] = useState({ name: "", diameter_cm: "", max_flavors: "1" });
  const [editingFlavor, setEditingFlavor] = useState<string | null>(null);
  const [flavorPrices, setFlavorPrices] = useState<Record<string, string>>({});
  const [flavorDraft, setFlavorDraft] = useState({ name: "", description: "", category: "" });
  const [editingAddon, setEditingAddon] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [addonDraft, setAddonDraft] = useState({ group_key: "borda", name: "", description: "", price: "0" });
  const [newFlavor, setNewFlavor] = useState({
    name: "",
    description: "",
    category: "Tradicionais",
  });
  const [newAddon, setNewAddon] = useState({
    group_key: "borda",
    name: "",
    description: "",
    price: "0",
  });

  const catalog = useQuery({
    queryKey: ["pizzeria-catalog", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const seedResult = await db.rpc("seed_pizzeria_catalog", { target_store_id: store!.id });
      if (seedResult.error) throw seedResult.error;
      const [settings, sizes, flavors, addons, prices] = await Promise.all([
        db.from("pizzeria_settings").select("*").eq("store_id", store!.id).maybeSingle(),
        db
          .from("pizzeria_sizes")
          .select("id,name,diameter_cm,max_flavors,is_active")
          .eq("store_id", store!.id)
          .order("sort_order"),
        db
          .from("pizzeria_flavors")
          .select("id,name,description,category,is_active,image_url,image_credit,image_source_url")
          .eq("store_id", store!.id)
          .order("sort_order"),
        db
          .from("pizzeria_addons")
          .select("id,group_key,name,description,price,is_active,image_url,image_credit,image_source_url")
          .eq("store_id", store!.id)
          .order("group_key")
          .order("sort_order"),
        db.from("pizzeria_flavor_prices").select("size_id,flavor_id,price").eq("store_id", store!.id),
      ]);
      for (const result of [settings, sizes, flavors, addons, prices]) {
        if (result.error) throw result.error;
      }
      return {
        settings: (settings.data as PizzeriaSettingsRow | null) ?? emptySettings(store!.id),
        sizes: (sizes.data ?? []) as PizzeriaSize[],
        flavors: (flavors.data ?? []) as PizzeriaFlavor[],
        addons: (addons.data ?? []) as PizzeriaAddon[],
        prices: (prices.data ?? []) as PizzeriaFlavorPrice[],
      };
    },
  });

  useEffect(() => {
    if (catalog.data) setForm(catalog.data.settings);
  }, [catalog.data]);

  async function refresh() {
    await client.invalidateQueries({ queryKey: ["pizzeria-catalog", store?.id] });
  }

  async function uploadCatalogImage(file: File, kind: "flavor" | "addon", item: { id: string; name: string }) {
    if (!store) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Envie uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5 MB.");
      return;
    }
    const key = `${kind}:${item.id}`;
    setUploadingImage(key);
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const objectPath = `${store.id}/${kind}/${item.id}/${Date.now()}.${extension}`;
    try {
      const uploaded = await supabase.storage.from("pizzeria-images").upload(objectPath, file, {
        cacheControl: "3600", upsert: false, contentType: file.type,
      });
      if (uploaded.error) throw uploaded.error;
      const imageUrl = supabase.storage.from("pizzeria-images").getPublicUrl(objectPath).data.publicUrl;
      const saved = kind === "flavor"
        ? await db.from("pizzeria_flavors").update({ image_url: imageUrl, image_credit: null, image_source_url: null }).eq("id", item.id).eq("store_id", store.id)
        : await db.from("pizzeria_addons").update({ image_url: imageUrl, image_credit: null, image_source_url: null }).eq("id", item.id).eq("store_id", store.id);
      if (saved.error) throw saved.error;
      toast.success(`Foto de "${item.name}" atualizada.`);
      await refresh();
    } catch (error) {
      console.error("Erro ao enviar foto da pizzaria:", error);
      toast.error("Não foi possível enviar a foto. Confira se a migration de imagens foi aplicada no Supabase.");
    } finally {
      setUploadingImage(null);
    }
  }

  function imagePicker(kind: "flavor" | "addon", item: { id: string; name: string; image_url: string | null }) {
    const key = `${kind}:${item.id}`;
    return (
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
        <ImagePlus className="size-3.5" />
        {uploadingImage === key ? "Enviando..." : item.image_url ? "Trocar foto" : "Adicionar foto"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={uploadingImage === key}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadCatalogImage(file, kind, item);
            event.target.value = "";
          }}
        />
      </label>
    );
  }

  async function saveSettings() {
    if (!form) return;
    const result = await db.from("pizzeria_settings").upsert(form, { onConflict: "store_id" });
    if (result.error) {
      toast.error("Não foi possível salvar as configurações da pizzaria.");
      return;
    }
    toast.success("Configurações da pizzaria salvas.");
    await refresh();
  }

  function startEditSize(size: PizzeriaSize) {
    setEditingSize(size.id);
    setSizeDraft({ name: size.name, diameter_cm: size.diameter_cm == null ? "" : String(size.diameter_cm), max_flavors: String(size.max_flavors) });
  }
  async function addSize() {
    if (!store) return;
    const name = newSize.name.trim();
    const diameter = newSize.diameter_cm.trim() ? Number(newSize.diameter_cm.replace(",", ".")) : null;
    const maxFlavors = Number(newSize.max_flavors);
    if (!name || (diameter !== null && (!Number.isFinite(diameter) || diameter <= 0)) || ![1, 2, 4].includes(maxFlavors)) {
      toast.error("Informe um nome, diâmetro válido e quantidade de sabores (1, 2 ou 4).");
      return;
    }
    const nextOrder = (catalog.data!.sizes.length + 1) * 10;
    const created = await db.from("pizzeria_sizes").insert({ store_id: store.id, name, diameter_cm: diameter, max_flavors: maxFlavors, sort_order: nextOrder }).select("id").single();
    if (created.error || !created.data) {
      toast.error("Não foi possível adicionar o tamanho. Verifique se já existe.");
      return;
    }
    if (catalog.data!.flavors.length) {
      const rows = catalog.data!.flavors.map((flavor) => ({ store_id: store.id, size_id: created.data.id, flavor_id: flavor.id, price: 0 }));
      const pricesResult = await db.from("pizzeria_flavor_prices").upsert(rows, { onConflict: "size_id,flavor_id" });
      if (pricesResult.error) toast.error("Tamanho criado, mas não foi possível inicializar os preços dos sabores.");
    }
    setNewSize({ name: "", diameter_cm: "", max_flavors: "1" });
    toast.success("Novo tamanho adicionado. Configure os preços dos sabores.");
    await refresh();
  }
  async function saveSize(size: PizzeriaSize) {
    const name = sizeDraft.name.trim();
    const diameter = sizeDraft.diameter_cm.trim() ? Number(sizeDraft.diameter_cm.replace(",", ".")) : null;
    const maxFlavors = Number(sizeDraft.max_flavors);
    if (!name || (diameter !== null && (!Number.isFinite(diameter) || diameter <= 0)) || ![1, 2, 4].includes(maxFlavors)) { toast.error("Confira o nome, o diâmetro e a quantidade de sabores."); return; }
    const result = await db.from("pizzeria_sizes").update({ name, diameter_cm: diameter, max_flavors: maxFlavors }).eq("id", size.id);
    if (result.error) { toast.error("Não foi possível salvar o tamanho. Verifique se o nome já existe."); return; }
    setEditingSize(null); toast.success("Tamanho atualizado."); await refresh();
  }
  function startEditFlavor(flavor: PizzeriaFlavor) {
    setEditingFlavor(flavor.id);
    setFlavorDraft({ name: flavor.name, description: flavor.description, category: flavor.category });
    const prices = Object.fromEntries(catalog.data!.sizes.map((size) => {
      const saved = catalog.data!.prices.find((item) => item.flavor_id === flavor.id && item.size_id === size.id);
      return [size.id, saved ? String(saved.price) : "0"];
    }));
    setFlavorPrices(prices);
  }
  async function saveFlavor(flavor: PizzeriaFlavor) {
    if (!flavorDraft.name.trim()) { toast.error("Informe o nome do sabor."); return; }
    const priceRows = catalog.data!.sizes.map((size) => {
      const price = Number((flavorPrices[size.id] ?? "0").replace(",", "."));
      return { store_id: store!.id, size_id: size.id, flavor_id: flavor.id, price };
    });
    if (priceRows.some((row) => !Number.isFinite(row.price) || row.price < 0)) {
      toast.error("Confira os preços: todos devem ser números iguais ou maiores que zero.");
      return;
    }
    const result = await db.from("pizzeria_flavors").update({ name: flavorDraft.name.trim(), description: flavorDraft.description.trim(), category: flavorDraft.category.trim() || "Tradicionais" }).eq("id", flavor.id).eq("store_id", store!.id);
    if (result.error) { toast.error("Não foi possível salvar o sabor. Verifique se o nome já existe."); return; }
    if (priceRows.length) {
      const priceResult = await db.from("pizzeria_flavor_prices").upsert(priceRows, { onConflict: "size_id,flavor_id" });
      if (priceResult.error) { toast.error("Sabor salvo, mas houve erro ao salvar os preços por tamanho."); await refresh(); return; }
    }
    setEditingFlavor(null); toast.success("Sabor e preços por tamanho atualizados."); await refresh();
  }
  function startEditAddon(addon: PizzeriaAddon) {
    setEditingAddon(addon.id);
    setAddonDraft({ group_key: addon.group_key, name: addon.name, description: addon.description, price: String(addon.price) });
  }
  async function saveAddon(addon: PizzeriaAddon) {
    const price = Number(addonDraft.price.replace(",", "."));
    if (!addonDraft.name.trim() || !Number.isFinite(price) || price < 0) { toast.error("Informe um nome e um preço válido (maior ou igual a zero)."); return; }
    const result = await db.from("pizzeria_addons").update({ group_key: addonDraft.group_key, name: addonDraft.name.trim(), description: addonDraft.description.trim(), price }).eq("id", addon.id);
    if (result.error) { toast.error("Não foi possível salvar o item. Verifique se já existe no grupo."); return; }
    setEditingAddon(null); toast.success("Item atualizado."); await refresh();
  }
  async function toggleAddon(addon: PizzeriaAddon) {
    const result = await db.from("pizzeria_addons").update({ is_active: !addon.is_active }).eq("id", addon.id);
    if (result.error) toast.error("Não foi possível atualizar o item."); else await refresh();
  }

  async function toggleSize(size: PizzeriaSize) {
    const result = await db
      .from("pizzeria_sizes")
      .update({ is_active: !size.is_active })
      .eq("id", size.id);
    if (result.error) toast.error("Não foi possível atualizar o tamanho.");
    else await refresh();
  }

  async function toggleFlavor(flavor: PizzeriaFlavor) {
    const result = await db
      .from("pizzeria_flavors")
      .update({ is_active: !flavor.is_active })
      .eq("id", flavor.id);
    if (result.error) toast.error("Não foi possível atualizar o sabor.");
    else await refresh();
  }

  async function addFlavor() {
    if (!store || !newFlavor.name.trim()) {
      toast.error("Informe o nome do sabor.");
      return;
    }
    const result = await db.from("pizzeria_flavors").insert({
      store_id: store.id,
      name: newFlavor.name.trim(),
      description: newFlavor.description.trim(),
      category: newFlavor.category.trim() || "Tradicionais",
    }).select("id").single();
    if (result.error || !result.data) toast.error("Não foi possível adicionar o sabor.");
    else {
      if (catalog.data!.sizes.length) {
        const rows = catalog.data!.sizes.map((size) => ({ store_id: store.id, size_id: size.id, flavor_id: result.data.id, price: 0 }));
        const priceResult = await db.from("pizzeria_flavor_prices").upsert(rows, { onConflict: "size_id,flavor_id" });
        if (priceResult.error) toast.error("Sabor criado, mas não foi possível inicializar os preços por tamanho.");
      }
      setNewFlavor({ name: "", description: "", category: "Tradicionais" });
      toast.success("Sabor adicionado.");
      await refresh();
    }
  }

  async function addAddon(groupOverride?: PizzeriaAddon["group_key"]) {
    if (!store || !newAddon.name.trim()) {
      toast.error("Informe o nome do adicional.");
      return;
    }
    const result = await db.from("pizzeria_addons").insert({
      store_id: store.id,
      group_key: groupOverride ?? (newAddon.group_key as PizzeriaAddon["group_key"]),
      name: newAddon.name.trim(),
      description: newAddon.description.trim(),
      price: Number(newAddon.price.replace(",", ".")) || 0,
    });
    if (result.error) toast.error("Não foi possível adicionar o item.");
    else {
      setNewAddon({ group_key: "borda", name: "", description: "", price: "0" });
      toast.success("Item adicionado.");
      await refresh();
    }
  }

  async function deleteAddon(addon: PizzeriaAddon) {
    const result = await db.from("pizzeria_addons").delete().eq("id", addon.id);
    if (result.error) toast.error("Não foi possível remover o item.");
    else await refresh();
  }

  if (!store) return null;
  if (catalog.isError) {
    return (
      <AppShell title="🍕 Pizzaria" description="Não foi possível carregar a configuração.">
        <div className="surface p-5 text-sm text-destructive">
          Verifique se a migration da Pizzaria foi executada no Supabase e tente novamente.
          <p className="mt-2 text-xs">{catalog.error instanceof Error ? catalog.error.message : "Erro desconhecido."}</p>
        </div>
        <Button className="mt-3" variant="outline" onClick={() => void catalog.refetch()}>
          Tentar novamente
        </Button>
      </AppShell>
    );
  }
  if (catalog.isLoading || !form) {
    return (
      <AppShell title="🍕 Pizzaria" description="Carregando a configuração da sua pizzaria..." />
    );
  }

  return (
    <AppShell
      title="🍕 Pizzaria"
      description="Configure tamanhos, sabores, bordas, bebidas, molhos e adicionais da sua loja."
      action={
        <Button size="sm" onClick={() => void saveSettings()}>
          <Save className="mr-1.5 size-4" /> Salvar configurações
        </Button>
      }
    >
      <div className="mb-5 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-background to-amber-50 p-5 dark:border-orange-900 dark:from-orange-950/30">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-orange-500/15 p-3 text-2xl">
            <Pizza className="size-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Sua pizzaria online</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O catálogo inicial já foi criado e pode ser editado a qualquer momento.
            </p>
          </div>
        </div>
      </div>

      <CollapsibleSection
        title="⚙️ Informações da pizzaria"
        description="Dados exibidos no cardápio e nas orientações do pedido"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome exibido</Label>
            <Input
              value={form.display_name ?? ""}
              onChange={(event) => setForm({ ...form, display_name: event.target.value })}
              placeholder={store.name}
            />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp para pedidos</Label>
            <Input
              value={form.whatsapp ?? ""}
              onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
              placeholder={store.whatsapp || "(00) 00000-0000"}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Endereço</Label>
            <Input
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              placeholder="Rua, número, bairro e cidade"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Instruções do pedido</Label>
            <Textarea
              value={form.order_instructions}
              onChange={(event) => setForm({ ...form, order_instructions: event.target.value })}
            />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <span>Aceitar meia pizza</span>
            <Switch
              checked={form.allow_half_flavors}
              onCheckedChange={(checked) => setForm({ ...form, allow_half_flavors: checked })}
            />
          </label>
          <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <span>Aceitar pizza de 4 sabores</span>
            <Switch
              checked={form.allow_quarter_flavors}
              onCheckedChange={(checked) => setForm({ ...form, allow_quarter_flavors: checked })}
            />
          </label>
        </div>
        <div className="mt-4 rounded-xl border p-3">
          <div className="mb-3">
            <h3 className="text-sm font-semibold">Campos obrigatórios no pedido</h3>
            <p className="text-xs text-muted-foreground">Defina quais escolhas o cliente precisa fazer antes de adicionar a pizza ao carrinho. As opções inativas nunca serão exigidas.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {([
              ["require_size", "Tamanho da pizza"],
              ["require_flavors", "Sabores da pizza"],
              ["require_border", "Borda"],
              ["require_drink", "Bebida"],
              ["require_sauce", "Molho"],
              ["require_additional", "Adicionais"],
            ] as const).map(([field, label]) => (
              <label key={field} className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-3 text-sm">
                <span>{label}</span>
                <Switch checked={form[field]} onCheckedChange={(checked) => setForm({ ...form, [field]: checked })} />
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Padrão recomendado: tamanho e sabores obrigatórios; borda, bebida, molho e adicionais opcionais.</p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="📏 Tamanhos"
        description={`${catalog.data.sizes.length} tamanhos cadastrados`}
        className="mt-4"
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.data.sizes.map((size) => (
            <div key={size.id} className="rounded-lg border p-3">
              {editingSize === size.id ? (
                <div className="space-y-2">
                  <Input value={sizeDraft.name} onChange={(event) => setSizeDraft({ ...sizeDraft, name: event.target.value })} placeholder="Nome do tamanho" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={sizeDraft.diameter_cm} onChange={(event) => setSizeDraft({ ...sizeDraft, diameter_cm: event.target.value })} placeholder="Diâmetro (cm)" inputMode="decimal" />
                    <select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={sizeDraft.max_flavors} onChange={(event) => setSizeDraft({ ...sizeDraft, max_flavors: event.target.value })}><option value="1">1 sabor</option><option value="2">2 sabores</option><option value="4">4 sabores</option></select>
                  </div>
                  <div className="flex gap-2"><Button size="sm" onClick={() => void saveSize(size)}><Save className="mr-1 size-3" /> Salvar</Button><Button size="sm" variant="outline" onClick={() => setEditingSize(null)}><X className="mr-1 size-3" /> Cancelar</Button></div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <button type="button" onClick={() => void toggleSize(size)} className="min-w-0 flex-1 text-left"><strong>{size.name}</strong><span className="ml-2 text-xs text-muted-foreground">{size.diameter_cm ? String(size.diameter_cm) + " cm · " : ""}{size.max_flavors} sabor(es)</span><span className="mt-1 block">{size.is_active ? <Badge className="bg-emerald-600">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}</span></button>
                  <Button size="icon" variant="ghost" onClick={() => startEditSize(size)} aria-label={"Editar " + size.name}><Pencil className="size-4" /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 rounded-lg border border-dashed p-3 md:grid-cols-[1fr_1fr_180px_auto]">
          <Input value={newSize.name} onChange={(event) => setNewSize({ ...newSize, name: event.target.value })} placeholder="Novo tamanho (ex.: Família)" />
          <Input value={newSize.diameter_cm} onChange={(event) => setNewSize({ ...newSize, diameter_cm: event.target.value })} placeholder="Diâmetro em cm (opcional)" inputMode="decimal" />
          <select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={newSize.max_flavors} onChange={(event) => setNewSize({ ...newSize, max_flavors: event.target.value })}><option value="1">Até 1 sabor</option><option value="2">Até 2 sabores</option><option value="4">Até 4 sabores</option></select>
          <Button onClick={() => void addSize()}><Plus className="mr-1.5 size-4" /> Adicionar tamanho</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Você pode cadastrar tamanhos próprios além dos cinco padrões. Ao criar um tamanho, os preços de todos os sabores começam em R$ 0,00 para você configurar.</p>
      </CollapsibleSection>

      <CollapsibleSection
        title="🍕 Sabores"
        description={`${catalog.data.flavors.length} sabores cadastrados`}
        className="mt-4"
      >
        <div className="grid gap-2 md:grid-cols-2">
          {catalog.data.flavors.map((flavor) => (
            <div key={flavor.id} className="rounded-lg border p-3">
              {editingFlavor === flavor.id ? (
                <div className="space-y-2">
                  {flavor.image_url ? <img src={flavor.image_url} alt={flavor.name} className="h-28 w-28 rounded-lg border object-cover" /> : null}
                  <div className="flex flex-wrap items-center gap-2">{imagePicker("flavor", flavor)}{flavor.image_credit && flavor.image_source_url ? <a href={flavor.image_source_url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline">Crédito: {flavor.image_credit}</a> : null}</div>
                  <Input value={flavorDraft.name} onChange={(event) => setFlavorDraft({ ...flavorDraft, name: event.target.value })} placeholder="Nome do sabor" />
                  <Input value={flavorDraft.category} onChange={(event) => setFlavorDraft({ ...flavorDraft, category: event.target.value })} placeholder="Categoria" />
                  <Textarea value={flavorDraft.description} onChange={(event) => setFlavorDraft({ ...flavorDraft, description: event.target.value })} placeholder="Descrição e ingredientes" />
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="mb-2 text-sm font-semibold">Preço deste sabor por tamanho</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {catalog.data.sizes.map((size) => (
                        <label key={size.id} className="space-y-1 text-xs">
                          <span className="text-muted-foreground">{size.name}{size.is_active ? "" : " (inativo)"}</span>
                          <Input value={flavorPrices[size.id] ?? "0"} onChange={(event) => setFlavorPrices((current) => ({ ...current, [size.id]: event.target.value }))} placeholder="0,00" inputMode="decimal" />
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Em pizzas com mais de um sabor, a regra planejada é cobrar o maior preço entre os sabores escolhidos.</p>
                  </div>
                  <div className="flex gap-2"><Button size="sm" onClick={() => void saveFlavor(flavor)}><Save className="mr-1 size-3" /> Salvar</Button><Button size="sm" variant="outline" onClick={() => setEditingFlavor(null)}><X className="mr-1 size-3" /> Cancelar</Button></div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-start gap-3"><button type="button" onClick={() => void toggleFlavor(flavor)} className="min-w-0 flex-1 text-left"><div className="flex items-center justify-between gap-2"><strong>{flavor.name}</strong>{flavor.is_active ? <Badge className="bg-emerald-600">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{flavor.category} · {flavor.description}</p></button>{flavor.image_url ? <img src={flavor.image_url} alt={flavor.name} className="size-16 shrink-0 rounded-md border object-cover" /> : null}</div>
                  <div className="flex shrink-0 flex-col gap-1">{imagePicker("flavor", flavor)}<Button size="icon" variant="ghost" onClick={() => startEditFlavor(flavor)} aria-label={"Editar " + flavor.name}><Pencil className="size-4" /></Button></div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 rounded-lg border border-dashed p-3 md:grid-cols-[1fr_1fr_180px_auto]">
          <Input
            value={newFlavor.name}
            onChange={(event) => setNewFlavor({ ...newFlavor, name: event.target.value })}
            placeholder="Nome do sabor"
          />
          <Input
            value={newFlavor.description}
            onChange={(event) => setNewFlavor({ ...newFlavor, description: event.target.value })}
            placeholder="Descrição"
          />
          <Input
            value={newFlavor.category}
            onChange={(event) => setNewFlavor({ ...newFlavor, category: event.target.value })}
            placeholder="Categoria"
          />
          <Button onClick={() => void addFlavor()}>
            <Plus className="mr-1.5 size-4" /> Adicionar
          </Button>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="🥤 Bebidas"
        description={`${catalog.data.addons.filter((addon) => addon.group_key === "bebida").length} bebidas cadastradas`}
        className="mt-4"
      >
        <p className="mb-3 text-xs text-muted-foreground">Sugestões iniciais baseadas nas marcas mais escolhidas fora de casa no Brasil. Edite os preços e apresentações conforme seu estoque. Você pode ativar, desativar, editar ou cadastrar novas bebidas.</p>
        <div className="grid gap-2 md:grid-cols-2">
          {catalog.data.addons.filter((addon) => addon.group_key === "bebida").map((addon) => (
            <div key={addon.id} className="rounded-lg border p-3">
              {editingAddon === addon.id ? (
                <div className="space-y-2">
                  {addon.image_url ? <img src={addon.image_url} alt={addon.name} className="h-28 w-28 rounded-lg border bg-white object-contain p-1" /> : null}
                  <div className="flex flex-wrap items-center gap-2">{imagePicker("addon", addon)}{addon.image_credit && addon.image_source_url ? <a href={addon.image_source_url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline">Crédito: {addon.image_credit}</a> : null}</div>
                  <Input value={addonDraft.name} onChange={(event) => setAddonDraft({ ...addonDraft, name: event.target.value })} placeholder="Nome" />
                  <Input value={addonDraft.description} onChange={(event) => setAddonDraft({ ...addonDraft, description: event.target.value })} placeholder="Descrição / volume" />
                  <Input value={addonDraft.price} onChange={(event) => setAddonDraft({ ...addonDraft, price: event.target.value })} placeholder="Preço" inputMode="decimal" />
                  <div className="flex gap-2"><Button size="sm" onClick={() => void saveAddon(addon)}><Save className="mr-1 size-3" /> Salvar</Button><Button size="sm" variant="outline" onClick={() => setEditingAddon(null)}><X className="mr-1 size-3" /> Cancelar</Button></div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-start gap-3"><button type="button" onClick={() => void toggleAddon(addon)} className="min-w-0 flex-1 text-left"><div className="flex items-center gap-2"><strong>{addon.name}</strong>{addon.is_active ? <Badge className="bg-emerald-600">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}</div><p className="text-xs text-muted-foreground">{addon.description} · R$ {Number(addon.price).toFixed(2).replace(".", ",")}</p></button>{addon.image_url ? <img src={addon.image_url} alt={addon.name} className="size-16 shrink-0 rounded-md border bg-white object-contain p-1" /> : null}</div>
                  <div className="flex shrink-0 flex-col gap-1">{imagePicker("addon", addon)}<div className="flex"><Button size="icon" variant="ghost" onClick={() => startEditAddon(addon)} aria-label={"Editar " + addon.name}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" onClick={() => void deleteAddon(addon)} aria-label={"Remover " + addon.name}><Trash2 className="size-4 text-destructive" /></Button></div></div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 rounded-lg border border-dashed p-3 md:grid-cols-[1fr_1fr_120px_auto]">
          <Input value={newAddon.name} onChange={(event) => setNewAddon({ ...newAddon, group_key: "bebida", name: event.target.value })} placeholder="Ex.: Coca-Cola Zero 600ml" />
          <Input value={newAddon.description} onChange={(event) => setNewAddon({ ...newAddon, group_key: "bebida", description: event.target.value })} placeholder="Marca, tipo e volume" />
          <Input value={newAddon.price} onChange={(event) => setNewAddon({ ...newAddon, group_key: "bebida", price: event.target.value })} placeholder="Preço" inputMode="decimal" />
          <Button onClick={() => void addAddon("bebida")}><Plus className="mr-1.5 size-4" /> Adicionar bebida</Button>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="🧀 Bordas, molhos e adicionais"
        description={`${catalog.data.addons.filter((addon) => addon.group_key !== "bebida").length} itens cadastrados`}
        className="mt-4"
      >
        <div className="grid gap-2 md:grid-cols-2">
          {catalog.data.addons.filter((addon) => addon.group_key !== "bebida").map((addon) => (
            <div key={addon.id} className="rounded-lg border p-3">
              {editingAddon === addon.id ? (
                <div className="space-y-2">
                  <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={addonDraft.group_key} onChange={(event) => setAddonDraft({ ...addonDraft, group_key: event.target.value })}><option value="borda">Borda</option><option value="bebida">Bebida</option><option value="molho">Molho</option><option value="adicional">Adicional</option></select>
                  <Input value={addonDraft.name} onChange={(event) => setAddonDraft({ ...addonDraft, name: event.target.value })} placeholder="Nome" />
                  <Input value={addonDraft.description} onChange={(event) => setAddonDraft({ ...addonDraft, description: event.target.value })} placeholder="Descrição" />
                  <Input value={addonDraft.price} onChange={(event) => setAddonDraft({ ...addonDraft, price: event.target.value })} placeholder="Preço" inputMode="decimal" />
                  <div className="flex gap-2"><Button size="sm" onClick={() => void saveAddon(addon)}><Save className="mr-1 size-3" /> Salvar</Button><Button size="sm" variant="outline" onClick={() => setEditingAddon(null)}><X className="mr-1 size-3" /> Cancelar</Button></div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <button type="button" onClick={() => void toggleAddon(addon)} className="min-w-0 flex-1 text-left"><div className="flex items-center gap-2"><strong>{addon.name}</strong>{addon.is_active ? <Badge className="bg-emerald-600">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}</div><p className="text-xs text-muted-foreground">{addon.group_key} · {addon.description} · R$ {Number(addon.price).toFixed(2).replace(".", ",")}</p></button>
                  <div className="flex shrink-0"><Button size="icon" variant="ghost" onClick={() => startEditAddon(addon)} aria-label={"Editar " + addon.name}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" onClick={() => void deleteAddon(addon)} aria-label={"Remover " + addon.name}><Trash2 className="size-4 text-destructive" /></Button></div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 rounded-lg border border-dashed p-3 md:grid-cols-[160px_1fr_1fr_120px_auto]">
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            value={newAddon.group_key}
            onChange={(event) => setNewAddon({ ...newAddon, group_key: event.target.value })}
          >
            <option value="borda">Borda</option>
            <option value="bebida">Bebida</option>
            <option value="molho">Molho</option>
            <option value="adicional">Adicional</option>
          </select>
          <Input
            value={newAddon.name}
            onChange={(event) => setNewAddon({ ...newAddon, name: event.target.value })}
            placeholder="Nome"
          />
          <Input
            value={newAddon.description}
            onChange={(event) => setNewAddon({ ...newAddon, description: event.target.value })}
            placeholder="Descrição"
          />
          <Input
            value={newAddon.price}
            onChange={(event) => setNewAddon({ ...newAddon, price: event.target.value })}
            placeholder="Preço"
            inputMode="decimal"
          />
          <Button onClick={() => void addAddon()}>
            <Plus className="mr-1.5 size-4" /> Adicionar
          </Button>
        </div>
      </CollapsibleSection>
    </AppShell>
  );
}
