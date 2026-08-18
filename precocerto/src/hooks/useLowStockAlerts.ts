/**
 * useLowStockAlerts Hook
 * Hook para monitorar produtos com stock baixo
 * NOVO (Fase 13): Gestão automática de stock
 */

import { useMemo } from "react";
import { Product } from "../types";

interface UseLowStockAlertsProps {
  products: Product[];
  defaultMinQuantity?: number; // Stock mínimo padrão
}

export function useLowStockAlerts({
  products,
  defaultMinQuantity = 5,
}: UseLowStockAlertsProps) {
  const lowStockProducts = useMemo(() => {
    return products
      .map((product) => {
        const quantidadeDisponivel = product.quantidadeDisponivel || 0;
        const minQuantidade = defaultMinQuantity;
        const percentageRemaining =
          (quantidadeDisponivel / (minQuantidade * 2)) * 100;

        return {
          product,
          quantidadeDisponivel,
          minQuantidade,
          percentageRemaining: Math.min(percentageRemaining, 100),
          isLow: quantidadeDisponivel <= minQuantidade,
          isCritical: quantidadeDisponivel <= 2,
          daysUntilEmpty: quantidadeDisponivel > 0
            ? Math.ceil(30 / (quantidadeDisponivel + 1)) // Estimativa baseada em ~1 unidade por dia
            : 0,
        };
      })
      .filter((item) => item.isLow)
      .sort((a, b) => {
        // Ordenar por crítico primeiro, depois por quantidade
        if (a.isCritical !== b.isCritical) {
          return a.isCritical ? -1 : 1;
        }
        return a.quantidadeDisponivel - b.quantidadeDisponivel;
      });
  }, [products, defaultMinQuantidade]);

  const criticalCount = useMemo(
    () => lowStockProducts.filter((item) => item.isCritical).length,
    [lowStockProducts]
  );

  const warningCount = useMemo(
    () =>
      lowStockProducts.filter(
        (item) => !item.isCritical && item.quantidadeDisponivel > 0
      ).length,
    [lowStockProducts]
  );

  const totalLowStock = lowStockProducts.length;

  return {
    lowStockProducts,
    criticalCount,
    warningCount,
    totalLowStock,
    recommendedReorderCount: criticalCount + Math.ceil(warningCount * 0.5), // 50% dos avisos
  };
}
