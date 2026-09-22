import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Package, Search, Trash2, Pencil, Footprints } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMyStore } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/calcados")({ component: ShoesModule });

type Brand = { id: string; name: string; is_active: boolean; is_suggested: boolean };
type Model = {
  id: string;
  name: string;
  brand_id: string;
  is_active: boolean;
  is_suggested: boolean;
};
const categories = [
  "Tênis",
  "Botas",
  "Sapatos",
  "Sandálias",
  "Femininos",
  "Sapatilhas",
  "Botas Femininas",
  "Sociais",
  "Chinelos",
  "Infantil",
  "Esportivos",
  "Personalizados",
];

function ShoesModule() {
  const { data: store } = useMyStore();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<"brand" | "model" | null>(null);
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const brands = useQuery({
    queryKey: ["shoes-brands", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const r = await supabase
        .from("shoe_brands")
        .select("id,name,is_active,is_suggested")
        .eq("store_id", store!.id)
        .order("position")
        .order("name");
      if (r.error) throw r.error;
      return r.data as Brand[];
    },
  });
  const models = useQuery({
    queryKey: ["shoes-models", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const r = await supabase
        .from("shoe_models")
        .select("id,name,brand_id,is_active,is_suggested")
        .eq("store_id", store!.id)
        .order("position")
        .order("name");
      if (r.error) throw r.error;
      return r.data as Model[];
    },
  });
  const products = useQuery({
    queryKey: ["shoes-products", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const r = await supabase
        .from("products")
        .select("id,name,price,stock,is_hidden,is_featured")
        .eq("store_id", store!.id)
        .eq("module", "calcados")
        .order("created_at", { ascending: false });
      if (r.error) throw r.error;
      return r.data ?? [];
    },
  });
  const active = (products.data ?? []).filter((p) => !p.is_hidden);
  const filteredBrands = (brands.data ?? []).filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );
  async function addItem() {
    if (!store || !name.trim()) return;
    if (dialog === "brand")
      await supabase.from("shoe_brands").insert({ store_id: store.id, name: name.trim() });
    if (dialog === "model" && brandId)
      await supabase
        .from("shoe_models")
        .insert({ store_id: store.id, brand_id: brandId, name: name.trim() });
    setName("");
    setDialog(null);
    await client.invalidateQueries({ queryKey: ["shoes-brands"] });
    await client.invalidateQueries({ queryKey: ["shoes-models"] });
  }
  async function removeBrand(id: string) {
    await supabase.from("shoe_brands").update({ is_active: false }).eq("id", id);
    await client.invalidateQueries({ queryKey: ["shoes-brands"] });
  }
  return (
    <AppShell
      title="👟 Calçados"
      description="Central independente para tênis, botas, sapatos e outros calçados"
      action={
        <Button size="sm" asChild>
          <a href="/produtos?module=calcados">
            <Plus className="mr-1.5 size-4" /> Novo produto
          </a>
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface flex items-center gap-3 p-4">
          <Footprints className="size-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Produtos ativos</p>
            <p className="text-xl font-bold">
              {store?.plan === "pro" ? `${active.length} · ilimitados` : `${active.length}/5`}
            </p>
          </div>
        </div>
        <div className="surface flex items-center gap-3 p-4">
          <Package className="size-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Produtos armazenados</p>
            <p className="text-xl font-bold">{products.data?.length ?? 0}</p>
          </div>
        </div>
        <div className="surface p-4">
          <p className="text-xs text-muted-foreground">Categorias iniciais</p>
          <p className="text-xl font-bold">{categories.length}</p>
        </div>
      </div>
      <section className="surface mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Marcas editáveis</h2>
            <p className="text-sm text-muted-foreground">
              Sugestões pré-configuradas e marcas próprias da loja.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setDialog("brand");
              setName("");
            }}
          >
            <Plus className="mr-1.5 size-4" /> Nova marca
          </Button>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar marca"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {filteredBrands.map((brand) => (
            <div
              key={brand.id}
              className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm"
            >
              <span>{brand.name}</span>
              {brand.is_suggested ? <Badge variant="secondary">sugestão</Badge> : null}
              <button
                aria-label={`Desativar ${brand.name}`}
                onClick={() => void removeBrand(brand.id)}
              >
                <Trash2 className="ml-1 size-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      </section>
      <section className="surface mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Modelos sugeridos e personalizados</h2>
            <p className="text-sm text-muted-foreground">
              Selecione uma marca para ver seus modelos ou adicione outro.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDialog("model");
              setName("");
              setBrandId(brands.data?.[0]?.id ?? "");
            }}
          >
            <Plus className="mr-1.5 size-4" /> Novo modelo
          </Button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(models.data ?? []).slice(0, 36).map((model) => (
            <div key={model.id} className="rounded-lg border p-3">
              <p className="font-medium">{model.name}</p>
              <p className="text-xs text-muted-foreground">
                {brands.data?.find((b) => b.id === model.brand_id)?.name ?? "Marca"}{" "}
                {model.is_suggested ? "· sugestão" : "· personalizado"}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="surface mt-4 p-4">
        <h2 className="font-semibold">Categorias</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Categorias iniciais do módulo; o cadastro de produtos permite usar qualquer classificação
          personalizada.
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge key={category} variant="secondary">
              {category}
            </Badge>
          ))}
        </div>
      </section>
      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "brand" ? "Nova marca" : "Novo modelo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={dialog === "brand" ? "Minha marca" : "Meu modelo"}
              />
            </div>
            {dialog === "model" ? (
              <div>
                <Label>Marca</Label>
                <select
                  className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                >
                  {(brands.data ?? []).map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void addItem()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
