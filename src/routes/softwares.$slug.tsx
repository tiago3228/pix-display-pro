import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Facebook,
  HelpCircle,
  Instagram,
  MessageCircle,
  PlayCircle,
  Rocket,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getPublicDigitalProduct, type DigitalProductView } from "@/lib/digital-products.functions";

export const Route = createFileRoute("/softwares/$slug")({
  loader: ({ params }) => getPublicDigitalProduct({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    if (!loaderData)
      return {
        meta: [
          { title: "Produto digital não encontrado | Vitrini" },
          { name: "robots", content: "noindex" },
        ],
      };
    const product = loaderData;
    const title = product.seo_title || `${product.name} | Produtos digitais Vitrini`;
    const description = product.seo_description || product.short_description;
    const image =
      product.share_image_url ||
      product.banner_image_url ||
      product.main_image_url ||
      "https://vitrini-br.lovable.app/og-default.png";
    const url = `https://vitrini-br.lovable.app/softwares/${product.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:image:alt", content: product.name },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
    };
  },
  notFoundComponent: () => <MissingProduct />,
  component: DigitalProductLanding,
});

function MissingProduct() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="text-center">
        <Rocket className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold">Produto digital não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Confira se o endereço está correto.</p>
        <Button asChild className="mt-5" variant="outline">
          <a href="/softwares">
            <ArrowLeft className="mr-2 size-4" />
            Voltar ao catálogo
          </a>
        </Button>
      </div>
    </main>
  );
}

function DigitalProductLanding() {
  const product = Route.useLoaderData();
  if (!product) return <MissingProduct />;
  return <ProductPresentation product={product} />;
}

function getVideoEmbedUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const id =
        url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = url.pathname.match(/\/(?:video\/)?(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

function ProductPresentation({ product }: { product: DigitalProductView }) {
  const [activeImage, setActiveImage] = useState(
    product.main_image_url || product.banner_image_url,
  );
  useEffect(() => {
    setActiveImage(product.main_image_url || product.banner_image_url);
  }, [product.id, product.main_image_url, product.banner_image_url]);
  const shareUrl =
    typeof window === "undefined"
      ? `https://vitrini-br.lovable.app/softwares/${product.slug}`
      : window.location.href;
  const shareText = `Conheça ${product.name}: ${product.short_description} ${shareUrl}`;
  const external = product.open_new_tab ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const images = [product.main_image_url, ...product.gallery_image_urls].filter(
    (image): image is string => Boolean(image),
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiado para compartilhar.");
    } catch {
      toast.error("Não foi possível copiar o link neste navegador.");
    }
  }

  async function share() {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: product.name,
        text: product.short_description,
        url: shareUrl,
      });
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError")
        toast.error("Não foi possível compartilhar agora.");
    }
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: product.background_color }}>
      <header className="border-b border-black/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <a href="/softwares" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="size-4" /> Todos os softwares
          </a>
          <a href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Rocket className="size-4" />
            </span>{" "}
            Vitrini
          </a>
        </div>
      </header>

      <section
        className="relative isolate overflow-hidden text-white"
        style={{ backgroundColor: product.secondary_color }}
      >
        {product.banner_image_url ? (
          <img
            src={product.banner_image_url}
            alt=""
            className="absolute inset-0 -z-10 size-full object-cover opacity-35"
          />
        ) : null}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 to-black/20" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              {product.logo_image_url ? (
                <img
                  src={product.logo_image_url}
                  alt={`Logo ${product.name}`}
                  className="size-14 rounded-2xl bg-white object-contain p-2"
                />
              ) : (
                <span className="flex size-14 items-center justify-center rounded-2xl bg-white/15">
                  <Rocket className="size-7" />
                </span>
              )}
              {product.category_name ? (
                <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
                  {product.category_name}
                </Badge>
              ) : null}
              <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
                {product.product_type_label}
              </Badge>
              {product.is_featured ? (
                <Badge className="border-amber-300/40 bg-amber-300/15 text-amber-100 hover:bg-amber-300/15">
                  ⭐ Em destaque
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
              {product.banner_title || product.name}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
              {product.banner_subtitle || product.short_description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                style={{ backgroundColor: product.primary_color }}
                className="border-0 text-white hover:opacity-90"
              >
                <a href={product.url} {...external}>
                  {product.cta_label}
                  <ExternalLink className="ml-2 size-4" />
                </a>
              </Button>
              {product.demo_url ? (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/40 bg-white/10 text-white hover:bg-white/20"
                >
                  <a href={product.demo_url} {...external}>
                    <PlayCircle className="mr-2 size-4" />
                    {product.demo_cta_label}
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/10 p-2 shadow-2xl backdrop-blur">
            {activeImage ? (
              <a href={product.url} {...external} aria-label={`Abrir ${product.name}`}>
                <img
                  src={activeImage}
                  alt={`Apresentação de ${product.name}`}
                  className="aspect-[4/3] w-full rounded-2xl object-cover"
                />
              </a>
            ) : (
              <a
                href={product.url}
                {...external}
                className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/30 to-violet-500/20"
              >
                <Rocket className="size-16 opacity-70" />
              </a>
            )}
            {images.length > 1 ? (
              <div className="mt-2 flex gap-2 overflow-x-auto p-1">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(image)}
                    aria-label={`Ver imagem ${index + 1}`}
                    className={`size-14 shrink-0 overflow-hidden rounded-lg border-2 ${activeImage === image ? "border-white" : "border-transparent"}`}
                  >
                    <img src={image} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:py-20">
        <div className="space-y-14">
          {product.description ? (
            <section>
              <h2 className="text-2xl font-bold">Sobre {product.name}</h2>
              <p className="mt-4 whitespace-pre-line text-base leading-8 text-muted-foreground">
                {product.description}
              </p>
            </section>
          ) : null}

          {product.features.length > 0 ? (
            <section>
              <h2 className="text-2xl font-bold">O que você pode fazer</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {product.features.map((feature, index) => (
                  <div
                    key={`${feature}-${index}`}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                  >
                    <Check
                      className="mt-0.5 size-5 shrink-0"
                      style={{ color: product.primary_color }}
                    />
                    <p className="text-sm leading-6">{feature}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {product.benefits.length > 0 ? (
            <section>
              <h2 className="text-2xl font-bold">Benefícios</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {product.benefits.map((benefit, index) => (
                  <li
                    key={`${benefit}-${index}`}
                    className="flex items-start gap-3 text-sm leading-6"
                  >
                    <Check
                      className="mt-0.5 size-4 shrink-0"
                      style={{ color: product.primary_color }}
                    />
                    {benefit}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {product.video_url ? (
            <section>
              <h2 className="text-2xl font-bold">Veja em ação</h2>
              {getVideoEmbedUrl(product.video_url) ? (
                <div className="mt-4 aspect-video overflow-hidden rounded-2xl border border-border bg-black">
                  <iframe
                    src={getVideoEmbedUrl(product.video_url) ?? undefined}
                    title={`Vídeo de apresentação de ${product.name}`}
                    className="size-full"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              ) : (
                <a
                  href={product.video_url}
                  {...external}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium"
                >
                  <PlayCircle className="size-5" />
                  Assistir apresentação
                  <ExternalLink className="size-4" />
                </a>
              )}
            </section>
          ) : null}

          {product.faqs.length > 0 ? (
            <section>
              <h2 className="text-2xl font-bold">Perguntas frequentes</h2>
              <Accordion
                type="single"
                collapsible
                className="mt-4 rounded-xl border border-border bg-card px-4"
              >
                {product.faqs.map((faq, index) => (
                  <AccordionItem key={`${faq.question}-${index}`} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ) : null}

          <section>
            <h2 className="text-2xl font-bold">Compartilhe</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => void share()}>
                <Share2 className="mr-2 size-4" />
                Compartilhar
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 size-4" />
                  WhatsApp
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Facebook className="mr-2 size-4" />
                  Facebook
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void copyLink();
                  window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
                }}
              >
                <Instagram className="mr-2 size-4" />
                Instagram
              </Button>
              <Button variant="outline" size="sm" onClick={() => void copyLink()}>
                <Copy className="mr-2 size-4" />
                Copiar link
              </Button>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          {product.plans.length > 0 ? (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-lg font-bold">Planos</h2>
              <div className="mt-4 space-y-3">
                {product.plans.map((plan, index) => (
                  <div
                    key={`${plan.name}-${index}`}
                    className="rounded-xl border border-border p-4"
                  >
                    <p className="font-semibold">{plan.name}</p>
                    {plan.price ? (
                      <p
                        className="mt-1 text-2xl font-bold"
                        style={{ color: product.primary_color }}
                      >
                        {plan.price}
                      </p>
                    ) : null}
                    {plan.description ? (
                      <p className="mt-2 text-xs text-muted-foreground">{plan.description}</p>
                    ) : null}
                    {plan.features.length > 0 ? (
                      <ul className="mt-3 space-y-2 text-xs">
                        {plan.features.map((feature, i) => (
                          <li key={`${feature}-${i}`} className="flex gap-2">
                            <Check
                              className="size-4 shrink-0"
                              style={{ color: product.primary_color }}
                            />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {plan.url ? (
                      <Button
                        asChild
                        size="sm"
                        className="mt-4 w-full"
                        style={{ backgroundColor: product.primary_color }}
                      >
                        <a href={plan.url} {...external}>
                          Escolher plano
                          <ArrowRight className="ml-2 size-4" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {product.contract_url ? (
            <Button asChild className="w-full" style={{ backgroundColor: product.primary_color }}>
              <a href={product.contract_url} {...external}>
                {product.contract_cta_label}
                <ArrowRight className="ml-2 size-4" />
              </a>
            </Button>
          ) : null}
          {product.support_url ? (
            <Button asChild variant="outline" className="w-full">
              <a href={product.support_url} {...external}>
                <HelpCircle className="mr-2 size-4" />
                {product.support_cta_label}
              </a>
            </Button>
          ) : null}
          <p className="text-center text-xs text-muted-foreground">
            Você será direcionado para o site seguro do produto.
          </p>
        </aside>
      </div>

      <footer className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {product.name} · Apresentado no catálogo digital Vitrini
      </footer>
    </main>
  );
}
