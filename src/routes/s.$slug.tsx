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
    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
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
