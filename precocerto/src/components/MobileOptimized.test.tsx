import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  TouchFriendlyButton,
  MobileMenuItem,
  MobileDrawer,
  MobileCard,
  ResponsiveImage
} from './MobileOptimized';

/**
 * Test suite for mobile-optimized components
 * Fase 5A Item 4: Mobile Responsiveness
 */
describe('Mobile Optimized Components', () => {
  describe('TouchFriendlyButton', () => {
    it('should render button with proper touch target size', () => {
      render(<TouchFriendlyButton>Click me</TouchFriendlyButton>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
    });

    it('should apply primary variant by default', () => {
      render(<TouchFriendlyButton>Primary Button</TouchFriendlyButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-emerald-600');
    });

    it('should apply secondary variant', () => {
      render(<TouchFriendlyButton variant="secondary">Secondary</TouchFriendlyButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-slate-200');
    });

    it('should apply danger variant', () => {
      render(<TouchFriendlyButton variant="danger">Delete</TouchFriendlyButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600');
    });

    it('should apply size classes correctly', () => {
      const { rerender } = render(<TouchFriendlyButton size="sm">Small</TouchFriendlyButton>);
      let button = screen.getByRole('button');
      expect(button).toHaveClass('text-xs');

      rerender(<TouchFriendlyButton size="md">Medium</TouchFriendlyButton>);
      button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-11');

      rerender(<TouchFriendlyButton size="lg">Large</TouchFriendlyButton>);
      button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-12');
    });

    it('should be full width when specified', () => {
      render(<TouchFriendlyButton fullWidth>Full Width</TouchFriendlyButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });

    it('should handle click events', () => {
      const onClick = vi.fn();
      render(<TouchFriendlyButton onClick={onClick}>Click</TouchFriendlyButton>);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledOnce();
    });

    it('should be disabled when disabled prop is set', () => {
      render(<TouchFriendlyButton disabled>Disabled</TouchFriendlyButton>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should accept custom className', () => {
      render(<TouchFriendlyButton className="custom-class">Button</TouchFriendlyButton>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('MobileMenuItem', () => {
    it('should render menu item with label', () => {
      const onClick = vi.fn();
      render(<MobileMenuItem label="Settings" onClick={onClick} />);
      const button = screen.getByRole('button', { name: /settings/i });
      expect(button).toBeInTheDocument();
    });

    it('should have minimum height for touch accessibility', () => {
      const onClick = vi.fn();
      render(<MobileMenuItem label="Item" onClick={onClick} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-11');
    });

    it('should render icon when provided', () => {
      const onClick = vi.fn();
      const { container } = render(
        <MobileMenuItem label="Home" onClick={onClick} icon={<span>🏠</span>} />
      );
      expect(container.textContent).toContain('🏠');
    });

    it('should show active state', () => {
      const onClick = vi.fn();
      render(<MobileMenuItem label="Active" onClick={onClick} active={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-emerald-50');
    });

    it('should display badge when provided', () => {
      const onClick = vi.fn();
      render(<MobileMenuItem label="Notifications" onClick={onClick} badge={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should handle click events', () => {
      const onClick = vi.fn();
      render(<MobileMenuItem label="Click me" onClick={onClick} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledOnce();
    });
  });

  describe('MobileDrawer', () => {
    it('should not be visible when closed', () => {
      const onClose = vi.fn();
      const { container } = render(
        <MobileDrawer isOpen={false} onClose={onClose}>
          Drawer content
        </MobileDrawer>
      );
      const drawer = container.querySelector('div[class*="translate-x-full"]');
      expect(drawer).toBeInTheDocument();
    });

    it('should be visible when open', () => {
      const onClose = vi.fn();
      const { container } = render(
        <MobileDrawer isOpen={true} onClose={onClose}>
          Drawer content
        </MobileDrawer>
      );
      expect(screen.getByText('Drawer content')).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      const onClose = vi.fn();
      render(
        <MobileDrawer isOpen={true} onClose={onClose} title="My Drawer">
          Content
        </MobileDrawer>
      );
      expect(screen.getByText('My Drawer')).toBeInTheDocument();
    });

    it('should close when overlay is clicked', () => {
      const onClose = vi.fn();
      const { container } = render(
        <MobileDrawer isOpen={true} onClose={onClose}>
          Content
        </MobileDrawer>
      );
      const overlay = container.querySelector('[aria-hidden="true"]');
      if (overlay) {
        fireEvent.click(overlay);
        expect(onClose).toHaveBeenCalledOnce();
      }
    });

    it('should close when close button is clicked', () => {
      const onClose = vi.fn();
      const { container } = render(
        <MobileDrawer isOpen={true} onClose={onClose} title="Drawer">
          Content
        </MobileDrawer>
      );
      const closeButton = container.querySelector('button[class*="text-slate-500"]');
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(onClose).toHaveBeenCalledOnce();
      }
    });

    it('should render children content', () => {
      const onClose = vi.fn();
      render(
        <MobileDrawer isOpen={true} onClose={onClose}>
          <p>Test content here</p>
        </MobileDrawer>
      );
      expect(screen.getByText('Test content here')).toBeInTheDocument();
    });
  });

  describe('MobileCard', () => {
    it('should render card with children', () => {
      render(<MobileCard>Card content</MobileCard>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should apply interactive styles when interactive is true', () => {
      const onClick = vi.fn();
      render(<MobileCard interactive={true} onClick={onClick}>Content</MobileCard>);
      const card = screen.getByText('Content').closest('div');
      expect(card).toHaveClass('cursor-pointer');
    });

    it('should handle click events when interactive', () => {
      const onClick = vi.fn();
      render(<MobileCard interactive={true} onClick={onClick}>Content</MobileCard>);
      const card = screen.getByText('Content').closest('div');
      if (card) {
        fireEvent.click(card);
        expect(onClick).toHaveBeenCalledOnce();
      }
    });

    it('should accept custom className', () => {
      const { container } = render(
        <MobileCard className="custom-card-class">Content</MobileCard>
      );
      const card = container.querySelector('div');
      expect(card).toHaveClass('custom-card-class');
    });

    it('should have proper responsive padding', () => {
      const { container } = render(<MobileCard>Content</MobileCard>);
      const card = container.querySelector('div');
      expect(card).toHaveClass('p-4');
      expect(card).toHaveClass('sm:p-6');
    });
  });

  describe('ResponsiveImage', () => {
    it('should render image with alt text', () => {
      render(<ResponsiveImage src="test.jpg" alt="Test image" />);
      const img = screen.getByAltText('Test image');
      expect(img).toBeInTheDocument();
    });

    it('should have correct source', () => {
      render(<ResponsiveImage src="image.png" alt="Test" />);
      const img = screen.getByAltText('Test') as HTMLImageElement;
      expect(img.src).toContain('image.png');
    });

    it('should apply full width class', () => {
      render(<ResponsiveImage src="test.jpg" alt="Test" />);
      const img = screen.getByAltText('Test');
      expect(img).toHaveClass('w-full');
    });

    it('should accept custom className', () => {
      render(
        <ResponsiveImage
          src="test.jpg"
          alt="Test"
          className="custom-image-class"
        />
      );
      const img = screen.getByAltText('Test');
      expect(img).toHaveClass('custom-image-class');
    });
  });

  describe('Accessibility', () => {
    it('TouchFriendlyButton should have aria labels when needed', () => {
      render(
        <TouchFriendlyButton aria-label="Submit form">
          →
        </TouchFriendlyButton>
      );
      const button = screen.getByLabelText('Submit form');
      expect(button).toBeInTheDocument();
    });

    it('MobileMenuItem should be keyboard navigable', () => {
      const onClick = vi.fn();
      render(<MobileMenuItem label="Navigable" onClick={onClick} />);
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('MobileDrawer overlay should have proper aria attributes', () => {
      const onClose = vi.fn();
      const { container } = render(
        <MobileDrawer isOpen={true} onClose={onClose}>
          Content
        </MobileDrawer>
      );
      const overlay = container.querySelector('[aria-hidden="true"]');
      expect(overlay).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Touch and Mobile Events', () => {
    it('TouchFriendlyButton should respond to touch events', () => {
      const onClick = vi.fn();
      render(<TouchFriendlyButton onClick={onClick}>Button</TouchFriendlyButton>);
      const button = screen.getByRole('button');

      fireEvent.touchStart(button);
      fireEvent.touchEnd(button);
      fireEvent.click(button);

      expect(onClick).toHaveBeenCalled();
    });

    it('MobileCard should be clickable on touch devices', () => {
      const onClick = vi.fn();
      render(<MobileCard interactive={true} onClick={onClick}>Content</MobileCard>);
      const card = screen.getByText('Content').closest('div');

      if (card) {
        fireEvent.touchStart(card);
        fireEvent.touchEnd(card);
        fireEvent.click(card);
        expect(onClick).toHaveBeenCalled();
      }
    });
  });
});
