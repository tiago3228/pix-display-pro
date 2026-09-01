import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  MessageCircle,
  QrCode,
  Smartphone,
  Store,
  Package,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSession } from "@/hooks/useAuth";
import { getLandingBanner } from "@/lib/landing.functions";
import { getProPricing } from "@/lib/pricing.functions";
import { brl } from "@/lib/format";


export const Route = createFileRoute("/")({
  loader: async () => {
    const [banner, pricing] = await Promise.all([getLandingBanner(), getProPricing()]);
    return { banner, pricing };
  },
  head: () => ({
    meta: [
      { title: "Vitrini — venda seus produtos de um jeito mais simples" },
      {
        name: "description",
        content:
          "Crie sua vitrine online grátis, compartilhe seu QR Code, receba pedidos pelo WhatsApp e receba via Pix. Sem comissão sobre suas vendas.",
      },
      { property: "og:title", content: "Vitrini — sua vitrine online em minutos" },
      {
        property: "og:description",
        content:
          "Vitrine online, QR Code, pedidos pelo WhatsApp e pagamento via Pix. Comece grátis.",
      },
    ],
  }),
  errorComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">
      Não foi possível carregar a página agora. Atualize em instantes.
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">Página não encontrada.</div>
  ),
  component: Landing,
});


const STEPS = [
  { icon: Store, title: "Crie sua loja", text: "Nome, WhatsApp e chave Pix. Leva 2 minutos." },
  { icon: Package, title: "Cadastre seus produtos", text: "Foto, preço, estoque e variações." },
  { icon: QrCode, title: "Compartilhe seu QR Code", text: "Link ou QR Code para imprimir." },
  {
    icon: MessageCircle,
    title: "Receba pelo WhatsApp",
    text: "O pedido chega pronto na sua conversa.",
  },
];

const NICHES = [
  { emoji: "🍫", label: "Doces" },
  { emoji: "💎", label: "Joias" },
  { emoji: "👗", label: "Roupas" },
  { emoji: "🧴", label: "Cosméticos" },
  { emoji: "🎁", label: "Artesanato" },
  { emoji: "🍔", label: "Comidas" },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Preciso instalar algum aplicativo?",
    a: "Não. Sua loja funciona diretamente pelo navegador.",
  },
  { q: "Meu cliente precisa criar conta?", a: "Não. Ele escolhe os produtos e envia o pedido." },
  { q: "O pedido chega onde?", a: "Diretamente no seu WhatsApp, já com o resumo pronto." },
  { q: "Como recebo o pagamento?", a: "O cliente paga direto para você usando a sua chave Pix." },
  { q: "Vocês cobram comissão?", a: "Não. O plano tem mensalidade fixa e nenhuma taxa por venda." },
  {
    q: "Posso vender roupas, doces ou joias?",
    a: "Sim. E também cosméticos, artesanato e muito mais.",
  },
];

