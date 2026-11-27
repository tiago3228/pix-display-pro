import { getCafeteriaCatalogSuggestions } from "./cafeteria-catalog.ts";
import { getConfectioneryCatalogSuggestions } from "./confeitaria-catalog.ts";

export function filterGuidedCategoryProducts<T extends { category_id: string | null }>(
  products: readonly T[],
  categoryId: string | null | undefined,
): T[] {
  if (!categoryId) return [];
  return products.filter((product) => product.category_id === categoryId);
}

export function getGuidedCatalogSuggestions<T extends { name: string }>(
  module: string,
  categoryName: string | null | undefined,
  categoryProducts: T[],
) {
  if (module !== "cafeteria") return [];
  return [
    ...getConfectioneryCatalogSuggestions(categoryName, categoryProducts),
    ...getCafeteriaCatalogSuggestions(categoryName, categoryProducts),
  ];
}
