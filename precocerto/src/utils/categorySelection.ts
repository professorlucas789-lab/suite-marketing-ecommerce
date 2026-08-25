import type { CategoryMarginConfig } from "../types/category";

export function normalizeBusinessType(value?: string | null): string {
  return (value || "").trim().toLocaleLowerCase("pt-PT");
}

export function filterGlobalCategoriesForBusiness(
  categories: CategoryMarginConfig[],
  businessType?: string | null
): CategoryMarginConfig[] {
  const normalizedBusinessType = normalizeBusinessType(businessType);

  return categories.filter((category) => {
    const categoryBusinessType = normalizeBusinessType(category.businessType);
    return !categoryBusinessType || !normalizedBusinessType || categoryBusinessType === normalizedBusinessType;
  });
}

export function selectMarginCategories(
  globalCategories: CategoryMarginConfig[],
  markupCategories: CategoryMarginConfig[],
  storedCategories: CategoryMarginConfig[],
  businessType?: string | null
): CategoryMarginConfig[] {
  const scopedGlobalCategories = filterGlobalCategoriesForBusiness(globalCategories, businessType);

  if (scopedGlobalCategories.length > 0) {
    return scopedGlobalCategories;
  }

  if (markupCategories.length > 0) {
    return markupCategories;
  }

  return storedCategories;
}

export function getUniqueProductCategories(products: Array<{ categoria?: string | null }>): string[] {
  return Array.from(
    new Set(
      products
        .map((product) => product.categoria?.trim())
        .filter((category): category is string => !!category)
    )
  ).sort((a, b) => a.localeCompare(b, "pt-PT"));
}
