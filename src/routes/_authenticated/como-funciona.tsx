import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  HelpCircle,
  ImagePlus,
  Megaphone,
  Package,
  QrCode,
  Settings,
  ShoppingCart,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/como-funciona")({
  head: () => ({
    meta: [
      { title: "Como funciona | Vitrini" },
      {
        name: "description",
        content:
          "Aprenda a configurar sua loja, publicar produtos e começar a vender com o Vitrini.",
      },
    ],
  }),
  component: ComoFunciona,
});

type TutorialStep = {
  title: string;
  description: string;
  details: string[];
  to:
    | "/dashboard"
    | "/onboarding"
    | "/minha-loja"
    | "/produtos"
    | "/produtos-ia"
    | "/pedidos"
    | "/cobrancas"
    | "/qrcodes"
    | "/clientes"
    | "/faturamento"
    | "/assinatura"
    | "/configuracoes";
  action: string;
};

type TutorialSection = {
  number: string;
  title: string;
  description: string;
  icon: typeof Store;
  steps: TutorialStep[];
};

const SECTIONS: TutorialSection[] = [
  {
    number: "1",
    title: "Comece pela configuração da loja",
    description:
      "Preencha os dados que seus clientes verão e deixe sua vitrine com a identidade do seu negócio.",
    icon: Store,
    steps: [
      {
        title: "Complete o cadastro inicial",
        description: "Informe o nome, segmento e dados básicos do seu negócio para ativar a loja.",
        details: [
          "Escolha um nome fácil de reconhecer.",
          "Confira o segmento para organizar sua experiência.",
          "Finalize o onboarding para liberar o painel completo.",
        ],
        to: "/onboarding",
        action: "Ir para o cadastro inicial",
      },
      {
        title: "Personalize sua loja",
        description: "Adicione logo, capa, descrição, endereço e formas de contato.",
        details: [
          "Use uma imagem nítida e que represente sua marca.",
          "Escreva uma descrição objetiva sobre o que você oferece.",
          "Revise os dados antes de compartilhar o link público.",
        ],
        to: "/minha-loja",
        action: "Ir para Minha Loja",
      },
    ],
  },
  {
    number: "2",
    title: "Cadastre o que você vende",
    description:
      "Monte um catálogo claro, com informações suficientes para o cliente escolher sem precisar perguntar tudo pelo WhatsApp.",
    icon: Package,
    steps: [
      {
        title: "Adicione produtos e serviços",
        description: "Cadastre nome, preço, descrição, foto, estoque e categoria.",
        details: [
          "Use nomes simples e fáceis de pesquisar.",
          "Informe preços e disponibilidade corretamente.",
          "Adicione fotos reais e bem iluminadas sempre que possível.",
        ],
        to: "/produtos",
        action: "Ir para Produtos",
      },
      {
        title: "Cadastrar produtos com IA",
        description:
          "Envie uma foto de uma página ou catálogo para acelerar a criação dos cadastros.",
        details: [
          "Revise o nome, preço e descrição sugeridos pela IA.",
          "Confirme os dados antes de publicar.",
          "A ferramenta ajuda no cadastro, mas a conferência final é sua.",
        ],
        to: "/produtos-ia",
        action: "Ir para Cadastrar com IA",
      },
    ],
  },
  {
    number: "3",
    title: "Publique e divulgue sua vitrine",
    description:
      "Leve sua loja para Instagram, Facebook, WhatsApp, cartão de visita, embalagem e qualquer canal de divulgação.",
    icon: Megaphone,
    steps: [
      {
        title: "Copie o link público da loja",
        description: "O Vitrini cria automaticamente uma página pública exclusiva para sua loja.",
        details: [
          "Abra a visualização da loja para conferir como o cliente verá.",
          "Copie o link e coloque na bio do Instagram e Facebook.",
          "Envie o link em grupos, conversas e campanhas do WhatsApp.",
        ],
        to: "/dashboard",
        action: "Ir para o Dashboard",
      },
      {
        title: "Crie e use seu QR Code",
        description: "Transforme o acesso à loja em um código fácil de escanear.",
        details: [
          "Baixe o QR Code para imprimir ou publicar.",
          "Coloque em balcão, cartão, embalagem ou material promocional.",
          "Teste o código com o celular antes de divulgar.",
        ],
        to: "/qrcodes",
        action: "Ir para QR Codes",
      },
      {
        title: "Compartilhe pelo WhatsApp",
        description: "Personalize a mensagem e abra o compartilhamento direto no WhatsApp.",
        details: [
          "Edite a mensagem de divulgação em Minha Loja.",
          "O link correto da sua loja é incluído automaticamente.",
          "No WhatsApp, escolha contato, grupo ou Status.",
        ],
        to: "/minha-loja",
        action: "Ir para Divulgação",
      },
    ],
  },
  {
    number: "4",
    title: "Receba e acompanhe pedidos",
    description:
      "Organize o atendimento desde o primeiro pedido até a confirmação da entrega ou retirada.",
    icon: ShoppingCart,
    steps: [
      {
        title: "Acompanhe os pedidos",
        description: "Veja os pedidos recebidos, confira os itens e atualize o andamento.",
        details: [
          "Confirme disponibilidade e os dados do cliente.",
          "Atualize o status para manter o cliente informado.",
          "Use o WhatsApp para alinhar detalhes quando necessário.",
        ],
        to: "/pedidos",
        action: "Ir para Pedidos",
      },
      {
        title: "Conheça seus clientes",
        description: "Consulte o histórico de clientes que já compraram na sua vitrine.",
        details: [
          "Identifique clientes recorrentes.",
          "Retome contatos para divulgar novidades e ofertas.",
          "Use os dados somente para atendimento e comunicação responsável.",
        ],
        to: "/clientes",
        action: "Ir para Clientes",
      },
    ],
  },
  {
    number: "5",
    title: "Controle pagamentos e crescimento",
    description:
      "Acompanhe cobranças, resultados e os recursos disponíveis para profissionalizar sua operação.",
    icon: BarChart3,
    steps: [
      {
        title: "Gerencie cobranças",
        description:
          "Crie e acompanhe cobranças para vendas e serviços que precisam de controle financeiro.",
        details: [
          "Confira valores, vencimentos e status.",
          "Envie links de cobrança pelo WhatsApp.",
          "Mantenha os registros atualizados após o recebimento.",
        ],
        to: "/cobrancas",
        action: "Ir para Cobranças",
      },
      {
        title: "Acompanhe seu faturamento",
        description: "Use o painel financeiro para entender vendas e lançamentos da loja.",
        details: [
          "Consulte o movimento do período.",
          "Compare resultados e identifique oportunidades.",
          "Use os dados para planejar estoque e divulgação.",
        ],
        to: "/faturamento",
        action: "Ir para Faturamento",
      },
      {
        title: "Conheça o plano PRO",
        description:
          "Veja os recursos adicionais e escolha o plano adequado para o estágio do seu negócio.",
        details: [
          "Compare Básica e PRO.",
          "Confira os valores e benefícios atuais.",
          "A confirmação de pagamentos ocorre pelo Mercado Pago ou pelo fluxo Pix configurado.",
        ],
        to: "/assinatura",
        action: "Ver planos",
      },
    ],
  },
];

