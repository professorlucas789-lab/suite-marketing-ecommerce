import type { CategoryMarginConfig } from "../types/category";
import type { MarkupCategory } from "../types/markup";

export function getMarkupBasePercent(markup: MarkupCategory): number {
  switch (markup.markupPadrao) {
    case "minimo":
      return markup.markupMinimo;
    case "alto":
      return markup.markupAlto;
    case "medio":
    default:
      return markup.markupMedio;
  }
}

export function markupToMarginCategory(
  markup: MarkupCategory,
  businessType: string
): CategoryMarginConfig {
  const levels = [markup.markupMinimo, markup.markupMedio, markup.markupAlto]
    .filter((value) => Number.isFinite(value));
  const baseMargin = getMarkupBasePercent(markup);
  const minMargin = levels.length > 0 ? Math.min(...levels) : baseMargin;
  const maxMargin = levels.length > 0 ? Math.max(...levels) : baseMargin;
  const now = markup.atualizadoEm || markup.criadoEm || new Date().toISOString();

  return {
    id: markup.id,
    storeId: markup.storeId,
    name: markup.name,
    businessType,
    description: markup.criterioUso || markup.descricao,
    marginRules: {
      baseMargin,
      minMargin,
      maxMargin,
      recommendedMargin: baseMargin,
    },
    priceStrategy: "percentage",
    regulatoryConstraints: {
      notes: markup.criterioUso,
      lastUpdated: now,
    },
    createdAt: markup.criadoEm || now,
    updatedAt: now,
  };
}
