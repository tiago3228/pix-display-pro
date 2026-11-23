import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Gem,
  Heart,
  MessageCircle,
  Package,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSession } from "@/hooks/useAuth";
import { getLandingBanner } from "@/lib/landing.functions";
import { getPlansPricing } from "@/lib/pricing.functions";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [banner, plans] = await Promise.all([getLandingBanner(), getPlansPricing()]);
    return { banner, pricing: plans.pro, basicPrice: plans.basica.price };
  },
  head: () => ({
    meta: [
      { title: "Vitrini — sua loja online, simples assim" },
      {
        name: "description",
        content:
          "Crie sua vitrine online, organize seus produtos e receba pedidos pelo WhatsApp. Compartilhe seu link ou QR Code e receba direto via Pix, sem comissão.",
      },
      { property: "og:title", content: "Vitrini — sua loja online, simples assim" },
      {
        property: "og:description",
        content:
          "Sua vitrine digital com catálogo, carrinho, QR Code e pedidos pelo WhatsApp. Comece grátis.",
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
  {
    icon: Store,
    number: "01",
    title: "Crie sua vitrine",
    text: "Escolha o nome da sua loja e configure seu WhatsApp e sua chave Pix.",
  },
  {
    icon: Package,
    number: "02",
    title: "Adicione seus produtos",
    text: "Cadastre fotos, preços, opções e disponibilidade em poucos cliques.",
  },
  {
    icon: QrCode,
    number: "03",
    title: "Compartilhe seu link",
    text: "Divulgue nas redes sociais, envie no WhatsApp ou imprima seu QR Code.",
  },
  {
    icon: MessageCircle,
    number: "04",
    title: "Receba seus pedidos",
    text: "Seu cliente monta o carrinho e envia o pedido pronto para seu WhatsApp.",
  },
];

const NICHES = [
  { emoji: "🍫", label: "Doces e confeitaria" },
  { emoji: "💎", label: "Joias e acessórios" },
  { emoji: "👗", label: "Moda e roupas" },
  { emoji: "🧴", label: "Cosméticos" },
  { emoji: "🎁", label: "Presentes e artesanato" },
  { emoji: "🥪", label: "Comidas e bebidas" },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Preciso ter um site ou saber programação?",
    a: "Não. Você cria sua vitrine em poucos passos, sem programar e sem precisar contratar um site.",
  },
  {
    q: "Meu cliente precisa criar uma conta?",
    a: "Não. Ele abre seu link, escolhe os produtos, monta o carrinho e envia o pedido. Sem cadastro obrigatório.",
  },
  {
    q: "Como recebo os pedidos?",
    a: "O cliente envia o pedido pelo WhatsApp com os produtos, quantidades e total organizados para você.",
  },
  {
    q: "Como funciona o pagamento?",
    a: "Você cadastra sua chave Pix. O cliente copia a chave e paga diretamente para você pelo aplicativo do banco.",
  },
  {
    q: "A Vitrini cobra comissão pelas vendas?",
    a: "Não. Você paga o valor fixo do plano e fica com o valor integral das suas vendas. Não cobramos comissão por pedido.",
  },
  {
    q: "Posso vender qualquer tipo de produto?",
    a: "Sim. A Vitrini foi pensada para diferentes pequenos negócios: doces, roupas, joias, cosméticos, presentes, alimentos e muito mais.",
  },
  {
    q: "Posso controlar estoque e variações?",
    a: "No plano PRO, você conta com recursos como controle de estoque, fotos, variações e histórico de pedidos.",
  },
];

function Landing() {
  const { session } = useSession();
  const { banner, pricing, basicPrice } = Route.useLoaderData();

  const signupHref = "/signup";
  const proPrice = pricing.promoActive ? pricing.price : pricing.price;

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-3" aria-label="Vitrini, início">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform group-hover:-rotate-3">
              <Store className="size-5" />
            </span>
            <span className="font-[family-name:var(--font-display)] text-xl font-extrabold tracking-tight">
              vitrini<span className="text-primary">.</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex" aria-label="Navegação principal">
            <a href="#como-funciona" className="transition-colors hover:text-foreground">Como funciona</a>
            <a href="#recursos" className="transition-colors hover:text-foreground">Recursos</a>
            <a href="#planos" className="transition-colors hover:text-foreground">Planos</a>
            <a href="#duvidas" className="transition-colors hover:text-foreground">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-2">
            {session ? (
              <Button asChild size="sm" className="rounded-full px-5">
                <Link to="/dashboard">Acessar painel <ArrowUpRight className="ml-1 size-4" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden rounded-full sm:inline-flex">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild size="sm" className="rounded-full px-4 sm:px-5">
                  <Link to={signupHref}>Criar minha loja <ArrowRight className="ml-1 size-4" /></Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -right-40 -top-32 size-[520px] rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -left-48 top-56 size-[420px] rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--foreground)/0.07)_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
          </div>

          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:pb-28 lg:pt-24">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-2 text-xs font-semibold text-primary shadow-sm">
                <Sparkles className="size-3.5" />
                Sua loja online sem complicação
                <span className="size-1 rounded-full bg-primary" />
                Comece grátis
              </div>

              <h1 className="mt-7 max-w-2xl font-[family-name:var(--font-display)] text-4xl leading-[1.08] font-extrabold tracking-[-0.045em] sm:text-5xl lg:text-[4.15rem]">
                Seus produtos merecem uma vitrine
                <span className="relative mx-2 inline-block text-primary">
                  incrível.
                  <span className="absolute -bottom-1 left-0 -z-10 h-3 w-full rounded-full bg-primary/15" />
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                {banner.subtitle || "Organize seus produtos em uma loja online, compartilhe seu link ou QR Code e receba pedidos direto pelo WhatsApp. Simples para você. Fácil para seus clientes."}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-14 rounded-full px-7 text-base shadow-xl shadow-primary/20">
                  <Link to={signupHref}>
                    Criar minha loja grátis <ArrowRight className="ml-2 size-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-14 rounded-full border-border/80 bg-background/70 px-7 text-base">
                  <a href="#como-funciona">Conhecer a Vitrini <ChevronRight className="ml-1 size-4" /></a>
                </Button>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" /> Sem comissão por venda</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" /> Sem precisar programar</span>
              </div>

              <div className="mt-12 flex items-center gap-4 border-t border-border/70 pt-6">
                <div className="flex -space-x-2">
                  <span className="flex size-9 items-center justify-center rounded-full border-2 border-background bg-amber-100 text-base">🍫</span>
                  <span className="flex size-9 items-center justify-center rounded-full border-2 border-background bg-rose-100 text-base">💎</span>
                  <span className="flex size-9 items-center justify-center rounded-full border-2 border-background bg-sky-100 text-base">👗</span>
                  <span className="flex size-9 items-center justify-center rounded-full border-2 border-background bg-emerald-100 text-base">🎁</span>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  Para quem vende produtos e quer<br className="hidden sm:block" /> organizar os pedidos com praticidade.
                </p>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[530px] lg:ml-auto">
              <div className="absolute -right-6 top-10 size-32 rounded-full bg-primary/15 blur-2xl" />
              <div className="absolute -bottom-8 -left-8 size-40 rounded-full bg-primary/10 blur-3xl" />

              <div className="relative rounded-[2rem] border border-border/80 bg-card/90 p-3 shadow-2xl shadow-foreground/10 backdrop-blur-xl sm:p-5">
                <div className="flex items-center justify-between px-2 pb-4 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-rose-400" />
                    <span className="size-2 rounded-full bg-amber-400" />
                    <span className="size-2 rounded-full bg-emerald-400" />
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-medium text-muted-foreground">vitrini.app / minha-loja</span>
                  <span className="size-5" />
                </div>

                <div className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-background">
                  <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-background px-5 pb-5 pt-6 sm:px-7">
                    <div className="absolute -right-8 -top-12 size-40 rounded-full border-[24px] border-primary/10" />
                    <div className="relative flex items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-background text-2xl shadow-sm">🌿</div>
                      <div>
                        <p className="font-[family-name:var(--font-display)] text-lg font-bold">Ateliê da Jú</p>
                        <p className="text-xs text-muted-foreground">Feito com carinho para você</p>
                      </div>
                      <span className="ml-auto rounded-full bg-background/80 px-3 py-1 text-[10px] font-semibold text-primary">Loja online</span>
                    </div>
                    <p className="relative mt-5 max-w-xs text-xs leading-5 text-muted-foreground">Peças especiais para deixar seus momentos ainda mais bonitos.</p>
                  </div>

                  <div className="px-4 pb-4 pt-4 sm:px-5">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-bold">Mais queridos</p>
                      <span className="text-[10px] font-semibold text-primary">Ver catálogo <ArrowRight className="inline size-3" /></span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                        <div className="flex aspect-[1.35] items-center justify-center bg-gradient-to-br from-amber-100 to-orange-50 text-5xl">✨</div>
                        <div className="p-3">
                          <p className="text-xs font-semibold">Colar delicado</p>
                          <p className="mt-1 text-sm font-extrabold">R$ 59,90</p>
                          <div className="mt-2 flex items-center justify-center gap-1 rounded-lg bg-primary py-2 text-[10px] font-bold text-primary-foreground"><ShoppingBag className="size-3" /> Adicionar</div>
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                        <div className="flex aspect-[1.35] items-center justify-center bg-gradient-to-br from-rose-100 to-pink-50 text-5xl">💍</div>
                        <div className="p-3">
                          <p className="text-xs font-semibold">Anel minimalista</p>
                          <p className="mt-1 text-sm font-extrabold">R$ 39,90</p>
                          <div className="mt-2 flex items-center justify-center gap-1 rounded-lg bg-primary py-2 text-[10px] font-bold text-primary-foreground"><ShoppingBag className="size-3" /> Adicionar</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/70 px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-background"><ShoppingBag className="size-4" /></span>
                        <div><p className="text-xs font-bold">Seu carrinho</p><p className="text-[10px] text-muted-foreground">2 produtos selecionados</p></div>
                      </div>
                      <div className="text-right"><p className="text-[10px] text-muted-foreground">Total</p><p className="text-sm font-extrabold">R$ 99,80</p></div>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#1FAF62] px-4 py-3 text-xs font-bold text-white shadow-lg shadow-green-900/10">
                      <MessageCircle className="size-4" /> Finalizar pelo WhatsApp
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -left-5 top-[34%] hidden items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xl sm:flex">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><QrCode className="size-5" /></span>
                <div><p className="text-xs font-bold">Seu QR Code</p><p className="text-[10px] text-muted-foreground">Pronto para compartilhar</p></div>
                <CheckCircle2 className="size-4 text-primary" />
              </div>

              <div className="absolute -bottom-5 right-3 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-xl">
                <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><Wallet className="size-4" /></span>
                <div><p className="text-xs font-bold">Pix direto para você</p><p className="text-[10px] text-muted-foreground">Sem intermediários</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/70 bg-card/60">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-7 sm:px-6 md:grid-cols-4">
            {[
              { icon: Smartphone, title: "100% online", text: "Abre no navegador" },
              { icon: QrCode, title: "Link e QR Code", text: "Compartilhe em qualquer lugar" },
              { icon: MessageCircle, title: "Pedido no WhatsApp", text: "Conversa pronta para atender" },
              { icon: Heart, title: "Feita para pequenos negócios", text: "Simples de usar no dia a dia" },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><item.icon className="size-5" /></span>
                <div><p className="text-xs font-bold sm:text-sm">{item.title}</p><p className="mt-0.5 text-[10px] leading-4 text-muted-foreground sm:text-xs">{item.text}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/5 px-4 py-1.5 text-primary">É mais fácil do que parece</Badge>
            <h2 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">Da sua ideia à primeira venda em <span className="text-primary">4 passos.</span></h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">Chega de mandar lista de produtos e preços um por um. Deixe sua vitrine fazer essa parte por você.</p>
          </div>
          <div className="relative mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-[12%] right-[12%] top-8 hidden border-t border-dashed border-primary/30 lg:block" />
            {STEPS.map((step) => (
              <div key={step.number} className="relative rounded-3xl border border-border/80 bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
                <div className="flex items-center justify-between">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/15"><step.icon className="size-6" /></span>
                  <span className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-primary/20">{step.number}</span>
                </div>
                <h3 className="mt-6 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="recursos" className="bg-card/60 py-20 lg:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/5 px-4 py-1.5 text-primary">Tudo organizado em um só lugar</Badge>
              <h2 className="mt-5 max-w-xl font-[family-name:var(--font-display)] text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">Mais tempo cuidando do seu negócio. Menos tempo organizando pedidos.</h2>
              <p className="mt-5 max-w-xl leading-7 text-muted-foreground">Sua vitrine apresenta os produtos, ajuda o cliente a escolher e monta o pedido. Você recebe tudo organizado para continuar o atendimento.</p>
              <div className="mt-8 space-y-5">
                {[
                  { icon: ShoppingBag, title: "Catálogo que valoriza seus produtos", text: "Fotos, descrições, preços e categorias em uma página fácil de navegar." },
                  { icon: QrCode, title: "Seu negócio em um QR Code", text: "Compartilhe seu endereço digital ou deixe o QR Code no balcão, embalagem ou cartão." },
                  { icon: MessageCircle, title: "Pedidos organizados no WhatsApp", text: "Receba a lista de itens e o total em uma mensagem pronta para atender." },
                  { icon: Wallet, title: "Pix direto na sua conta", text: "Cadastre sua chave e receba diretamente do cliente, sem carteira intermediária." },
                ].map((feature) => (
                  <div key={feature.title} className="flex gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><feature.icon className="size-5" /></span>
                    <div><h3 className="font-bold">{feature.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{feature.text}</p></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-5 rounded-[2rem] bg-primary/10 blur-2xl" />
              <div className="relative rounded-[2rem] border border-border bg-background p-5 shadow-2xl sm:p-7">
                <div className="flex items-center justify-between border-b border-border pb-5">
                  <div><p className="text-xs font-medium text-muted-foreground">VISÃO DA SUA LOJA</p><p className="mt-1 text-lg font-extrabold">Tudo no seu ritmo.</p></div>
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Zap className="size-5" /></span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-muted/60 p-4"><p className="text-xs text-muted-foreground">Produtos</p><p className="mt-2 text-2xl font-extrabold">Seu catálogo</p><p className="mt-1 text-[11px] text-muted-foreground">Organizado por categoria</p></div>
                  <div className="rounded-2xl bg-primary/8 p-4"><p className="text-xs text-muted-foreground">Pedidos</p><p className="mt-2 text-2xl font-extrabold">No WhatsApp</p><p className="mt-1 text-[11px] text-muted-foreground">Com resumo automático</p></div>
                </div>
                <div className="mt-4 rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between"><p className="text-sm font-bold">Como o cliente compra</p><Badge className="rounded-full">Sem cadastro</Badge></div>
                  <div className="mt-5 flex items-center justify-between gap-1">
                    {[
                      { icon: Store, label: "Loja" },
                      { icon: ShoppingBag, label: "Carrinho" },
                      { icon: Wallet, label: "Pix" },
                      { icon: MessageCircle, label: "WhatsApp" },
                    ].map((item, index) => (
                      <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><item.icon className="size-5" /></span>
                        <span className="text-[10px] font-semibold text-muted-foreground">{item.label}</span>
                        {index < 3 ? <span className="absolute hidden" /> : null}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl bg-muted/60 px-3 py-3 text-center text-xs text-muted-foreground">Uma experiência simples do primeiro clique ao pedido.</div>
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-emerald-500/10 p-4">
                  <ShieldCheck className="size-6 shrink-0 text-emerald-600" />
                  <p className="text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Você continua no controle.</strong> O pagamento é feito diretamente para você e a conversa acontece no seu WhatsApp.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/5 px-4 py-1.5 text-primary">Um espaço para cada tipo de negócio</Badge>
            <h2 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">Seu produto. Sua marca. <span className="text-primary">Sua vitrine.</span></h2>
            <p className="mt-4 leading-7 text-muted-foreground">Não importa o que você vende: tenha um catálogo digital bonito e fácil de compartilhar.</p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {NICHES.map((n) => (
              <div key={n.label} className="group flex flex-col items-center gap-3 rounded-2xl border border-border/80 bg-card p-5 text-center transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-3xl transition-transform group-hover:scale-110">{n.emoji}</span>
                <span className="text-xs font-bold sm:text-sm">{n.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">E muitos outros produtos e pequenos negócios.</p>
        </section>

        <section id="planos" className="border-y border-border/70 bg-card/60 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/5 px-4 py-1.5 text-primary">Comece no seu tempo</Badge>
              <h2 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">Simples para começar. Completa para crescer.</h2>
              <p className="mt-4 leading-7 text-muted-foreground">Escolha o plano que acompanha o momento do seu negócio. Sem comissão sobre suas vendas.</p>
            </div>

            <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
              <div className="rounded-[1.75rem] border border-border bg-background p-7 sm:p-8">
                <div className="flex items-center justify-between"><p className="text-sm font-extrabold tracking-wide">BÁSICA</p><span className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold text-muted-foreground">PARA COMEÇAR</span></div>
                <p className="mt-5 text-4xl font-extrabold tracking-tight">{brl(basicPrice)}<span className="text-sm font-medium text-muted-foreground">/mês</span></p>
                <p className="mt-2 text-sm text-muted-foreground">30 dias grátis para conhecer.</p>
                <div className="my-7 h-px bg-border" />
                <ul className="space-y-4 text-sm">
                  {["Sua própria vitrine online", "Até 5 produtos cadastrados", "Pedidos pelo WhatsApp", "Chave Pix e QR Code da loja", "Link para compartilhar"].map((f) => (
                    <li key={f} className="flex items-start gap-3"><Check className="mt-0.5 size-4 shrink-0 text-primary" /><span>{f}</span></li>
                  ))}
                </ul>
                <Button asChild variant="outline" size="lg" className="mt-9 h-12 w-full rounded-full">
                  <Link to={signupHref}>Começar 30 dias grátis <ArrowRight className="ml-2 size-4" /></Link>
                </Button>
              </div>

              <div className="relative rounded-[1.75rem] border-2 border-primary/60 bg-background p-7 shadow-2xl shadow-primary/10 sm:p-8">
                <div className="absolute -top-3 right-7 rounded-full bg-primary px-4 py-1.5 text-[10px] font-extrabold tracking-wide text-primary-foreground">PARA VENDER MAIS</div>
                <div className="flex items-center justify-between"><p className="text-sm font-extrabold tracking-wide text-primary">PRO</p><Sparkles className="size-5 text-primary" /></div>
                <p className="mt-5 text-4xl font-extrabold tracking-tight">
                  {pricing.promoActive ? (
                    <><span className="mr-2 text-base font-medium text-muted-foreground line-through">{brl(pricing.basePrice)}</span>{brl(proPrice)}</>
                  ) : brl(proPrice)}
                  <span className="text-sm font-medium text-muted-foreground">/mês</span>
                </p>
                {pricing.promoActive && pricing.promoLabel ? <Badge className="mt-2 rounded-full">{pricing.promoLabel}</Badge> : null}
                <p className="mt-2 text-sm text-muted-foreground">Mais recursos para sua loja crescer.</p>
                <div className="my-7 h-px bg-border" />
                <ul className="space-y-4 text-sm">
                  {["Tudo do plano Básica", "Produtos ilimitados", "Fotos e variações de produtos", "Controle de estoque", "Histórico de pedidos e relatórios", "QR Codes individuais por produto", "Personalização da loja"].map((f) => (
                    <li key={f} className="flex items-start gap-3"><Check className="mt-0.5 size-4 shrink-0 text-primary" /><span>{f}</span></li>
                  ))}
                </ul>
                <Button asChild size="lg" className="mt-9 h-12 w-full rounded-full shadow-lg shadow-primary/20">
                  <Link to={signupHref}>Experimentar grátis <ArrowRight className="ml-2 size-4" /></Link>
                </Button>
              </div>
            </div>
            <p className="mt-7 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> Sem comissão por venda. O dinheiro vai direto para você.</p>
          </div>
        </section>

        <section id="duvidas" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="text-center">
            <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/5 px-4 py-1.5 text-primary">Ainda tem dúvidas?</Badge>
            <h2 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">A gente explica.</h2>
            <p className="mt-3 text-muted-foreground">As respostas para você começar com tranquilidade.</p>
          </div>
          <Accordion type="single" collapsible className="mt-9 w-full">
            {FAQ.map(({ q, a }) => (
              <AccordionItem key={q} value={q} className="border-border/80">
                <AccordionTrigger className="py-5 text-left text-sm font-semibold hover:no-underline">{q}</AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-6 text-muted-foreground">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:pb-24">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-primary px-6 py-12 text-center text-primary-foreground shadow-2xl shadow-primary/20 sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute -left-20 -top-32 size-80 rounded-full border-[45px] border-white/10" />
            <div className="pointer-events-none absolute -bottom-48 -right-16 size-96 rounded-full border-[55px] border-white/10" />
            <div className="relative mx-auto max-w-2xl">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/15"><Store className="size-7" /></span>
              <h2 className="mt-6 font-[family-name:var(--font-display)] text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">Sua próxima venda pode começar com um link.</h2>
              <p className="mt-4 leading-7 text-primary-foreground/80">Crie sua vitrine, coloque seus produtos no ar e facilite o jeito de receber pedidos.</p>
              <Button asChild size="lg" className="mt-8 h-14 rounded-full bg-background px-8 text-base font-bold text-foreground shadow-lg hover:bg-background/90">
                <Link to={signupHref}>Criar minha loja grátis <ArrowRight className="ml-2 size-5" /></Link>
              </Button>
              <p className="mt-4 text-xs text-primary-foreground/70">Sem comissão sobre suas vendas. Você no controle do seu negócio.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 bg-card/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 px-4 py-9 text-sm sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight"> <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Store className="size-4" /></span> vitrini<span className="-ml-2 text-primary">.</span></Link>
            <p className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">Sua vitrine online para apresentar produtos e receber pedidos com praticidade.</p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-muted-foreground" aria-label="Links institucionais">
            <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
            <a href="#planos" className="hover:text-foreground">Planos</a>
            <Link to="/softwares" className="hover:text-foreground">Softwares</Link>
            <Link to="/suporte" className="hover:text-foreground">Suporte</Link>
            <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
            <Link to="/termos" className="hover:text-foreground">Termos de uso</Link>
          </nav>
          <div className="text-xs leading-5 text-muted-foreground md:text-right">
            <p>© {new Date().getFullYear()} Vitrini · By: Tiago Cardoso</p>
            <p>Pagamento realizado diretamente para o vendedor.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
