/**
 * Multi-Store Analytics Service
 * Análise comparativa de performance entre lojas
 * Fase 9: Dashboard Multi-Loja
 */

import { SalesKPIs, SalesReport } from '../types/sales';
import type { OperationalUnitType } from '../types/store';

export interface StorePerformance {
  storeId: string;
  storeName: string;
  businessSegmentName?: string;
  unitType?: OperationalUnitType;
  rank: number;
  metrics: {
    totalRevenue: number;
    totalProfit: number;
    profitMargin: number; // %
    transactionCount: number;
    avgTransactionValue: number;
    avgMargin: number; // %
    totalUnits: number;
    productCount: number;
    inventoryValue: number;
    cashIn: number;
    cashOut: number;
    netCashFlow: number;
    receivables: number;
    payables: number;
    operationalBalance: number;
    pendingReconciliation: number;
  };
  trends: {
    revenueGrowth: number; // %
    profitGrowth: number; // %
    efficiency: 'high' | 'medium' | 'low';
  };
}

export interface MultiStoreComparison {
  period: { from: string; to: string; label: string };
  timestamp: string;
  stores: StorePerformance[];
  consolidated: {
    totalRevenue: number;
    totalProfit: number;
    totalTransactions: number;
    totalUnits: number;
    avgMargin: number;
    cashIn: number;
    cashOut: number;
    netCashFlow: number;
    receivables: number;
    payables: number;
    operationalBalance: number;
    pendingReconciliation: number;
    storeCount: number;
  };
  insights: {
    bestPerformer: StorePerformance | null;
    worstPerformer: StorePerformance | null;
    averageMetrics: {
      avgRevenue: number;
      avgMargin: number;
      avgTransactionValue: number;
    };
  };
}

/**
 * Calcular performance de uma loja
 */
export function calculateStorePerformance(
  storeId: string,
  storeName: string,
  kpis: SalesKPIs,
  productCount: number,
  inventoryValue: number,
  previousKpis?: SalesKPIs,
  financialMetrics: Partial<Pick<
    StorePerformance['metrics'],
    'cashIn' | 'cashOut' | 'netCashFlow' | 'receivables' | 'payables' | 'operationalBalance' | 'pendingReconciliation'
  >> = {},
  storeScope?: Pick<StorePerformance, 'businessSegmentName' | 'unitType'>
): StorePerformance {
  const totalRevenue = kpis.totalRevenue || 0;
  const totalProfit = kpis.totalProfit || 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Calcular crescimento vs período anterior
  const revenueGrowth = previousKpis
    ? ((totalRevenue - (previousKpis.totalRevenue || 0)) / (previousKpis.totalRevenue || 1)) * 100
    : 0;

  const profitGrowth = previousKpis
    ? ((totalProfit - (previousKpis.totalProfit || 0)) / (previousKpis.totalProfit || 1)) * 100
    : 0;

  // Calcular eficiência
  let efficiency: 'high' | 'medium' | 'low' = 'medium';
  if (profitMargin >= 20 && revenueGrowth > 0) {
    efficiency = 'high';
  } else if (profitMargin < 10 || revenueGrowth < -5) {
    efficiency = 'low';
  }

  return {
    storeId,
    storeName,
    businessSegmentName: storeScope?.businessSegmentName,
    unitType: storeScope?.unitType,
    rank: 0, // Será atualizado após ranking
    metrics: {
      totalRevenue,
      totalProfit,
      profitMargin,
      transactionCount: kpis.totalTransactions,
      avgTransactionValue: kpis.avgTransactionValue || 0,
      avgMargin: kpis.avgMargin || 0,
      totalUnits: kpis.totalUnits,
      productCount,
      inventoryValue,
      cashIn: financialMetrics.cashIn || 0,
      cashOut: financialMetrics.cashOut || 0,
      netCashFlow: financialMetrics.netCashFlow || 0,
      receivables: financialMetrics.receivables || 0,
      payables: financialMetrics.payables || 0,
      operationalBalance: financialMetrics.operationalBalance || 0,
      pendingReconciliation: financialMetrics.pendingReconciliation || 0,
    },
    trends: {
      revenueGrowth,
      profitGrowth,
      efficiency,
    },
  };
}

/**
 * Preparar comparação multi-loja
 */
