import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Settings2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMyStore } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/lojas-premium")({ component: PremiumStores });

type CatalogItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  status: string;
  route: string;
  plan_required: string;
  featured: boolean;
  promotional_text: string | null;
};
type StoreModule = { module: string; is_active: boolean };

function PremiumStores() {
  const { data: store } = useMyStore();
  const isPro = store?.plan === "pro";
  const client = useQueryClient();
  const catalog = useQuery({
    queryKey: ["premium-catalog"],
    queryFn: async () => {
      const result = await supabase
        .from("premium_store_modules")
        .select(
          "id,name,slug,description,icon,status,route,plan_required,featured,promotional_text",
        )
        .order("sort_order");
      if (result.error) throw result.error;
      return (result.data ?? []) as CatalogItem[];
    },
  });
  const enabled = useQuery({
    queryKey: ["store-modules", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const result = await supabase
        .from("store_modules")
        .select("module,is_active")
        .eq("store_id", store!.id);
      if (result.error) throw result.error;
      return (result.data ?? []) as StoreModule[];
    },
  });

  function moduleKey(item: CatalogItem) {
    if (item.slug === "roupas-esportivas") return "roupas_esportivas";
    if (item.slug === "roupas-treino") return "roupas_treino";
    if (item.slug === "joias-semijoias") return "joias";
    return item.slug;
  }
  async function toggle(item: CatalogItem, value: boolean) {
    if (!store || !isPro) return;
    const result = await supabase
      .from("store_modules")
      .update({ is_active: value })
      .eq("store_id", store.id)
      .eq("module", moduleKey(item));
    if (result.error) return;
    await client.invalidateQueries({ queryKey: ["store-modules", store.id] });
  }
  function isActive(item: CatalogItem) {
    return (
      enabled.data?.find((itemModule) => itemModule.module === moduleKey(item))?.is_active ?? false
    );
  }

  return (
    <AppShell
      title="⭐ Lojas Premium"
      description="Crie uma loja especializada para o seu segmento e destaque seus produtos."
    >
      <div className="mb-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-background to-primary/5 p-5 dark:border-amber-900 dark:from-amber-950/30">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-500/15 p-3 text-2xl">
            <Sparkles className="size-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Expanda sua loja com segmentos especializados</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Ative um ou vários módulos dentro da mesma loja. Seus produtos, pedidos e clientes
              continuam centralizados.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(catalog.data ?? [])
          .filter((item) => item.status !== "inactive")
          .map((item) => {
            const active = isActive(item);
            const available = item.status === "available";
            return (
              <article
                key={item.id}
                className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <span className="text-4xl">{item.icon}</span>
                  {!isPro && available ? (
                    <Badge variant="outline">🔒 PRO</Badge>
                  ) : active && available ? (
                    <Badge className="gap-1 bg-emerald-600">
                      <Check className="size-3" /> Ativa
                    </Badge>
                  ) : (
                    <Badge variant="outline">{available ? "Não configurada" : "Em breve"}</Badge>
                  )}
                </div>
                <h3 className="mt-5 text-lg font-semibold">{item.name}</h3>
                <p className="mt-1 min-h-10 text-sm text-muted-foreground">{item.description}</p>
                {item.promotional_text ? (
                  <p className="mt-3 text-xs font-medium text-primary">{item.promotional_text}</p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-2">
                  {available && isPro ? (
                    <Button size="sm" asChild>
                      <a
                        href={active ? item.route : "#"}
                        onClick={(event) => {
                          if (!active) {
                            event.preventDefault();
                            void toggle(item, true);
                          }
                        }}
                      >
                        {active ? "Acessar loja" : "Ativar loja"}
                        <ArrowRight className="ml-1.5 size-4" />
                      </a>
                    </Button>
                  ) : available ? (
                    <Button size="sm" variant="outline" asChild>
                      <a href={item.route}>🔒 Exclusivo PRO</a>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      Em breve
                    </Button>
                  )}
                  {isPro && active && available ? (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`${item.route}?settings=1`}>
                        <Settings2 className="mr-1.5 size-4" /> Configurar
                      </a>
                    </Button>
                  ) : null}
                </div>
                {isPro && active && available ? (
                  <button
                    className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:underline"
                    onClick={() => void toggle(item, false)}
                  >
                    Desativar módulo
                  </button>
                ) : null}
              </article>
            );
          })}
      </div>
      <section className="mt-6 rounded-2xl border border-dashed p-5 text-center">
        <p className="font-semibold">⭐ Em breve</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Novas lojas premium estão chegando. O catálogo foi preparado para receber futuros
          segmentos sem alterar este menu.
        </p>
      </section>
    </AppShell>
  );
}
