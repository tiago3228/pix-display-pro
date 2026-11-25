export function filterCategoriesWithProducts<TCategory extends { id: string }, TProduct>(
  categories: readonly TCategory[],
  products: readonly TProduct[],
  getCategoryId: (product: TProduct) => string | null | undefined,
): TCategory[] {
  const populatedCategoryIds = new Set(
    products.map(getCategoryId).filter((categoryId): categoryId is string => Boolean(categoryId)),
  );

  return categories.filter((category) => populatedCategoryIds.has(category.id));
}
