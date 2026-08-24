import { describe, expect, it } from "vitest";
import type { Product } from "../types";
import {
  buildStockSummary,
  calculateAdjustedStock,
  getProductAvailableStock,
  getProductStockValue,
  isLowStockProduct,
  isOutOfStockProduct,
} from "./stockUtils";

const makeProduct = (overrides: Partial<Product>): Product => ({
  nome: "Produto teste",
  categoria: "Geral",
  fornecedor: "Fornecedor",
  numeroFatura: "FAT-1",
  dataEmissaoFatura: "2026-08-20",
  storeId: "store-1",
  custoCompra: 100,
  custoTransporte: 0,
  custoEmbalagem: 0,
  outrosCustos: 0,
  margemDesejada: 20,
  precoVendaRecomendado: 150,
  lucroEstimado: 50,
  margemReal: 33,
  observacoes: "",
  userId: "user-1",
  createdAt: "2026-08-20T00:00:00.000Z",
  updatedAt: "2026-08-20T00:00:00.000Z",
  ...overrides,
});

describe("stockUtils", () => {
  it("resolve stock disponivel com fallback para quantidade", () => {
    expect(getProductAvailableStock(makeProduct({ quantidadeDisponivel: 8, quantidade: 20 }))).toBe(8);
    expect(getProductAvailableStock(makeProduct({ quantidadeDisponível: 6, quantidade: 20 }))).toBe(6);
    expect(getProductAvailableStock(makeProduct({ quantidade: 20 }))).toBe(20);
  });

  it("calcula valor de stock pelo custo unitario real quando existir", () => {
    expect(getProductStockValue(makeProduct({ quantidadeDisponivel: 4, custoRealUnidadeVenda: 25 }))).toBe(100);
  });

  it("calcula resumo de stock da unidade", () => {
    const summary = buildStockSummary([
      makeProduct({ quantidadeDisponivel: 0 }),
      makeProduct({ quantidadeDisponivel: 3, quantidadeMinima: 5 }),
      makeProduct({ quantidadeDisponivel: 10, custoRealUnidadeVenda: 20 }),
    ]);

    expect(summary).toMatchObject({
      totalProducts: 3,
      totalUnits: 13,
      lowStockProducts: 1,
      outOfStockProducts: 1,
    });
  });

  it("classifica stock baixo e ruptura", () => {
    expect(isLowStockProduct(makeProduct({ quantidadeDisponivel: 3, quantidadeMinima: 5 }))).toBe(true);
    expect(isOutOfStockProduct(makeProduct({ quantidadeDisponivel: 0 }))).toBe(true);
  });

  it("calcula entrada, saida e correcao com validacao", () => {
    expect(calculateAdjustedStock(10, 5, "in")).toBe(15);
    expect(calculateAdjustedStock(10, 5, "out")).toBe(5);
    expect(calculateAdjustedStock(10, 7, "correction")).toBe(7);
    expect(calculateAdjustedStock(10, 0, "correction")).toBe(0);
    expect(() => calculateAdjustedStock(2, 5, "out")).toThrow("Stock insuficiente");
  });
});
