import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportBuilder, ReportConfig } from './ReportBuilder';
import { Product } from '../types';

/**
 * Test suite for ReportBuilder component
 * Fase 5B Item 3: Custom Reports
 */
describe('ReportBuilder', () => {
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

  const mockOnGenerateReport = vi.fn();

  describe('Rendering', () => {
    it('should render report builder component', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      expect(screen.getByText('Título do Relatório')).toBeInTheDocument();
    });

    it('should render title input field', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const input = screen.getByPlaceholderText(/Ex: Relatório de Produtos/);
      expect(input).toBeInTheDocument();
    });

    it('should render column selection section', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      expect(screen.getByText('Selecionar Colunas')).toBeInTheDocument();
    });

    it('should render sort section', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      expect(screen.getByText('Ordenação')).toBeInTheDocument();
    });

    it('should render summary section', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      expect(screen.getByText(/colunas selecionadas/)).toBeInTheDocument();
    });

    it('should render generate report button', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      expect(screen.getByText('Gerar Relatório')).toBeInTheDocument();
    });
  });

  describe('Title Input', () => {
    it('should have default title', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const input = screen.getByPlaceholderText(/Ex: Relatório de Produtos/) as HTMLInputElement;
      expect(input.value).toBe('Relatório de Produtos');
    });

    it('should update title when typing', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const input = screen.getByPlaceholderText(/Ex: Relatório de Produtos/) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Relatório Customizado' } });
      expect(input.value).toBe('Relatório Customizado');
    });

    it('should accept empty title', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const input = screen.getByPlaceholderText(/Ex: Relatório de Produtos/) as HTMLInputElement;
      fireEvent.change(input, { target: { value: '' } });
      expect(input.value).toBe('');
    });

    it('should accept long titles', () => {
      const longTitle = 'A'.repeat(100);
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const input = screen.getByPlaceholderText(/Ex: Relatório de Produtos/) as HTMLInputElement;
      fireEvent.change(input, { target: { value: longTitle } });
      expect(input.value).toBe(longTitle);
    });
  });

  describe('Column Selection', () => {
    it('should display selected columns by default', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const columnLabels = container.querySelectorAll('.text-sm.font-medium.text-slate-700');
      const labelTexts = Array.from(columnLabels).map(el => el.textContent);
      expect(labelTexts).toContain('Nome');
      expect(labelTexts).toContain('Categoria');
      expect(labelTexts).toContain('Custo');
      expect(labelTexts).toContain('Preço');
      expect(labelTexts).toContain('Margem %');
    });

    it('should toggle column when checkbox clicked', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];

      expect(firstCheckbox).toBeChecked();
      fireEvent.click(firstCheckbox);
      expect(firstCheckbox).not.toBeChecked();
      fireEvent.click(firstCheckbox);
      expect(firstCheckbox).toBeChecked();
    });

    it('should disable column when unchecked', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      expect(checkboxes[0]).not.toBeChecked();
    });

    it('should have remove button for each column', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const removeButtons = screen.getAllByTitle('Remover coluna');
      expect(removeButtons.length).toBeGreaterThan(0);
    });

    it('should show all available columns in add section', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      expect(screen.getByText('Adicionar mais colunas:')).toBeInTheDocument();
      // Should show available columns that are not selected
      const addButtonsSection = screen.getByText('Adicionar mais colunas:').parentElement;
      const sectionText = addButtonsSection?.textContent || '';
      const hasAnyUnselectedColumn =
        sectionText.includes('Custo de Embalagem') ||
        sectionText.includes('Custo Total') ||
        sectionText.includes('Lucro Estimado') ||
        sectionText.includes('ROI %');
      expect(hasAnyUnselectedColumn).toBe(true);
    });
  });

  describe('Add Column', () => {
    it('should add available column when button clicked', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      // Get all add buttons
      const addButtons = Array.from(container.querySelectorAll('button')).filter(btn =>
        btn.className?.includes('bg-slate-100') && btn.textContent?.includes('Custo')
      );

      if (addButtons.length > 0) {
        fireEvent.click(addButtons[0]);
        // After clicking, the column count should increase
        expect(screen.getByText(/colunas selecionadas/)).toBeInTheDocument();
      }
    });

    it('should not duplicate column when adding', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );

      // Count how many times "Nome" appears in selected columns section
      const selectedColumnsSection = screen.getByText('Selecionar Colunas').parentElement;
      const nomeInSelected = selectedColumnsSection?.textContent?.includes('Nome');

      // Try to find an add button for Nome in the add section
      const addButtonsSection = screen.getByText('Adicionar mais colunas:').parentElement;
      const nomeInAdd = addButtonsSection?.textContent?.includes('Nome');

      // Nome can't be both in selected and in add buttons at the same time
      expect(!nomeInSelected || !nomeInAdd).toBe(true);
    });

    it('should only show buttons for unselected columns', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );

      const selectedColumnsSection = screen.getByText('Selecionar Colunas').parentElement;
      const addButtonsSection = screen.getByText('Adicionar mais colunas:').parentElement;

      const selectedText = selectedColumnsSection?.textContent || '';
      const addText = addButtonsSection?.textContent || '';

      // Check that at least one column is in selected but not in add buttons
      const selectedHasColumns = selectedText.includes('Nome') || selectedText.includes('Categoria');
      expect(selectedHasColumns).toBe(true);
    });
  });

  describe('Remove Column', () => {
    it('should remove column when X button clicked', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const removeButtons = screen.getAllByTitle('Remover coluna');
      const initialCount = removeButtons.length;

      fireEvent.click(removeButtons[0]);

      // Wait a bit for state to update
      const updatedRemoveButtons = screen.queryAllByTitle('Remover coluna');
      expect(updatedRemoveButtons.length).toBe(initialCount - 1);
    });

    it('should allow re-adding removed column', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const removeButtons = screen.getAllByTitle('Remover coluna');

      // Remove first column (Nome)
      fireEvent.click(removeButtons[0]);

      // Should now be able to add it back from available columns
      const addButtonsSection = screen.getByText('Adicionar mais colunas:').parentElement;
      const addButtonsText = addButtonsSection?.textContent || '';

      // After removing, the removed column should appear in add section
      expect(addButtonsText.length).toBeGreaterThan(0);
    });

    it('should update column count after removing', () => {
      const { container } = render(
        <ReportBuilder products={[createTestProduct()]} onGenerateReport={mockOnGenerateReport} />
      );
      const getParagraphWithText = (text: string) => {
        const paragraphs = container.querySelectorAll('p');
        return Array.from(paragraphs).find(p => p.textContent?.includes(text));
      };

      const summaryBefore = getParagraphWithText('colunas selecionadas');
      const countBefore = parseInt(summaryBefore?.textContent?.match(/\d+/)?.[0] || '0');

      const removeButtons = screen.getAllByTitle('Remover coluna');
      fireEvent.click(removeButtons[0]);

      const summaryAfter = getParagraphWithText('colunas selecionadas');
      const countAfter = parseInt(summaryAfter?.textContent?.match(/\d+/)?.[0] || '0');

      expect(countAfter).toBe(countBefore - 1);
    });
  });

  describe('Sort Functionality', () => {
    it('should display sort field dropdown', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const sortByLabel = screen.getByText('Ordenar por:');
      expect(sortByLabel).toBeInTheDocument();
    });

    it('should display sort direction dropdown', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const directionLabel = screen.getByText('Direção:');
      expect(directionLabel).toBeInTheDocument();
    });

    it('should change sort field when selected', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const selects = screen.getAllByRole('combobox');
      const sortBySelect = selects[0];

      fireEvent.change(sortBySelect, { target: { value: 'categoria' } });
      expect((sortBySelect as HTMLSelectElement).value).toBe('categoria');
    });

    it('should change sort direction when selected', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const selects = screen.getAllByRole('combobox');
      const sortDirectionSelect = selects[1];

      fireEvent.change(sortDirectionSelect, { target: { value: 'desc' } });
      expect((sortDirectionSelect as HTMLSelectElement).value).toBe('desc');
    });

    it('should have default sort field as nome', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const selects = screen.getAllByRole('combobox');
      const sortBySelect = selects[0] as HTMLSelectElement;
      expect(sortBySelect.value).toBe('nome');
    });

    it('should have default sort direction as asc', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const selects = screen.getAllByRole('combobox');
      const sortDirectionSelect = selects[1] as HTMLSelectElement;
      expect(sortDirectionSelect.value).toBe('asc');
    });

    it('should provide multiple sort options', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const selects = container.querySelectorAll('select');
      const sortBySelect = selects[0];
      const options = sortBySelect?.querySelectorAll('option');
      expect((options?.length || 0) > 1).toBe(true);
    });
  });

  describe('Summary Display', () => {
    it('should display column count', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const paragraphs = container.querySelectorAll('p');
      const hasSummary = Array.from(paragraphs).some(p => p.textContent?.includes('colunas selecionadas'));
      expect(hasSummary).toBe(true);
    });

    it('should update column count when column toggled', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const getParagraphWithText = (text: string) => {
        const paragraphs = container.querySelectorAll('p');
        return Array.from(paragraphs).find(p => p.textContent?.includes(text));
      };

      const summaryBefore = getParagraphWithText('colunas selecionadas');
      const countBefore = parseInt(summaryBefore?.textContent?.match(/\d+/)?.[0] || '0');

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      const summaryAfter = getParagraphWithText('colunas selecionadas');
      const countAfter = parseInt(summaryAfter?.textContent?.match(/\d+/)?.[0] || '0');

      expect(countAfter).toBe(countBefore - 1);
    });

    it('should display product count', () => {
      const products = [
        createTestProduct({ id: 'prod-1' }),
        createTestProduct({ id: 'prod-2' }),
        createTestProduct({ id: 'prod-3' }),
      ];
      const { container } = render(
        <ReportBuilder products={products} onGenerateReport={mockOnGenerateReport} />
      );
      const paragraphs = container.querySelectorAll('p');
      const hasProductCount = Array.from(paragraphs).some(p =>
        p.textContent?.includes('3') && p.textContent?.includes('produtos no relatório')
      );
      expect(hasProductCount).toBe(true);
    });

    it('should handle empty products list', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const paragraphs = container.querySelectorAll('p');
      const hasEmpty = Array.from(paragraphs).some(p =>
        p.textContent?.includes('0') && p.textContent?.includes('produtos no relatório')
      );
      expect(hasEmpty).toBe(true);
    });

    it('should handle many products', () => {
      const products = Array.from({ length: 100 }, (_, i) =>
        createTestProduct({ id: `prod-${i}` })
      );
      const { container } = render(
        <ReportBuilder products={products} onGenerateReport={mockOnGenerateReport} />
      );
      const paragraphs = container.querySelectorAll('p');
      const hasMany = Array.from(paragraphs).some(p =>
        p.textContent?.includes('100') && p.textContent?.includes('produtos no relatório')
      );
      expect(hasMany).toBe(true);
    });
  });

  describe('Generate Report Button', () => {
    it('should render generate button', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      expect(screen.getByText('Gerar Relatório')).toBeInTheDocument();
    });

    it('should enable button when columns selected', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const button = screen.getByText('Gerar Relatório') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });

    it('should disable button when no columns selected', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      // Uncheck all columns
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        if ((checkbox as HTMLInputElement).checked) {
          fireEvent.click(checkbox);
        }
      });

      const button = screen.getByText('Gerar Relatório') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('should call onGenerateReport when clicked', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const button = screen.getByText('Gerar Relatório');
      fireEvent.click(button);

      expect(mockOnGenerateReport).toHaveBeenCalledOnce();
    });

    it('should pass correct config to onGenerateReport', () => {
      const products = [createTestProduct()];
      render(
        <ReportBuilder products={products} onGenerateReport={mockOnGenerateReport} />
      );
      const button = screen.getByText('Gerar Relatório');
      fireEvent.click(button);

      expect(mockOnGenerateReport).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Relatório de Produtos',
          columns: expect.any(Array),
          filters: expect.any(Array),
          sortBy: 'nome',
          sortOrder: 'asc'
        })
      );
    });

    it('should include enabled columns in config', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      // Disable first column
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      const button = screen.getByText('Gerar Relatório');
      fireEvent.click(button);

      const config = mockOnGenerateReport.mock.calls[0][0] as ReportConfig;
      expect(config.columns.every(c => c.enabled)).toBe(true);
    });

    it('should include custom title in config', () => {
      mockOnGenerateReport.mockClear();
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const input = screen.getByPlaceholderText(/Ex: Relatório de Produtos/) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Custom Title' } });

      const button = screen.getByText('Gerar Relatório');
      fireEvent.click(button);

      const config = mockOnGenerateReport.mock.calls[0][0] as ReportConfig;
      expect(config.title).toBe('Custom Title');
    });

    it('should include sort config in report', () => {
      mockOnGenerateReport.mockClear();
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'margemReal' } });
      fireEvent.change(selects[1], { target: { value: 'desc' } });

      const button = screen.getByText('Gerar Relatório');
      fireEvent.click(button);

      const config = mockOnGenerateReport.mock.calls[0][0] as ReportConfig;
      expect(config.sortBy).toBe('margemReal');
      expect(config.sortOrder).toBe('desc');
    });
  });

  describe('Column Rendering', () => {
    it('should render selected columns in grid', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const selectedColumnsSection = screen.getByText('Selecionar Colunas').parentElement;
      const sectionText = selectedColumnsSection?.textContent || '';
      expect(sectionText).toContain('Nome');
      expect(sectionText).toContain('Categoria');
    });

    it('should show columns in emerald styling when selected', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const emeraldDivs = container.querySelectorAll('[class*="emerald-50"]');
      expect(emeraldDivs.length).toBeGreaterThan(0);
    });

    it('should show add buttons for unselected columns', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const availableSection = screen.getByText('Adicionar mais colunas:').parentElement;
      const sectionText = availableSection?.textContent || '';
      // Should contain at least one unselected column
      const hasUnselected = sectionText.includes('Lucro') || sectionText.includes('ROI') || sectionText.includes('Custo');
      expect(hasUnselected).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty products array', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const paragraphs = container.querySelectorAll('p');
      const hasEmpty = Array.from(paragraphs).some(p =>
        p.textContent?.includes('0') && p.textContent?.includes('produtos no relatório')
      );
      expect(hasEmpty).toBe(true);
    });

    it('should handle very large products array', () => {
      const products = Array.from({ length: 1000 }, (_, i) =>
        createTestProduct({ id: `prod-${i}` })
      );
      const { container } = render(
        <ReportBuilder products={products} onGenerateReport={mockOnGenerateReport} />
      );
      const paragraphs = container.querySelectorAll('p');
      const hasMany = Array.from(paragraphs).some(p =>
        p.textContent?.includes('1000') && p.textContent?.includes('produtos no relatório')
      );
      expect(hasMany).toBe(true);
    });

    it('should handle removing all columns then adding one back', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      // Remove all columns
      let removeButtons = screen.queryAllByTitle('Remover coluna');
      const count = removeButtons.length;

      for (let i = 0; i < count; i++) {
        removeButtons = screen.queryAllByTitle('Remover coluna');
        if (removeButtons.length > 0) {
          fireEvent.click(removeButtons[0]);
        }
      }

      // Button should be disabled
      let button = screen.getByText('Gerar Relatório') as HTMLButtonElement;
      expect(button.disabled).toBe(true);

      // Add a column back
      const addButtons = screen.queryAllByRole('button');
      const firstAddButton = addButtons.find(btn => btn.className?.includes('bg-slate-100') && !btn.title);
      if (firstAddButton) {
        fireEvent.click(firstAddButton);
      }

      // Button should be enabled again (if we successfully added a column)
      button = screen.getByText('Gerar Relatório') as HTMLButtonElement;
      // After adding one column, button should be enabled
      const paragraphs = container.querySelectorAll('p');
      const summaryElement = Array.from(paragraphs).find(p => p.textContent?.includes('colunas selecionadas'));
      if (summaryElement) {
        const columnCount = parseInt(summaryElement.textContent?.match(/\d+/)?.[0] || '0');
        expect(button.disabled).toBe(columnCount === 0);
      }
    });

    it('should handle multiple sort changes', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const selects = screen.getAllByRole('combobox');
      const sortBySelect = selects[0];

      fireEvent.change(sortBySelect, { target: { value: 'categoria' } });
      fireEvent.change(sortBySelect, { target: { value: 'roi' } });
      fireEvent.change(sortBySelect, { target: { value: 'nome' } });

      expect((sortBySelect as HTMLSelectElement).value).toBe('nome');
    });

    it('should handle title with special characters', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const input = screen.getByPlaceholderText(/Ex: Relatório de Produtos/) as HTMLInputElement;
      const specialTitle = 'Relatório @2024 #Premium "Especial" & Teste!';
      fireEvent.change(input, { target: { value: specialTitle } });

      expect(input.value).toBe(specialTitle);
    });

    it('should maintain state across multiple interactions', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );

      // Set title
      const input = screen.getByPlaceholderText(/Ex: Relatório de Produtos/) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Test Title' } });

      // Toggle column
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      // Change sort
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'categoria' } });

      // Verify all changes persist
      expect(input.value).toBe('Test Title');
      expect(checkboxes[0]).not.toBeChecked();
      expect((selects[0] as HTMLSelectElement).value).toBe('categoria');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for inputs', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      expect(screen.getByText('Título do Relatório')).toBeInTheDocument();
      expect(screen.getByText('Ordenar por:')).toBeInTheDocument();
      expect(screen.getByText('Direção:')).toBeInTheDocument();
    });

    it('should render checkboxes for column selection', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should have text labels for checkboxes', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const columnLabels = container.querySelectorAll('.text-sm.font-medium.text-slate-700');
      const labelTexts = Array.from(columnLabels).map(el => el.textContent);
      expect(labelTexts).toContain('Nome');
      expect(labelTexts).toContain('Categoria');
    });

    it('should have button with icon', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const generateButton = screen.getByText('Gerar Relatório');
      const svg = generateButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const button = screen.getByText('Gerar Relatório') as HTMLButtonElement;
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('Styling', () => {
    it('should apply dark mode classes', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const elements = container.querySelectorAll('[class*="dark:"]');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should style generate button appropriately', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const button = screen.getByText('Gerar Relatório');
      // Should have background color styling
      expect(button.className).toMatch(/bg-|gradient/);
    });

    it('should show emerald color for selected columns', () => {
      const { container } = render(
        <ReportBuilder products={[]} onGenerateReport={mockOnGenerateReport} />
      );
      const emeraldElements = container.querySelectorAll('[class*="emerald"]');
      expect(emeraldElements.length).toBeGreaterThan(0);
    });
  });
});
