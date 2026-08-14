import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SearchHighlight } from './SearchHighlight';

/**
 * Test suite for SearchHighlight component
 * Fase 5A Item 3: Search result highlighting
 */
describe('SearchHighlight', () => {
  describe('Basic highlighting', () => {
    it('should highlight matching text', () => {
      render(<SearchHighlight text="iPhone 12 Pro" search="iPhone" />);
      const mark = screen.getByText('iPhone');
      expect(mark.tagName).toBe('MARK');
    });

    it('should not highlight when search is empty', () => {
      const { container } = render(
        <SearchHighlight text="iPhone 12 Pro" search="" />
      );
      const mark = container.querySelector('mark');
      expect(mark).toBeNull();
    });

    it('should not highlight when search is whitespace only', () => {
      const { container } = render(
        <SearchHighlight text="iPhone 12 Pro" search="   " />
      );
      const mark = container.querySelector('mark');
      expect(mark).toBeNull();
    });

    it('should be case-insensitive', () => {
      render(<SearchHighlight text="iPhone 12 Pro" search="iphone" />);
      const mark = screen.getByText('iPhone');
      expect(mark).toBeInTheDocument();
    });

    it('should highlight multiple occurrences', () => {
      const { container } = render(
        <SearchHighlight text="apple apple apple" search="apple" />
      );
      const marks = container.querySelectorAll('mark');
      expect(marks.length).toBe(3);
    });
  });

  describe('Partial matches', () => {
    it('should highlight partial word matches', () => {
      render(<SearchHighlight text="smartphone" search="phone" />);
      const mark = screen.getByText('phone');
      expect(mark).toBeInTheDocument();
    });

    it('should highlight at the beginning', () => {
      render(<SearchHighlight text="Samsung Galaxy" search="Sam" />);
      const mark = screen.getByText('Sam');
      expect(mark).toBeInTheDocument();
    });

    it('should highlight at the end', () => {
      render(<SearchHighlight text="Samsung Galaxy" search="Galaxy" />);
      const mark = screen.getByText('Galaxy');
      expect(mark).toBeInTheDocument();
    });

    it('should highlight in the middle', () => {
      render(<SearchHighlight text="Samsung Galaxy S21" search="Galaxy" />);
      const mark = screen.getByText('Galaxy');
      expect(mark).toBeInTheDocument();
    });
  });

  describe('Special characters', () => {
    it('should handle special characters in search', () => {
      render(<SearchHighlight text="iPhone (2021)" search="(2021)" />);
      const mark = screen.getByText('(2021)');
      expect(mark).toBeInTheDocument();
    });

    it('should handle special characters in text', () => {
      render(<SearchHighlight text="C++ Programming" search="C++" />);
      const mark = screen.getByText('C++');
      expect(mark).toBeInTheDocument();
    });

    it('should handle accents and special chars in Portuguese', () => {
      render(
        <SearchHighlight text="Açúcar e Pão" search="Açúcar" />
      );
      const mark = screen.getByText('Açúcar');
      expect(mark).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className to wrapper', () => {
      const { container } = render(
        <SearchHighlight
          text="Test Product"
          search="Test"
          className="custom-class"
        />
      );
      const span = container.querySelector('span.custom-class');
      expect(span).toBeInTheDocument();
    });

    it('should apply custom className even when no matches', () => {
      const { container } = render(
        <SearchHighlight
          text="Test Product"
          search=""
          className="custom-class"
        />
      );
      const span = container.querySelector('span.custom-class');
      expect(span).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle very long text', () => {
      const longText = 'a'.repeat(1000) + 'KEYWORD' + 'b'.repeat(1000);
      render(<SearchHighlight text={longText} search="KEYWORD" />);
      const mark = screen.getByText('KEYWORD');
      expect(mark).toBeInTheDocument();
    });

    it('should handle very long search term that doesnt match', () => {
      const longSearch = 'a'.repeat(100);
      const { container } = render(
        <SearchHighlight
          text="hello world"
          search={longSearch}
        />
      );
      // Should render without error
      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span?.textContent).toBe('hello world');
    });

    it('should handle empty text gracefully', () => {
      const { container } = render(
        <SearchHighlight text="" search="test" className="test-class" />
      );
      const span = container.querySelector('span.test-class');
      expect(span).toBeInTheDocument();
    });

    it('should preserve non-matching parts', () => {
      const { container } = render(
        <SearchHighlight text="hello world" search="world" />
      );
      expect(container.textContent).toBe('hello world');
    });
  });

  describe('Real-world scenarios', () => {
    it('should highlight product names in search results', () => {
      render(
        <SearchHighlight
          text="Samsung Galaxy S21 Ultra"
          search="Galaxy"
        />
      );
      const mark = screen.getByText('Galaxy');
      expect(mark).toBeInTheDocument();
    });

    it('should handle search for number in product name', () => {
      render(
        <SearchHighlight
          text="iPhone 12 Pro Max"
          search="12"
        />
      );
      const mark = screen.getByText('12');
      expect(mark).toBeInTheDocument();
    });

    it('should handle Portuguese product names', () => {
      render(
        <SearchHighlight
          text="Pão de Queijo Congelado"
          search="Queijo"
        />
      );
      const mark = screen.getByText('Queijo');
      expect(mark).toBeInTheDocument();
    });

    it('should handle product names with multiple spaces', () => {
      render(
        <SearchHighlight
          text="Produto    com    espaços"
          search="com"
        />
      );
      const mark = screen.getByText('com');
      expect(mark).toBeInTheDocument();
    });

    it('should handle supplier names with special formats', () => {
      render(
        <SearchHighlight
          text="Fornecedor LTDA - Distribuidora"
          search="LTDA"
        />
      );
      const mark = screen.getByText('LTDA');
      expect(mark).toBeInTheDocument();
    });
  });
});
