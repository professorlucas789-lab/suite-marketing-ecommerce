/**
 * Testes: SalesHistory — anulação de recibos
 *
 * Garante que a interface anula através do serviço UNIFICADO
 * (stock em products/{id}/stock/{storeId}) e não da função antiga, que repunha
 * o stock no sítio errado e consultava sem storeId.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SalesHistory from './SalesHistory';

const cancelUnifiedSale = vi.fn();
const cancelSaleByReceipt = vi.fn();
const fetchHistory = vi.fn();

vi.mock('../services/unifiedSalesService', () => ({
  cancelUnifiedSale: (...args: unknown[]) => cancelUnifiedSale(...args),
}));

vi.mock('../services/salesService', () => ({
  cancelSaleByReceipt: (...args: unknown[]) => cancelSaleByReceipt(...args),
}));

let utilizador: { id: string; nome?: string; email?: string } | null;

vi.mock('../contexts/StoreContext', () => ({
  useStore: () => ({
    currentStore: { storeId: 'store-1', name: 'Loja 1' },
    currentUser: utilizador,
  }),
}));

const venda = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  storeId: 'store-1',
  receiptNumber: 'R-100',
  productId: `p-${id}`,
  productName: `Produto ${id}`,
  quantity: 2,
  unitPrice: 5,
  totalPrice: 10,
  totalCost: 4,
  totalProfit: 6,
  status: 'completed',
  paymentMethod: 'cash',
  timestamp: '2026-10-22T10:00:00.000Z',
  date: '2026-10-22',
  time: '10:00',
  ...extra,
});

vi.mock('../hooks/useSalesAnalytics', () => ({
  useSalesAnalytics: () => ({
    salesHistory: [venda('a'), venda('b')],
    loading: false,
    fetchHistory,
  }),
}));

function abrirAnulacao() {
  render(<SalesHistory />);
  fireEvent.click(screen.getByRole('button', { name: /anular/i }));
}

describe('SalesHistory — anulação de recibo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    utilizador = { id: 'user-1', nome: 'Maria Silva', email: 'maria@loja.pt' };
    cancelUnifiedSale.mockResolvedValue(undefined);
  });

  it('anula pelo serviço unificado com loja, recibo, utilizador, nome e motivo', async () => {
    abrirAnulacao();

    fireEvent.change(screen.getByPlaceholderText(/erro no produto/i), {
      target: { value: '  Venda em duplicado  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirmar anulação/i }));

    await waitFor(() => expect(cancelUnifiedSale).toHaveBeenCalledTimes(1));
    expect(cancelUnifiedSale).toHaveBeenCalledWith('store-1', 'R-100', 'user-1', {
      cancelledByName: 'Maria Silva',
      reason: '  Venda em duplicado  ',
    });
    expect(cancelSaleByReceipt).not.toHaveBeenCalled();
  });

  it('recarrega o histórico e fecha a janela depois de anular', async () => {
    abrirAnulacao();
    fireEvent.click(screen.getByRole('button', { name: /confirmar anulação/i }));

    await waitFor(() => expect(fetchHistory).toHaveBeenCalledTimes(2)); // carga inicial + depois de anular
    expect(fetchHistory).toHaveBeenLastCalledWith('store-1', { limit: 500 });
    await waitFor(() => expect(screen.queryByRole('button', { name: /confirmar anulação/i })).toBeNull());
  });

  it('usa o email quando o utilizador não tem nome', async () => {
    utilizador = { id: 'user-1', email: 'maria@loja.pt' };
    abrirAnulacao();
    fireEvent.click(screen.getByRole('button', { name: /confirmar anulação/i }));

    await waitFor(() => expect(cancelUnifiedSale).toHaveBeenCalled());
    expect(cancelUnifiedSale.mock.calls[0][3]).toMatchObject({ cancelledByName: 'maria@loja.pt' });
  });

  it('mostra mensagem clara quando o Firestore nega a permissão e mantém a janela aberta', async () => {
    cancelUnifiedSale.mockRejectedValue(Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }));
    abrirAnulacao();
    fireEvent.click(screen.getByRole('button', { name: /confirmar anulação/i }));

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toMatch(/Sem permissão para anular este recibo/);
    expect(alerta.textContent).toMatch(/autor da venda ou um administrador/);
    expect(screen.getByRole('button', { name: /confirmar anulação/i })).toBeTruthy();
  });

  it('mostra a mensagem do serviço noutros erros (ex.: recibo já anulado)', async () => {
    cancelUnifiedSale.mockRejectedValue(new Error('Este recibo já foi anulado'));
    abrirAnulacao();
    fireEvent.click(screen.getByRole('button', { name: /confirmar anulação/i }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/Este recibo já foi anulado/);
  });

  it('não anula sem utilizador identificado', async () => {
    utilizador = null;
    abrirAnulacao();
    fireEvent.click(screen.getByRole('button', { name: /confirmar anulação/i }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/Utilizador não identificado/);
    expect(cancelUnifiedSale).not.toHaveBeenCalled();
  });
});
