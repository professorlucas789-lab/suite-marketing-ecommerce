import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ReportBuilder } from './ReportBuilder';
import { Product } from '../types';
import { ReportConfig } from './ReportBuilder';

describe('ReportBuilder - Filter Functionality', () => {
  const createTestProduct = (overrides?: Partial<Product>): Product => ({
    id: 'test-1',
    nome: 'Test Product',
    categoria: 'Category A',
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

  const mockOnGenerateReport = vi.fn();
  const mockOnExport = vi.fn();

  const products = [
    createTestProduct({ id: 'p1', nome: 'Produto A', categoria: 'Category A', precoVendaRecomendado: 100, margemReal: 25, roi: 20 }),
    createTestProduct({ id: 'p2', nome: 'Produto B', categoria: 'Category B', precoVendaRecomendado: 200, margemReal: 35, roi: 40 }),
    createTestProduct({ id: 'p3', nome: 'Produto C', categoria: 'Category A', precoVendaRecomendado: 150, margemReal: 40, roi: 50 }),
  ];

  describe('Filter UI Rendering', () => {
    it('should render filter section', () => {
      render(
        <ReportBuilder
          products={products}
          onGenerateReport={mockOnGenerateReport}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText(/Filtros/i)).toBeInTheDocument();
      expect(screen.getByText(/Tipo de Filtro:/i)).toBeInTheDocument();
    });

    it('should render category filter select', () => {
      render(
        <ReportBuilder
          products={products}
          onGenerateReport={mockOnGenerateReport}
          onExport={mockOnExport}
        />
      );

      const select = screen.getByDisplayValue(/-- Selecione uma categoria --/i);
      expect(select).toBeInTheDocument();
    });

    it('should display available categories', () => {
      render(
        <ReportBuilder
          products={products}
          onGenerateReport={mockOnGenerateReport}
          onExport={mockOnExport}
        />
      );

      const select = screen.getByDisplayValue(/-- Selecione uma categoria --/i) as HTMLSelectElement;
      const options = Array.from(select.options).map(opt => opt.value);

      expect(options).toContain('Category A');
      expect(options).toContain('Category B');
    });

    it('should show price range inputs when price filter type selected', () => {
      render(
        <ReportBuilder
          products={products}
          onGenerateReport={mockOnGenerateReport}
          onExport={mockOnExport}
        />
      );

      const typeLabel = screen.getByText(/Tipo de Filtro:/i);
      const typeContainer = typeLabel.closest('div');
      const filterTypeSelect = typeContainer?.querySelector('select') as HTMLSelectElement;
      fireEvent.change(filterTypeSelect, { target: { value: 'priceRange' } });

      expect(screen.getByLabelText(/Preço Mínimo:/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Preço Máximo:/i)).toBeInTheDocument();
    });

    it('should show margin range inputs when margin filter type selected', () => {
      render(
        <ReportBuilder
          products={products}
          onGenerateReport={mockOnGenerateReport}
          onExport={mockOnExport}
        />
      );

      const typeLabel = screen.getByText(/Tipo de Filtro:/i);
      const typeContainer = typeLabel.closest('div');
      const filterTypeSelect = typeContainer?.querySelector('select') as HTMLSelectElement;
      fireEvent.change(filterTypeSelect, { target: { value: 'marginRange' } });

      expect(screen.getByLabelText(/Margem Mínima/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Margem Máxima/i)).toBeInTheDocument();
    });

    it('should show ROI range inputs when ROI filter type selected', () => {
      render(
        <ReportBuilder
          products={products}
          onGenerateReport={mockOnGenerateReport}
          onExport={mockOnExport}
        />
      );

      const typeLabel = screen.getByText(/Tipo de Filtro:/i);
      const typeContainer = typeLabel.closest('div');
      const filterTypeSelect = typeContainer?.querySelector('select') as HTMLSelectElement;
      fireEvent.change(filterTypeSelect, { target: { value: 'roiRange' } });

      expect(screen.getByLabelText(/ROI Mínimo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/ROI Máximo/i)).toBeInTheDocument();
    });
  });

  describe('Adding Filters', () => {
    it('should add category filter', () => {
      render(
        <ReportBuilder
          products={products}
          onGenerateReport={mockOnGenerateReport}
          onExport={mockOnExport}
        />
      );

      const categorySelect = screen.getByDisplayValue(/-- Selecione uma categoria --/i) as HTMLSelectElement;
      fireEvent.change(categorySelect, { target: { value: 'Category A' } });

      const addButton = screen.getByRole('button', { name: /Adicionar Filtro/i });
      fireEvent.click(addButton);

      expect(screen.getByText(/Categoria: Category A/i)).toBeInTheDocument();
    });

    it('should add price range filter', () => {
      render(
        <ReportBuilder
          products={products}
          onGenerateReport={mockOnGenerateReport}
          onExport={mockOnExport}
        />
      );

      const typeLabel = screen.getByText(/Tipo de Filtro:/i);
      const typeContainer = typeLabel.closest('div');
      const filterTypeSelect = typeContainer?.querySelector('select') as HTMLSelectElement;
      fireEvent.change(filterTypeSelect, { target: { value: 'priceRange' } });

      const inputs = screen.getAllByPlaceholderText('0');
      fireEvent.change(inputs[0], { target: { value: '100' } });
      fireEvent.change(inputs[1], { target: { value: '200' } });

      const addButton = screen.getByRole('button', { name: /Adicionar Filtro/i });
      fireEvent.click(addButton);

      expect(screen.getByText(/Preço: 100 - 200/i)).toBeInTheDocument();
    });

    it('should add margin range filter', () => {
      render(
        <ReportBuilder
          products={products}
          onGenerateReport={mockOnGenerateReport}
          onExport={mockOnExport}
        />
      );

      const typeLabel = screen.getByText(/Tipo de Filtro:/i);
      const typeContainer = typeLabel.closest('div');
      const filterTypeSelect = typeContainer?.querySelector('select') as HTMLSelectElement;
      fireEvent.change(filterTypeSelect, { target: { value: 'marginRange' } });

      const minInput = screen.getByLabelText(/Margem Mínima/i);
      const maxInput = screen.getByLabelText(/Margem Máxima/i);

      fireEvent.change(minInput, { target: { value: '20' } });
      fireEvent.change(maxInput, { target: { value: '40' } });

      const addButton = screen.getByRole('button', { name: /Adicionar Filtro/i });
      fireEvent.click(addButton);

      expect(screen.getByText(/Margem: 20% - 40%/i)).toBeInTheDocument();
    });

    it('should add ROI range filter', () => {
      render(
        <ReportBuilder
          products={products}
          onGenerateReport={mockOnGenerateReport}
          onExport={mockOnExport}
        />
      );

      const typeLabel = screen.getByText(/Tipo de Filtro:/i);
      const typeContainer = typeLabel.closest('div');
      const filterTypeSelect = typeContainer?.querySelector('select') as HTMLSelectElement;
      fireEvent.change(filterTypeSelect, { target: { value: 'roiRange' } });

      const minInput = screen.getByLabelText(/ROI Mínimo/);
      const maxInput = screen.getByLabelText(/ROI Máximo/);

      fireEvent.change(minInput, { target: { value: '30' } });
      fireEvent.change(maxInput, { target: { value: '50' } });

      const addButton = screen.getByRole('button', { name: /Adicionar Filtro/i });
      fireEvent.click(addButton);

      expect(screen.getByText(/ROI: 30% - 50%/i)).toBeInTheDocument();
    });

    it('should not add filter without required values', () => {
      render(
        <ReportBuilder
          products={products}
          onGenerateReport={mockOnGenerateReport}
          onExport={mockOnExport}
        />
      );

      const addButton = screen.getByRole('button', { name: /Adicionar Filtro/i });
      fireEvent.click(addButton);

      // Filter should not be added since no category was selected
      // The "Filtros Aplicados:" section should not appear
      expect(screen.queryByText(/Filtros Aplicados:/i)).not.toBeInTheDocument();
    });
  });

  describe('Removing Filters', () => {
    it('should remove filter when X button clicked', () => {
      render(
        <ReportBuilder
          products={products}
          onGenerateReport={mockOnGenerateReport}
          onExport={mockOnExport}
        />
      );

      // Add a filter first
      const categorySelect = screen.getByDisplayValue(/-- Selecione uma categoria --/i) as HTMLSelectElement;
      fireEvent.change(categorySelect, { target: { value: 'Category A' } });

      const addButton = screen.getByRole('button', { name: /Adicionar Filtro/i });
      fireEvent.click(addButton);

      // Verify filter was added
      expect(screen.getByText(/Categoria: Category A/i)).toBeInTheDocument();

      // Remove the filter
      const removeButtons = screen.getAllByTitle(/Remover filtro/i);
      fireEvent.click(removeButtons[0]);

      // Filter should be removed
      expect(screen.queryByText(/Categoria: Category A/i)).not.toBeInTheDocument();
    });

    it('should hide filter section when no filters applied', () => {
      render(
        <ReportBuilder
          products={products}
          onGenerateReport={mockOnGenerateReport}
          onExport={mockOnExport}
        />
      );

      // Initially no "Filtros Aplicados" text should appear
      expect(screen.queryByText(/Filtros Aplicados:/i)).not.toBeInTheDocument();
    });
  });

  describe('Multiple Filters', () => {
    it('should allow adding multiple filters', () => {
      render(
        <ReportBuilder
          products={products}
          onGenerateReport={mockOnGenerateReport}
          onExport={mockOnExport}
        />
      );

      // Add category filter
      const categoryLabel = screen.getByText(/Selecionar Categoria:/i);
      const categoryContainer = categoryLabel.closest('div');
      const categorySelect = categoryContainer?.querySelector('select') as HTMLSelectElement;
      fireEvent.change(categorySelect, { target: { value: 'Category A' } });
      let addButton = screen.getByRole('button', { name: /Adicionar Filtro/i });
      fireEvent.click(addButton);

      // Add price range filter
      const typeLabel = screen.getByText(/Tipo de Filtro:/i);
      const typeContainer = typeLabel.closest('div');
      const filterTypeSelect = typeContainer?.querySelector('select') as HTMLSelectElement;
      fireEvent.change(filterTypeSelect, { target: { value: 'priceRange' } });

      const inputs = screen.getAllByPlaceholderText('0');
      fireEvent.change(inputs[0], { target: { value: '100' } });
      fireEvent.change(inputs[1], { target: { value: '200' } });

      addButton = screen.getByRole('button', { name: /Adicionar Filtro/i });
      fireEvent.click(addButton);

      // Verify both filters are present
      expect(screen.getByText(/Categoria: Category A/i)).toBeInTheDocument();
      expect(screen.getByText(/Preço: 100 - 200/i)).toBeInTheDocument();
    });
  });

  describe('Filter Integration with Report Generation', () => {
    it('should pass filters to onGenerateReport', () => {
      render(
        <ReportBuilder
          products={products}
          onGenerateReport={mockOnGenerateReport}
          onExport={mockOnExport}
        />
      );

      // Add a filter
      const categorySelect = screen.getByDisplayValue(/-- Selecione uma categoria --/i) as HTMLSelectElement;
      fireEvent.change(categorySelect, { target: { value: 'Category A' } });

      const addButton = screen.getByRole('button', { name: /Adicionar Filtro/i });
      fireEvent.click(addButton);

      // Generate report
      const generateButton = screen.getByRole('button', { name: /Gerar/i });
      fireEvent.click(generateButton);

      // Verify onGenerateReport was called with filters
      expect(mockOnGenerateReport).toHaveBeenCalled();
      const config = mockOnGenerateReport.mock.calls[0][0] as ReportConfig;
      expect(config.filters).toHaveLength(1);
      expect(config.filters[0].type).toBe('category');
      expect(config.filters[0].value).toBe('Category A');
    });

    it('should pass filters to onExport', () => {
      render(
        <ReportBuilder
          products={products}
          onGenerateReport={mockOnGenerateReport}
          onExport={mockOnExport}
        />
      );

      // Add a filter
      const categorySelect = screen.getByDisplayValue(/-- Selecione uma categoria --/i) as HTMLSelectElement;
      fireEvent.change(categorySelect, { target: { value: 'Category A' } });

      const addButton = screen.getByRole('button', { name: /Adicionar Filtro/i });
      fireEvent.click(addButton);

      // Export to Excel
      const excelButton = screen.getByRole('button', { name: /Excel/i });
      fireEvent.click(excelButton);

      // Verify onExport was called with filters
      expect(mockOnExport).toHaveBeenCalled();
      const config = mockOnExport.mock.calls[0][0] as ReportConfig;
      expect(config.filters).toHaveLength(1);
      expect(config.filters[0].type).toBe('category');
      expect(config.filters[0].value).toBe('Category A');
    });
  });

  describe('Filter Display with Decimal Values', () => {
    it('should display price range filter with decimal values', () => {
      render(
        <ReportBuilder
          products={products}
          onGenerateReport={mockOnGenerateReport}
          onExport={mockOnExport}
        />
      );

      const typeLabel = screen.getByText(/Tipo de Filtro:/i);
      const typeContainer = typeLabel.closest('div');
      const filterTypeSelect = typeContainer?.querySelector('select') as HTMLSelectElement;

      fireEvent.change(filterTypeSelect, { target: { value: 'priceRange' } });

      const inputs = screen.getAllByPlaceholderText('0');
      fireEvent.change(inputs[0], { target: { value: '99.99' } });
      fireEvent.change(inputs[1], { target: { value: '200.50' } });

      const addButton = screen.getByRole('button', { name: /Adicionar Filtro/i });
      fireEvent.click(addButton);

      expect(screen.getByText(/Preço: 99.99 - 200.5/i)).toBeInTheDocument();
    });
  });
});
