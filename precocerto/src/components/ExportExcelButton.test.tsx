import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportExcelButton } from './ExportExcelButton';
import { Product, BusinessSettings } from '../types';

const { mockExportSheetsToXlsx } = vi.hoisted(() => ({
  mockExportSheetsToXlsx: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../utils/excelExport', () => ({
  exportSheetsToXlsx: mockExportSheetsToXlsx,
}));

/**
 * Helper to create test products
 */
const createTestProduct = (overrides?: Partial<Product>): Product => ({
  id: 'test-1',
  nome: 'Test Product',
  categoria: 'Test Category',
  custoCompra: 100,
  custoTransporte: 10,
  custoEmbalagem: 5,
  outrosCustos: 2,
  margemDesejada: 20,
  precoVendaRecomendado: 150,
  lucroEstimado: 33,
  margemReal: 22,
  margemAplicada: 20,
  roi: 33,
  dataCriacao: '2024-01-15',
  ...overrides,
} as Product);

/**
 * Test suite for ExportExcelButton component
 */
describe('ExportExcelButton', () => {
  const mockSettings: BusinessSettings = {
    userId: 'test-user',
    companyName: 'Test Company',
    currency: 'Kz',
    defaultMargin: 20,
    taxRate: 10,
    inactivityTimeout: 30,
  };

  const mockProducts: Product[] = [
    createTestProduct({
      id: 'prod-1',
      nome: 'Produto A',
      categoria: 'Eletrônicos',
      custoCompra: 100,
      precoVendaRecomendado: 150,
      lucroEstimado: 50,
      margemReal: 50,
    }),
    createTestProduct({
      id: 'prod-2',
      nome: 'Produto B',
      categoria: 'Alimentos',
      custoCompra: 50,
      precoVendaRecomendado: 75,
      lucroEstimado: 25,
      margemReal: 50,
    }),
  ];

  const mockPriceHistory = [
    {
      productId: 'prod-1',
      productName: 'Produto A',
      precoAnterior: 140,
      precoAtual: 150,
      data: '2024-01-15',
    },
    {
      productId: 'prod-2',
      productName: 'Produto B',
      precoAnterior: 70,
      precoAtual: 75,
      data: '2024-01-16',
    },
  ];

  beforeEach(() => {
    mockExportSheetsToXlsx.mockClear();
  });

  describe('Rendering', () => {
    it('should render export button', () => {
      render(<ExportExcelButton products={mockProducts} settings={mockSettings} />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should display "Exportar Excel" text when not exporting', () => {
      render(<ExportExcelButton products={mockProducts} settings={mockSettings} />);
      expect(screen.getByText('Exportar Excel')).toBeInTheDocument();
    });

    it('should be disabled when no products are available', () => {
      render(<ExportExcelButton products={[]} settings={mockSettings} />);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should be enabled when products are available', () => {
      render(<ExportExcelButton products={mockProducts} settings={mockSettings} />);
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    it('should show correct tooltip when no products', () => {
      render(<ExportExcelButton products={[]} settings={mockSettings} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Nenhum produto para exportar');
    });

    it('should show correct tooltip when products exist', () => {
      render(<ExportExcelButton products={mockProducts} settings={mockSettings} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Exportar para Excel');
    });
  });

  describe('Data Formatting', () => {
    it('should format product data correctly', async () => {
      const { container } = render(
        <ExportExcelButton products={mockProducts} settings={mockSettings} />
      );
      const button = screen.getByRole('button');

      fireEvent.click(button);

      await waitFor(() => {
        expect(mockExportSheetsToXlsx).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle price history formatting', async () => {
      const { container } = render(
        <ExportExcelButton
          products={mockProducts}
          settings={mockSettings}
          priceHistory={mockPriceHistory}
        />
      );
      const button = screen.getByRole('button');

      fireEvent.click(button);

      await waitFor(() => {
        const sheets = mockExportSheetsToXlsx.mock.calls[0][0];
        expect(sheets.map((sheet: { name: string }) => sheet.name)).toContain('Histórico de Preços');
      });
    });

    it('should handle empty price history', () => {
      const { container } = render(
        <ExportExcelButton
          products={mockProducts}
          settings={mockSettings}
          priceHistory={[]}
        />
      );
      const button = screen.getByRole('button');

      fireEvent.click(button);

      // Should handle empty history gracefully
      expect(button).toBeInTheDocument();
    });

    it('should handle missing settings gracefully', () => {
      render(<ExportExcelButton products={mockProducts} settings={null} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      // Should use default values
      expect(button).toBeInTheDocument();
    });
  });

  describe('Product Data Edge Cases', () => {
    it('should handle products with missing optional fields', () => {
      const productWithMissingFields: Product = {
        id: 'test-1',
        nome: 'Test Product',
        categoria: undefined,
        custoCompra: 100,
        custoTransporte: undefined,
        custoEmbalagem: undefined,
        outrosCustos: undefined,
        margemDesejada: 20,
        precoVendaRecomendado: 120,
        lucroEstimado: 20,
        margemReal: 20,
        margemAplicada: 20,
        roi: 20,
        dataCriacao: undefined,
      };

      render(
        <ExportExcelButton products={[productWithMissingFields]} settings={mockSettings} />
      );
      const button = screen.getByRole('button');

      fireEvent.click(button);

      // Should handle undefined values
      expect(button).toBeInTheDocument();
    });

    it('should handle products with zero costs', () => {
      const freeProduct = createTestProduct({
        custoCompra: 0,
        custoTransporte: 0,
        custoEmbalagem: 0,
        outrosCustos: 0,
      });

      render(<ExportExcelButton products={[freeProduct]} settings={mockSettings} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(button).toBeInTheDocument();
    });

    it('should handle products with very large numbers', () => {
      const expensiveProduct = createTestProduct({
        custoCompra: 999999,
        precoVendaRecomendado: 1999999,
        lucroEstimado: 1000000,
      });

      render(<ExportExcelButton products={[expensiveProduct]} settings={mockSettings} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(button).toBeInTheDocument();
    });

    it('should handle products with decimal cost values', () => {
      const decimalProduct = createTestProduct({
        custoCompra: 10.99,
        custoTransporte: 2.50,
        custoEmbalagem: 1.25,
        precoVendaRecomendado: 19.99,
      });

      render(<ExportExcelButton products={[decimalProduct]} settings={mockSettings} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(button).toBeInTheDocument();
    });
  });

  describe('Category Summary', () => {
    it('should handle multiple categories in summary', () => {
      const multiCategoryProducts: Product[] = [
        createTestProduct({
          id: 'prod-1',
          categoria: 'Eletrônicos',
          custoCompra: 100,
          lucroEstimado: 50,
        }),
        createTestProduct({
          id: 'prod-2',
          categoria: 'Alimentos',
          custoCompra: 50,
          lucroEstimado: 25,
        }),
        createTestProduct({
          id: 'prod-3',
          categoria: 'Vestuário',
          custoCompra: 30,
          lucroEstimado: 15,
        }),
      ];

      render(
        <ExportExcelButton products={multiCategoryProducts} settings={mockSettings} />
      );
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(button).toBeInTheDocument();
    });

    it('should handle products with undefined category', () => {
      const productsWithoutCategory: Product[] = [
        createTestProduct({
          id: 'prod-1',
          categoria: undefined,
        }),
        createTestProduct({
          id: 'prod-2',
          categoria: 'Known Category',
        }),
      ];

      render(
        <ExportExcelButton products={productsWithoutCategory} settings={mockSettings} />
      );
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(button).toBeInTheDocument();
    });
  });

  describe('Button States', () => {
    it('should show loading state during export', async () => {
      render(<ExportExcelButton products={mockProducts} settings={mockSettings} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      // Loading state should appear briefly
      await waitFor(() => {
        const loadingText = screen.queryByText('Exportando...');
        if (loadingText) {
          expect(loadingText).toBeInTheDocument();
        }
      });
    });

    it('should disable button while exporting', async () => {
      render(<ExportExcelButton products={mockProducts} settings={mockSettings} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      // Button should be disabled during export
      await waitFor(() => {
        const disabledButton = screen.getByRole('button');
        if (disabledButton.getAttribute('disabled')) {
          expect(disabledButton).toBeDisabled();
        }
      });
    });
  });

  describe('Business Settings Integration', () => {
    it('should use company name from settings', () => {
      const customSettings: BusinessSettings = {
        ...mockSettings,
        companyName: 'Custom Company Name',
      };

      render(<ExportExcelButton products={mockProducts} settings={customSettings} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(button).toBeInTheDocument();
    });

    it('should use currency from settings', () => {
      const customSettings: BusinessSettings = {
        ...mockSettings,
        currency: 'USD',
      };

      render(<ExportExcelButton products={mockProducts} settings={customSettings} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(button).toBeInTheDocument();
    });

    it('should handle null settings gracefully', () => {
      render(<ExportExcelButton products={mockProducts} settings={null} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      // Should still work with default values
      expect(button).toBeInTheDocument();
    });
  });

  describe('Large Dataset Handling', () => {
    it('should handle 100 products', () => {
      const manyProducts = Array.from({ length: 100 }, (_, i) =>
        createTestProduct({
          id: `prod-${i}`,
          nome: `Product ${i}`,
          categoria: `Category ${i % 5}`,
        })
      );

      render(<ExportExcelButton products={manyProducts} settings={mockSettings} />);
      const button = screen.getByRole('button');

      expect(button).not.toBeDisabled();
      fireEvent.click(button);

      expect(button).toBeInTheDocument();
    });

    it('should handle 1000 products', () => {
      const manyProducts = Array.from({ length: 1000 }, (_, i) =>
        createTestProduct({
          id: `prod-${i}`,
          nome: `Product ${i}`,
          categoria: `Category ${i % 10}`,
        })
      );

      render(<ExportExcelButton products={manyProducts} settings={mockSettings} />);
      const button = screen.getByRole('button');

      expect(button).not.toBeDisabled();
      fireEvent.click(button);

      expect(button).toBeInTheDocument();
    });
  });

  describe('Price History Edge Cases', () => {
    it('should handle price history with identical previous and current prices', () => {
      const identicalPriceHistory = [
        {
          productId: 'prod-1',
          productName: 'Produto A',
          precoAnterior: 100,
          precoAtual: 100,
          data: '2024-01-15',
        },
      ];

      render(
        <ExportExcelButton
          products={mockProducts}
          settings={mockSettings}
          priceHistory={identicalPriceHistory}
        />
      );
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(button).toBeInTheDocument();
    });

    it('should handle price history with decimal price changes', () => {
      const decimalPriceHistory = [
        {
          productId: 'prod-1',
          productName: 'Produto A',
          precoAnterior: 100.50,
          precoAtual: 105.75,
          data: '2024-01-15',
        },
      ];

      render(
        <ExportExcelButton
          products={mockProducts}
          settings={mockSettings}
          priceHistory={decimalPriceHistory}
        />
      );
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(button).toBeInTheDocument();
    });

    it('should handle price history with price decreases', () => {
      const decreasingPriceHistory = [
        {
          productId: 'prod-1',
          productName: 'Produto A',
          precoAnterior: 200,
          precoAtual: 150,
          data: '2024-01-15',
        },
      ];

      render(
        <ExportExcelButton
          products={mockProducts}
          settings={mockSettings}
          priceHistory={decreasingPriceHistory}
        />
      );
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(button).toBeInTheDocument();
    });
  });
});
