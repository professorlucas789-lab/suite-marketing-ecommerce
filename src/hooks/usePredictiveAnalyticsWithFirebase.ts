/**
 * Hook React para Análise Preditiva com Firestore
 * FASE 7: Integração com Firebase em Tempo Real
 *
 * Combina análise local com persistência e listeners do Firestore
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Unsubscribe } from 'firebase/firestore';
import {
  DemandForecast,
  ProductTrendAnalysis,
  AutoReorderRecommendation,
  ExecutiveDashboard,
} from '../types/analytics';
import { PredictiveAnalyticsFirebaseService } from '../services/predictiveAnalyticsFirebaseService';
import { PredictiveAnalyticsService } from '../services/predictiveAnalyticsService';
import { Product, Sale } from '../types/store';

interface PredictiveAnalyticsWithFirebaseState {
  // Dados carregados do Firebase
  firebaseForecasts: DemandForecast[];
  firebaseAnomalies: any[];
  firebaseReorders: AutoReorderRecommendation[];
  firebaseDashboard: ExecutiveDashboard | null;

  // Dados calculados localmente
  localForecasts: DemandForecast[];
  localTrends: ProductTrendAnalysis[];

  // Estado
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
}

export function usePredictiveAnalyticsWithFirebase(
  storeId: string,
  products: Product[],
  sales: Sale[],
  enableLocalAnalysis: boolean = true,
  enableFirebaseSync: boolean = true
) {
  const [state, setState] = useState<PredictiveAnalyticsWithFirebaseState>({
    firebaseForecasts: [],
    firebaseAnomalies: [],
    firebaseReorders: [],
    firebaseDashboard: null,
    localForecasts: [],
    localTrends: [],
    isLoading: false,
    error: null,
    lastSync: null,
  });

  // Referências para cleanup
  const unsubscribeRef = useRef<Unsubscribe[]>([]);

  /**
   * Executar análise local
   */
  const runLocalAnalysis = useCallback(async () => {
    if (!enableLocalAnalysis || products.length === 0) return;

    try {
      const aggregateByProduct = new Map<string, Sale[]>();
      sales.forEach((sale) => {
        if (!aggregateByProduct.has(sale.productId)) {
          aggregateByProduct.set(sale.productId, []);
        }
        aggregateByProduct.get(sale.productId)!.push(sale);
      });

      const forecasts: DemandForecast[] = [];
      const trends: ProductTrendAnalysis[] = [];

      for (const product of products) {
        const productSales = aggregateByProduct.get(product.id) || [];

        if (productSales.length >= 5) {
          try {
            const forecast = PredictiveAnalyticsService.forecastDemandExponentialSmoothing(
              product.id,
              storeId,
              productSales as any,
              7
            );
            forecasts.push(forecast);

            const trend = PredictiveAnalyticsService.analyzeTrends(
              product.id,
              storeId,
              product,
              productSales as any,
              sales as any
            );
            trends.push(trend);
          } catch (err) {
            console.warn(`Erro ao analisar produto ${product.nome}:`, err);
          }
        }
      }

      // Salvar forecasts no Firebase
      if (enableFirebaseSync && forecasts.length > 0) {
        try {
          await PredictiveAnalyticsFirebaseService.saveForecastsBatch(storeId, forecasts);
        } catch (err) {
          console.error('Erro ao salvar forecasts no Firebase:', err);
        }
      }

      setState((prev) => ({
        ...prev,
        localForecasts: forecasts,
        localTrends: trends,
        lastSync: new Date(),
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Erro ao executar análise local',
      }));
    }
  }, [storeId, products, sales, enableLocalAnalysis, enableFirebaseSync]);

  /**
   * Configurar listeners do Firebase
   */
  useEffect(() => {
    if (!enableFirebaseSync) return;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Listener para previsões
      const unsubForecasts = PredictiveAnalyticsFirebaseService.listenForecasts(
        storeId,
        (forecasts) => {
          setState((prev) => ({
            ...prev,
            firebaseForecasts: forecasts,
            isLoading: false,
          }));
        },
        (error) => {
          setState((prev) => ({
            ...prev,
            error: error.message,
            isLoading: false,
          }));
        }
      );

      // Listener para anomalias
      const unsubAnomalies = PredictiveAnalyticsFirebaseService.listenAnomalies(
        storeId,
        (anomalies) => {
          setState((prev) => ({
            ...prev,
            firebaseAnomalies: anomalies,
          }));
        }
      );

      // Listener para dashboard
      const unsubDashboard = PredictiveAnalyticsFirebaseService.listenDashboard(
        storeId,
        (dashboard) => {
          setState((prev) => ({
            ...prev,
            firebaseDashboard: dashboard,
          }));
        }
      );

      unsubscribeRef.current = [unsubForecasts, unsubAnomalies, unsubDashboard];

      return () => {
        unsubscribeRef.current.forEach((unsub) => unsub?.());
      };
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Erro ao configurar listeners',
        isLoading: false,
      }));
    }
  }, [storeId, enableFirebaseSync]);

  /**
   * Executar análise ao montar ou quando dados mudarem
   */
  useEffect(() => {
    if (enableLocalAnalysis && products.length > 0) {
      runLocalAnalysis();
    }
  }, [enableLocalAnalysis, products.length, runLocalAnalysis]);

  /**
   * Reconhecer anomalia e salvar no Firebase
   */
  const acknowledgeAnomaly = useCallback(
    async (anomalyId: string, notes?: string) => {
      try {
        await PredictiveAnalyticsFirebaseService.acknowledgeAnomaly(
          storeId,
          anomalyId,
          notes
        );
        setState((prev) => ({
          ...prev,
          firebaseAnomalies: prev.firebaseAnomalies.filter((a) => a.id !== anomalyId),
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Erro ao reconhecer anomalia',
        }));
      }
    },
    [storeId]
  );

  /**
   * Marcar reabastecimento como implementado
   */
  const markReorderAsImplemented = useCallback(
    async (reorderId: string, implementedQuantity: number) => {
      try {
        await PredictiveAnalyticsFirebaseService.markReorderAsImplemented(
          storeId,
          reorderId,
          implementedQuantity
        );
        setState((prev) => ({
          ...prev,
          firebaseReorders: prev.firebaseReorders.filter((r) => r.id !== reorderId),
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Erro ao marcar reabastecimento',
        }));
      }
    },
    [storeId]
  );

  /**
   * Forçar sincronização com Firebase
   */
  const syncWithFirebase = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await runLocalAnalysis();
      setState((prev) => ({
        ...prev,
        isLoading: false,
        lastSync: new Date(),
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Erro ao sincronizar',
        isLoading: false,
      }));
    }
  }, [runLocalAnalysis]);

  /**
   * Cleanup ao desmontar
   */
  useEffect(() => {
    return () => {
      unsubscribeRef.current.forEach((unsub) => unsub?.());
    };
  }, []);

  // Combinar dados (Firebase tem prioridade para dados persistidos)
  const allForecasts = state.firebaseForecasts.length > 0 ? state.firebaseForecasts : state.localForecasts;
  const urgentReorders = state.firebaseReorders.filter((r) => r.recommendedUrgency !== 'planned');

  return {
    // Dados
    forecasts: allForecasts,
    trends: state.localTrends,
    anomalies: state.firebaseAnomalies,
    reorders: state.firebaseReorders,
    dashboard: state.firebaseDashboard,

    // Estado
    isLoading: state.isLoading,
    error: state.error,
    lastSync: state.lastSync,

    // Ações
    runLocalAnalysis,
    syncWithFirebase,
    acknowledgeAnomaly,
    markReorderAsImplemented,

    // Filtros
    getUrgentReorders: () => urgentReorders,
    getForecastForProduct: (productId: string) =>
      allForecasts.find((f) => f.productId === productId),
    getTrendForProduct: (productId: string) =>
      state.localTrends.find((t) => t.productId === productId),
  };
}
