import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ClipboardList,
  Computer,
  Headphones,
  Plus,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMyStore } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/informatica")({
  component: InformaticaStore,
});

const serviceSuggestions = [
  {
    icon: Wrench,
    title: "Formatação e otimização",
    items: [
      "Formatação de computadores e notebooks",
      "Instalação do Windows e drivers",
      "Limpeza e otimização do sistema",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Backup e recuperação",
    items: [
      "Backup de arquivos e fotos",
      "Recuperação de dados",
      "Configuração de backup automático",
    ],
  },
  {
    icon: Computer,
    title: "Instalação e configuração",
    items: [
      "Instalação do pacote Office",
      "Antivírus e programas essenciais",
      "Configuração de impressoras e periféricos",
    ],
  },
  {
    icon: Wrench,
    title: "Upgrades e montagem",
    items: [
      "Troca de HD antigo por SSD",
      "Upgrade de memória RAM",
      "Montagem e manutenção de computadores",
    ],
  },
  {
    icon: Computer,
    title: "Peças e acessórios",
    items: [
      "SSDs, HDs e memórias RAM",
      "Fontes, placas e componentes",
      "Cabos, adaptadores e periféricos",
    ],
  },
  {
    icon: Headphones,
    title: "Redes e suporte",
    items: [
      "Configuração de Wi-Fi e redes",
      "Suporte remoto e presencial",
      "Manutenção preventiva e corretiva",
    ],
  },
  {
    icon: ClipboardList,
    title: "Soluções digitais",
    items: ["Criação de sites", "Sistemas SaaS sob medida", "Planilhas inteligentes e automações"],
  },
];

function InformaticaStore() {
  const { data: store } = useMyStore();
  const products = useQuery({
    queryKey: ["informatica-products", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const result = await supabase
        .from("products")
        .select("id,is_hidden")
        .eq("store_id", store!.id)
        .eq("module", "informatica");
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });

  const activeServices = products.data?.filter((product) => !product.is_hidden).length ?? 0;

  return (
    <AppShell
      title="💻 Informática & Tecnologia"
      description="Organize serviços técnicos, suporte e soluções digitais em uma vitrine profissional."
      action={
        <Button size="sm" asChild>
          <a href="/produtos?module=informatica&guided=1">
            <Plus className="mr-1.5 size-4" /> Novo serviço
          </a>
        </Button>
      }
    >
      <section className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-background to-primary/5 p-5 dark:border-sky-900 dark:from-sky-950/30">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-sky-500/15 p-3 text-sky-700 dark:text-sky-300">
            <Computer className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Sua assistência técnica, mais profissional</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Cadastre serviços e peças com preço, estoque, prazo e descrição. O cliente consulta
              sua vitrine, monta o pedido e chama você pelo WhatsApp.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="surface flex items-center gap-3 p-4">
          <CheckCircle2 className="size-5 text-emerald-600" />
          <div>
            <p className="text-xs text-muted-foreground">Serviços ativos</p>
            <p className="text-xl font-bold">{activeServices}</p>
          </div>
        </div>
        <div className="surface flex items-center gap-3 p-4">
          <ClipboardList className="size-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Sugestões prontas</p>
            <p className="text-xl font-bold">
              {serviceSuggestions.reduce((total, group) => total + group.items.length, 0)}
            </p>
          </div>
        </div>
        <div className="surface flex items-center gap-3 p-4">
          <Headphones className="size-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Atendimento</p>
            <p className="text-xl font-bold">WhatsApp</p>
          </div>
        </div>
      </section>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Catálogo inicial de serviços</h2>
          <p className="text-sm text-muted-foreground">
            Use as sugestões como categorias e personalize serviços, peças, preços e estoque para
            sua realidade.
          </p>
        </div>
        <Badge variant="secondary">PRO</Badge>
      </div>

      <section className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {serviceSuggestions.map(({ icon: Icon, title, items }) => (
          <article key={title} className="surface p-4">
            <div className="flex items-center gap-2">
              <Icon className="size-5 text-primary" />
              <h3 className="font-semibold">{title}</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-dashed p-5 text-center">
        <p className="font-semibold">Pronto para publicar seus serviços?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre serviços com valores fechados ou solicitação de orçamento.
        </p>
        <Button className="mt-3" asChild>
          <a href="/produtos?module=informatica&guided=1">Cadastrar primeiro serviço</a>
        </Button>
      </section>
    </AppShell>
  );
}
