import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FavoriteButton, FavoriteIndicator } from './FavoriteButton';

/**
 * Test suite for FavoriteButton and FavoriteIndicator
 * Fase 5B Item 1: Favorite Products
 */
describe('FavoriteButton', () => {
  const mockOnToggle = vi.fn();

  describe('Rendering', () => {
    it('should render favorite button', () => {
      render(
        <FavoriteButton isFavorite={false} onToggle={mockOnToggle} />
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should show heart icon', () => {
      const { container } = render(
        <FavoriteButton isFavorite={false} onToggle={mockOnToggle} />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should have aria-pressed attribute', () => {
      render(
        <FavoriteButton isFavorite={false} onToggle={mockOnToggle} />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Favorite state', () => {
    it('should show unfavorite styling when not favorited', () => {
      render(
        <FavoriteButton isFavorite={false} onToggle={mockOnToggle} />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-slate-400');
    });

    it('should show favorite styling when favorited', () => {
      render(
        <FavoriteButton isFavorite={true} onToggle={mockOnToggle} />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-red-600');
      expect(button).toHaveClass('bg-red-50');
    });

    it('should have filled heart when favorited', () => {
      const { container } = render(
        <FavoriteButton isFavorite={true} onToggle={mockOnToggle} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('fill-current');
    });

    it('should have unfilled heart when not favorited', () => {
      const { container } = render(
        <FavoriteButton isFavorite={false} onToggle={mockOnToggle} />
      );
      const svg = container.querySelector('svg');
      expect(svg).not.toHaveClass('fill-current');
    });

    it('should update aria-pressed when favorite state changes', () => {
      const { rerender } = render(
        <FavoriteButton isFavorite={false} onToggle={mockOnToggle} />
      );
      let button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'false');

      rerender(
        <FavoriteButton isFavorite={true} onToggle={mockOnToggle} />
      );
      button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Interactions', () => {
    it('should call onToggle when clicked', () => {
      render(
        <FavoriteButton isFavorite={false} onToggle={mockOnToggle} />
      );
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockOnToggle).toHaveBeenCalledOnce();
    });

    it('should not call onToggle when disabled', () => {
      const mockOnToggleDisabled = vi.fn();
      render(
        <FavoriteButton isFavorite={false} onToggle={mockOnToggleDisabled} disabled />
      );
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(mockOnToggleDisabled).not.toHaveBeenCalled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(
        <FavoriteButton isFavorite={false} onToggle={mockOnToggle} disabled />
      );
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Tooltips and labels', () => {
    it('should have default label when not favorited', () => {
      render(
        <FavoriteButton isFavorite={false} onToggle={mockOnToggle} />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Adicionar aos favoritos');
    });

    it('should show remove label when favorited', () => {
      render(
        <FavoriteButton isFavorite={true} onToggle={mockOnToggle} />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Remover de favoritos');
    });

    it('should use custom label when provided', () => {
      render(
        <FavoriteButton
          isFavorite={false}
          onToggle={mockOnToggle}
          label="Custom label"
        />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Custom label');
    });

    it('should have proper aria-label', () => {
      render(
        <FavoriteButton isFavorite={false} onToggle={mockOnToggle} />
      );
      const button = screen.getByRole('button', { name: /Adicionar aos favoritos/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should accept custom className', () => {
      const { container } = render(
        <FavoriteButton
          isFavorite={false}
          onToggle={mockOnToggle}
          className="custom-class"
        />
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should apply dark mode classes', () => {
      render(
        <FavoriteButton isFavorite={true} onToggle={mockOnToggle} />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('dark:text-red-400');
      expect(button).toHaveClass('dark:bg-red-950/30');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      render(
        <FavoriteButton isFavorite={false} onToggle={mockOnToggle} />
      );
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should respond to keyboard Enter', () => {
      render(
        <FavoriteButton isFavorite={false} onToggle={mockOnToggle} />
      );
      const button = screen.getByRole('button');
      button.focus();
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.click(button);
      expect(mockOnToggle).toHaveBeenCalled();
    });

    it('should announce pressed state to screen readers', () => {
      const { rerender } = render(
        <FavoriteButton isFavorite={false} onToggle={mockOnToggle} />
      );
      let button = screen.getByRole('button', { pressed: false });
      expect(button).toBeInTheDocument();

      rerender(
        <FavoriteButton isFavorite={true} onToggle={mockOnToggle} />
      );
      button = screen.getByRole('button', { pressed: true });
      expect(button).toBeInTheDocument();
    });
  });
});

describe('FavoriteIndicator', () => {
  describe('Rendering', () => {
    it('should not render when count is 0', () => {
      const { container } = render(<FavoriteIndicator count={0} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when count is greater than 0', () => {
      render(<FavoriteIndicator count={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display count number', () => {
      render(<FavoriteIndicator count={10} />);
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should show heart icon', () => {
      const { container } = render(<FavoriteIndicator count={5} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have red background and text', () => {
      const { container } = render(<FavoriteIndicator count={5} />);
      const div = container.querySelector('div');
      expect(div).toHaveClass('bg-red-100');
      expect(div).toHaveClass('text-red-700');
    });

    it('should have dark mode support', () => {
      const { container } = render(<FavoriteIndicator count={5} />);
      const div = container.querySelector('div');
      expect(div).toHaveClass('dark:bg-red-900/30');
      expect(div).toHaveClass('dark:text-red-300');
    });

    it('should accept custom className', () => {
      const { container } = render(
        <FavoriteIndicator count={5} className="custom-class" />
      );
      const div = container.querySelector('div');
      expect(div).toHaveClass('custom-class');
    });

    it('should have filled heart icon', () => {
      const { container } = render(<FavoriteIndicator count={5} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('fill-current');
    });
  });

  describe('Edge cases', () => {
    it('should handle very large counts', () => {
      render(<FavoriteIndicator count={999} />);
      expect(screen.getByText('999')).toBeInTheDocument();
    });

    it('should not render with undefined count', () => {
      const { container } = render(<FavoriteIndicator />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render with negative count', () => {
      const { container } = render(<FavoriteIndicator count={-1} />);
      expect(container.firstChild).toBeNull();
    });
  });
});
