import type { DigitalProductView } from "./digital-products.functions";
import type { Storefront } from "./storefront.functions";
import { isTechnologyStorefront } from "./technology-storefront.ts";

export type PublicStorefrontPageData = NonNullable<Storefront> & {
  digitalProducts: DigitalProductView[];
};

export type PublicStorefrontLoaderDependencies = {
  getStorefront: (slug: string) => Promise<Storefront>;
  listPublicDigitalProducts: () => Promise<DigitalProductView[]>;
};

export function createPublicStorefrontLoader(dependencies: PublicStorefrontLoaderDependencies) {
  return async (slug: string): Promise<PublicStorefrontPageData | null> => {
    const storefront = await dependencies.getStorefront(slug);
    if (!storefront) return null;

    let digitalProducts: DigitalProductView[] = [];
    if (isTechnologyStorefront(storefront.store.slug)) {
      try {
        digitalProducts = await dependencies.listPublicDigitalProducts();
      } catch (error) {
        console.error("Não foi possível carregar os softwares do portfólio.", error);
      }
    }

    return { ...storefront, digitalProducts };
  };
}
