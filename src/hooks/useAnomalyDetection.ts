/**
 * Hook React para Detecção de Anomalias
 * FASE 5-6: Alertas de Padrões Anormais
 *
 * Monitora vendas para identificar comportamentos inesperados
 * com padrão de hook [data, isLoading, error, actions]
 */

import { useState, useEffect, useCallback } from 'react';
import { SalesAnomaly } from '../types/analytics';
import { AnomalyDetectionService } from '../services/anomalyDetectionService';
import { Sale, Product } from '../types/store';

interface AnomalyDetectionState {
  anomalies: SalesAnomaly[];
  criticalAnomalies: SalesAnomaly[];
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

export function useAnomalyDetection(
  storeId: string,
  sales: Sale[],
  products: Product[],
  enabled: boolean = true,
  historicalDaysToConsider: number = 30
) {
  const [state, setState] = useState<AnomalyDetectionState>({
    anomalies: [],
    criticalAnomalies: [],
    isLoading: false,
    error: null,
    lastUpdate: null,
  });

  /**
   * Executar detecção de anomalias
   */
  const detectAnomalies = useCallback(async () => {
    if (!enabled || sales.length === 0) {
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const productsMap = new Map(products.map((p) => [p.id, p]));

      // Filtrar vendas recentes (últimos N dias)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - historicalDaysToConsider);
      const cutoffISOString = cutoffDate.toISOString().split('T')[0];

      const recentSales = sales.filter((s) => s.date >= cutoffISOString);
      const historicalSales = sales.filter((s) => s.date < cutoffISOString);

      if (recentSales.length === 0) {
        setState((prev) => ({ ...prev, isLoading: false, anomalies: [] }));
        return;
      }

      // Detectar anomalias
      const anomalies = AnomalyDetectionService.detectMultipleAnomalies(
        recentSales,
        productsMap,
        historicalSales,
        [] // TODO: Passar dados históricos agregados
      );

      // Separar por severidade
      const criticalAnomalies = anomalies.filter((a) => a.severity === 'CRITICAL');

      setState({
        anomalies,
        criticalAnomalies,
        isLoading: false,
        error: null,
        lastUpdate: new Date(),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Erro ao detectar anomalias',
      }));
    }
  }, [storeId, sales, products, enabled, historicalDaysToConsider]);

  /**
   * Executar detecção ao montar ou quando dados mudarem
   */
  useEffect(() => {
    if (enabled && sales.length > 0) {
      detectAnomalies();
    }
  }, [enabled, sales.length, detectAnomalies]);

  /**
   * Reconhecer/resolver uma anomalia
   */
  const acknowledgeAnomaly = useCallback((anomalyId: string, notes?: string) => {
    setState((prev) => ({
      ...prev,
      anomalies: prev.anomalies.map((a) =>
        a.id === anomalyId
          ? {
              ...a,
              acknowledged: true,
              acknowledgedAt: new Date().toISOString(),
              notes,
            }
          : a
      ),
      criticalAnomalies: prev.criticalAnomalies.filter((a) => a.id !== anomalyId),
    }));

    // TODO: Salvar em Firestore
  }, []);

  /**
   * Filtrar anomalias por tipo
   */
  const filterByType = useCallback(
    (type: SalesAnomaly['type']) => state.anomalies.filter((a) => a.type === type),
    [state.anomalies]
  );

  /**
   * Filtrar anomalias por produto
   */
  const filterByProduct = useCallback(
    (productId: string) => state.anomalies.filter((a) => a.productId === productId),
    [state.anomalies]
  );

  /**
   * Filtrar anomalias não reconhecidas
   */
  const getUnacknowledgedAnomalies = useCallback(
    () => state.anomalies.filter((a) => !a.acknowledged),
    [state.anomalies]
  );

  /**
   * Contar anomalias por tipo
   */
  const countByType = useCallback(() => {
    const counts = new Map<string, number>();
    state.anomalies.forEach((a) => {
      counts.set(a.type, (counts.get(a.type) || 0) + 1);
    });
    return Object.fromEntries(counts);
  }, [state.anomalies]);

  /**
   * Obter anomalias para um período específico
   */
  const filterByDateRange = useCallback(
    (startDate: string, endDate: string) =>
      state.anomalies.filter(
        (a) =>
          new Date(a.date).getTime() >= new Date(startDate).getTime() &&
          new Date(a.date).getTime() <= new Date(endDate).getTime()
      ),
    [state.anomalies]
  );

  return {
    // Estado
    anomalies: state.anomalies,
    criticalAnomalies: state.criticalAnomalies,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdate: state.lastUpdate,

    // Ações
    detectAnomalies,
    acknowledgeAnomaly,

    // Filtros
    filterByType,
    filterByProduct,
    getUnacknowledgedAnomalies,
    filterByDateRange,

    // Análises
    countByType,
  };
}
