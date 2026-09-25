import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listDigitalProductCategories,
  listPublicDigitalProducts,
  type DigitalProductView,
} from "@/lib/digital-products.functions";

export const Route = createFileRoute("/softwares")({
  loader: async () => {
    const [products, categories] = await Promise.all([
      listPublicDigitalProducts({ data: {} }),
      listDigitalProductCategories(),
    ]);
    return { products, categories };
  },
  head: () => ({
    meta: [
      { title: "Softwares e produtos digitais | Vitrini" },
      {
        name: "description",
        content: "Conheça softwares, aplicativos, serviços e produtos digitais da família Vitrini.",
      },
      { property: "og:title", content: "Conheça nossos softwares e produtos digitais" },
      {
        property: "og:description",
        content: "Soluções digitais para vender, administrar e crescer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DigitalProductsCatalog,
});

function DigitalProductsCatalog() {
  const { products, categories } = Route.useLoaderData();
  const [category, setCategory] = useState<string | null>(null);
  const visibleProducts = category
    ? products.filter((product) => product.category_slug === category)
    : products;
  const featured = visibleProducts.filter((product) => product.is_featured);
  const regular = visibleProducts.filter((product) => !product.is_featured);

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Rocket className="size-5" />
            </span>
            <span className="font-[family-name:var(--font-display)]">Vitrini Digital</span>
          </a>
          <Button asChild size="sm" variant="outline">
            <a href="/">Voltar ao Vitrini</a>
          </Button>
        </div>
      </header>

      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-4 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-7xl">
          <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
            <Rocket className="mr-1 size-3.5" /> Produtos digitais
          </Badge>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Ideias digitais feitas para ir mais longe.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Conheça softwares, aplicativos, serviços e soluções digitais criados para ajudar pessoas
            e negócios.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              Catálogo
            </p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Conheça nossos produtos</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {visibleProducts.length} {visibleProducts.length === 1 ? "solução" : "soluções"}
          </p>
        </div>

        {categories.length > 0 ? (
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar por categoria">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${category === null ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"}`}
            >
              Todos
            </button>
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.slug)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${category === item.slug ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"}`}
              >
                {item.name}
              </button>
            ))}
          </div>
        ) : null}

        {featured.length > 0 ? (
          <div className="mt-8">
            <h3 className="mb-4 text-lg font-semibold">⭐ Em destaque</h3>
            <div className="grid gap-5 lg:grid-cols-2">
              {featured.map((product) => (
                <SoftwareCard key={product.id} product={product} featured />
              ))}
            </div>
          </div>
        ) : null}

        {regular.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {regular.map((product) => (
              <SoftwareCard key={product.id} product={product} />
            ))}
          </div>
        ) : null}

        {visibleProducts.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center">
            <Rocket className="mx-auto size-9 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Novidades a caminho</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Ainda não há produtos digitais publicados nesta categoria.
            </p>
          </div>
        ) : null}
      </section>

      <footer className="border-t border-border bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
        Soluções digitais da família Vitrini
      </footer>
    </main>
  );
}

function SoftwareCard({
  product,
  featured = false,
}: {
  product: DigitalProductView;
  featured?: boolean;
}) {
  const external = product.open_new_tab ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <article
      className={`relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${featured ? "grid md:grid-cols-2" : ""}`}
    >
      {product.card_clickable ? (
        <a
          href={product.url}
          {...external}
          aria-label={`Conhecer ${product.name}`}
          className="absolute inset-0 z-0"
        />
      ) : null}
      <a
        href={product.url}
        {...external}
        className={`relative z-10 block overflow-hidden bg-muted ${featured ? "min-h-56 md:min-h-full" : "aspect-[16/10]"}`}
        aria-label={`Abrir ${product.name}`}
      >
        {product.main_image_url ? (
          <img
            src={product.main_image_url}
            alt={`Imagem do ${product.name}`}
            className="h-full w-full object-cover transition duration-500 hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full min-h-56 items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900 text-white">
            <Rocket className="size-12 opacity-70" />
          </div>
        )}
        {product.is_featured ? <Badge className="absolute left-4 top-4">⭐ Destaque</Badge> : null}
      </a>
      <div
        className={`pointer-events-none relative z-10 flex flex-col p-5 ${featured ? "justify-center sm:p-7" : "h-full"}`}
      >
        <div className="flex items-center gap-3">
          {product.logo_image_url ? (
            <img
              src={product.logo_image_url}
              alt={`Logo ${product.name}`}
              className="size-11 rounded-xl border border-border bg-card object-contain p-1"
            />
          ) : null}
          <div className="min-w-0">
            <h3 className="pointer-events-auto text-lg font-bold">
              <a href={`/softwares/${product.slug}`} className="hover:text-primary">
                {product.name}
              </a>
            </h3>
            {product.category_name ? (
              <p className="text-xs text-muted-foreground">{product.category_name}</p>
            ) : null}
            <Badge variant="outline" className="mt-1 w-fit text-[10px]">
              {product.product_type_label}
            </Badge>
          </div>
        </div>
        <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
          {product.short_description}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild className="pointer-events-auto relative z-10">
            <a href={product.url} {...external}>
              {product.cta_label}
              <ExternalLink className="ml-2 size-4" />
            </a>
          </Button>
          <Button asChild variant="outline" className="pointer-events-auto">
            <a href={`/softwares/${product.slug}`}>
              Saiba mais
              <ArrowRight className="ml-2 size-4" />
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}
