/**
 * Hook: useStockMovements
 * Gerencia movimentações de stock
 * Padrão: [data, loading, error, actions]
 */

import { useState, useCallback, useEffect } from 'react';
import { StockMovement, StockMovementHistory } from '../types/inventory';
import { StockService } from '../services/stockService';

interface UseStockMovementsState {
  history: StockMovementHistory | null;
  loading: boolean;
  error: string | null;
}

interface UseStockMovementsActions {
  recordMovement: (
    movement: Omit<StockMovement, 'id' | 'timestamp'>
  ) => Promise<StockMovement>;
  loadHistory: (productId?: string, limit?: number) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useStockMovements(
  storeId: string,
  productId?: string
): [UseStockMovementsState, UseStockMovementsActions] {
  const [state, setState] = useState<UseStockMovementsState>({
    history: null,
    loading: true,
    error: null,
  });

  /**
   * Carregar histórico de movimentações
   */
  const loadHistory = useCallback(
    async (pid?: string, limit?: number) => {
      if (!storeId) {
        setState({
          history: null,
          loading: false,
          error: 'storeId não fornecido',
        });
        return;
      }

      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const history = await StockService.getMovementHistory(storeId, {
          productId: pid || productId,
          limit: limit || 50,
        });

        setState({
          history,
          loading: false,
          error: null,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Erro ao carregar histórico de movimentações';

        setState({
          history: null,
          loading: false,
          error: errorMessage,
        });
      }
    },
    [storeId, productId]
  );

  /**
   * Registar nova movimentação
   */
  const recordMovement = useCallback(
    async (movement: Omit<StockMovement, 'id' | 'timestamp'>) => {
      try {
        const recorded = await StockService.recordMovement(movement);
        // Recarregar histórico após novo movimento
        await loadHistory();
        return recorded;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Erro ao registar movimentação';

        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));

        throw error;
      }
    },
    [loadHistory]
  );

  /**
   * Recarregar histórico
   */
  const refetch = useCallback(async () => {
    await loadHistory();
  }, [loadHistory]);

  // Carregar histórico ao montar ou quando productId muda
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return [
    state,
    {
      recordMovement,
      loadHistory,
      refetch,
    },
  ];
}

/**
 * Hook: useStockAnalytics
 * Análise de tendências e previsões
 */
export function useStockAnalytics(storeId: string, productId: string) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    if (!storeId || !productId) {
      setError('storeId ou productId não fornecido');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await StockService.getStockAnalytics(storeId, productId);
      setAnalytics(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao carregar analytics';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [storeId, productId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return { analytics, loading, error, refetch: loadAnalytics };
}
