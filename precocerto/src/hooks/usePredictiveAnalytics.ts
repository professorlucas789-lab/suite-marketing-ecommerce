/**
 * Hook: Predictive Analytics
 * FASE 6: Machine Learning
 *
 * Fornece interface reativa para análise preditiva e detecção de anomalias
 */

import { useState, useCallback } from 'react';
import {
  PredictiveAnalyticsService,
  SalesDataPoint,
  DemandForecast,
  AnomalyAlert,
} from '../services/predictiveAnalyticsService';

export interface PredictiveSummary {
  totalProducts: number;
  highRiskCount: number;
  recommendations: string[];
}

export function usePredictiveAnalytics() {
  const [forecasts, setForecasts] = useState<Map<string, DemandForecast>>(new Map());
  const [anomalies, setAnomalies] = useState<Map<string, AnomalyAlert[]>>(new Map());
  const [summary, setSummary] = useState<PredictiveSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const forecastDemand = useCallback(
    (
      productId: string,
      productName: string,
      historicalData: SalesDataPoint[],
      forecastDays: number = 7
    ): DemandForecast => {
      try {
        const forecast = PredictiveAnalyticsService.forecastDemand(
          productId,
          productName,
          historicalData,
          forecastDays
        );

        setForecasts((prev) => new Map(prev).set(productId, forecast));
        setError(null);

        return forecast;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao prever demanda';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  const detectAnomalies = useCallback(
    (
      productId: string,
      productName: string,
      historicalData: SalesDataPoint[],
      threshold: number = 2.5
    ): AnomalyAlert[] => {
      try {
        const alerts = PredictiveAnalyticsService.detectAnomalies(
          productId,
          productName,
          historicalData,
          threshold
        );

        setAnomalies((prev) => new Map(prev).set(productId, alerts));
        setError(null);

        return alerts;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao detectar anomalias';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  const generatePredictiveSummary = useCallback(
    (products: Array<{ id: string; name: string; data: SalesDataPoint[] }>) => {
      try {
        setIsLoading(true);

        const generatedSummary = PredictiveAnalyticsService.generatePredictiveSummary(
          products
        );

        setSummary(generatedSummary);
        setError(null);

        return generatedSummary;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar resumo';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const analyzeProduct = useCallback(
    (
      productId: string,
      productName: string,
      historicalData: SalesDataPoint[],
      forecastDays: number = 7
    ) => {
      try {
        setIsLoading(true);
        setError(null);

        // Prever demanda
        const forecast = forecastDemand(productId, productName, historicalData, forecastDays);

        // Detectar anomalias
        const alerts = detectAnomalies(productId, productName, historicalData);

        return {
          forecast,
          anomalies: alerts,
          hasAnomalies: alerts.length > 0,
          riskLevel: forecast.recommendation.riskLevel,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao analisar produto';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [forecastDemand, detectAnomalies]
  );

  const analyzeMultipleProducts = useCallback(
    async (
      products: Array<{ id: string; name: string; data: SalesDataPoint[] }>,
      forecastDays: number = 7
    ) => {
      try {
        setIsLoading(true);
        setError(null);

        const results = new Map();

        for (const product of products) {
          try {
            const forecast = forecastDemand(
              product.id,
              product.name,
              product.data,
              forecastDays
            );
            const alerts = detectAnomalies(
              product.id,
              product.name,
              product.data
            );

            results.set(product.id, {
              forecast,
              anomalies: alerts,
              hasAnomalies: alerts.length > 0,
            });
          } catch (productError) {
            console.warn(`Erro ao analisar produto ${product.id}:`, productError);
          }
        }

        // Gerar resumo
        const generatedSummary = generatePredictiveSummary(products);

        return {
          results,
          summary: generatedSummary,
          successCount: results.size,
          totalCount: products.length,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao analisar produtos';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [forecastDemand, detectAnomalies, generatePredictiveSummary]
  );

  const getForecast = useCallback(
    (productId: string): DemandForecast | undefined => {
      return forecasts.get(productId);
    },
    [forecasts]
  );

  const getAnomalies = useCallback(
    (productId: string): AnomalyAlert[] | undefined => {
      return anomalies.get(productId);
    },
    [anomalies]
  );

  const getCriticalAnomalies = useCallback((): AnomalyAlert[] => {
    const critical: AnomalyAlert[] = [];

    anomalies.forEach((alerts) => {
      critical.push(...alerts.filter((a) => a.severity === 'high'));
    });

    return critical.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [anomalies]);

  const getHighRiskProducts = useCallback((): Array<{
    id: string;
    name: string;
    riskLevel: string;
    trend: string;
  }> => {
    const highRisk: Array<{
      id: string;
      name: string;
      riskLevel: string;
      trend: string;
    }> = [];

    forecasts.forEach((forecast) => {
      if (forecast.recommendation.riskLevel === 'high') {
        highRisk.push({
          id: forecast.productId,
          name: forecast.productName,
          riskLevel: forecast.recommendation.riskLevel,
          trend: forecast.trend,
        });
      }
    });

    return highRisk;
  }, [forecasts]);

  const clearCache = useCallback(() => {
    setForecasts(new Map());
    setAnomalies(new Map());
    setSummary(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    forecasts,
    anomalies,
    summary,
    isLoading,
    error,

    // Análises simples
    forecastDemand,
    detectAnomalies,
    generatePredictiveSummary,

    // Análises compostas
    analyzeProduct,
    analyzeMultipleProducts,

    // Getters
    getForecast,
    getAnomalies,
    getCriticalAnomalies,
    getHighRiskProducts,

    // Cache management
    clearCache,
    clearError,
  };
}