function ComoFunciona() {
  return (
    <AppShell
      title="Como funciona"
      description="Tudo o que você precisa para começar a vender com o Vitrini"
    >
      <div className="space-y-5">
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <HelpCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Central do proprietário
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Como funciona o Vitrini
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                Siga este passo a passo para configurar seu negócio, publicar sua loja online,
                divulgar seus produtos e começar a receber pedidos.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["1", "Configure", "Loja e catálogo"],
              ["2", "Compartilhe", "Link, QR Code e WhatsApp"],
              ["3", "Atenda", "Pedidos e clientes"],
            ].map(([number, title, description]) => (
              <div key={number} className="rounded-xl border border-border bg-background/80 p-4">
                <p className="text-sm font-bold text-primary">{number}</p>
                <p className="mt-2 font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-5">
          {SECTIONS.map((section) => (
            <TutorialSectionView key={section.number} section={section} />
          ))}
        </div>

        <section className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Precisa ajustar alguma informação?</p>
            <p className="text-sm text-muted-foreground">
              Volte às configurações da loja para revisar seus dados e preferências.
            </p>
          </div>
          <Link
            to="/configuracoes"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-accent"
          >
            <Settings className="size-4" /> Abrir configurações <ArrowRight className="size-4" />
          </Link>
        </section>
      </div>
    </AppShell>
  );
}

function TutorialSectionView({ section }: { section: TutorialSection }) {
  const Icon = section.icon;
  return (
    <section className="surface p-5 sm:p-7">
      <div className="flex items-start gap-3 border-b border-border pb-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
            Etapa {section.number}
          </p>
          <h2 className="mt-1 text-xl font-bold sm:text-2xl">{section.title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{section.description}</p>
        </div>
      </div>
      <div className="mt-5 space-y-4">
        {section.steps.map((step, index) => (
          <article
            key={step.title}
            className="relative rounded-xl border border-border bg-muted/20 p-4 sm:p-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {step.details.map((detail) => (
                    <li key={detail} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={step.to}
                  className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  {step.action} <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
