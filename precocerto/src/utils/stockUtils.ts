import type { Product } from "../types";
import type { StockAdjustmentType, StockSummary } from "../types/stock";

export function getProductAvailableStock(product: Product): number {
  return Number(
    product.quantidadeDisponivel ??
      product.quantidadeDisponível ??
      product.totalUnidadesVendaveis ??
      product.quantidade ??
      0
  );
}

export function getProductStockValue(product: Product): number {
  const unitValue = Number(product.custoRealUnidadeVenda ?? product.custoTotalReal ?? product.custoCompra ?? 0);
  return Math.max(0, getProductAvailableStock(product)) * Math.max(0, unitValue);
}

export function getProductMinimumStock(product: Product): number {
  return Number(product.quantidadeMinima ?? 5);
}

export function isLowStockProduct(product: Product): boolean {
  const stock = getProductAvailableStock(product);
  return stock > 0 && stock <= getProductMinimumStock(product);
}

export function isOutOfStockProduct(product: Product): boolean {
  return getProductAvailableStock(product) <= 0;
}

export function buildStockSummary(products: Product[]): StockSummary {
  return products.reduce(
    (summary, product) => ({
      totalProducts: summary.totalProducts + 1,
      totalUnits: summary.totalUnits + getProductAvailableStock(product),
      totalStockValue: summary.totalStockValue + getProductStockValue(product),
      lowStockProducts: summary.lowStockProducts + (isLowStockProduct(product) ? 1 : 0),
      outOfStockProducts: summary.outOfStockProducts + (isOutOfStockProduct(product) ? 1 : 0),
    }),
    {
      totalProducts: 0,
      totalUnits: 0,
      totalStockValue: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
    }
  );
}

export function calculateAdjustedStock(
  currentStock: number,
  quantity: number,
  adjustmentType: StockAdjustmentType
): number {
  if (quantity < 0) {
    throw new Error("A quantidade não pode ser negativa.");
  }

  if (adjustmentType === "in") return currentStock + quantity;
  if (adjustmentType === "out") {
    if (currentStock < quantity) {
      throw new Error(`Stock insuficiente. Disponível: ${currentStock}, solicitado: ${quantity}.`);
    }
    return currentStock - quantity;
  }

  return quantity;
}
