import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductList from './ProductList';
import { Product } from '../types';

/**
 * Regressão: produtos gravados sem todos os campos de texto (cadastro em lote,
 * importação CSV ou registos antigos) não podem quebrar a Lista de Produtos.
 */
describe('ProductList - produtos com campos em falta', () => {
  const baseProduct = {
    id: 'p1',
    nome: 'Produto em Lote',
    categoria: 'Outros',
    quantidade: 10,
    custoCompra: 100,
    custoTransporte: 0,
    custoEmbalagem: 0,
    outrosCustos: 0,
    margemDesejada: 30,
    precoVendaRecomendado: 150,
    lucroEstimado: 50,
    margemReal: 33,
    roi: 50,
    createdAt: '2026-01-01T00:00:00.000Z',
  } as unknown as Product;

  const noop = vi.fn();

  const renderList = (products: Product[]) =>
    render(
      <ProductList
        products={products}
        onAddProduct={noop}
        onEditProduct={noop}
        onDeleteProduct={noop}
        onDuplicateProduct={noop}
        settings={null}
      />
    );

  it('renderiza um produto sem fornecedor em vez de quebrar', () => {
    expect(() => renderList([baseProduct])).not.toThrow();
    expect(screen.getAllByText('Produto em Lote').length).toBeGreaterThan(0);
  });

  it('renderiza um produto sem nome nem categoria', () => {
    const semNome = { ...baseProduct, id: 'p2', nome: undefined, categoria: undefined } as unknown as Product;
    expect(() => renderList([semNome])).not.toThrow();
  });
});
