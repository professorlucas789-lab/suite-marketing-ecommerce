import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveStack,
  ResponsiveButtonGroup
} from './ResponsiveContainer';

/**
 * Test suite for responsive container components
 * Fase 5A Item 4: Mobile Responsiveness
 */
describe('Responsive Container Components', () => {
  describe('ResponsiveContainer', () => {
    it('should render children content', () => {
      render(
        <ResponsiveContainer>
          <p>Test content</p>
        </ResponsiveContainer>
      );
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should apply responsive padding classes', () => {
      const { container } = render(
        <ResponsiveContainer>
          <p>Content</p>
        </ResponsiveContainer>
      );
      const div = container.querySelector('div');
      expect(div).toHaveClass('px-4');
      expect(div).toHaveClass('sm:px-6');
      expect(div).toHaveClass('lg:px-8');
    });

    it('should apply responsive vertical padding', () => {
      const { container } = render(
        <ResponsiveContainer>
          <p>Content</p>
        </ResponsiveContainer>
      );
      const div = container.querySelector('div');
      expect(div).toHaveClass('py-4');
      expect(div).toHaveClass('sm:py-6');
      expect(div).toHaveClass('lg:py-8');
    });

    it('should apply max width and centering', () => {
      const { container } = render(
        <ResponsiveContainer>
          <p>Content</p>
        </ResponsiveContainer>
      );
      const div = container.querySelector('div');
      expect(div).toHaveClass('max-w-7xl');
      expect(div).toHaveClass('mx-auto');
    });

    it('should accept custom className', () => {
      const { container } = render(
        <ResponsiveContainer className="custom-class">
          <p>Content</p>
        </ResponsiveContainer>
      );
      const div = container.querySelector('div');
      expect(div).toHaveClass('custom-class');
    });
  });

  describe('ResponsiveGrid', () => {
    it('should render children in grid layout', () => {
      render(
        <ResponsiveGrid>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>
      );
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('should apply grid column classes', () => {
      const { container } = render(
        <ResponsiveGrid>
          <div>Item</div>
        </ResponsiveGrid>
      );
      const grid = container.querySelector('div');
      expect(grid).toHaveClass('grid');
    });

    it('should apply compact gap', () => {
      const { container } = render(
        <ResponsiveGrid gap="compact">
          <div>Item</div>
        </ResponsiveGrid>
      );
      const grid = container.querySelector('div');
      expect(grid).toHaveClass('gap-2');
      expect(grid).toHaveClass('sm:gap-3');
    });

    it('should apply normal gap by default', () => {
      const { container } = render(
        <ResponsiveGrid>
          <div>Item</div>
        </ResponsiveGrid>
      );
      const grid = container.querySelector('div');
      expect(grid).toHaveClass('gap-4');
    });

    it('should apply spacious gap', () => {
      const { container } = render(
        <ResponsiveGrid gap="spacious">
          <div>Item</div>
        </ResponsiveGrid>
      );
      const grid = container.querySelector('div');
      expect(grid).toHaveClass('gap-6');
      expect(grid).toHaveClass('sm:gap-8');
    });

    it('should accept custom column configuration', () => {
      const { container } = render(
        <ResponsiveGrid columns={{ mobile: 1, sm: 2, lg: 4 }}>
          <div>Item</div>
        </ResponsiveGrid>
      );
      const grid = container.querySelector('div');
      expect(grid).toBeInTheDocument();
    });

    it('should accept custom className', () => {
      const { container } = render(
        <ResponsiveGrid className="custom-grid">
          <div>Item</div>
        </ResponsiveGrid>
      );
      const grid = container.querySelector('div');
      expect(grid).toHaveClass('custom-grid');
    });
  });

  describe('ResponsiveStack', () => {
    it('should render children in flex layout', () => {
      render(
        <ResponsiveStack>
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveStack>
      );
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('should apply flex column by default', () => {
      const { container } = render(
        <ResponsiveStack>
          <div>Item</div>
        </ResponsiveStack>
      );
      const stack = container.querySelector('div');
      expect(stack).toHaveClass('flex');
      expect(stack).toHaveClass('flex-col');
    });

    it('should apply flex row when direction is row', () => {
      const { container } = render(
        <ResponsiveStack direction="row">
          <div>Item</div>
        </ResponsiveStack>
      );
      const stack = container.querySelector('div');
      expect(stack).toHaveClass('flex-row');
    });

    it('should apply gap classes', () => {
      const { container } = render(
        <ResponsiveStack gap="normal">
          <div>Item</div>
        </ResponsiveStack>
      );
      const stack = container.querySelector('div');
      expect(stack).toHaveClass('gap-4');
      expect(stack).toHaveClass('sm:gap-5');
    });

    it('should apply compact gap', () => {
      const { container } = render(
        <ResponsiveStack gap="compact">
          <div>Item</div>
        </ResponsiveStack>
      );
      const stack = container.querySelector('div');
      expect(stack).toHaveClass('gap-2');
    });

    it('should apply spacious gap', () => {
      const { container } = render(
        <ResponsiveStack gap="spacious">
          <div>Item</div>
        </ResponsiveStack>
      );
      const stack = container.querySelector('div');
      expect(stack).toHaveClass('gap-6');
      expect(stack).toHaveClass('lg:gap-10');
    });

    it('should apply flex-wrap', () => {
      const { container } = render(
        <ResponsiveStack>
          <div>Item</div>
        </ResponsiveStack>
      );
      const stack = container.querySelector('div');
      expect(stack).toHaveClass('flex-wrap');
    });

    it('should accept custom className', () => {
      const { container } = render(
        <ResponsiveStack className="custom-stack">
          <div>Item</div>
        </ResponsiveStack>
      );
      const stack = container.querySelector('div');
      expect(stack).toHaveClass('custom-stack');
    });
  });

  describe('ResponsiveButtonGroup', () => {
    it('should render buttons in a group', () => {
      render(
        <ResponsiveButtonGroup>
          <button>Button 1</button>
          <button>Button 2</button>
        </ResponsiveButtonGroup>
      );
      expect(screen.getByRole('button', { name: /button 1/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /button 2/i })).toBeInTheDocument();
    });

    it('should stack buttons on mobile by default', () => {
      const { container } = render(
        <ResponsiveButtonGroup>
          <button>Button 1</button>
          <button>Button 2</button>
        </ResponsiveButtonGroup>
      );
      const group = container.querySelector('div');
      expect(group).toHaveClass('flex-col');
      expect(group).toHaveClass('sm:flex-row');
    });

    it('should arrange buttons horizontally when stacked is false', () => {
      const { container } = render(
        <ResponsiveButtonGroup stacked={false}>
          <button>Button 1</button>
          <button>Button 2</button>
        </ResponsiveButtonGroup>
      );
      const group = container.querySelector('div');
      expect(group).toHaveClass('flex-row');
    });

    it('should apply gap between buttons', () => {
      const { container } = render(
        <ResponsiveButtonGroup>
          <button>Button 1</button>
          <button>Button 2</button>
        </ResponsiveButtonGroup>
      );
      const group = container.querySelector('div');
      expect(group).toHaveClass('gap-2');
      expect(group).toHaveClass('sm:gap-3');
    });

    it('should make buttons full width on mobile', () => {
      const { container } = render(
        <ResponsiveButtonGroup>
          <button>Button</button>
        </ResponsiveButtonGroup>
      );
      const group = container.querySelector('div');
      expect(group).toHaveClass('w-full');
      expect(group).toHaveClass('sm:w-auto');
    });

    it('should accept custom className', () => {
      const { container } = render(
        <ResponsiveButtonGroup className="custom-group">
          <button>Button</button>
        </ResponsiveButtonGroup>
      );
      const group = container.querySelector('div');
      expect(group).toHaveClass('custom-group');
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt to different screen sizes', () => {
      const { container } = render(
        <ResponsiveContainer>
          <ResponsiveGrid gap="normal" columns={{ mobile: 1, sm: 2, lg: 3 }}>
            <div>Item 1</div>
            <div>Item 2</div>
            <div>Item 3</div>
          </ResponsiveGrid>
        </ResponsiveContainer>
      );
      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('should maintain proper spacing at all breakpoints', () => {
      const { container } = render(
        <ResponsiveStack gap="normal">
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveStack>
      );
      const stack = container.querySelector('div');
      expect(stack).toHaveClass('gap-4');
      expect(stack).toHaveClass('sm:gap-5');
      expect(stack).toHaveClass('lg:gap-6');
    });
  });
});
