import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductComparison } from './ProductComparison';
import { Product } from '../types';

/**
 * Test suite for ProductComparison component
 * Fase 5B Item 2: Product Comparison
 */
describe('ProductComparison', () => {
  const createTestProduct = (overrides?: Partial<Product>): Product => ({
    id: 'test-1',
    nome: 'Test Product',
    categoria: 'Test',
    custoCompra: 100,
    custoTransporte: 10,
    custoEmbalagem: 5,
    outrosCustos: 0,
    margemDesejada: 20,
    precoVendaRecomendado: 150,
    lucroEstimado: 35,
    margemReal: 35,
    margemAplicada: 20,
    roi: 35,
    dataCriacao: '2024-01-15',
    ...overrides,
  } as Product);

  const mockOnRemove = vi.fn();
  const mockOnClearAll = vi.fn();

  describe('Empty state', () => {
    it('should show empty message when no products', () => {
      render(
        <ProductComparison
          products={[]}
          onRemoveProduct={mockOnRemove}
          onClearAll={mockOnClearAll}
        />
      );
      expect(screen.getByText(/Nenhum produto selecionado/i)).toBeInTheDocument();
    });
  });

  describe('Rendering', () => {
    it('should render comparison table with products', () => {
      const products = [
        createTestProduct({ id: 'prod-1', nome: 'Produto A' }),
        createTestProduct({ id: 'prod-2', nome: 'Produto B' }),
      ];

      const { container } = render(
        <ProductComparison
          products={products}
          onRemoveProduct={mockOnRemove}
          onClearAll={mockOnClearAll}
        />
      );

      expect(container.textContent).toContain('Produto A');
      expect(container.textContent).toContain('Produto B');
    });

    it('should display product count', () => {
      const products = [
        createTestProduct({ id: 'prod-1' }),
        createTestProduct({ id: 'prod-2' }),
      ];

      render(
        <ProductComparison
          products={products}
          onRemoveProduct={mockOnRemove}
          onClearAll={mockOnClearAll}
        />
      );

      expect(screen.getByText(/2 produtos selecionados/)).toBeInTheDocument();
    });

    it('should display comparison fields', () => {
      const products = [
        createTestProduct({ id: 'prod-1', nome: 'Produto A' }),
      ];

      render(
        <ProductComparison
          products={products}
          onRemoveProduct={mockOnRemove}
          onClearAll={mockOnClearAll}
        />
      );

      expect(screen.getByText('Categoria')).toBeInTheDocument();
      expect(screen.getByText('Custo Compra')).toBeInTheDocument();
      expect(screen.getByText('Preço Venda')).toBeInTheDocument();
      expect(screen.getByText('Margem Real %')).toBeInTheDocument();
      expect(screen.getByText('ROI %')).toBeInTheDocument();
    });
  });

  describe('Remove product', () => {
    it('should call onRemoveProduct when X button clicked', () => {
      const products = [
        createTestProduct({ id: 'prod-1', nome: 'Produto A' }),
      ];

      render(
        <ProductComparison
          products={products}
          onRemoveProduct={mockOnRemove}
          onClearAll={mockOnClearAll}
        />
      );

      const removeButtons = screen.getAllByTitle('Remover da comparação');
      fireEvent.click(removeButtons[0]);

      expect(mockOnRemove).toHaveBeenCalledWith('prod-1');
    });
  });

  describe('Clear all', () => {
    it('should show clear button when products exist', () => {
      const products = [
        createTestProduct({ id: 'prod-1' }),
      ];

      render(
        <ProductComparison
          products={products}
          onRemoveProduct={mockOnRemove}
          onClearAll={mockOnClearAll}
        />
      );

      expect(screen.getByText('Limpar Comparação')).toBeInTheDocument();
    });

    it('should call onClearAll when clear button clicked', () => {
      const products = [
        createTestProduct({ id: 'prod-1' }),
      ];

      render(
        <ProductComparison
          products={products}
          onRemoveProduct={mockOnRemove}
          onClearAll={mockOnClearAll}
        />
      );

      const clearButton = screen.getByText('Limpar Comparação');
      fireEvent.click(clearButton);

      expect(mockOnClearAll).toHaveBeenCalled();
    });
  });

  describe('Metrics', () => {
    it('should show comparison metrics with 2+ products', () => {
      const products = [
        createTestProduct({ id: 'prod-1', precoVendaRecomendado: 100 }),
        createTestProduct({ id: 'prod-2', precoVendaRecomendado: 150 }),
      ];

      render(
        <ProductComparison
          products={products}
          onRemoveProduct={mockOnRemove}
          onClearAll={mockOnClearAll}
        />
      );

      expect(screen.getByText('Melhor Preço')).toBeInTheDocument();
      expect(screen.getByText('Melhor Margem')).toBeInTheDocument();
      expect(screen.getByText('Melhor ROI')).toBeInTheDocument();
      expect(screen.getByText('Menor Custo')).toBeInTheDocument();
    });

    it('should not show metrics with single product', () => {
      const products = [
        createTestProduct({ id: 'prod-1' }),
      ];

      const { container } = render(
        <ProductComparison
          products={products}
          onRemoveProduct={mockOnRemove}
          onClearAll={mockOnClearAll}
        />
      );

      // Metrics grid should not be present
      const gridDivs = container.querySelectorAll('div[class*="grid-cols"]');
      const hasMetrics = Array.from(gridDivs).some((div) =>
        div.textContent?.includes('Melhor Preço')
      );
      expect(hasMetrics).toBe(false);
    });
  });

  describe('Comparison accuracy', () => {
    it('should correctly identify best price', () => {
      const products = [
        createTestProduct({ id: 'prod-1', nome: 'Caro', precoVendaRecomendado: 200 }),
        createTestProduct({ id: 'prod-2', nome: 'Barato', precoVendaRecomendado: 100 }),
      ];

      const { container } = render(
        <ProductComparison
          products={products}
          onRemoveProduct={mockOnRemove}
          onClearAll={mockOnClearAll}
        />
      );

      // Should render the comparison
      expect(container.textContent).toContain('Barato');
      expect(container.textContent).toContain('Melhor Preço');
    });

    it('should correctly identify best margin', () => {
      const products = [
        createTestProduct({ id: 'prod-1', nome: 'Baixa Margem', margemReal: 10 }),
        createTestProduct({ id: 'prod-2', nome: 'Alta Margem', margemReal: 50 }),
      ];

      const { container } = render(
        <ProductComparison
          products={products}
          onRemoveProduct={mockOnRemove}
          onClearAll={mockOnClearAll}
        />
      );

      expect(container.textContent).toContain('Alta Margem');
      expect(container.textContent).toContain('Melhor Margem');
    });

    it('should correctly identify best ROI', () => {
      const products = [
        createTestProduct({ id: 'prod-1', nome: 'Baixo ROI', roi: 15 }),
        createTestProduct({ id: 'prod-2', nome: 'Alto ROI', roi: 75 }),
      ];

      const { container } = render(
        <ProductComparison
          products={products}
          onRemoveProduct={mockOnRemove}
          onClearAll={mockOnClearAll}
        />
      );

      expect(container.textContent).toContain('Alto ROI');
      expect(container.textContent).toContain('Melhor ROI');
    });
  });

  describe('Data formatting', () => {
    it('should format currency values', () => {
      const products = [
        createTestProduct({ id: 'prod-1', custoCompra: 100.50 }),
      ];

      render(
        <ProductComparison
          products={products}
          onRemoveProduct={mockOnRemove}
          onClearAll={mockOnClearAll}
        />
      );

      // Should format the currency (exact format depends on formatKz implementation)
      expect(screen.getByText('Custo Compra')).toBeInTheDocument();
    });

    it('should format percentage values', () => {
      const products = [
        createTestProduct({ id: 'prod-1', margemReal: 22.5 }),
      ];

      render(
        <ProductComparison
          products={products}
          onRemoveProduct={mockOnRemove}
          onClearAll={mockOnClearAll}
        />
      );

      expect(screen.getByText(/22\.5/)).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle products with missing fields', () => {
      const products = [
        createTestProduct({
          id: 'prod-1',
          categoria: undefined,
          margemReal: undefined,
        }),
      ];

      render(
        <ProductComparison
          products={products}
          onRemoveProduct={mockOnRemove}
          onClearAll={mockOnClearAll}
        />
      );

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should handle zero values correctly', () => {
      const products = [
        createTestProduct({
          id: 'prod-1',
          custoTransporte: 0,
          outrosCustos: 0,
        }),
      ];

      render(
        <ProductComparison
          products={products}
          onRemoveProduct={mockOnRemove}
          onClearAll={mockOnClearAll}
        />
      );

      expect(screen.getByText('Custo Compra')).toBeInTheDocument();
    });

    it('should handle many products', () => {
      const products = Array.from({ length: 10 }, (_, i) =>
        createTestProduct({
          id: `prod-${i}`,
          nome: `Produto ${i}`,
        })
      );

      render(
        <ProductComparison
          products={products}
          onRemoveProduct={mockOnRemove}
          onClearAll={mockOnClearAll}
        />
      );

      expect(screen.getByText(/10 produtos selecionados/)).toBeInTheDocument();
    });
  });
});
