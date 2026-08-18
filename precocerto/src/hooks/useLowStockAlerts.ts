/**
 * useLowStockAlerts Hook
 * Monitora produtos com stock baixo
 * NOVO (Fase 13): Gestão de estoque automática
 */

import { useMemo } from "react";
import { Product } from "../types";

type ProductWithLegacyQuantity = Product & {
  quantidadeDisponível?: number;
};

interface LowStockItem {
  product: Product;
  quantidadeDisponivel: number;
  minQuantidade: number;
  isLow: boolean;
  isCritical: boolean;
  percentageRemaining: number;
  daysUntilEmpty: number;
}

interface UseLowStockAlertsReturn {
  lowStockProducts: LowStockItem[];
  criticalCount: number;
  warningCount: number;
  totalLowStock: number;
  recommendedReorderCount: number;
}

export function useLowStockAlerts({
  products = [],
  defaultMinQuantity = 5,
}: {
  products?: Product[];
  defaultMinQuantity?: number;
}): UseLowStockAlertsReturn {
  return useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];

    const lowStockItems: LowStockItem[] = safeProducts
      .map((product) => {
        const legacyProduct = product as ProductWithLegacyQuantity;
        const quantidadeDisponivel =
          product.quantidadeDisponivel ??
          legacyProduct.quantidadeDisponível ??
          0;
        const minQuantidade = defaultMinQuantity;

        return {
          product,
          quantidadeDisponivel,
          minQuantidade,
          isLow: quantidadeDisponivel <= minQuantidade,
          isCritical: quantidadeDisponivel <= 2,
          percentageRemaining: Math.min(
            (quantidadeDisponivel / (minQuantidade * 2)) * 100,
            100
          ),
          daysUntilEmpty:
            quantidadeDisponivel > 0
              ? Math.ceil(30 / (quantidadeDisponivel + 1))
              : 0,
        };
      })
      .filter((item) => item.isLow)
      .sort((a, b) => {
        // Sort by critical first, then by quantity
        if (a.isCritical !== b.isCritical) {
          return a.isCritical ? -1 : 1;
        }
        return a.quantidadeDisponivel - b.quantidadeDisponivel;
      });

    const criticalCount = lowStockItems.filter((item) => item.isCritical)
      .length;
    const warningCount = lowStockItems.length - criticalCount;

    return {
      lowStockProducts: lowStockItems,
      criticalCount,
      warningCount,
      totalLowStock: lowStockItems.length,
      recommendedReorderCount: lowStockItems.reduce(
        (sum, item) => sum + (item.minQuantidade * 2 - item.quantidadeDisponivel),
        0
      ),
    };
  }, [products, defaultMinQuantity]);
}
