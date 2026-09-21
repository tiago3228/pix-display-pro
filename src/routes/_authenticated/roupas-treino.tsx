import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell, Package, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMyStore } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/roupas-treino")({
  component: TrainingModule,
});

type TrainingProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_hidden: boolean;
  is_featured: boolean;
  image_url: string | null;
};

const defaultCategories = [
  "Parte Superior",
  "Parte Inferior",
  "Conjuntos",
  "Macacões",
  "Agasalhos",
  "Performance",
  "Acessórios",
];

function TrainingModule() {
  const { data: store, isLoading: storeLoading } = useMyStore();
  const { data, isLoading } = useQuery({
    queryKey: ["training-module", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const [products, categories] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, price, stock, is_hidden, is_featured, image_url")
          .eq("store_id", store!.id)
          .eq("module", "roupas_treino")
          .order("created_at", { ascending: false }),
        supabase
          .from("categories")
          .select("id, name")
          .eq("store_id", store!.id)
          .eq("module", "roupas_treino")
          .order("position"),
      ]);
      if (products.error) throw products.error;
      if (categories.error) throw categories.error;
      return {
        products: (products.data ?? []) as TrainingProduct[],
        categories: categories.data ?? [],
      };
    },
  });

  const products = data?.products ?? [];
  const active = products.filter((product) => !product.is_hidden);
  const limit = store?.plan === "pro" ? null : 5;

  return (
    <AppShell
      title="🏋️ Roupas de Treino / Academia"
      description="Módulo independente para academia, fitness, corrida e performance"
      action={
        <Button size="sm" asChild>
          <a href="/produtos?module=roupas_treino">
            <Plus className="mr-1.5 size-4" /> Novo produto
          </a>
        </Button>
      }
    >
      {storeLoading || isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando módulo...</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface flex items-center gap-3 p-4">
          <Dumbbell className="size-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Produtos ativos</p>
            <p className="text-xl font-bold">
              {limit === null ? `${active.length} · ilimitados` : `${active.length}/${limit}`}
            </p>
          </div>
        </div>
        <div className="surface flex items-center gap-3 p-4">
          <Package className="size-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Produtos armazenados</p>
            <p className="text-xl font-bold">{products.length}</p>
          </div>
        </div>
        <div className="surface p-4">
          <p className="text-xs text-muted-foreground">Categorias do módulo</p>
          <p className="text-xl font-bold">{data?.categories.length || defaultCategories.length}</p>
        </div>
      </div>

      <section className="surface mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Categorias de treino</h2>
            <p className="text-sm text-muted-foreground">Independentes de Roupas Esportivas.</p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <a href="/produtos?module=roupas_treino">Gerenciar categorias</a>
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(data?.categories.length
            ? data.categories.map((category) => category.name)
            : defaultCategories
          ).map((category) => (
            <Badge key={category} variant="secondary">
              {category}
            </Badge>
          ))}
        </div>
      </section>

      <section className="surface mt-4 overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-semibold">Produtos de Treino / Academia</h2>
          <p className="text-sm text-muted-foreground">
            Somente produtos com módulo explícito roupas_treino aparecem aqui.
          </p>
        </div>
        {products.length ? (
          <div className="divide-y divide-border">
            {products.map((product) => (
              <div key={product.id} className="flex items-center gap-3 p-4">
                <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="size-full object-cover" />
                  ) : (
                    <Dumbbell className="m-3 size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {brl(product.price)} · estoque {product.stock}
                  </p>
                </div>
                {product.is_featured ? <Badge variant="secondary">Destaque</Badge> : null}
                <Badge variant={product.is_hidden ? "outline" : "default"}>
                  {product.is_hidden ? "Inativo" : "Ativo"}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum produto neste módulo. Cadastre um produto e escolha “Roupas de Treino /
            Academia”.
          </div>
        )}
      </section>
    </AppShell>
  );
}
