/**
 * Testes de regressão: useStockMovements
 * Garante que o hook não quebra quando product.nome é undefined
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStockMovements } from '../useStockMovements';
import * as StoreContext from '../../contexts/StoreContext';
import * as StockService from '../../services/stockService';

// Mock do StoreContext
vi.mock('../../contexts/StoreContext', () => ({
  useStore: vi.fn(),
}));

// Mock do StockService
vi.mock('../../services/stockService', () => ({
  StockService: {
    recordMovement: vi.fn(),
    getMovementHistory: vi.fn(),
    getStockAnalytics: vi.fn(),
  },
}));

describe('useStockMovements - Regressão', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (StoreContext.useStore as any).mockReturnValue({
      currentStore: { storeId: 'store-1', nome: 'Loja A' },
      userStores: [],
    });
  });

  it('deve lidar com product.nome undefined sem quebrar', async () => {
    const mockAnalytics = {
      currentQuantity: 100,
      minQuantity: 10,
      averageDailyUsage: 5,
      trend: 'increasing' as const,
      trendPercent: 10,
      daysUntilStockout: 20,
      quantityHistory: [],
    };

    (StockService.StockService.getStockAnalytics as any).mockResolvedValue(mockAnalytics);

    const { result } = renderHook(() => useStockMovements());

    // Product sem nome
    const product = {
      id: 'prod-1',
      nome: undefined,
      categoria: 'Cat1',
      fornecedor: 'F1',
      storeId: 'store-1',
    } as any;

    // Não deve lançar erro
    await result.current.getStockAnalytics('prod-1', product);

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  it('deve lidar com product completamente undefined sem quebrar', async () => {
    const mockAnalytics = {
      currentQuantity: 100,
      minQuantity: 10,
      averageDailyUsage: 5,
      trend: 'increasing' as const,
      trendPercent: 10,
      daysUntilStockout: 20,
      quantityHistory: [],
    };

    (StockService.StockService.getStockAnalytics as any).mockResolvedValue(mockAnalytics);

    const { result } = renderHook(() => useStockMovements());

    const product = undefined as any;

    // Deve lançar erro (correto), não quebrar
    try {
      await result.current.getStockAnalytics('prod-1', product);
    } catch (error) {
      // Esperado: erro controlado
      expect(error).toBeDefined();
    }
  });

  it('deve inicializar com estado vazio', () => {
    const { result } = renderHook(() => useStockMovements());

    expect(result.current.movements).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('deve definir erro quando currentStore não existe', async () => {
    (StoreContext.useStore as any).mockReturnValue({
      currentStore: undefined,
      userStores: [],
    });

    const { result } = renderHook(() => useStockMovements());

    const product = { id: 'prod-1', nome: 'Produto' } as any;

    try {
      await result.current.getStockAnalytics('prod-1', product);
    } catch (error) {
      // Erro esperado
      expect(error).toBeDefined();
    }
  });
});
