/**
 * useStockMovements Hook
 * Gerenciar movimentações de stock
 * Padrão: [data, loading, error, actions]
 */

import { useState, useCallback, useEffect } from 'react';
import {
  recordStockMovement,
  getStockHistory,
  calculateStockTrend,
} from '../services/stockService';
import { StockMovement, StockTrend } from '../types/inventory';

interface UseStockMovementsOptions {
  storeId?: string;
  productId?: string;
  autoFetch?: boolean;
}

export function useStockMovements(options: UseStockMovementsOptions = {}) {
  const { storeId = '', productId, autoFetch = true } = options;

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar histórico
  const fetchHistory = useCallback(async () => {
    if (!storeId) return;

    try {
      setLoading(true);
      setError(null);

      const history = await getStockHistory(storeId, {
        productId,
        limit: 100,
      });

      setMovements(history);
      console.log(`✅ [useStockMovements] ${history.length} movimentos carregados`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar histórico';
      setError(message);
      console.error('❌ [useStockMovements] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [storeId, productId]);

  // Auto-fetch ao montar
  useEffect(() => {
    if (autoFetch && storeId) {
      fetchHistory();
    }
  }, [storeId, productId, autoFetch, fetchHistory]);

  // Registar nova movimentação
  const recordMovement = useCallback(
    async (movement: Omit<StockMovement, 'id' | 'timestamp'>) => {
      try {
        setError(null);
        const newMovement = await recordStockMovement(movement);
        setMovements([newMovement, ...movements]);
        console.log('✅ [useStockMovements] Movimentação registada:', newMovement.id);
        return newMovement;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao registar movimento';
        setError(message);
        console.error('❌ [useStockMovements] Erro:', err);
        return null;
      }
    },
    [movements]
  );

  // Limpar
  const clearMovements = useCallback(() => {
    setMovements([]);
    setError(null);
  }, []);

  return {
    movements,
    loading,
    error,
    recordMovement,
    fetchHistory,
    clearMovements,
  };
}

/**
 * Hook para tendência de stock
 */
export function useStockTrend(
  storeId: string,
  productId: string,
  days: number = 30
) {
  const [trend, setTrend] = useState<StockTrend | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId || !productId) return;

    const fetchTrend = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await calculateStockTrend(storeId, productId, days);
        setTrend(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao calcular tendência';
        setError(message);
        console.error('❌ [useStockTrend] Erro:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrend();
  }, [storeId, productId, days]);

  return { trend, loading, error };
}
