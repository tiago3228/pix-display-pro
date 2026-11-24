import {
  ArrowRight,
  Code2,
  Cpu,
  Database,
  ExternalLink,
  Globe2,
  HardDrive,
  Instagram,
  Laptop,
  Layers,
  MessageCircle,
  MonitorCog,
  Network,
  PanelTop,
  Settings2,
  ShoppingCart,
  Workflow,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Storefront, StorefrontProduct } from "@/lib/storefront.functions";
import { whatsappLink } from "@/lib/format";
import {
  buildTechnologyQuoteMessage,
  findTechnologyServiceProduct,
  technologyServicePriceLabel,
  technologyServices,
  TECHNOLOGY_STOREFRONT_DESCRIPTION,
} from "@/lib/technology-storefront";
import { Button } from "@/components/ui/button";

type Store = NonNullable<Storefront>["store"];
type Category = NonNullable<Storefront>["categories"][number];

const serviceIcons: Record<string, LucideIcon> = {
  formatacao: MonitorCog,
  manutencao: Wrench,
  upgrade: HardDrive,
  instalacao: Settings2,
  "backup-suporte": Database,
  redes: Network,
  sites: Globe2,
  "landing-pages": PanelTop,
  "lojas-virtuais": ShoppingCart,
  sistemas: Code2,
  "plataformas-saas": Layers,
  "automacao-planilhas": Workflow,
};

