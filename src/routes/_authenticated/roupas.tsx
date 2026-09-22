import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shirt, Plus, Package, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useMyStore } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/roupas")({ component: ClothingStore });

const initialCategories = [
  "Camisas",
  "Camisetas",
  "Blusas",
  "Regatas",
  "Calças",
  "Jeans",
  "Shorts",
  "Bermudas",
  "Saias",
  "Vestidos",
  "Conjuntos",
  "Jaquetas",
  "Blazers",
  "Moletons",
  "Moda Praia",
  "Íntimos",
  "Infantil",
  "Social",
  "Personalizados",
];
const sizes = [
  "PP",
  "P",
  "M",
  "G",
  "GG",
  "XGG",
  "34",
  "36",
  "38",
  "40",
  "42",
  "44",
  "46",
  "48",
  "50",
  "52",
];
const colors = [
  "Preto",
  "Branco",
  "Cinza",
  "Azul",
  "Azul-marinho",
  "Vermelho",
  "Verde",
  "Amarelo",
  "Laranja",
  "Rosa",
  "Roxo",
  "Marrom",
  "Bege",
  "Nude",
  "Off-white",
  "Estampado",
  "Multicolorido",
];
const collections = [
  "Nova coleção",
  "Verão",
  "Inverno",
  "Primavera",
  "Outono",
  "Casual",
  "Social",
  "Streetwear",
  "Fitness",
  "Praia",
  "Feminina",
  "Masculina",
  "Infantil",
  "Lançamentos",
  "Básicos",
  "Outlet",
];

function ClothingStore() {
  const { data: store } = useMyStore();
  const client = useQueryClient();
  const categories = useQuery({
    queryKey: ["clothing-categories", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const r = await supabase
        .from("categories")
        .select("id,name")
        .eq("store_id", store!.id)
        .eq("module", "roupas")
        .order("position");
      if (r.error) throw r.error;
      return r.data ?? [];
    },
  });
  const products = useQuery({
    queryKey: ["clothing-products", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const r = await supabase
        .from("products")
        .select("id,is_hidden")
        .eq("store_id", store!.id)
        .eq("module", "roupas");
      if (r.error) throw r.error;
      return r.data ?? [];
    },
  });
  const settings = useQuery({
    queryKey: ["clothing-settings", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const r = await supabase
        .from("clothing_store_settings")
        .select("store_id,sell_clothing,sell_accessories,sell_shoes")
        .eq("store_id", store!.id)
        .maybeSingle();
      if (r.error) throw r.error;
      return (
        r.data ?? {
          store_id: store!.id,
          sell_clothing: true,
          sell_accessories: false,
          sell_shoes: false,
        }
      );
    },
  });
  async function updateSetting(
    field: "sell_clothing" | "sell_accessories" | "sell_shoes",
    value: boolean,
  ) {
    if (!store) return;
    await supabase.from("clothing_store_settings").upsert({ store_id: store.id, [field]: value });
    await client.invalidateQueries({ queryKey: ["clothing-settings", store.id] });
  }
  const active = (products.data ?? []).filter((p) => !p.is_hidden).length;
  return (
    <AppShell
      title="👕 Roupas"
      description="Loja Premium de moda flexível e personalizável"
      action={
        <Button size="sm" asChild>
          <a href="/produtos?module=roupas&guided=1">
            <Plus className="mr-1.5 size-4" /> Novo produto
          </a>
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface flex items-center gap-3 p-4">
          <Shirt className="size-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Produtos ativos</p>
            <p className="text-xl font-bold">
              {store?.plan === "pro" ? `${active} · ilimitados` : `${active}/5`}
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
          <p className="text-xs text-muted-foreground">Categorias</p>
          <p className="text-xl font-bold">{categories.data?.length || initialCategories.length}</p>
        </div>
      </div>
      <CollapsibleSection
        title="📂 Categorias"
        description={`${categories.data?.length || initialCategories.length} categorias editáveis`}
        className="mt-4"
      >
        <div className="flex flex-wrap gap-2">
          {(categories.data?.length ? categories.data.map((c) => c.name) : initialCategories).map(
            (category) => (
              <Badge key={category} variant="secondary">
                {category}
              </Badge>
            ),
          )}
        </div>
        <Button size="sm" variant="outline" className="mt-3">
          <Plus className="mr-1.5 size-4" /> Adicionar categoria
        </Button>
      </CollapsibleSection>
      <CollapsibleSection
        title="🏷️ Marcas e modelos"
        description="Sugestões e cadastros personalizados"
        className="mt-4"
      >
        <p className="text-sm text-muted-foreground">
          Use o Cadastro Inteligente ou o formulário avançado para informar marcas, modelos e
          características. Tudo permanece editável.
        </p>
        <Button size="sm" variant="outline" className="mt-3" asChild>
          <a href="/produtos?module=roupas&guided=1">Cadastrar produto</a>
        </Button>
      </CollapsibleSection>
      <CollapsibleSection
        title="📏 Tamanhos"
        description={`${sizes.length} sugestões iniciais`}
        className="mt-4"
      >
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <Badge key={size} variant="secondary">
              {size}
            </Badge>
          ))}
        </div>
        <Button size="sm" variant="outline" className="mt-3">
          <Plus className="mr-1.5 size-4" /> Adicionar tamanho
        </Button>
      </CollapsibleSection>
      <CollapsibleSection
        title="🎨 Cores"
        description={`${colors.length} sugestões iniciais`}
        className="mt-4"
      >
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => (
            <Badge key={color} variant="secondary">
              {color}
            </Badge>
          ))}
        </div>
        <Button size="sm" variant="outline" className="mt-3">
          <Plus className="mr-1.5 size-4" /> Adicionar cor
        </Button>
      </CollapsibleSection>
      <CollapsibleSection
        title="🧵 Coleções"
        description={`${collections.length} sugestões iniciais`}
        className="mt-4"
      >
        <div className="flex flex-wrap gap-2">
          {collections.map((collection) => (
            <Badge key={collection} variant="secondary">
              {collection}
            </Badge>
          ))}
        </div>
        <Button size="sm" variant="outline" className="mt-3">
          <Plus className="mr-1.5 size-4" /> Criar coleção
        </Button>
      </CollapsibleSection>
      <CollapsibleSection
        title="🛍️ O que minha loja vende?"
        description="Ative acessórios e calçados opcionalmente"
        className="mt-4"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span>👕 Roupas</span>
            <Switch
              checked={settings.data?.sell_clothing ?? true}
              onCheckedChange={(value) => void updateSetting("sell_clothing", value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span>👜 Acessórios</span>
            <Switch
              checked={settings.data?.sell_accessories ?? false}
              onCheckedChange={(value) => void updateSetting("sell_accessories", value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span>👟 Calçados</span>
            <Switch
              checked={settings.data?.sell_shoes ?? false}
              onCheckedChange={(value) => void updateSetting("sell_shoes", value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Calçados permanece um módulo independente. Esta opção apenas indica que a loja de Roupas
            também oferece essa linha.
          </p>
        </div>
      </CollapsibleSection>
      <CollapsibleSection
        title="⚙️ Configurações avançadas"
        description="Destaques, ofertas, filtros e personalização"
        className="mt-4"
      >
        <p className="text-sm text-muted-foreground">
          As configurações de produto, promoções, imagens, variações e vitrine continuam disponíveis
          no cadastro e na loja pública.
        </p>
      </CollapsibleSection>
    </AppShell>
  );
}
