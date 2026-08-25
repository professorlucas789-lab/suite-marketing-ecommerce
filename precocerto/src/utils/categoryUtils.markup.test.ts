import { describe, expect, it } from "vitest";
import type { CategoryMarginConfig } from "../types/category";
import { calculateProductPricesWithCategoryMargin } from "./categoryUtils";

const calculationInput = {
  quantidade: 1,
  modoCalculo: "manual" as const,
  custoCompra: 100,
  custoTransporte: 0,
  custoEmbalagem: 0,
  outrosCustos: 0,
  unidadesInternas: 1,
  venderEmbalagemInteira: true,
};

const markupCategory = {
  id: "cat-1",
  storeId: "store-1",
  name: "Medicamentos comuns",
  businessType: "farmacia",
  marginRules: {
    baseMargin: 30,
    minMargin: 25,
    maxMargin: 40,
  },
  priceStrategy: "percentage",
  regulatoryConstraints: {
    lastUpdated: "2026-08-20T00:00:00.000Z",
  },
  createdAt: "2026-08-20T00:00:00.000Z",
  updatedAt: "2026-08-20T00:00:00.000Z",
  calculationMode: "markup",
} as CategoryMarginConfig & { calculationMode: "markup" };

describe("calculateProductPricesWithCategoryMargin", () => {
  it("converts markup categories before using the margin-based pricing engine", () => {
    const result = calculateProductPricesWithCategoryMargin(calculationInput, markupCategory);

    expect(result.precoVendaRecomendado).toBeCloseTo(130, 2);
    expect(result.margemReal).toBeCloseTo(23.08, 2);
  });
});
