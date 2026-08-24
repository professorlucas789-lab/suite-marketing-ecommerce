import { describe, expect, it } from "vitest";
import type { CategoryMarginConfig } from "../types/category";
import {
  filterGlobalCategoriesForBusiness,
  getUniqueProductCategories,
  selectMarginCategories,
} from "./categorySelection";

function createCategory(id: string, name: string, businessType: string, storeId = "global"): CategoryMarginConfig {
  return {
    id,
    storeId,
    name,
    businessType,
    marginRules: {
      baseMargin: 30,
      minMargin: 20,
      maxMargin: 40,
    },
    priceStrategy: "percentage",
    regulatoryConstraints: {
      lastUpdated: "2026-08-24T00:00:00.000Z",
    },
    createdAt: "2026-08-24T00:00:00.000Z",
    updatedAt: "2026-08-24T00:00:00.000Z",
  };
}

describe("categorySelection", () => {
  it("filtra categorias globais pelo tipo de negócio atual", () => {
    const categories = [
      createCategory("pharmacy", "Medicamentos comuns", "farmacia"),
      createCategory("it", "Consumíveis Informáticos", "informatica"),
    ];

    expect(filterGlobalCategoriesForBusiness(categories, "informatica")).toEqual([categories[1]]);
  });

  it("usa markups da loja quando categorias globais são de outro negócio", () => {
    const pharmacyGlobal = [createCategory("pharmacy", "Medicamentos comuns", "farmacia")];
    const storeMarkup = [createCategory("paper", "Papel A4", "papelaria-informatica", "store-1")];
    const stored = [createCategory("fallback", "Geral", "papelaria-informatica", "store-1")];

    expect(selectMarginCategories(pharmacyGlobal, storeMarkup, stored, "papelaria-informatica")).toEqual(storeMarkup);
  });

  it("cria opções únicas de categoria a partir dos produtos da loja", () => {
    const categories = getUniqueProductCategories([
      { categoria: "Medicamentos" },
      { categoria: "Informática" },
      { categoria: "Medicamentos" },
      { categoria: " " },
      {},
    ]);

    expect(categories).toEqual(["Informática", "Medicamentos"]);
  });
});
