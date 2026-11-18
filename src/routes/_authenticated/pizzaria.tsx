import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { validateDeliveryOrigin } from "@/lib/delivery.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { Check, Pencil, Pizza, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PizzeriaPhoto, PizzeriaPhotoPreview } from "@/components/PizzeriaPhoto";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useMyStore } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/pizzaria")({
  head: () => ({
    meta: [
      { title: "Pizzaria | Vitrini" },
      {
        name: "description",
        content: "Gerencie o catálogo e as configurações da sua pizzaria no Vitrini.",
      },
      { property: "og:title", content: "Pizzaria | Vitrini" },
      {
        property: "og:description",
        content: "Gerencie o catálogo e as configurações da sua pizzaria no Vitrini.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PizzeriaSettings,
});

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
  delivery_enabled: boolean;
  delivery_origin_cep: string;
  delivery_radius_km: number;
  delivery_fee: number;
};
type PizzeriaSize = {
  id: string;
  name: string;
  diameter_cm: number | null;
  max_flavors: number;
  is_active: boolean;
};
type PizzeriaFlavor = {
  image_url: string | null;
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
};
type PizzeriaFlavorPrice = { size_id: string; flavor_id: string; price: number };
type PizzeriaAddon = {
  image_url: string | null;
  id: string;
  group_key: "borda" | "bebida" | "molho" | "adicional";
  name: string;
  description: string;
  price: number;
  is_active: boolean;
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
  delivery_enabled: false,
  delivery_origin_cep: "",
  delivery_radius_km: 5,
  delivery_fee: 0,
});

function PizzeriaSettings() {
  const { data: store } = useMyStore();
  const client = useQueryClient();
  const validateOrigin = useServerFn(validateDeliveryOrigin);
  const [savingSettings, setSavingSettings] = useState(false);
  const [form, setForm] = useState<PizzeriaSettingsRow | null>(null);
  const [editingSize, setEditingSize] = useState<string | null>(null);
  const [sizeDraft, setSizeDraft] = useState({ name: "", diameter_cm: "", max_flavors: "1" });
  const [newSize, setNewSize] = useState({ name: "", diameter_cm: "", max_flavors: "1" });
  const [editingFlavor, setEditingFlavor] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [flavorPrices, setFlavorPrices] = useState<Record<string, string>>({});
  const [flavorDraft, setFlavorDraft] = useState({
    name: "",
    description: "",
    category: "",
    image_url: null as string | null,
  });
  const [editingAddon, setEditingAddon] = useState<string | null>(null);
  const [addonDraft, setAddonDraft] = useState({
    group_key: "borda",
    name: "",
    description: "",
    price: "0",
    image_url: null as string | null,
  });
  const [newFlavor, setNewFlavor] = useState({
    name: "",
    description: "",
    category: "Tradicionais",
    image_url: null as string | null,
  });
  const [newAddon, setNewAddon] = useState({
    group_key: "borda",
    name: "",
    description: "",
    price: "0",
    image_url: null as string | null,
  });

  const catalog = useQuery({
    queryKey: ["pizzeria-catalog", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      if (!store) throw new Error("Loja não encontrada.");
      const seedResult = await db.rpc("seed_pizzeria_catalog", { target_store_id: store.id });
      if (seedResult.error) throw seedResult.error;
      const [settings, sizes, flavors, addons, prices] = await Promise.all([
        db.from("pizzeria_settings").select("*").eq("store_id", store.id).maybeSingle(),
        db
          .from("pizzeria_sizes")
          .select("id,name,diameter_cm,max_flavors,is_active")
          .eq("store_id", store.id)
          .order("sort_order"),
        db
          .from("pizzeria_flavors")
          .select("id,name,description,category,is_active,image_url")
          .eq("store_id", store.id)
          .order("sort_order"),
        db
          .from("pizzeria_addons")
          .select("id,group_key,name,description,price,is_active,image_url")
          .eq("store_id", store.id)
          .order("group_key")
          .order("sort_order"),
        db
          .from("pizzeria_flavor_prices")
          .select("size_id,flavor_id,price")
          .eq("store_id", store.id),
      ]);
      for (const result of [settings, sizes, flavors, addons, prices]) {
        if (result.error) throw result.error;
      }
      return {
        settings: (settings.data as PizzeriaSettingsRow | null) ?? emptySettings(store.id),
        sizes: (sizes.data ?? []) as PizzeriaSize[],
        flavors: (flavors.data ?? []) as PizzeriaFlavor[],
        addons: (addons.data ?? []) as PizzeriaAddon[],
        prices: (prices.data ?? []) as PizzeriaFlavorPrice[],
      };
    },
  });

  const catalogData = catalog.data;

  useEffect(() => {
    if (catalog.data) setForm(catalog.data.settings);
  }, [catalog.data]);

  async function refresh() {
    await client.invalidateQueries({ queryKey: ["pizzeria-catalog", store?.id] });
  }

  async function saveSettings() {
    if (!form) return;
    if (!Number.isFinite(form.delivery_radius_km) || form.delivery_radius_km <= 0 || !Number.isFinite(form.delivery_fee) || form.delivery_fee < 0) {
      toast.error("Informe um limite maior que zero e uma taxa de frete válida.");
      return;
    }
    setSavingSettings(true);
    try {
    const cep = form.delivery_origin_cep.replace(/\D/g, "");
    if (form.delivery_enabled) {
      await validateOrigin({ data: { cep } });
    }
    const result = await db.from("pizzeria_settings").upsert({ ...form, delivery_origin_cep: cep }, { onConflict: "store_id" });
    if (result.error) {
      toast.error("Não foi possível salvar as configurações da pizzaria.");
      return;
    }
    toast.success("Configurações da pizzaria salvas.");
    await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível verificar o CEP da pizzaria.");
    } finally {
      setSavingSettings(false);
    }
  }

  function startEditSize(size: PizzeriaSize) {
    setEditingSize(size.id);
    setSizeDraft({
      name: size.name,
      diameter_cm: size.diameter_cm == null ? "" : String(size.diameter_cm),
      max_flavors: String(size.max_flavors),
    });
  }
  async function addSize() {
    if (!catalogData) return;
    if (!store) return;
    const name = newSize.name.trim();
    const diameter = newSize.diameter_cm.trim()
      ? Number(newSize.diameter_cm.replace(",", "."))
      : null;
    const maxFlavors = Number(newSize.max_flavors);
    if (
      !name ||
      (diameter !== null && (!Number.isFinite(diameter) || diameter <= 0)) ||
      ![1, 2, 4].includes(maxFlavors)
    ) {
      toast.error("Informe um nome, diâmetro válido e quantidade de sabores (1, 2 ou 4).");
      return;
    }
    const nextOrder = (catalogData.sizes.length + 1) * 10;
    const created = await db
      .from("pizzeria_sizes")
      .insert({
        store_id: store.id,
        name,
        diameter_cm: diameter,
        max_flavors: maxFlavors,
        sort_order: nextOrder,
      })
      .select("id")
      .single();
    if (created.error || !created.data) {
      toast.error("Não foi possível adicionar o tamanho. Verifique se já existe.");
      return;
    }
    if (catalogData.flavors.length) {
      const rows = catalogData.flavors.map((flavor) => ({
        store_id: store.id,
        size_id: created.data.id,
        flavor_id: flavor.id,
        price: 0,
      }));
      const pricesResult = await db
        .from("pizzeria_flavor_prices")
        .upsert(rows, { onConflict: "size_id,flavor_id" });
      if (pricesResult.error)
        toast.error("Tamanho criado, mas não foi possível inicializar os preços dos sabores.");
    }
    setNewSize({ name: "", diameter_cm: "", max_flavors: "1" });
    toast.success("Novo tamanho adicionado. Configure os preços dos sabores.");
    await refresh();
  }
  async function saveSize(size: PizzeriaSize) {
    const name = sizeDraft.name.trim();
    const diameter = sizeDraft.diameter_cm.trim()
      ? Number(sizeDraft.diameter_cm.replace(",", "."))
      : null;
    const maxFlavors = Number(sizeDraft.max_flavors);
    if (
      !name ||
      (diameter !== null && (!Number.isFinite(diameter) || diameter <= 0)) ||
      ![1, 2, 4].includes(maxFlavors)
    ) {
      toast.error("Confira o nome, o diâmetro e a quantidade de sabores.");
      return;
    }
    const result = await db
      .from("pizzeria_sizes")
      .update({ name, diameter_cm: diameter, max_flavors: maxFlavors })
      .eq("id", size.id);
    if (result.error) {
      toast.error("Não foi possível salvar o tamanho. Verifique se o nome já existe.");
      return;
    }
    setEditingSize(null);
    toast.success("Tamanho atualizado.");
    await refresh();
  }
  function startEditFlavor(flavor: PizzeriaFlavor) {
    if (!catalogData) return;
    setEditingFlavor(flavor.id);
    setFlavorDraft({
      name: flavor.name,
      description: flavor.description,
      category: flavor.category,
      image_url: flavor.image_url,
    });
    const prices = Object.fromEntries(
      catalogData.sizes.map((size) => {
        const saved = catalogData.prices.find(
          (item) => item.flavor_id === flavor.id && item.size_id === size.id,
        );
        return [size.id, saved ? String(saved.price) : "0"];
      }),
    );
    setFlavorPrices(prices);
  }
  async function saveFlavor(flavor: PizzeriaFlavor) {
    if (!store || !catalogData) return;
    if (!flavorDraft.name.trim()) {
      toast.error("Informe o nome do sabor.");
      return;
    }
    const priceRows = catalogData.sizes.map((size) => {
      const price = Number((flavorPrices[size.id] ?? "0").replace(",", "."));
      return { store_id: store.id, size_id: size.id, flavor_id: flavor.id, price };
    });
    if (priceRows.some((row) => !Number.isFinite(row.price) || row.price < 0)) {
      toast.error("Confira os preços: todos devem ser números iguais ou maiores que zero.");
      return;
    }
    const result = await db
      .from("pizzeria_flavors")
      .update({
        name: flavorDraft.name.trim(),
        description: flavorDraft.description.trim(),
        category: flavorDraft.category.trim() || "Tradicionais",
        image_url: flavorDraft.image_url,
        ...(flavorDraft.image_url !== flavor.image_url
          ? { image_credit: null, image_source_url: null }
          : {}),
      })
      .eq("id", flavor.id)
      .eq("store_id", store.id);
    if (result.error) {
      toast.error("Não foi possível salvar o sabor. Verifique se o nome já existe.");
      return;
    }
    if (priceRows.length) {
      const priceResult = await db
        .from("pizzeria_flavor_prices")
        .upsert(priceRows, { onConflict: "size_id,flavor_id" });
      if (priceResult.error) {
        toast.error("Sabor salvo, mas houve erro ao salvar os preços por tamanho.");
        await refresh();
        return;
      }
    }
    setEditingFlavor(null);
    toast.success("Sabor e preços por tamanho atualizados.");
    await refresh();
  }
  function startEditAddon(addon: PizzeriaAddon) {
    setEditingAddon(addon.id);
    setAddonDraft({
      group_key: addon.group_key,
      name: addon.name,
      description: addon.description,
      price: String(addon.price),
      image_url: addon.image_url,
    });
  }
  async function saveAddon(addon: PizzeriaAddon) {
    const price = Number(addonDraft.price.replace(",", "."));
    if (!addonDraft.name.trim() || !Number.isFinite(price) || price < 0) {
      toast.error("Informe um nome e um preço válido (maior ou igual a zero).");
      return;
    }
    const result = await db
      .from("pizzeria_addons")
      .update({
        group_key: addonDraft.group_key,
        name: addonDraft.name.trim(),
        description: addonDraft.description.trim(),
        price,
        image_url: addonDraft.image_url,
        ...(addonDraft.image_url !== addon.image_url
          ? { image_credit: null, image_source_url: null }
          : {}),
      })
      .eq("id", addon.id);
    if (result.error) {
      toast.error("Não foi possível salvar o item. Verifique se já existe no grupo.");
      return;
    }
    setEditingAddon(null);
    toast.success("Item atualizado.");
    await refresh();
  }
  async function toggleAddon(addon: PizzeriaAddon) {
    const result = await db
      .from("pizzeria_addons")
      .update({ is_active: !addon.is_active })
      .eq("id", addon.id);
    if (result.error) toast.error("Não foi possível atualizar o item.");
    else await refresh();
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
    if (!catalogData) return;
    if (!store || !newFlavor.name.trim()) {
      toast.error("Informe o nome do sabor.");
      return;
    }
    const result = await db
      .from("pizzeria_flavors")
      .insert({
        store_id: store.id,
        name: newFlavor.name.trim(),
        description: newFlavor.description.trim(),
        category: newFlavor.category.trim() || "Tradicionais",
        image_url: newFlavor.image_url,
      })
      .select("id")
      .single();
    if (result.error || !result.data) toast.error("Não foi possível adicionar o sabor.");
    else {
      if (catalogData.sizes.length) {
        const rows = catalogData.sizes.map((size) => ({
          store_id: store.id,
          size_id: size.id,
          flavor_id: result.data.id,
          price: 0,
        }));
        const priceResult = await db
          .from("pizzeria_flavor_prices")
          .upsert(rows, { onConflict: "size_id,flavor_id" });
        if (priceResult.error)
          toast.error("Sabor criado, mas não foi possível inicializar os preços por tamanho.");
      }
      setNewFlavor({ name: "", description: "", category: "Tradicionais", image_url: null });
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
      image_url: newAddon.image_url,
    });
    if (result.error) toast.error("Não foi possível adicionar o item.");
    else {
      setNewAddon({ group_key: "borda", name: "", description: "", price: "0", image_url: null });
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
          <p className="mt-2 text-xs">
            {catalog.error instanceof Error ? catalog.error.message : "Erro desconhecido."}
          </p>
        </div>
        <Button className="mt-3" variant="outline" onClick={() => void catalog.refetch()}>
          Tentar novamente
        </Button>
      </AppShell>
    );
  }
  if (catalog.isLoading || !form || !catalogData) {
    return (
      <AppShell title="🍕 Pizzaria" description="Carregando a configuração da sua pizzaria...">
        <div role="status" aria-live="polite">
          Carregando...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="🍕 Pizzaria"
      description="Configure tamanhos, sabores, bordas, bebidas, molhos e adicionais da sua loja."
      action={
        <div className="flex gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link to="/pizzaria/pedidos">
            <ClipboardList className="mr-1.5 size-4" /> Pedidos
          </Link>
        </Button>
        <Button size="sm" disabled={savingSettings} onClick={() => void saveSettings()}>
          <Save className="mr-1.5 size-4" /> Salvar configurações
        </Button>
        </div>
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
            <p className="text-xs text-muted-foreground">
              Defina quais escolhas o cliente precisa fazer antes de adicionar a pizza ao carrinho.
              As opções inativas nunca serão exigidas.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["require_size", "Tamanho da pizza"],
                ["require_flavors", "Sabores da pizza"],
                ["require_border", "Borda"],
                ["require_drink", "Bebida"],
                ["require_sauce", "Molho"],
                ["require_additional", "Adicionais"],
              ] as const
            ).map(([field, label]) => (
              <label
                key={field}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-3 text-sm"
              >
                <span>{label}</span>
                <Switch
                  checked={form[field]}
                  onCheckedChange={(checked) => setForm({ ...form, [field]: checked })}
                />
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Padrão recomendado: tamanho e sabores obrigatórios; borda, bebida, molho e adicionais
            opcionais.
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Entrega e frete" description="Área atendida e taxa de entrega" className="mt-4">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Habilitar entrega</span>
          <Switch checked={form.delivery_enabled} onCheckedChange={(checked) => setForm({ ...form, delivery_enabled: checked })} />
        </label>
        {form.delivery_enabled ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="origin-cep">CEP da pizzaria</Label>
              <Input id="origin-cep" inputMode="numeric" maxLength={9} value={form.delivery_origin_cep} onChange={(e) => setForm({ ...form, delivery_origin_cep: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-radius">Limite de distância (km)</Label>
              <Input id="delivery-radius" type="number" min="0.1" step="0.1" value={form.delivery_radius_km} onChange={(e) => setForm({ ...form, delivery_radius_km: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-fee">Frete (R$)</Label>
              <Input id="delivery-fee" type="number" min="0" step="0.01" value={form.delivery_fee} onChange={(e) => setForm({ ...form, delivery_fee: Number(e.target.value) })} />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-3">Raio aproximado entre os CEPs, em linha reta. Não representa o trajeto pelas ruas. Use R$ 0 para entrega grátis.</p>
          </div>
        ) : <p className="mt-3 text-xs text-muted-foreground">Pedidos da pizzaria disponíveis para retirada.</p>}
      </CollapsibleSection>

      <CollapsibleSection
        title="📏 Tamanhos"
        description={`${catalogData.sizes.length} tamanhos cadastrados`}
        className="mt-4"
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {catalogData.sizes.map((size) => (
            <div key={size.id} className="rounded-lg border p-3">
              {editingSize === size.id ? (
                <div className="space-y-2">
                  <Input
                    value={sizeDraft.name}
                    onChange={(event) => setSizeDraft({ ...sizeDraft, name: event.target.value })}
                    placeholder="Nome do tamanho"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={sizeDraft.diameter_cm}
                      onChange={(event) =>
                        setSizeDraft({ ...sizeDraft, diameter_cm: event.target.value })
                      }
                      placeholder="Diâmetro (cm)"
                      inputMode="decimal"
                    />
                    <select
                      className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={sizeDraft.max_flavors}
                      onChange={(event) =>
                        setSizeDraft({ ...sizeDraft, max_flavors: event.target.value })
                      }
                    >
                      <option value="1">1 sabor</option>
                      <option value="2">2 sabores</option>
                      <option value="4">4 sabores</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void saveSize(size)}>
                      <Save className="mr-1 size-3" /> Salvar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingSize(null)}>
                      <X className="mr-1 size-3" /> Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleSize(size)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <strong>{size.name}</strong>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {size.diameter_cm ? String(size.diameter_cm) + " cm · " : ""}
                      {size.max_flavors} sabor(es)
                    </span>
                    <span className="mt-1 block">
                      {size.is_active ? (
                        <Badge className="bg-emerald-600">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Inativo</Badge>
                      )}
                    </span>
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => startEditSize(size)}
                    aria-label={"Editar " + size.name}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 rounded-lg border border-dashed p-3 md:grid-cols-[1fr_1fr_180px_auto]">
          <Input
            value={newSize.name}
            onChange={(event) => setNewSize({ ...newSize, name: event.target.value })}
            placeholder="Novo tamanho (ex.: Família)"
          />
          <Input
            value={newSize.diameter_cm}
            onChange={(event) => setNewSize({ ...newSize, diameter_cm: event.target.value })}
            placeholder="Diâmetro em cm (opcional)"
            inputMode="decimal"
          />
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            value={newSize.max_flavors}
            onChange={(event) => setNewSize({ ...newSize, max_flavors: event.target.value })}
          >
            <option value="1">Até 1 sabor</option>
            <option value="2">Até 2 sabores</option>
            <option value="4">Até 4 sabores</option>
          </select>
          <Button onClick={() => void addSize()}>
            <Plus className="mr-1.5 size-4" /> Adicionar tamanho
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Você pode cadastrar tamanhos próprios além dos cinco padrões. Ao criar um tamanho, os
          preços de todos os sabores começam em R$ 0,00 para você configurar.
        </p>
      </CollapsibleSection>

      <CollapsibleSection
        title="🍕 Sabores"
        description={`${catalogData.flavors.length} sabores cadastrados`}
        className="mt-4"
      >
        <div className="grid gap-2 md:grid-cols-2">
          {catalogData.flavors.map((flavor) => (
            <div key={flavor.id} className="rounded-lg border p-3">
              {editingFlavor === flavor.id ? (
                <div className="space-y-2">
                  <PizzeriaPhoto
                    path={flavorDraft.image_url}
                    name={flavor.name}
                    onChange={(image_url) =>
                      setFlavorDraft((current) => ({ ...current, image_url }))
                    }
                    onUploadingChange={setPhotoUploading}
                  />
                  <Input
                    value={flavorDraft.name}
                    onChange={(event) =>
                      setFlavorDraft({ ...flavorDraft, name: event.target.value })
                    }
                    placeholder="Nome do sabor"
                  />
                  <Input
                    value={flavorDraft.category}
                    onChange={(event) =>
                      setFlavorDraft({ ...flavorDraft, category: event.target.value })
                    }
                    placeholder="Categoria"
                  />
                  <Textarea
                    value={flavorDraft.description}
                    onChange={(event) =>
                      setFlavorDraft({ ...flavorDraft, description: event.target.value })
                    }
                    placeholder="Descrição e ingredientes"
                  />
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="mb-2 text-sm font-semibold">Preço deste sabor por tamanho</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {catalogData.sizes.map((size) => (
                        <label key={size.id} className="space-y-1 text-xs">
                          <span className="text-muted-foreground">
                            {size.name}
                            {size.is_active ? "" : " (inativo)"}
                          </span>
                          <Input
                            value={flavorPrices[size.id] ?? "0"}
                            onChange={(event) =>
                              setFlavorPrices((current) => ({
                                ...current,
                                [size.id]: event.target.value,
                              }))
                            }
                            placeholder="0,00"
                            inputMode="decimal"
                          />
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Em pizzas com mais de um sabor, a regra planejada é cobrar o maior preço entre
                      os sabores escolhidos.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={photoUploading}
                      onClick={() => void saveFlavor(flavor)}
                    >
                      <Save className="mr-1 size-3" /> Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={photoUploading}
                      onClick={() => setEditingFlavor(null)}
                    >
                      <X className="mr-1 size-3" /> Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <PizzeriaPhotoPreview path={flavor.image_url} name={flavor.name} />
                  <button
                    type="button"
                    onClick={() => void toggleFlavor(flavor)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong>{flavor.name}</strong>
                      {flavor.is_active ? (
                        <Badge className="bg-emerald-600">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Inativo</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {flavor.category} · {flavor.description}
                    </p>
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={photoUploading}
                    onClick={() => startEditFlavor(flavor)}
                    aria-label={"Editar " + flavor.name}
                  >
                    <Pencil className="size-4" />
                  </Button>
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
          <div className="md:col-span-full">
            <PizzeriaPhoto
              path={newFlavor.image_url}
              name="novo sabor"
              onChange={(image_url) => setNewFlavor((current) => ({ ...current, image_url }))}
              onUploadingChange={setPhotoUploading}
            />
          </div>
          <Button disabled={photoUploading} onClick={() => void addFlavor()}>
            <Plus className="mr-1.5 size-4" /> Adicionar
          </Button>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="🥤 Bebidas"
        description={`${catalogData.addons.filter((addon) => addon.group_key === "bebida").length} bebidas cadastradas`}
        className="mt-4"
      >
        <p className="mb-3 text-xs text-muted-foreground">
          Sugestões iniciais baseadas nas marcas mais escolhidas fora de casa no Brasil. Edite os
          preços e apresentações conforme seu estoque. Você pode ativar, desativar, editar ou
          cadastrar novas bebidas.
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          {catalogData.addons
            .filter((addon) => addon.group_key === "bebida")
            .map((addon) => (
              <div key={addon.id} className="rounded-lg border p-3">
                {editingAddon === addon.id ? (
                  <div className="space-y-2">
                    {addon.group_key === "bebida" ? (
                      <PizzeriaPhoto
                        path={addonDraft.image_url}
                        name={addon.name}
                        onChange={(image_url) =>
                          setAddonDraft((current) => ({ ...current, image_url }))
                        }
                        onUploadingChange={setPhotoUploading}
                      />
                    ) : null}
                    <Input
                      value={addonDraft.name}
                      onChange={(event) =>
                        setAddonDraft({ ...addonDraft, name: event.target.value })
                      }
                      placeholder="Nome"
                    />
                    <Input
                      value={addonDraft.description}
                      onChange={(event) =>
                        setAddonDraft({ ...addonDraft, description: event.target.value })
                      }
                      placeholder="Descrição / volume"
                    />
                    <Input
                      value={addonDraft.price}
                      onChange={(event) =>
                        setAddonDraft({ ...addonDraft, price: event.target.value })
                      }
                      placeholder="Preço"
                      inputMode="decimal"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={photoUploading}
                        onClick={() => void saveAddon(addon)}
                      >
                        <Save className="mr-1 size-3" /> Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={photoUploading}
                        onClick={() => setEditingAddon(null)}
                      >
                        <X className="mr-1 size-3" /> Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    {addon.group_key === "bebida" ? (
                      <PizzeriaPhotoPreview path={addon.image_url} name={addon.name} />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void toggleAddon(addon)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <strong>{addon.name}</strong>
                        {addon.is_active ? (
                          <Badge className="bg-emerald-600">Ativo</Badge>
                        ) : (
                          <Badge variant="outline">Inativo</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {addon.description} · R$ {Number(addon.price).toFixed(2).replace(".", ",")}
                      </p>
                    </button>
                    <div className="flex shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={photoUploading}
                        onClick={() => startEditAddon(addon)}
                        aria-label={"Editar " + addon.name}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void deleteAddon(addon)}
                        aria-label={"Remover " + addon.name}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
        <div className="mt-4 grid gap-2 rounded-lg border border-dashed p-3 md:grid-cols-[1fr_1fr_120px_auto]">
          <Input
            value={newAddon.name}
            onChange={(event) =>
              setNewAddon({ ...newAddon, group_key: "bebida", name: event.target.value })
            }
            placeholder="Ex.: Coca-Cola Zero 600ml"
          />
          <Input
            value={newAddon.description}
            onChange={(event) =>
              setNewAddon({ ...newAddon, group_key: "bebida", description: event.target.value })
            }
            placeholder="Marca, tipo e volume"
          />
          <Input
            value={newAddon.price}
            onChange={(event) =>
              setNewAddon({ ...newAddon, group_key: "bebida", price: event.target.value })
            }
            placeholder="Preço"
            inputMode="decimal"
          />
          <div className="md:col-span-full">
            <PizzeriaPhoto
              path={newAddon.image_url}
              name="nova bebida"
              onChange={(image_url) => setNewAddon((current) => ({ ...current, image_url }))}
              onUploadingChange={setPhotoUploading}
            />
          </div>
          <Button disabled={photoUploading} onClick={() => void addAddon("bebida")}>
            <Plus className="mr-1.5 size-4" /> Adicionar bebida
          </Button>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="🧀 Bordas, molhos e adicionais"
        description={`${catalogData.addons.filter((addon) => addon.group_key !== "bebida").length} itens cadastrados`}
        className="mt-4"
      >
        <div className="grid gap-2 md:grid-cols-2">
          {catalogData.addons
            .filter((addon) => addon.group_key !== "bebida")
            .map((addon) => (
              <div key={addon.id} className="rounded-lg border p-3">
                {editingAddon === addon.id ? (
                  <div className="space-y-2">
                    <select
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      value={addonDraft.group_key}
                      onChange={(event) =>
                        setAddonDraft({ ...addonDraft, group_key: event.target.value })
                      }
                    >
                      <option value="borda">Borda</option>
                      <option value="bebida">Bebida</option>
                      <option value="molho">Molho</option>
                      <option value="adicional">Adicional</option>
                    </select>
                    {addon.group_key === "bebida" ? (
                      <PizzeriaPhoto
                        path={addonDraft.image_url}
                        name={addon.name}
                        onChange={(image_url) =>
                          setAddonDraft((current) => ({ ...current, image_url }))
                        }
                        onUploadingChange={setPhotoUploading}
                      />
                    ) : null}
                    <Input
                      value={addonDraft.name}
                      onChange={(event) =>
                        setAddonDraft({ ...addonDraft, name: event.target.value })
                      }
                      placeholder="Nome"
                    />
                    <Input
                      value={addonDraft.description}
                      onChange={(event) =>
                        setAddonDraft({ ...addonDraft, description: event.target.value })
                      }
                      placeholder="Descrição"
                    />
                    <Input
                      value={addonDraft.price}
                      onChange={(event) =>
                        setAddonDraft({ ...addonDraft, price: event.target.value })
                      }
                      placeholder="Preço"
                      inputMode="decimal"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={photoUploading}
                        onClick={() => void saveAddon(addon)}
                      >
                        <Save className="mr-1 size-3" /> Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={photoUploading}
                        onClick={() => setEditingAddon(null)}
                      >
                        <X className="mr-1 size-3" /> Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    {addon.group_key === "bebida" ? (
                      <PizzeriaPhotoPreview path={addon.image_url} name={addon.name} />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void toggleAddon(addon)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <strong>{addon.name}</strong>
                        {addon.is_active ? (
                          <Badge className="bg-emerald-600">Ativo</Badge>
                        ) : (
                          <Badge variant="outline">Inativo</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {addon.group_key} · {addon.description} · R${" "}
                        {Number(addon.price).toFixed(2).replace(".", ",")}
                      </p>
                    </button>
                    <div className="flex shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={photoUploading}
                        onClick={() => startEditAddon(addon)}
                        aria-label={"Editar " + addon.name}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void deleteAddon(addon)}
                        aria-label={"Remover " + addon.name}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
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
