/**
 * Hook: useStockMovements
 * Gerenciar movimentações de estoque
 * FASE 2: Gestão de Estoque Automática
 */

import { useState, useCallback } from 'react';
import { StockMovement, StockMovementType, StockMovementReason, StockAnalytics } from '../types/inventory';
import { Product } from '../types';
import { StockService } from '../services/stockService';
import { useStore } from './useStore';

export interface UseStockMovementsReturn {
  // Estado
  movements: StockMovement[];
  isLoading: boolean;
  error: string | null;

  // Ações
  recordMovement: (
    productId: string,
    product: Product,
    type: StockMovementType,
    quantity: number,
    reason: StockMovementReason,
    userId: string,
    options?: {
      reference?: string;
      batchNumber?: string;
      unitCost?: number;
      notes?: string;
    }
  ) => Promise<StockMovement>;

  getMovementHistory: (filters?: any) => Promise<void>;
  getStockAnalytics: (productId: string, product: Product) => Promise<StockAnalytics>;
  clearError: () => void;
}

export function useStockMovements(): UseStockMovementsReturn {
  const { currentStore } = useStore();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Registar movimentação de stock
   */
  const recordMovement = useCallback(
    async (
      productId: string,
      product: Product,
      type: StockMovementType,
      quantity: number,
      reason: StockMovementReason,
      userId: string,
      options?: {
        reference?: string;
        batchNumber?: string;
        unitCost?: number;
        notes?: string;
      }
    ): Promise<StockMovement> => {
      if (!currentStore?.storeId) {
        throw new Error('Loja não selecionada');
      }

      try {
        setIsLoading(true);
        setError(null);

        const movement = await StockService.recordMovement(
          currentStore.storeId,
          productId,
          product,
          type,
          quantity,
          reason,
          userId,
          options
        );

        // Atualizar lista local
        setMovements((prev) => [movement, ...prev]);

        console.log(`✅ Movimento registado: ${movement.productName}`);

        return movement;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao registar movimento';
        setError(errorMessage);
        console.error('Erro ao registar movimento:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [currentStore?.storeId]
  );

  /**
   * Obter histórico de movimentações
   */
  const getMovementHistory = useCallback(
    async (filters?: any) => {
      if (!currentStore?.storeId) {
        setError('Loja não selecionada');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const history = await StockService.getMovementHistory(currentStore.storeId, filters);
        setMovements(history);

        console.log(`✅ ${history.length} movimentações carregadas`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar histórico';
        setError(errorMessage);
        console.error('Erro ao carregar histórico:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [currentStore?.storeId]
  );

  /**
   * Obter análise de stock
   */
  const getStockAnalytics = useCallback(
    async (productId: string, product: Product): Promise<StockAnalytics> => {
      if (!currentStore?.storeId) {
        throw new Error('Loja não selecionada');
      }

      try {
        setIsLoading(true);
        setError(null);

        const analytics = await StockService.getStockAnalytics(
          currentStore.storeId,
          productId,
          product
        );

        console.log(`✅ Análise de stock calculada para ${product.nome}`);

        return analytics;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao calcular análise';
        setError(errorMessage);
        console.error('Erro ao calcular análise:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [currentStore?.storeId]
  );

  /**
   * Limpar erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Estado
    movements,
    isLoading,
    error,

    // Ações
    recordMovement,
    getMovementHistory,
    getStockAnalytics,
    clearError,
  };
}