function instagramHref(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;
      url.protocol = "https:";
      return url.toString();
    } catch {
      return null;
    }
  }
  const username = raw
    .replace(/^@+/, "")
    .replace(/^(?:www\.)?instagram\.com\/?/i, "")
    .split(/[?#/]/, 1)[0];
  return username ? `https://www.instagram.com/${encodeURIComponent(username)}/` : null;
}

function QuoteLink({
  store,
  serviceName,
  className,
}: {
  store: Store;
  serviceName: string;
  className?: string;
}) {
  const message = buildTechnologyQuoteMessage(serviceName);
  return (
    <a
      href={whatsappLink(store.whatsapp, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={{ backgroundColor: store.button_color }}
      aria-label={`Solicitar orçamento pelo WhatsApp para ${serviceName}`}
    >
      <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
      Solicitar orçamento
    </a>
  );
}

export function TechnologyStorefrontTop({
  store,
  products,
  categories,
  onSelectProduct,
}: {
  store: Store;
  products: StorefrontProduct[];
  categories: Category[];
  onSelectProduct: (product: StorefrontProduct) => void;
}) {
  const generalMessage = buildTechnologyQuoteMessage("assistência técnica ou solução digital");
  const contactHref = whatsappLink(store.whatsapp, generalMessage);
  const groups = [
    {
      id: "assistencia-tecnica",
      title: "Assistência técnica e informática",
      description: "Atendimento para computadores, sistemas, redes e suporte técnico.",
      services: technologyServices.filter((service) => service.group === "informatica"),
    },
    {
      id: "solucoes-digitais",
      title: "Desenvolvimento e soluções digitais",
      description: "Projetos digitais definidos conforme a necessidade de cada negócio.",
      services: technologyServices.filter((service) => service.group === "solucoes-digitais"),
    },
  ];
  return (
    <>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 pt-5 sm:pt-6">
        <a href="#inicio" className="flex min-w-0 items-center gap-3" aria-label={store.name}>
          <span
            className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-card"
            style={{ borderColor: store.accent_color }}
          >
            {store.logo ? (
              <img
                src={store.logo}
                alt={`Logotipo de ${store.name}`}
                className="size-full object-contain"
              />
            ) : (
              <Cpu className="size-5" style={{ color: store.primary_color }} aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold sm:text-base">{store.name}</span>
            <span className="block text-xs text-muted-foreground">
              Tecnologia e soluções digitais
            </span>
          </span>
        </a>
        <nav
          aria-label="Navegação da vitrine"
          className="hidden items-center gap-5 text-sm lg:flex"
        >
          <a className="transition hover:text-[var(--store-links)]" href="#servicos">
            Serviços
          </a>
          <a className="transition hover:text-[var(--store-links)]" href="#catalogo">
            Catálogo
          </a>
          <a className="transition hover:text-[var(--store-links)]" href="#contato">
            Contato
          </a>
        </nav>
        <a
          href={contactHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ backgroundColor: store.button_color }}
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Falar pelo WhatsApp</span>
          <span className="sm:hidden">WhatsApp</span>
        </a>
      </div>

      <section
        id="inicio"
        className="mx-auto max-w-7xl scroll-mt-6 px-4 pb-8 pt-6 sm:pb-12 sm:pt-10"
      >
        <div
          className="relative isolate grid items-center gap-8 overflow-hidden rounded-[2rem] border p-5 shadow-sm sm:gap-10 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-12"
          style={{
            borderColor: `${store.accent_color}55`,
            background: `linear-gradient(125deg, ${store.primary_color}0a 0%, transparent 48%), linear-gradient(315deg, ${store.secondary_color}0d 0%, transparent 52%), var(--store-cards, #fff)`,
          }}
        >
          <div className="relative z-10 space-y-6">
            <div
              className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-semibold shadow-sm"
              style={{ borderColor: `${store.accent_color}66`, color: store.primary_color }}
            >
              <Cpu className="size-4" aria-hidden="true" />
              Tecnologia, informática e soluções digitais
            </div>
            <div className="space-y-3">
              <h1 className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Tecnologia que resolve.
                <span className="mt-1 block" style={{ color: store.primary_color }}>
                  Soluções que fazem sua empresa evoluir.
                </span>
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Assistência técnica, desenvolvimento de sites e sistemas personalizados para pessoas
                e empresas.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={contactHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ backgroundColor: store.button_color }}
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Solicitar orçamento
              </a>
              <a
                href="#servicos"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-background px-5 text-sm font-semibold transition hover:bg-muted"
              >
                Conhecer os serviços <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
            <div className="grid gap-2 pt-1 sm:grid-cols-2">
              <a
                href="#assistencia-tecnica"
                className="rounded-xl border bg-background/70 p-3 text-sm font-semibold transition hover:border-[var(--store-accent)]"
              >
                <Laptop
                  className="mb-2 size-5"
                  style={{ color: store.primary_color }}
                  aria-hidden="true"
                />
                Assistência técnica e informática
              </a>
              <a
                href="#solucoes-digitais"
                className="rounded-xl border bg-background/70 p-3 text-sm font-semibold transition hover:border-[var(--store-accent)]"
              >
                <Code2
                  className="mb-2 size-5"
                  style={{ color: store.primary_color }}
                  aria-hidden="true"
                />
                Sites, sistemas e soluções digitais
              </a>
            </div>
          </div>
          <div className="relative">
            {store.banner ? (
              <div className="overflow-hidden rounded-2xl border bg-muted shadow-xl">
                <img
                  src={store.banner}
                  alt={`Imagem de apresentação da empresa ${store.name}`}
                  fetchPriority="high"
                  className="aspect-[16/11] w-full object-cover"
                />
              </div>
            ) : (
              <div
                className="flex aspect-[16/11] flex-col items-center justify-center gap-4 rounded-2xl border bg-gradient-to-br from-card to-muted p-6 text-center shadow-xl"
                style={{ borderColor: `${store.accent_color}66` }}
              >
                <div className="flex gap-3">
                  <span className="rounded-2xl border bg-background p-4">
                    <Laptop
                      className="size-8"
                      style={{ color: store.primary_color }}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="rounded-2xl border bg-background p-4">
                    <Code2
                      className="size-8"
                      style={{ color: store.secondary_color }}
                      aria-hidden="true"
                    />
                  </span>
                </div>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Assistência técnica e desenvolvimento de soluções digitais.
                </p>
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-card p-3">
                <Wrench
                  className="size-5"
                  style={{ color: store.primary_color }}
                  aria-hidden="true"
                />
                <p className="mt-2 text-xs font-semibold">Informática e suporte</p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <Code2
                  className="size-5"
                  style={{ color: store.secondary_color }}
                  aria-hidden="true"
                />
                <p className="mt-2 text-xs font-semibold">Desenvolvimento digital</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="servicos" className="mx-auto max-w-7xl scroll-mt-6 px-4 py-8 sm:py-12">
        <div className="mb-8 max-w-3xl">
          <p
            className="text-sm font-semibold uppercase tracking-[0.14em]"
            style={{ color: store.primary_color }}
          >
            Serviços
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Soluções para sua rotina e para o seu negócio
          </h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Conheça as áreas de atuação e use o catálogo abaixo como a fonte principal para
            consultar serviços, valores publicados e disponibilidade.
          </p>
        </div>
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.id} id={group.id} className="scroll-mt-8">
              <div className="mb-5 flex flex-col justify-between gap-2 border-b pb-4 sm:flex-row sm:items-end">
                <div>
                  <h3 className="text-xl font-bold sm:text-2xl">{group.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                </div>
                <span className="w-fit rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                  {group.services.length} serviços
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.services.map((service) => {
                  const Icon = serviceIcons[service.id] ?? MonitorCog;
                  const product = findTechnologyServiceProduct(service, products, categories);
                  const priceLabel = technologyServicePriceLabel(product);
                  return (
                    <article
                      key={service.id}
                      className="group flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[var(--store-accent)] hover:shadow-lg sm:p-6"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className="rounded-xl border bg-background p-3 transition group-hover:scale-105"
                          style={{ borderColor: `${store.accent_color}66` }}
                        >
                          <Icon
                            className="size-6"
                            style={{ color: store.primary_color }}
                            aria-hidden="true"
                          />
                        </span>
                        <span
                          className="max-w-[60%] text-right text-xs font-semibold leading-5 sm:text-sm"
                          style={{
                            color:
                              product && product.priceVisible && product.price > 0
                                ? store.primary_color
                                : undefined,
                          }}
                        >
                          {priceLabel}
                        </span>
                      </div>
                      <h4 className="mt-5 text-lg font-bold">{service.name}</h4>
                      <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                        {service.description}
                      </p>
                      <div
                        className="mt-4 rounded-lg border bg-background/70 px-3 py-2.5 text-xs leading-5"
                        style={{ borderColor: `${store.accent_color}44` }}
                      >
                        <span className="font-semibold">Como pode ajudar: </span>
                        <span className="text-muted-foreground">{service.benefit}</span>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <QuoteLink
                          store={store}
                          serviceName={service.name}
                          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:opacity-95"
                        />
                        {product ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onSelectProduct(product)}
                            aria-label={`Ver cadastro de ${product.name}`}
                          >
                            Ver detalhes
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Os preços exibidos correspondem a serviços cadastrados na vitrine. Serviços sem valor
          publicado são orçados após entender a necessidade.
        </p>
      </section>
    </>
  );
}

export function TechnologyStorefrontBottom({ store, hasCart }: { store: Store; hasCart: boolean }) {
  const generalMessage = buildTechnologyQuoteMessage("assistência técnica ou solução digital");
  const contactHref = whatsappLink(store.whatsapp, generalMessage);
  const instagram = instagramHref(store.instagram);
  const differentiators = [
    "Atendimento personalizado",
    "Soluções adequadas à necessidade",
    "Comunicação direta",
    "Orientação e suporte técnico",
  ];
  const steps = [
    "Conte o que você precisa pelo WhatsApp.",
    "A necessidade é entendida e, quando aplicável, avaliada tecnicamente.",
    "Você recebe as informações e a proposta para o serviço.",
    "Aprove a proposta quando estiver de acordo com a solução.",
    "A execução é iniciada e você acompanha os próximos passos.",
  ];
  const faqs = [
    {
      question: "Como solicitar um orçamento?",
      answer:
        "Escolha um serviço nesta página e use o botão de orçamento. A mensagem já identifica o serviço para facilitar o primeiro contato.",
    },
    {
      question: "Como funciona a assistência técnica?",
      answer:
        "Descreva o problema pelo WhatsApp. Quando o caso exigir, a necessidade será avaliada antes de definir o serviço e o orçamento.",
    },
    {
      question: "Vocês desenvolvem sites personalizados?",
      answer:
        "A loja oferece criação de sites, landing pages e lojas virtuais. O escopo é conversado de acordo com os objetivos do projeto.",
    },
    {
      question: "Como funciona o desenvolvimento de sistemas?",
      answer:
        "Sistemas, plataformas e automações são discutidos a partir da necessidade e dos requisitos apresentados pelo cliente.",
    },
    {
      question: "Quais são as formas de atendimento?",
      answer: instagram
        ? "O contato pode começar pelo WhatsApp. O Instagram da loja também está disponível no rodapé."
        : "O contato pode começar pelo WhatsApp usando qualquer botão de atendimento desta página.",
    },
    {
      question: "Os serviços possuem preço fixo?",
      answer:
        "Alguns serviços têm preço cadastrado e são exibidos na vitrine. Quando não houver valor publicado, o orçamento é feito após entender a necessidade.",
    },
    {
      question: "Como entrar em contato?",
      answer:
        "Use o botão de WhatsApp no início da página, em cada serviço ou no encerramento da vitrine.",
    },
  ];

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-9 sm:py-12">
        <div className="grid gap-8 rounded-3xl border bg-card p-5 sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p
              className="text-sm font-semibold uppercase tracking-[0.14em]"
              style={{ color: store.primary_color }}
            >
              Como trabalhamos
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Um processo claro, do primeiro contato à execução
            </h2>
            <p className="mt-3 leading-6 text-muted-foreground">
              O caminho pode variar conforme o tipo de atendimento e a avaliação técnica necessária.
            </p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3 rounded-xl border bg-background p-4">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: store.primary_color }}
                >
                  {index + 1}
                </span>
                <span className="text-sm leading-6">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <p
              className="text-sm font-semibold uppercase tracking-[0.14em]"
              style={{ color: store.primary_color }}
            >
              Por que escolher nosso trabalho?
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Tecnologia com atenção ao que você realmente precisa
            </h2>
            <p className="mt-3 leading-6 text-muted-foreground">
              O atendimento começa pela compreensão da necessidade e pela conversa sobre as
              alternativas possíveis.
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {differentiators.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm font-medium"
                >
                  <span
                    className="mt-0.5 size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: store.accent_color }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <section
            aria-labelledby="portfolio-title"
            className="rounded-2xl border bg-card p-5 sm:p-6"
          >
            <p
              className="text-sm font-semibold uppercase tracking-[0.14em]"
              style={{ color: store.primary_color }}
            >
              Portfólio
            </p>
            <h2 id="portfolio-title" className="mt-2 text-xl font-bold">
              Projetos e trabalhos realizados
            </h2>
            <div className="mt-5 rounded-xl border border-dashed bg-background/70 p-6 text-center">
              <MonitorCog className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 font-semibold">
                Nenhum projeto foi cadastrado nesta vitrine ainda.
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Quando trabalhos reais forem adicionados, este espaço poderá apresentá-los sem
                recorrer a exemplos fictícios.
              </p>
            </div>
          </section>
        </div>
      </section>

      <section aria-labelledby="reviews-title" className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <div className="rounded-2xl border bg-card px-5 py-6 text-center sm:px-8">
          <h2 id="reviews-title" className="text-lg font-bold">
            Avaliações de clientes
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta vitrine não disponibiliza avaliações cadastradas. Nenhum depoimento foi criado ou
            atribuído a clientes.
          </p>
        </div>
      </section>

      <section aria-labelledby="faq-title" className="mx-auto max-w-4xl px-4 py-4 sm:py-8">
        <div className="mb-5 text-center">
          <p
            className="text-sm font-semibold uppercase tracking-[0.14em]"
            style={{ color: store.primary_color }}
          >
            Dúvidas frequentes
          </p>
          <h2 id="faq-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Antes de pedir seu orçamento
          </h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-xl border bg-card p-4 open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span
                  className="text-xl leading-none text-muted-foreground transition group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 pr-5 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="contato" className="mx-auto max-w-6xl px-4 py-9 sm:py-12">
        <div
          className="rounded-3xl p-6 text-white shadow-md sm:p-10"
          style={{
            background: `linear-gradient(120deg, ${store.primary_color}, ${store.secondary_color})`,
          }}
        >
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/75">
              Vamos conversar
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Precisa de uma solução em tecnologia?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl leading-6 text-white/85">
              Vamos entender sua necessidade e conversar sobre uma solução para você ou sua empresa.
            </p>
            <a
              href={contactHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 font-bold transition hover:bg-white/90"
              style={{ color: store.primary_color }}
            >
              <MessageCircle className="size-4" aria-hidden="true" /> Falar pelo WhatsApp
            </a>
          </div>
        </div>
      </section>

      <footer
        className="border-t"
        style={{
          borderColor: store.theme_palette["borders"] ?? "#e2e8f0",
          backgroundColor: store.theme_palette["footer"] ?? store.primary_color,
          color: "#fff",
        }}
      >
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/10">
              {store.logo ? (
                <img
                  src={store.logo}
                  alt={`Logotipo de ${store.name}`}
                  className="size-full object-contain"
                  loading="lazy"
                />
              ) : (
                <Cpu className="size-5" aria-hidden="true" />
              )}
            </span>
            <div>
              <p className="font-bold">{store.name}</p>
              <p className="mt-1 max-w-xl text-sm leading-6 text-white/75">
                {TECHNOLOGY_STOREFRONT_DESCRIPTION}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <a
              href="#servicos"
              className="inline-flex items-center rounded-lg border border-white/20 px-3 py-2 transition hover:bg-white/10"
            >
              Serviços
            </a>
            <a
              href="#assistencia-tecnica"
              className="inline-flex items-center rounded-lg border border-white/20 px-3 py-2 transition hover:bg-white/10"
            >
              Informática
            </a>
            <a
              href="#solucoes-digitais"
              className="inline-flex items-center rounded-lg border border-white/20 px-3 py-2 transition hover:bg-white/10"
            >
              Soluções digitais
            </a>
            <a
              href={contactHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 transition hover:bg-white/10"
            >
              <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp
            </a>
            {instagram ? (
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 transition hover:bg-white/10"
              >
                <Instagram className="size-4" aria-hidden="true" /> Instagram{" "}
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>
        <div className="border-t border-white/15 px-4 py-3 text-center text-xs text-white/70">
          <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 sm:flex-row">
            <span>Informações e serviços conforme cadastro da loja.</span>
            <a
              href="https://vitrini-br.lovable.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 hover:text-white"
            >
              Vitrine criada com Vitrini <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </div>
        </div>
      </footer>

      {store.whatsapp.replace(/\D/g, "").length >= 10 ? (
        <a
          href={contactHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar pelo WhatsApp"
          className={`fixed right-4 z-20 inline-flex size-14 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-105 ${hasCart ? "bottom-24" : "bottom-5"}`}
          style={{ backgroundColor: store.button_color }}
        >
          <MessageCircle className="size-6" aria-hidden="true" />
        </a>
      ) : null}
    </>
  );
}
