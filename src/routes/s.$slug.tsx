import { createFileRoute } from "@tanstack/react-router";
import { getStorefront } from "@/lib/storefront.functions";
import { StorePage, EmptyState } from "./loja.$slug";

export const Route = createFileRoute("/s/$slug")({
  loader: ({ params }) => getStorefront({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Loja não encontrada | Vitrini" }, { name: "robots", content: "noindex" }],
      };
    }
    const { store } = loaderData;
    const title = `${store.name} | Loja Online`;
    const description =
      store.description || `Veja os produtos de ${store.name} e peça pelo WhatsApp.`;
    const shareImage = store.logo || "https://vitrini-br.lovable.app/og-default.png";
    const shareUrl = `https://vitrini-br.lovable.app/s/${store.slug}`;
    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: shareUrl },
      { property: "og:image", content: shareImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: `${store.name} — loja online` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: shareImage },
    ];
    return { meta };
  },
  errorComponent: () => (
    <EmptyState
      title="Não foi possível abrir esta loja"
      text="Tente novamente em alguns instantes."
    />
  ),
  notFoundComponent: () => (
    <EmptyState title="Loja não encontrada" text="Confira o link e tente novamente." />
  ),
  component: StorePage,
});
