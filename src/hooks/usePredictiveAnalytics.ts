/**
 * Hook React para Análise Preditiva
 * FASE 5-6: Previsão de Demanda
 *
 * Fornece acesso a previsões, tendências e recomendações
 * com padrão de hook [data, isLoading, error, actions]
 */

import { useState, useEffect, useCallback } from 'react';
import {
  DemandForecast,
  ProductTrendAnalysis,
  AutoReorderRecommendation,
  ExecutiveDashboard,
} from '../types/analytics';
import { PredictiveAnalyticsService } from '../services/predictiveAnalyticsService';
import { Product, Sale } from '../types/store';

interface PredictiveAnalyticsState {
  forecasts: DemandForecast[];
  trends: ProductTrendAnalysis[];
  reorders: AutoReorderRecommendation[];
  dashboard: ExecutiveDashboard | null;
  isLoading: boolean;
  error: string | null;
}

export function usePredictiveAnalytics(
  storeId: string,
  products: Product[],
  sales: Sale[],
  enabled: boolean = true
) {
  const [state, setState] = useState<PredictiveAnalyticsState>({
    forecasts: [],
    trends: [],
    reorders: [],
    dashboard: null,
    isLoading: false,
    error: null,
  });

  /**
   * Executar análise preditiva completa
   */
  const runAnalysis = useCallback(async () => {
    if (!enabled || products.length === 0 || sales.length === 0) {
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Agregar vendas por produto e dia
      const aggregateByProduct = new Map<string, Sale[]>();
      sales.forEach((sale) => {
        if (!aggregateByProduct.has(sale.productId)) {
          aggregateByProduct.set(sale.productId, []);
        }
        aggregateByProduct.get(sale.productId)!.push(sale);
      });

      // Gerar previsões para cada produto
      const forecasts: DemandForecast[] = [];
      const trends: ProductTrendAnalysis[] = [];
      const reorders: AutoReorderRecommendation[] = [];

      for (const product of products) {
        const productSales = aggregateByProduct.get(product.id) || [];

        if (productSales.length >= 5) {
          try {
            // Previsão de demanda para os próximos 7 dias
            const forecast = PredictiveAnalyticsService.forecastDemandExponentialSmoothing(
              product.id,
              storeId,
              productSales as any, // TODO: Converter para DailySalesAggregate
              7
            );
            forecasts.push(forecast);

            // Análise de tendências
            const trend = PredictiveAnalyticsService.analyzeTrends(
              product.id,
              storeId,
              product,
              productSales as any,
              sales as any
            );
            trends.push(trend);

            // Recomendação de reabastecimento
            if (forecast && product.quantidadeDisponível !== undefined) {
              const reorder =
                PredictiveAnalyticsService.calculateAutoReorderRecommendation(
                  product.id,
                  storeId,
                  product,
                  forecast,
                  3 // Lead time padrão de 3 dias
                );
              reorders.push(reorder);
            }
          } catch (err) {
            console.warn(`Erro ao analisar produto ${product.nome}:`, err);
          }
        }
      }

      // Gerar dashboard executivo
      const dashboard = PredictiveAnalyticsService.generateExecutiveInsights(
        storeId,
        forecasts,
        trends,
        [], // Anomalias - virão de outro hook
        reorders
      );

      setState({
        forecasts,
        trends,
        reorders,
        dashboard,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Erro ao executar análise preditiva',
      }));
    }
  }, [storeId, products, sales, enabled]);

  /**
   * Executar análise ao montar ou quando dados mudarem
   */
  useEffect(() => {
    if (enabled && products.length > 0) {
      runAnalysis();
    }
  }, [enabled, products.length, runAnalysis]);

  /**
   * Obter previsão para um produto específico
   */
  const getForecastForProduct = useCallback(
    (productId: string): DemandForecast | undefined => {
      return state.forecasts.find((f) => f.productId === productId);
    },
    [state.forecasts]
  );

  /**
   * Obter tendência para um produto específico
   */
  const getTrendForProduct = useCallback(
    (productId: string): ProductTrendAnalysis | undefined => {
      return state.trends.find((t) => t.productId === productId);
    },
    [state.trends]
  );

  /**
   * Obter recomendação de reabastecimento para um produto
   */
  const getReorderForProduct = useCallback(
    (productId: string): AutoReorderRecommendation | undefined => {
      return state.reorders.find((r) => r.productId === productId);
    },
    [state.reorders]
  );

  /**
   * Filtrar recomendações por urgência
   */
  const getUrgentReorders = useCallback(
    () => state.reorders.filter((r) => r.recommendedUrgency !== 'planned'),
    [state.reorders]
  );

  /**
   * Obter produtos com tendência de crescimento
   */
  const getGrowingProducts = useCallback(
    () =>
      state.trends
        .filter((t) => t.salesTrend.direction === 'increasing')
        .sort((a, b) => b.salesTrend.percentageChange - a.salesTrend.percentageChange),
    [state.trends]
  );

  /**
   * Obter produtos em declínio
   */
  const getDeciningProducts = useCallback(
    () =>
      state.trends
        .filter((t) => t.salesTrend.direction === 'decreasing')
        .sort((a, b) => a.salesTrend.percentageChange - b.salesTrend.percentageChange),
    [state.trends]
  );

  return {
    // Estado
    forecasts: state.forecasts,
    trends: state.trends,
    reorders: state.reorders,
    dashboard: state.dashboard,
    isLoading: state.isLoading,
    error: state.error,

    // Ações
    runAnalysis,
    getForecastForProduct,
    getTrendForProduct,
    getReorderForProduct,
    getUrgentReorders,
    getGrowingProducts,
    getDeciningProducts,
  };
}
