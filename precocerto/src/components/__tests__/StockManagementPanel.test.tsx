/**
 * Testes de regressão: StockManagementPanel
 * Garante que o componente não quebra com dados inválidos ou ausentes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import StockManagementPanel from '../StockManagementPanel';
import * as StoreContext from '../../contexts/StoreContext';

// Mock do StoreContext
vi.mock('../../contexts/StoreContext', () => ({
  useStore: vi.fn(),
}));

// Mock dos componentes filhos para evitar dependências complexas
vi.mock('../StockMovementRecorder', () => ({
  StockMovementRecorder: ({ product }: any) => (
    <div data-testid="recorder">{product?.nome || 'Sem produto'}</div>
  ),
}));

vi.mock('../StockMovementHistory', () => ({
  StockMovementHistory: () => <div data-testid="history">Histórico</div>,
}));

vi.mock('../StockAnalyticsPanel', () => ({
  StockAnalyticsPanel: ({ product }: any) => (
    <div data-testid="analytics">{product?.nome || 'Sem análise'}</div>
  ),
}));

describe('StockManagementPanel - Regressão', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar mensagem de loja não selecionada quando currentStore é undefined', () => {
    (StoreContext.useStore as any).mockReturnValue({
      currentStore: undefined,
      userStores: [],
    });

    render(<StockManagementPanel products={[]} />);

    expect(screen.getByText('Loja não selecionada')).toBeInTheDocument();
  });

  it('deve renderizar mensagem de loja não selecionada quando currentStore.storeId é undefined', () => {
    (StoreContext.useStore as any).mockReturnValue({
      currentStore: { nome: 'Loja A', storeId: undefined },
      userStores: [],
    });

    render(<StockManagementPanel products={[]} />);

    expect(screen.getByText('Loja não selecionada')).toBeInTheDocument();
  });

  it('deve renderizar mensagem de nenhum produto quando products é vazio', () => {
    (StoreContext.useStore as any).mockReturnValue({
      currentStore: { storeId: 'store-1', nome: 'Loja A' },
      userStores: [],
    });

    render(<StockManagementPanel products={[]} />);

    // Deve ter "Gestão de Estoque" como título
    expect(screen.getByText('Gestão de Estoque')).toBeInTheDocument();
    // E a mensagem de nenhum produto
    expect(screen.getByText(/Nenhum produto/i)).toBeInTheDocument();
  });

  it('deve renderizar mensagem de nenhum produto quando products é undefined', () => {
    (StoreContext.useStore as any).mockReturnValue({
      currentStore: { storeId: 'store-1', nome: 'Loja A' },
      userStores: [],
    });

    render(<StockManagementPanel products={undefined} />);

    expect(screen.getByText('Gestão de Estoque')).toBeInTheDocument();
    expect(screen.getByText(/Nenhum produto/i)).toBeInTheDocument();
  });

  it('deve renderizar mensagem de nenhum produto quando products é null', () => {
    (StoreContext.useStore as any).mockReturnValue({
      currentStore: { storeId: 'store-1', nome: 'Loja A' },
      userStores: [],
    });

    render(<StockManagementPanel products={null as any} />);

    expect(screen.getByText('Gestão de Estoque')).toBeInTheDocument();
    expect(screen.getByText(/Nenhum produto/i)).toBeInTheDocument();
  });

  it('deve filtrar produtos sem id', () => {
    (StoreContext.useStore as any).mockReturnValue({
      currentStore: { storeId: 'store-1', nome: 'Loja A' },
      userStores: [],
    });

    const products = [
      { id: 'prod-1', nome: 'Produto 1', categoria: 'Cat1', fornecedor: 'F1', storeId: 'store-1' } as any,
      { id: undefined, nome: 'Produto Sem ID', categoria: 'Cat2', fornecedor: 'F2', storeId: 'store-1' } as any,
    ];

    const { container } = render(<StockManagementPanel products={products} />);

    // Deve ter apenas um option (além do placeholder)
    const options = container.querySelectorAll('option');
    // Filtrar o option vazio (placeholder)
    const validOptions = Array.from(options).filter((o) => o.value !== '');
    expect(validOptions.length).toBe(1);
  });

  it('deve filtrar produtos com id null', () => {
    (StoreContext.useStore as any).mockReturnValue({
      currentStore: { storeId: 'store-1', nome: 'Loja A' },
      userStores: [],
    });

    const products = [
      { id: 'prod-1', nome: 'Produto 1', categoria: 'Cat1', fornecedor: 'F1', storeId: 'store-1' } as any,
      { id: null, nome: 'Produto Com ID Null', categoria: 'Cat2', fornecedor: 'F2', storeId: 'store-1' } as any,
    ];

    const { container } = render(<StockManagementPanel products={products} />);

    const options = container.querySelectorAll('option');
    const validOptions = Array.from(options).filter((o) => o.value !== '');
    expect(validOptions.length).toBe(1);
  });

  it('deve filtrar produtos undefined do array', () => {
    (StoreContext.useStore as any).mockReturnValue({
      currentStore: { storeId: 'store-1', nome: 'Loja A' },
      userStores: [],
    });

    const products = [
      { id: 'prod-1', nome: 'Produto 1', categoria: 'Cat1', fornecedor: 'F1', storeId: 'store-1' } as any,
      undefined,
      null,
    ] as any[];

    const { container } = render(<StockManagementPanel products={products} />);

    const options = container.querySelectorAll('option');
    const validOptions = Array.from(options).filter((o) => o.value !== '');
    expect(validOptions.length).toBe(1);
  });

  it('deve renderizar com produtos válidos', () => {
    (StoreContext.useStore as any).mockReturnValue({
      currentStore: { storeId: 'store-1', nome: 'Loja A' },
      userStores: [],
    });

    const products = [
      {
        id: 'prod-1',
        nome: 'Produto 1',
        categoria: 'Cat1',
        fornecedor: 'F1',
        storeId: 'store-1',
        quantidadeDisponível: 100,
      } as any,
    ];

    render(<StockManagementPanel products={products} />);

    // Deve renderizar o selector e as abas
    expect(screen.getByText('Selecione um Produto')).toBeInTheDocument();
    expect(screen.getByText('Análise')).toBeInTheDocument();
    expect(screen.getByText('Registar Movimentação')).toBeInTheDocument();
    expect(screen.getByText('Histórico')).toBeInTheDocument();
  });

  it('não deve quebrar quando selecionando abas sem produto', () => {
    (StoreContext.useStore as any).mockReturnValue({
      currentStore: { storeId: 'store-1', nome: 'Loja A' },
      userStores: [],
    });

    const { container } = render(<StockManagementPanel products={[]} />);

    // Não deve lançar erro ao renderizar
    // Verificar que contém título "Gestão de Estoque"
    expect(screen.getByText('Gestão de Estoque')).toBeInTheDocument();
    // E que não quebrou renderizando
    expect(container).toBeTruthy();
  });
});
