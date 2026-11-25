import {
  ArrowRight,
  Code2,
  Cpu,
  ExternalLink,
  Instagram,
  Laptop,
  MessageCircle,
  MonitorCog,
  Wrench,
} from "lucide-react";
import type { Storefront, StorefrontProduct } from "@/lib/storefront.functions";
import type { DigitalProductView } from "@/lib/digital-products.functions";
import { whatsappLink } from "@/lib/format";
import {
  buildTechnologyQuoteMessage,
  buildTechnologyReviewMessage,
  groupTechnologyStorefrontProducts,
  technologyServicePriceLabel,
  TECHNOLOGY_STOREFRONT_DESCRIPTION,
} from "@/lib/technology-storefront";
import { Button } from "@/components/ui/button";

type Store = NonNullable<Storefront>["store"];
type Category = NonNullable<Storefront>["categories"][number];
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
      Solicitar orçamento pelo WhatsApp
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
  const groups = groupTechnologyStorefrontProducts(products, categories);
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
            <span className="block whitespace-normal break-words text-sm font-bold leading-tight sm:text-base">
              {store.name}
            </span>
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

      <nav
        aria-label="Navegação da vitrine móvel"
        className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-1 pt-2 [scrollbar-width:none] lg:hidden"
      >
        <a
          className="inline-flex min-h-10 shrink-0 items-center rounded-full border bg-card px-4 text-sm font-medium"
          href="#servicos"
        >
          Serviços
        </a>
        <a
          className="inline-flex min-h-10 shrink-0 items-center rounded-full border bg-card px-4 text-sm font-medium"
          href="#catalogo"
        >
          Catálogo
        </a>
        <a
          className="inline-flex min-h-10 shrink-0 items-center rounded-full border bg-card px-4 text-sm font-medium"
          href="#contato"
        >
          Contato
        </a>
      </nav>

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
                Solicitar orçamento pelo WhatsApp
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
            Os destaques abaixo usam os mesmos cadastros do catálogo. Descrições, imagens, preços e
            solicitações de orçamento acompanham as informações registradas para cada item.
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
                  {group.products.length} cadastros
                </span>
              </div>
              {group.products.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {group.products.map((product) => {
                    const priceLabel = technologyServicePriceLabel(product, store.is_premium);
                    const hasPublicPrice =
                      (!store.is_premium || product.priceVisible) &&
                      Number.isFinite(product.price) &&
                      product.price > 0;
                    return (
                      <article
                        key={product.id}
                        className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[var(--store-accent)] hover:shadow-lg"
                      >
                        <div className="flex aspect-[16/10] items-center justify-center overflow-hidden bg-muted">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={`Imagem cadastrada de ${product.name}`}
                              loading="lazy"
                              className="size-full object-contain p-2"
                            />
                          ) : (
                            <MonitorCog
                              className="size-10 text-muted-foreground"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-5 sm:p-6">
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <h4 className="min-w-0 text-lg font-bold">{product.name}</h4>
                            <span
                              className="max-w-[55%] shrink-0 text-right text-xs font-semibold leading-5 sm:text-sm"
                              style={{ color: hasPublicPrice ? store.primary_color : undefined }}
                            >
                              {priceLabel}
                            </span>
                          </div>
                          {!product.is_available ? (
                            <p className="mt-2 text-xs font-medium text-muted-foreground">
                              Indisponível no momento
                            </p>
                          ) : null}
                          {product.description.trim() ? (
                            <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                              {product.description}
                            </p>
                          ) : null}
                          <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-[1fr_auto]">
                            <QuoteLink
                              store={store}
                              serviceName={product.name}
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-center text-xs font-semibold leading-5 text-white shadow-sm transition hover:-translate-y-0.5 hover:opacity-95 sm:text-sm"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-11"
                              onClick={() => onSelectProduct(product)}
                              aria-label={`Ver cadastro de ${product.name}`}
                            >
                              Ver detalhes
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed bg-card px-4 py-5 text-sm text-muted-foreground">
                  Nenhum serviço ou item desta área foi publicado no catálogo.
                </p>
              )}
            </section>
          ))}
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Valores e disponibilidade seguem os cadastros da loja. Quando o preço depender de
          avaliação, ele pode variar conforme o equipamento, a complexidade ou a necessidade.
          Solicite orçamento pelo WhatsApp.
        </p>
      </section>
    </>
  );
}

