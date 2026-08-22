/**
 * Hook: useStockAlerts
 * Monitora e gerencia alertas de stock baixo
 * Padrão: [data, loading, error, actions]
 */

import { useState, useCallback, useEffect } from 'react';
import { StockAlert } from '../types/inventory';
import { StockService } from '../services/stockService';

interface UseStockAlertsState {
  alerts: StockAlert[];
  criticalCount: number;
  warningCount: number;
  loading: boolean;
  error: string | null;
}

interface UseStockAlertsActions {
  checkAlerts: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useStockAlerts(
  storeId: string
): [UseStockAlertsState, UseStockAlertsActions] {
  const [state, setState] = useState<UseStockAlertsState>({
    alerts: [],
    criticalCount: 0,
    warningCount: 0,
    loading: true,
    error: null,
  });

  /**
   * Verificar alertas de stock
   */
  const checkAlerts = useCallback(async () => {
    if (!storeId) {
      setState({
        alerts: [],
        criticalCount: 0,
        warningCount: 0,
        loading: false,
        error: 'storeId não fornecido',
      });
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const alerts = await StockService.checkLowStockAlerts(storeId);

      const criticalCount = alerts.filter(
        (a) => a.severity === 'CRITICAL'
      ).length;
      const warningCount = alerts.filter(
        (a) => a.severity === 'WARNING'
      ).length;

      setState({
        alerts,
        criticalCount,
        warningCount,
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Erro ao verificar alertas de stock';

      setState({
        alerts: [],
        criticalCount: 0,
        warningCount: 0,
        loading: false,
        error: errorMessage,
      });
    }
  }, [storeId]);

  /**
   * Recarregar alertas
   */
  const refetch = useCallback(async () => {
    await checkAlerts();
  }, [checkAlerts]);

  // Carregar alertas ao montar
  useEffect(() => {
    checkAlerts();
  }, [checkAlerts]);

  return [
    state,
    {
      checkAlerts,
      refetch,
    },
  ];
}

/**
 * Hook: useReorderSuggestions
 * Gera recomendações de reabastecimento
 */
export function useReorderSuggestions(storeId: string) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSuggestions = useCallback(async () => {
    if (!storeId) {
      setError('storeId não fornecido');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const report = await StockService.getReorderReport(storeId);
      setSuggestions(report);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Erro ao gerar sugestões de reabastecimento';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    generateSuggestions();
  }, [generateSuggestions]);

  return {
    suggestions,
    loading,
    error,
    refetch: generateSuggestions,
  };
}
