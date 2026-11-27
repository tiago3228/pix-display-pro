export function filterGuidedCategoryProducts<T extends { category_id: string | null }>(
  products: readonly T[],
  categoryId: string | null | undefined,
): T[] {
  if (!categoryId) return [];
  return products.filter((product) => product.category_id === categoryId);
}