export function TechnologyStorefrontBottom({
  store,
  hasCart,
  digitalProducts = [],
}: {
  store: Store;
  hasCart: boolean;
  digitalProducts?: DigitalProductView[];
}) {
  const generalMessage = buildTechnologyQuoteMessage("assistência técnica ou solução digital");
  const contactHref = whatsappLink(store.whatsapp, generalMessage);
  const reviewHref = whatsappLink(store.whatsapp, buildTechnologyReviewMessage());
  const hasWhatsApp = store.whatsapp.replace(/\D/g, "").length >= 10;
  const instagram = instagramHref(store.instagram);
  const portfolioProducts = digitalProducts.filter((product) =>
    ["software", "app", "saas", "tool"].includes(product.product_type),
  );
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
        "Alguns serviços têm preço cadastrado e são exibidos na vitrine. Quando não houver valor publicado ou o serviço depender de avaliação, o orçamento considera o equipamento, a complexidade e a necessidade apresentada.",
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
              Softwares e soluções digitais
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Conheça os softwares e aplicativos publicados no catálogo da Vitrini.
            </p>
            {portfolioProducts.length ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {portfolioProducts.map((product) => {
                  const image = product.main_image_url || product.logo_image_url;
                  return (
                    <article
                      key={product.id}
                      className="overflow-hidden rounded-xl border bg-background"
                    >
                      <a
                        href={`/softwares/${product.slug}`}
                        aria-label={`Ver detalhes de ${product.name}`}
                        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={`Imagem ilustrativa de ${product.name}`}
                            loading="lazy"
                            className="aspect-[16/10] w-full bg-muted object-contain p-3"
                          />
                        ) : (
                          <div className="flex aspect-[16/10] items-center justify-center bg-muted">
                            <MonitorCog
                              className="size-10 text-muted-foreground"
                              aria-hidden="true"
                            />
                          </div>
                        )}
                      </a>
                      {image ? (
                        <p className="px-4 pt-2 text-xs text-muted-foreground">
                          Imagem ilustrativa
                        </p>
                      ) : null}
                      <div className="p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {product.product_type_label}
                        </p>
                        <h3 className="mt-1 font-bold">
                          <a href={`/softwares/${product.slug}`} className="hover:underline">
                            {product.name}
                          </a>
                        </h3>
                        {product.short_description ? (
                          <p className="mt-2 text-sm leading-5 text-muted-foreground">
                            {product.short_description}
                          </p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
                          <a
                            href={`/softwares/${product.slug}`}
                            className="inline-flex items-center gap-1 hover:underline"
                          >
                            Saiba mais <ArrowRight className="size-4" aria-hidden="true" />
                          </a>
                          <a
                            href={product.url}
                            target={product.open_new_tab ? "_blank" : undefined}
                            rel={product.open_new_tab ? "noopener noreferrer" : undefined}
                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                          >
                            {product.cta_label}{" "}
                            <ExternalLink className="size-3.5" aria-hidden="true" />
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed bg-background/70 p-6 text-center">
                <MonitorCog className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                <p className="mt-3 font-semibold">Nenhum software publicado no catálogo ainda.</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Os softwares e aplicativos ativos no catálogo aparecerão aqui automaticamente.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>

      <section aria-labelledby="reviews-title" className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <div className="flex flex-col gap-4 rounded-xl border border-dashed bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <h2 id="reviews-title" className="text-base font-bold">
              Já recebeu atendimento?
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Se você já foi atendido, pode compartilhar sua avaliação pelo WhatsApp. A mensagem
              será recebida pela loja e não será publicada automaticamente na vitrine.
            </p>
          </div>
          {hasWhatsApp ? (
            <a
              href={reviewHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Compartilhar uma avaliação pelo WhatsApp"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ backgroundColor: store.button_color }}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Compartilhar avaliação
            </a>
          ) : null}
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
