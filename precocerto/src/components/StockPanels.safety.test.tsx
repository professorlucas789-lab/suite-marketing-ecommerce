import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StockAnalyticsPanel } from './StockAnalyticsPanel';
import { StockMovementRecorder } from './StockMovementRecorder';
import { StockMovementHistory } from './StockMovementHistory';
import { useStockMovements } from '../hooks/useStockMovements';
import type { Product } from '../types';

vi.mock('../hooks/useStockMovements', () => ({ useStockMovements: vi.fn() }));
vi.mock('../contexts/StoreContext', () => ({
  useStore: () => ({ currentStore: { storeId: 'store-1' } }),
}));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'user-1' } }) }));

const product = { id: 'product-1', nome: 'Produto teste', quantidadeDisponivel: 8 } as Product;
const getStockAnalytics = vi.fn();
const getMovementHistory = vi.fn();

describe('Stock panels with incomplete data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStockAnalytics.mockResolvedValue({
      productId: product.id, productName: product.nome, totalValue: 0,
      trend: 'stable', quantityHistory: undefined,
    });
    vi.mocked(useStockMovements).mockReturnValue({
      movements: [], isLoading: false, error: null, clearError: vi.fn(),
      recordMovement: vi.fn(), getMovementHistory, getStockAnalytics,
    });
  });

  it('keeps analytics hooks stable when a product loads and is removed', async () => {
    const { rerender } = render(<StockAnalyticsPanel />);
    expect(getStockAnalytics).not.toHaveBeenCalled();
    rerender(<StockAnalyticsPanel product={product} />);
    await waitFor(() => expect(getStockAnalytics).toHaveBeenCalledWith(product.id, product));
    await waitFor(() => expect(screen.queryByText('Erro ao calcular análise')).not.toBeInTheDocument());
    rerender(<StockAnalyticsPanel />);
    expect(screen.getByText(/Selecione um produto/)).toBeInTheDocument();
  });

  it('keeps the movement form stable when a product loads and disappears', () => {
    const { rerender, container } = render(<StockMovementRecorder />);
    expect(container.querySelector('form')).toBeNull();
    rerender(<StockMovementRecorder product={product} />);
    expect(container.querySelector('form')).not.toBeNull();
    rerender(<StockMovementRecorder />);
    expect(container.querySelector('form')).toBeNull();
  });

  it('renders incomplete history records without reading a missing id', () => {
    vi.mocked(useStockMovements).mockReturnValue({
      movements: [null, undefined, { productName: 'Produto legado' }] as any,
      isLoading: false, error: null, clearError: vi.fn(), recordMovement: vi.fn(),
      getMovementHistory, getStockAnalytics,
    });
    render(<StockMovementHistory />);
    expect(screen.getByText('Produto legado')).toBeInTheDocument();
    expect(screen.getByText('Data não registada')).toBeInTheDocument();
  });
});
