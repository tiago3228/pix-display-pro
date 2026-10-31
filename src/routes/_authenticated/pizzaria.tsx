import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Pizza, Plus, Save, Trash2 } from "lucide-react";
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
};
type PizzeriaAddon = {
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
});

function PizzeriaSettings() {
  const { data: store } = useMyStore();
  const client = useQueryClient();
  const [form, setForm] = useState<PizzeriaSettingsRow | null>(null);
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
      const [settings, sizes, flavors, addons] = await Promise.all([
        db.from("pizzeria_settings").select("*").eq("store_id", store!.id).maybeSingle(),
        db
          .from("pizzeria_sizes")
          .select("id,name,diameter_cm,max_flavors,is_active")
          .eq("store_id", store!.id)
          .order("sort_order"),
        db
          .from("pizzeria_flavors")
          .select("id,name,description,category,is_active")
          .eq("store_id", store!.id)
          .order("sort_order"),
        db
          .from("pizzeria_addons")
          .select("id,group_key,name,description,price,is_active")
          .eq("store_id", store!.id)
          .order("group_key")
          .order("sort_order"),
      ]);
      for (const result of [settings, sizes, flavors, addons]) {
        if (result.error) throw result.error;
      }
      return {
        settings: (settings.data as PizzeriaSettingsRow | null) ?? emptySettings(store!.id),
        sizes: (sizes.data ?? []) as PizzeriaSize[],
        flavors: (flavors.data ?? []) as PizzeriaFlavor[],
        addons: (addons.data ?? []) as PizzeriaAddon[],
      };
    },
  });

  useEffect(() => {
    if (catalog.data) setForm(catalog.data.settings);
  }, [catalog.data]);

  async function refresh() {
    await client.invalidateQueries({ queryKey: ["pizzeria-catalog", store?.id] });
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
    });
    if (result.error) toast.error("Não foi possível adicionar o sabor.");
    else {
      setNewFlavor({ name: "", description: "", category: "Tradicionais" });
      toast.success("Sabor adicionado.");
      await refresh();
    }
  }

  async function addAddon() {
    if (!store || !newAddon.name.trim()) {
      toast.error("Informe o nome do adicional.");
      return;
    }
    const result = await db.from("pizzeria_addons").insert({
      store_id: store.id,
      group_key: newAddon.group_key,
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
      </CollapsibleSection>

      <CollapsibleSection
        title="📏 Tamanhos"
        description={`${catalog.data.sizes.length} tamanhos cadastrados`}
        className="mt-4"
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.data.sizes.map((size) => (
            <button
              key={size.id}
              type="button"
              onClick={() => void toggleSize(size)}
              className="flex items-center justify-between rounded-lg border p-3 text-left hover:bg-muted"
            >
              <span>
                <strong>{size.name}</strong>
                <span className="ml-2 text-xs text-muted-foreground">
                  {size.diameter_cm ? `${size.diameter_cm} cm · ` : ""}
                  {size.max_flavors} sabor(es)
                </span>
              </span>
              {size.is_active ? (
                <Badge className="gap-1 bg-emerald-600">
                  <Check className="size-3" /> Ativo
                </Badge>
              ) : (
                <Badge variant="outline">Inativo</Badge>
              )}
            </button>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="🍕 Sabores"
        description={`${catalog.data.flavors.length} sabores cadastrados`}
        className="mt-4"
      >
        <div className="grid gap-2 md:grid-cols-2">
          {catalog.data.flavors.map((flavor) => (
            <button
              key={flavor.id}
              type="button"
              onClick={() => void toggleFlavor(flavor)}
              className="rounded-lg border p-3 text-left hover:bg-muted"
            >
              <div className="flex items-center justify-between">
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
        title="🧀 Bordas, bebidas e adicionais"
        description={`${catalog.data.addons.length} itens cadastrados`}
        className="mt-4"
      >
        <div className="grid gap-2 md:grid-cols-2">
          {catalog.data.addons.map((addon) => (
            <div key={addon.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <strong>{addon.name}</strong>
                <p className="text-xs text-muted-foreground">
                  {addon.group_key} · {addon.description} · R${" "}
                  {Number(addon.price).toFixed(2).replace(".", ",")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void deleteAddon(addon)}
                aria-label={`Remover ${addon.name}`}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
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
