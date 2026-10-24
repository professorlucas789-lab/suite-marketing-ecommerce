/**
 * Testes: SalesModule — fluxo de venda
 *
 * Cobre os defeitos que impediam a venda no ecrã:
 * - a lista de produtos estava sempre aberta e tapava a quantidade e o botão Adicionar
 * - o utilizador da venda vinha de currentUser.uid, que a sessão (documento users/{uid})
 *   não tem: a venda falhava com "Utilizador obrigatório"
 * - o stock mostrado era a quantidade do lote em vez do stock disponível
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SalesModule from './SalesModule';

const recordTransaction = vi.fn();
const alerta = vi.fn();

let utilizador: Record<string, unknown> | null;

vi.mock('../contexts/StoreContext', () => ({
  useStore: () => ({
    currentStore: { storeId: 'store-1', storeName: 'Loja Centro' },
    currentUser: utilizador,
  }),
}));

vi.mock('../hooks/useSalesTransaction', () => ({
  useSalesTransaction: () => ({
    recordTransaction: (...args: unknown[]) => recordTransaction(...args),
    isLoading: false,
    error: null,
    successMessage: null,
  }),
}));

const produtos: any[] = [
  { id: 'p1', nome: 'Paracetamol 500mg', categoria: 'Medicamentos', precoVendaRecomendado: 2.5, quantidade: 60, quantidadeDisponivel: 50 },
  { id: 'p4', nome: 'Dipirona 500mg', categoria: 'Medicamentos', precoVendaRecomendado: 1.8, quantidade: 47, quantidadeDisponivel: 40 },
];

function abrirLista() {
  fireEvent.click(screen.getByRole('button', { name: /selecione produto/i }));
}

describe('SalesModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('alert', alerta);
    // Sessão real: documento users/{uid} (id, nome, email), sem uid nem displayName
    utilizador = { id: 'user-1', nome: 'Maria Silva', email: 'maria@loja.pt' };
    recordTransaction.mockResolvedValue({ receiptNumber: 'R-1' });
  });

  it('a lista de produtos começa fechada e abre ao carregar no seletor', () => {
    render(<SalesModule products={produtos} />);

    expect(screen.queryByText('Dipirona 500mg')).toBeNull();

    abrirLista();

    expect(screen.getByText('Dipirona 500mg')).toBeTruthy();
    expect(screen.getByText('Paracetamol 500mg')).toBeTruthy();
  });

  it('mostra o preço e o stock disponível (não a quantidade do lote)', () => {
    render(<SalesModule products={produtos} />);
    abrirLista();

    expect(screen.getByText('40 stock')).toBeTruthy();   // quantidadeDisponivel, não 47 (quantidade)
    expect(screen.getByText('Kz 1.80')).toBeTruthy();
    expect(screen.queryByText('47 stock')).toBeNull();
  });

  it('escolher um produto fecha a lista e mostra a quantidade e o botão Adicionar', () => {
    render(<SalesModule products={produtos} />);
    abrirLista();

    fireEvent.click(screen.getByText('Dipirona 500mg'));

    expect(screen.queryByText('Paracetamol 500mg')).toBeNull(); // lista fechada
    expect(screen.getByPlaceholderText('Quantidade')).toBeTruthy();
    expect(screen.getByRole('button', { name: /adicionar/i })).toBeTruthy();
  });

  it('o seletor volta a fechar a lista ao ser carregado outra vez', () => {
    render(<SalesModule products={produtos} />);
    abrirLista();
    expect(screen.getByText('Paracetamol 500mg')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /selecione produto/i }));

    expect(screen.queryByText('Paracetamol 500mg')).toBeNull();
  });

  it('adicionar atualiza o total e finalizar regista a venda com o utilizador da sessão', async () => {
    render(<SalesModule products={produtos} />);
    abrirLista();
    fireEvent.click(screen.getByText('Dipirona 500mg'));

    fireEvent.change(screen.getByPlaceholderText('Quantidade'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /adicionar/i }));

    expect(screen.getAllByText('Kz 5.40').length).toBeGreaterThan(0); // 3 × 1,80

    fireEvent.click(screen.getByRole('button', { name: /finalizar venda/i }));

    await waitFor(() => expect(recordTransaction).toHaveBeenCalledTimes(1));
    expect(recordTransaction.mock.calls[0][0]).toMatchObject({
      storeId: 'store-1',
      userId: 'user-1',          // vem de currentUser.id (a sessão não tem uid)
      userName: 'Maria Silva',   // vem de currentUser.nome (a sessão não tem displayName)
      items: [{ productId: 'p4', quantity: 3, unitPrice: 1.8 }],
    });
    expect(alerta).not.toHaveBeenCalled();
  });

  it('usa o uid quando a sessão o traz (preenchido pelo StoreContext)', async () => {
    utilizador = { id: 'user-1', uid: 'uid-do-auth', nome: 'Maria Silva', email: 'maria@loja.pt' };
    render(<SalesModule products={produtos} />);
    abrirLista();
    fireEvent.click(screen.getByText('Dipirona 500mg'));
    fireEvent.change(screen.getByPlaceholderText('Quantidade'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /adicionar/i }));
    fireEvent.click(screen.getByRole('button', { name: /finalizar venda/i }));

    await waitFor(() => expect(recordTransaction).toHaveBeenCalled());
    expect(recordTransaction.mock.calls[0][0]).toMatchObject({ userId: 'uid-do-auth' });
  });

  it('adicionar sem quantidade válida avisa e não adiciona', () => {
    render(<SalesModule products={produtos} />);
    abrirLista();
    fireEvent.click(screen.getByText('Dipirona 500mg'));

    fireEvent.click(screen.getByRole('button', { name: /adicionar/i }));

    expect(alerta).toHaveBeenCalledWith('Selecione um produto e quantidade válida');
    expect(screen.queryByText('Kz 5.40')).toBeNull();
  });
});
