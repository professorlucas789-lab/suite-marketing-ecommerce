import { describe, expect, it } from "vitest";
import type { MarkupCategory } from "../types/markup";
import { getMarkupBasePercent, markupToMarginCategory } from "./markupCategoryAdapter";

const baseMarkup: MarkupCategory = {
  id: "antibioticos",
  storeId: "loja-1",
  name: "Antibioticos",
  markupMinimo: 32,
  markupMedio: 45,
  markupAlto: 60,
  markupPadrao: "medio",
  ativo: true,
  criterioUso: "Procura alta, margem elevada",
  criadoEm: "2026-08-20T00:00:00.000Z",
  atualizadoEm: "2026-08-20T00:00:00.000Z",
};

describe("markupCategoryAdapter", () => {
  it("uses the configured default markup level as base margin", () => {
    expect(getMarkupBasePercent(baseMarkup)).toBe(45);
    expect(getMarkupBasePercent({ ...baseMarkup, markupPadrao: "minimo" })).toBe(32);
    expect(getMarkupBasePercent({ ...baseMarkup, markupPadrao: "alto" })).toBe(60);
  });

  it("converts markup categories into margin selector categories", () => {
    const category = markupToMarginCategory(baseMarkup, "farmacia");

    expect(category).toMatchObject({
      id: "antibioticos",
      storeId: "loja-1",
      name: "Antibioticos",
      businessType: "farmacia",
      priceStrategy: "percentage",
      marginRules: {
        baseMargin: 45,
        minMargin: 32,
        maxMargin: 60,
        recommendedMargin: 45,
      },
    });
  });
});