function Landing() {
  const { session } = useSession();
  const { banner, pricing } = Route.useLoaderData();


  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="size-4" />
            </span>
            <span className="font-[family-name:var(--font-display)] text-lg">Vitrini</span>
          </Link>
          <nav className="flex items-center gap-2">
            {session ? (
              <Button asChild size="sm">
                <Link to="/dashboard">Meu painel</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/signup">Criar loja grátis</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section
          className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:pt-20"
          style={
            banner.image
              ? {
                  backgroundImage: `linear-gradient(to right, hsl(var(--background) / 0.94), hsl(var(--background) / 0.7)), url(${banner.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <Smartphone className="size-3.5" /> {banner.badge}
              </span>
              <h1 className="mt-5 text-4xl leading-tight font-bold sm:text-5xl">{banner.title}</h1>
              <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
                {banner.subtitle}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 text-base">
                  <a href={banner.ctaHref}>
                    {banner.ctaLabel} <ArrowRight className="ml-1 size-4" />
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 text-base">
                  <a href="#como-funciona">Ver como funciona</a>
                </Button>
              </div>

              <p className="mt-4 text-sm font-medium text-primary">
                Sem comissão sobre suas vendas.
              </p>
            </div>

            <div className="surface relative mx-auto w-full max-w-sm p-5">
              <div className="rounded-xl bg-muted/60 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full bg-primary/15 text-lg">
                    💎
                  </div>
                  <div>
                    <p className="font-semibold">Atena Joias</p>
                    <p className="text-xs text-muted-foreground">Joias e acessórios</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    ["Brinco Dourado", "R$ 39,90"],
                    ["Colar Elegance", "R$ 59,90"],
                  ].map(([name, price]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-sm shadow-sm"
                    >
                      <span>{name}</span>
                      <span className="font-semibold">{price}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-lg font-bold">R$ 99,80</span>
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-[var(--whatsapp)] px-3 py-2.5 text-sm font-semibold text-[var(--whatsapp-foreground)]">
                  <MessageCircle className="size-4" /> Pedir pelo WhatsApp
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <QrCode className="size-4" /> Seu cliente chega aqui escaneando um QR Code.
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="border-y border-border bg-card/60 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold sm:text-3xl">Como funciona</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <div key={step.title} className="surface p-5">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <step.icon className="size-5" />
                  </div>
                  <p className="mt-4 text-xs font-semibold text-muted-foreground">Passo {i + 1}</p>
                  <h3 className="text-base font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Feito para quem vende</h2>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {NICHES.map((n) => (
              <div key={n.label} className="surface flex flex-col items-center gap-2 p-5">
                <span className="text-3xl">{n.emoji}</span>
                <span className="text-sm font-medium">{n.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm text-muted-foreground">E muito mais.</p>
        </section>

        <section id="precos" className="border-y border-border bg-card/60 py-16">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="text-2xl font-bold sm:text-3xl">Preço simples</h2>
            <p className="mt-2 text-muted-foreground">Sem comissão sobre suas vendas. Nunca.</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="surface p-6">
                <p className="text-sm font-semibold text-muted-foreground">GRÁTIS</p>
                <p className="mt-2 text-3xl font-bold">R$ 0</p>
                <p className="text-sm text-muted-foreground">Comece sem pagar.</p>
                <ul className="mt-5 space-y-2 text-sm">
                  {[
                    "Vitrine online com link próprio",
                    "Até 5 produtos",
                    "Pedidos pelo WhatsApp",
                    "Chave Pix e QR Code da loja",
                  ].map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="size-4 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="mt-6 w-full">
                  <Link to="/signup">Criar minha loja grátis</Link>
                </Button>
              </div>
              <div className="surface border-primary/40 p-6 ring-1 ring-primary/20">
                <p className="text-sm font-semibold text-primary">PRO</p>
                <p className="mt-2 text-3xl font-bold">
                  R$ 9,90
                  <span className="text-base font-normal text-muted-foreground">/mês</span>
                </p>
                <p className="text-sm text-muted-foreground">Sem comissão sobre suas vendas.</p>
                <ul className="mt-5 space-y-2 text-sm">
                  {[
                    "Produtos ilimitados",
                    "Fotos, variações e controle de estoque",
                    "Histórico de pedidos e relatórios",
                    "QR Codes individuais por produto",
                    "Personalização da loja",
                  ].map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="size-4 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-6 w-full">
                  <Link to="/signup">Começar agora</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Perguntas frequentes</h2>
          <Accordion type="single" collapsible className="mt-6">
            {FAQ.map(({ q, a }) => (
              <AccordionItem key={q} value={q}>
                <AccordionTrigger className="text-left">{q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="surface flex flex-col items-center gap-4 bg-primary/8 p-8 text-center">
            <Share2 className="size-6 text-primary" />
            <h2 className="text-2xl font-bold">Você vende pelo WhatsApp. Nós organizamos.</h2>
            <p className="max-w-lg text-muted-foreground">
              Veja uma loja de exemplo funcionando agora mesmo.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/signup">Criar minha loja grátis</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/loja/$slug" params={{ slug: "atena-joias" }}>
                  Ver loja de exemplo
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Vitrini · By: Tiago Cardoso</span>
          <span>Pagamento realizado diretamente para o vendedor.</span>
        </div>
      </footer>
    </div>
  );
}
