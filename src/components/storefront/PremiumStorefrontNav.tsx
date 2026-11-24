import { MessageCircle, Store as StoreIcon } from "lucide-react";
import type { Storefront } from "@/lib/storefront.functions";
import { whatsappLink } from "@/lib/format";

type Store = NonNullable<Storefront>["store"];

export function PremiumStorefrontNav({ store }: { store: Store }) {
  return (
    <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-5 sm:pt-6">
      <a href="#inicio" className="flex min-w-0 items-center gap-3" aria-label={store.name}>
        <span
          className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-card"
          style={{ borderColor: store.accent_color }}
        >
          {store.logo ? (
            <img
              src={store.logo}
              alt={`Logotipo de ${store.name}`}
              className="size-full object-contain"
            />
          ) : (
            <StoreIcon
              className="size-5"
              style={{ color: store.primary_color }}
              aria-hidden="true"
            />
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold sm:text-base">{store.name}</span>
          <span className="block text-xs text-muted-foreground">Vitrine Premium</span>
        </span>
      </a>
      <nav aria-label="Navegação da vitrine" className="hidden items-center gap-5 text-sm lg:flex">
        <a className="transition hover:text-[var(--store-links)]" href="#inicio">
          Início
        </a>
        <a className="transition hover:text-[var(--store-links)]" href="#catalogo">
          Catálogo
        </a>
        <a className="transition hover:text-[var(--store-links)]" href="#contato">
          Contato
        </a>
      </nav>
      <a
        href={whatsappLink(store.whatsapp, `Olá, ${store.seller_name || store.name}!`)}
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
  );
}
