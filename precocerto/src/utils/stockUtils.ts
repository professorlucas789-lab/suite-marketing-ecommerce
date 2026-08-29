import type { Product } from "../types";
import type { StockAdjustmentType, StockSummary } from "../types/stock";

export type StockProductWithId = Product & { id: string; nome: string };

export function isStockProduct(product: Product | null | undefined): product is Product {
  return Boolean(product && typeof product === "object");
}

export function isStockProductWithId(
  product: Product | null | undefined
): product is StockProductWithId {
  return (
    isStockProduct(product) &&
    typeof product.id === "string" &&
    product.id.trim().length > 0 &&
    typeof product.nome === "string" &&
    product.nome.trim().length > 0
  );
}

export function normalizeStockProducts(
  products: Array<Product | null | undefined> | null | undefined
): Product[] {
  return Array.isArray(products) ? products.filter(isStockProduct) : [];
}

export function normalizeStockProductsWithId(
  products: Array<Product | null | undefined> | null | undefined
): StockProductWithId[] {
  return Array.isArray(products) ? products.filter(isStockProductWithId) : [];
}

export function getProductAvailableStock(product: Product | null | undefined): number {
  if (!isStockProduct(product)) {
    return 0;
  }

  const value = Number(
    product.quantidadeDisponivel ??
      product.quantidadeDisponível ??
      product.totalUnidadesVendaveis ??
      product.quantidade ??
      0
  );

  return Number.isFinite(value) ? value : 0;
}

export function getProductStockValue(product: Product | null | undefined): number {
  if (!isStockProduct(product)) {
    return 0;
  }

  const unitValue = Number(product.custoRealUnidadeVenda ?? product.custoTotalReal ?? product.custoCompra ?? 0);
  return Math.max(0, getProductAvailableStock(product)) * Math.max(0, unitValue);
}

export function getProductMinimumStock(product: Product | null | undefined): number {
  if (!isStockProduct(product)) {
    return 5;
  }

  const value = Number(product.quantidadeMinima ?? 5);
  return Number.isFinite(value) ? value : 5;
}

export function isLowStockProduct(product: Product | null | undefined): boolean {
  const stock = getProductAvailableStock(product);
  return stock > 0 && stock <= getProductMinimumStock(product);
}

export function isOutOfStockProduct(product: Product | null | undefined): boolean {
  return getProductAvailableStock(product) <= 0;
}

export function buildStockSummary(products: Array<Product | null | undefined>): StockSummary {
  return normalizeStockProducts(products).reduce(
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
