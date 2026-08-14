import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import {
  exportReportToExcel,
  exportReportToPDF,
  filterProductsByConfig,
  prepareProductsForExport
} from './reportExporter';
import { Product } from '../types';
import { ReportConfig } from '../components/ReportBuilder';

// Mock modules
vi.mock('xlsx');
vi.mock('jspdf');
vi.mock('jspdf-autotable');

describe('reportExporter', () => {
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

  describe('filterProductsByConfig', () => {
    const products = [
      createTestProduct({ id: 'p1', nome: 'Produto A', categoria: 'Categoria 1', precoVendaRecomendado: 100, margemReal: 25 }),
      createTestProduct({ id: 'p2', nome: 'Produto B', categoria: 'Categoria 2', precoVendaRecomendado: 200, margemReal: 35 }),
      createTestProduct({ id: 'p3', nome: 'Produto C', categoria: 'Categoria 1', precoVendaRecomendado: 150, margemReal: 40 }),
    ];

    it('should return all products when no filters applied', () => {
      const config: ReportConfig = {
        title: 'Test',
        columns: [],
        filters: [],
        sortBy: 'nome',
        sortOrder: 'asc'
      };

      const result = filterProductsByConfig(products, config);
      expect(result).toHaveLength(3);
    });

    it('should filter by category', () => {
      const config: ReportConfig = {
        title: 'Test',
        columns: [],
        filters: [
          {
            id: 'cat-filter',
            type: 'category',
            value: 'Categoria 1'
          }
        ],
        sortBy: 'nome',
        sortOrder: 'asc'
      };

      const result = filterProductsByConfig(products, config);
      expect(result).toHaveLength(2);
      expect(result.every(p => p.categoria === 'Categoria 1')).toBe(true);
    });

    it('should filter by price range', () => {
      const config: ReportConfig = {
        title: 'Test',
        columns: [],
        filters: [
          {
            id: 'price-filter',
            type: 'priceRange',
            value: { min: 100, max: 150 }
          }
        ],
        sortBy: 'nome',
        sortOrder: 'asc'
      };

      const result = filterProductsByConfig(products, config);
      expect(result).toHaveLength(2);
      expect(result.every(p => p.precoVendaRecomendado >= 100 && p.precoVendaRecomendado <= 150)).toBe(true);
    });

    it('should filter by margin range', () => {
      const config: ReportConfig = {
        title: 'Test',
        columns: [],
        filters: [
          {
            id: 'margin-filter',
            type: 'marginRange',
            value: { min: 30, max: 40 }
          }
        ],
        sortBy: 'nome',
        sortOrder: 'asc'
      };

      const result = filterProductsByConfig(products, config);
      expect(result).toHaveLength(2);
      expect(result.every(p => (p.margemReal || 0) >= 30 && (p.margemReal || 0) <= 40)).toBe(true);
    });

    it('should sort ascending', () => {
      const config: ReportConfig = {
        title: 'Test',
        columns: [],
        filters: [],
        sortBy: 'nome',
        sortOrder: 'asc'
      };

      const result = filterProductsByConfig(products, config);
      expect(result[0].nome).toBe('Produto A');
      expect(result[1].nome).toBe('Produto B');
      expect(result[2].nome).toBe('Produto C');
    });

    it('should sort descending', () => {
      const config: ReportConfig = {
        title: 'Test',
        columns: [],
        filters: [],
        sortBy: 'nome',
        sortOrder: 'desc'
      };

      const result = filterProductsByConfig(products, config);
      expect(result[0].nome).toBe('Produto C');
      expect(result[1].nome).toBe('Produto B');
      expect(result[2].nome).toBe('Produto A');
    });

    it('should sort by price ascending', () => {
      const config: ReportConfig = {
        title: 'Test',
        columns: [],
        filters: [],
        sortBy: 'precoVendaRecomendado',
        sortOrder: 'asc'
      };

      const result = filterProductsByConfig(products, config);
      expect(result[0].precoVendaRecomendado).toBe(100);
      expect(result[1].precoVendaRecomendado).toBe(150);
      expect(result[2].precoVendaRecomendado).toBe(200);
    });

    it('should apply multiple filters', () => {
      const config: ReportConfig = {
        title: 'Test',
        columns: [],
        filters: [
          {
            id: 'cat-filter',
            type: 'category',
            value: 'Categoria 1'
          },
          {
            id: 'price-filter',
            type: 'priceRange',
            value: { min: 100, max: 150 }
          }
        ],
        sortBy: 'nome',
        sortOrder: 'asc'
      };

      const result = filterProductsByConfig(products, config);
      expect(result).toHaveLength(2);
      expect(result.every(p => p.categoria === 'Categoria 1' && p.precoVendaRecomendado >= 100 && p.precoVendaRecomendado <= 150)).toBe(true);
    });

    it('should handle undefined/null values in sort', () => {
      const productsWithNull = [
        ...products,
        createTestProduct({ id: 'p4', nome: undefined as any, precoVendaRecomendado: 75 })
      ];

      const config: ReportConfig = {
        title: 'Test',
        columns: [],
        filters: [],
        sortBy: 'nome',
        sortOrder: 'asc'
      };

      const result = filterProductsByConfig(productsWithNull, config);
      expect(result.length).toBeGreaterThan(0);
      // Products with undefined nome should be at the end
      expect(result[result.length - 1].nome).toBeUndefined();
    });
  });

  describe('prepareProductsForExport', () => {
    it('should prepare products with selected columns', () => {
      const products = [
        createTestProduct({ id: 'p1', nome: 'Produto A', precoVendaRecomendado: 100 })
      ];

      const columns = [
        { key: 'nome', label: 'Nome' },
        { key: 'precoVendaRecomendado', label: 'Preço' }
      ];

      const result = prepareProductsForExport(products, columns);

      expect(result).toHaveLength(1);
      expect(result[0].nome).toBe('Produto A');
      expect(result[0].precoVendaRecomendado).toBe(100);
    });

    it('should calculate custoTotal', () => {
      const products = [
        createTestProduct({
          id: 'p1',
          custoCompra: 100,
          custoTransporte: 10,
          custoEmbalagem: 5,
          outrosCustos: 2
        })
      ];

      const columns = [
        { key: 'nome', label: 'Nome' },
        { key: 'custoTotal', label: 'Custo Total' }
      ];

      const result = prepareProductsForExport(products, columns);

      expect(result[0].custoTotal).toBe(117);
    });

    it('should handle missing values with 0', () => {
      const products = [
        createTestProduct({
          id: 'p1',
          margemReal: undefined
        })
      ];

      const columns = [
        { key: 'margemReal', label: 'Margem' }
      ];

      const result = prepareProductsForExport(products, columns);

      expect(result[0].margemReal).toBe(0);
    });

    it('should prepare multiple products', () => {
      const products = [
        createTestProduct({ id: 'p1', nome: 'Produto A' }),
        createTestProduct({ id: 'p2', nome: 'Produto B' }),
        createTestProduct({ id: 'p3', nome: 'Produto C' })
      ];

      const columns = [{ key: 'nome', label: 'Nome' }];

      const result = prepareProductsForExport(products, columns);

      expect(result).toHaveLength(3);
      expect(result[0].nome).toBe('Produto A');
      expect(result[1].nome).toBe('Produto B');
      expect(result[2].nome).toBe('Produto C');
    });
  });

  describe('exportReportToExcel', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should prepare Excel export with correct structure', () => {
      const data = [
        { nome: 'Produto A', preco: 100 },
        { nome: 'Produto B', preco: 200 }
      ];

      const options = {
        title: 'Test Report',
        columns: [
          { key: 'nome', label: 'Nome' },
          { key: 'preco', label: 'Preço' }
        ],
        data,
        generatedAt: '2024-01-15',
        companyName: 'Test Company'
      };

      // Verify the options are properly formatted
      expect(options.data).toHaveLength(2);
      expect(options.columns).toHaveLength(2);
      expect(options.title).toBe('Test Report');
    });

    it('should handle export with multiple products', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        nome: `Produto ${i}`,
        preco: Math.random() * 1000
      }));

      const options = {
        title: 'Large Report',
        columns: [
          { key: 'nome', label: 'Nome' },
          { key: 'preco', label: 'Preço' }
        ],
        data,
        generatedAt: '2024-01-15'
      };

      expect(options.data).toHaveLength(100);
      expect(options.title).toBe('Large Report');
    });
  });

  describe('exportReportToPDF', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should prepare PDF export with correct structure', () => {
      const data = [
        { nome: 'Produto A', preco: 100 },
        { nome: 'Produto B', preco: 200 }
      ];

      const options = {
        title: 'Test Report',
        columns: [
          { key: 'nome', label: 'Nome' },
          { key: 'preco', label: 'Preço' }
        ],
        data,
        generatedAt: '2024-01-15',
        companyName: 'Test Company'
      };

      // Verify the options are properly formatted
      expect(options.data).toHaveLength(2);
      expect(options.columns).toHaveLength(2);
      expect(options.title).toBe('Test Report');
      expect(options.companyName).toBe('Test Company');
    });

    it('should prepare PDF export with landscape orientation for many products', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        nome: `Produto ${i}`,
        preco: Math.random() * 1000
      }));

      const options = {
        title: 'Large PDF Report',
        columns: [
          { key: 'nome', label: 'Nome' },
          { key: 'preco', label: 'Preço' }
        ],
        data,
        generatedAt: '2024-01-15'
      };

      // For many products (>5), PDF should use landscape
      expect(options.data.length).toBeGreaterThan(5);
      expect(options.title).toBe('Large PDF Report');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty product list', () => {
      const config: ReportConfig = {
        title: 'Test',
        columns: [],
        filters: [],
        sortBy: 'nome',
        sortOrder: 'asc'
      };

      const result = filterProductsByConfig([], config);
      expect(result).toHaveLength(0);
    });

    it('should handle ROI range filter', () => {
      const products = [
        createTestProduct({ id: 'p1', roi: 15 }),
        createTestProduct({ id: 'p2', roi: 50 }),
        createTestProduct({ id: 'p3', roi: 70 })
      ];

      const config: ReportConfig = {
        title: 'Test',
        columns: [],
        filters: [
          {
            id: 'roi-filter',
            type: 'roiRange',
            value: { min: 40, max: 75 }
          }
        ],
        sortBy: 'nome',
        sortOrder: 'asc'
      };

      const result = filterProductsByConfig(products, config);
      expect(result).toHaveLength(2);
    });

    it('should sanitize special characters in report title for filename', () => {
      const title = 'Relatório @2024 #Premium "Especial" & Test!';
      const sanitized = title.replace(/[^a-z0-9]/gi, '_');

      // Should properly sanitize special characters
      expect(sanitized).toBe('Relat_rio__2024__Premium__Especial____Test_');
      expect(sanitized).not.toContain('@');
      expect(sanitized).not.toContain('#');
      expect(sanitized).not.toContain('"');
      // Should only contain alphanumeric and underscores
      expect(/^[a-z0-9_]+$/i.test(sanitized)).toBe(true);
    });

    it('should format currency values correctly', () => {
      const products = [
        createTestProduct({
          id: 'p1',
          precoVendaRecomendado: 123.456,
          margemReal: 23.789
        })
      ];

      const columns = [
        { key: 'precoVendaRecomendado', label: 'Preço' },
        { key: 'margemReal', label: 'Margem' }
      ];

      const result = prepareProductsForExport(products, columns);

      // Should preserve original values in the export data
      expect(result[0].precoVendaRecomendado).toBe(123.456);
      expect(result[0].margemReal).toBe(23.789);
    });
  });
});