export function prepareMultiStoreComparison(
  stores: StorePerformance[],
  period: { from: string; to: string; label: string }
): MultiStoreComparison {
  // Ranking por receita
  const ranked = stores
    .sort((a, b) => b.metrics.totalRevenue - a.metrics.totalRevenue)
    .map((store, idx) => ({ ...store, rank: idx + 1 }));

  // Consolidado
  const consolidated = {
    totalRevenue: ranked.reduce((sum, s) => sum + s.metrics.totalRevenue, 0),
    totalProfit: ranked.reduce((sum, s) => sum + s.metrics.totalProfit, 0),
    totalTransactions: ranked.reduce((sum, s) => sum + s.metrics.transactionCount, 0),
    totalUnits: ranked.reduce((sum, s) => sum + s.metrics.totalUnits, 0),
    avgMargin: ranked.length > 0
      ? ranked.reduce((sum, s) => sum + s.metrics.avgMargin, 0) / ranked.length
      : 0,
    cashIn: ranked.reduce((sum, s) => sum + s.metrics.cashIn, 0),
    cashOut: ranked.reduce((sum, s) => sum + s.metrics.cashOut, 0),
    netCashFlow: ranked.reduce((sum, s) => sum + s.metrics.netCashFlow, 0),
    receivables: ranked.reduce((sum, s) => sum + s.metrics.receivables, 0),
    payables: ranked.reduce((sum, s) => sum + s.metrics.payables, 0),
    operationalBalance: ranked.reduce((sum, s) => sum + s.metrics.operationalBalance, 0),
    pendingReconciliation: ranked.reduce((sum, s) => sum + s.metrics.pendingReconciliation, 0),
    storeCount: ranked.length,
  };

  // Insights
  const bestPerformer = ranked[0] || null;
  const worstPerformer = ranked[ranked.length - 1] || null;

  const averageMetrics = {
    avgRevenue: consolidated.totalRevenue / Math.max(1, ranked.length),
    avgMargin: consolidated.avgMargin,
    avgTransactionValue: ranked.length > 0
      ? ranked.reduce((sum, s) => sum + s.metrics.avgTransactionValue, 0) / ranked.length
      : 0,
  };

  return {
    period,
    timestamp: new Date().toISOString(),
    stores: ranked,
    consolidated,
    insights: {
      bestPerformer,
      worstPerformer,
      averageMetrics,
    },
  };
}

/**
 * Calcular diferenças percentuais
 */
export function calculatePercentageDifference(value: number, average: number): number {
  if (average === 0) return 0;
  return ((value - average) / average) * 100;
}

/**
 * Obter cor de desempenho
 */
export function getPerformanceColor(efficiency: 'high' | 'medium' | 'low'): {
  bg: string;
  text: string;
  badge: string;
} {
  const colors = {
    high: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-900 dark:text-emerald-100',
      badge: 'bg-emerald-600 text-white',
    },
    medium: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-900 dark:text-amber-100',
      badge: 'bg-amber-600 text-white',
    },
    low: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-900 dark:text-red-100',
      badge: 'bg-red-600 text-white',
    },
  };

  return colors[efficiency];
}

/**
 * Gerar recomendações por loja
 */
export function generateStoreRecommendations(
  store: StorePerformance,
  averageMargin: number
): string[] {
  const recommendations: string[] = [];

  if (store.metrics.avgMargin < averageMargin - 5) {
    recommendations.push('Considere revisar estratégia de preço (margem abaixo da média)');
  }

  if (store.metrics.inventoryValue > store.metrics.totalRevenue * 2) {
    recommendations.push('Stock muito elevado - considere promoções ou redução de compras');
  }

  if (store.metrics.avgTransactionValue < 5000) {
    recommendations.push('Ticket médio baixo - explorar upselling');
  }

  if (store.trends.revenueGrowth < -10) {
    recommendations.push('Queda de receita detectada - investigar causas');
  }

  if (store.metrics.pendingReconciliation > 0) {
    recommendations.push('Existem movimentos financeiros pendentes de conciliação');
  }

  if (store.metrics.payables > store.metrics.receivables + store.metrics.netCashFlow) {
    recommendations.push('Contas a pagar acima da folga financeira - rever pagamentos e cobranças');
  }

  return recommendations;
}
