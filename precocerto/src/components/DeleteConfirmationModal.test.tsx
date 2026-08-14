import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

/**
 * Test suite for DeleteConfirmationModal
 * Fase 5A Item 5: Delete Confirmation
 */
describe('DeleteConfirmationModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnConfirm.mockClear();
    mockOnCancel.mockClear();
  });

  describe('Visibility', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <DeleteConfirmationModal
          isOpen={false}
          itemName="Test Product"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const modal = container.querySelector('[role="alertdialog"]');
      expect(modal).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('should display the item name', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="iPhone 12 Pro"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByText(/iPhone 12 Pro/)).toBeInTheDocument();
    });

    it('should display custom item type', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Product A"
          itemType="categoria"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByText(/categoria/)).toBeInTheDocument();
    });
  });

  describe('Content', () => {
    it('should show confirmation message', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(
        screen.getByText(/Tem certeza de que deseja remover/i)
      ).toBeInTheDocument();
    });

    it('should show warning about irreversible action', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(
        screen.getByText(/Esta ação não pode ser desfeita/i)
      ).toBeInTheDocument();
    });

    it('should display danger message when provided', () => {
      const dangerMsg = 'Este produto está vinculado a vendas!';
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          dangerMessage={dangerMsg}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByText(/Este produto está vinculado/)).toBeInTheDocument();
    });

    it('should not display danger message when not provided', () => {
      const { container } = render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      // Check that there's no red danger box in the content area (not the header)
      const mainContent = container.querySelector('.px-6.py-6');
      if (mainContent) {
        const dangerBox = mainContent.querySelector('.bg-red-50');
        expect(dangerBox).not.toBeInTheDocument();
      }
    });
  });

  describe('Buttons', () => {
    it('should have cancel button', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should have delete button', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const deleteButton = screen.getByRole('button', { name: /Remover/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it('should call onCancel when cancel button is clicked', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalledOnce();
    });

    it('should call onConfirm when delete button is clicked', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const deleteButton = screen.getByRole('button', { name: /Remover/i });
      fireEvent.click(deleteButton);
      expect(mockOnConfirm).toHaveBeenCalledOnce();
    });
  });

  describe('Close button', () => {
    it('should have close button in header', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const closeButtons = screen.getAllByLabelText('Fechar');
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    it('should call onCancel when close button is clicked', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const closeButton = screen.getAllByLabelText('Fechar')[0];
      fireEvent.click(closeButton);
      expect(mockOnCancel).toHaveBeenCalledOnce();
    });
  });

  describe('Loading state', () => {
    it('should show loading spinner when isDeleting is true', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          isDeleting={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByText(/Removendo/i)).toBeInTheDocument();
    });

    it('should show "Remover" text when not deleting', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          isDeleting={false}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByText(/Remover/)).toBeInTheDocument();
    });

    it('should disable buttons when isDeleting is true', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          isDeleting={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        if (button.getAttribute('aria-label') !== 'Fechar') {
          expect(button).toBeDisabled();
        }
      });
    });

    it('should enable buttons when not deleting', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          isDeleting={false}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
      const deleteButton = screen.getByRole('button', { name: /Remover/i });
      expect(cancelButton).not.toBeDisabled();
      expect(deleteButton).not.toBeDisabled();
    });
  });

  describe('Overlay interaction', () => {
    it('should call onCancel when overlay is clicked', () => {
      const { container } = render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const overlay = container.querySelector('[aria-hidden="true"]');
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnCancel).toHaveBeenCalledOnce();
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA roles', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('should have aria-labelledby pointing to title', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const modal = screen.getByRole('alertdialog');
      expect(modal).toHaveAttribute(
        'aria-labelledby',
        'delete-modal-title'
      );
    });

    it('should have aria-describedby pointing to description', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const modal = screen.getByRole('alertdialog');
      expect(modal).toHaveAttribute(
        'aria-describedby',
        'delete-modal-description'
      );
    });

    it('should have proper button aria-labels', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByLabelText('Fechar')).toBeInTheDocument();
    });
  });

  describe('Async operations', () => {
    it('should handle async onConfirm', async () => {
      const asyncOnConfirm = vi.fn().mockResolvedValue(undefined);
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          onConfirm={asyncOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const deleteButton = screen.getByRole('button', { name: /Remover/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(asyncOnConfirm).toHaveBeenCalledOnce();
      });
    });

    it('should handle async onCancel', async () => {
      const asyncOnCancel = vi.fn().mockResolvedValue(undefined);
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test Product"
          onConfirm={mockOnConfirm}
          onCancel={asyncOnCancel}
        />
      );
      const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(asyncOnCancel).toHaveBeenCalledOnce();
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('should work for product deletion', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="iPhone 12 Pro"
          itemType="produto"
          dangerMessage="Este produto está ligado a 5 vendas."
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByText(/iPhone 12 Pro/)).toBeInTheDocument();
      expect(screen.getByText(/Este produto está ligado/)).toBeInTheDocument();
    });

    it('should work for category deletion', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Eletrônicos"
          itemType="categoria"
          dangerMessage="Existem 12 produtos nesta categoria."
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByText(/Eletrônicos/)).toBeInTheDocument();
      expect(screen.getByText(/Existem 12 produtos/)).toBeInTheDocument();
    });

    it('should work for batch deletion', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Seleção de 5 produtos"
          itemType="item"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByText(/Seleção de 5 produtos/)).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle very long item names', () => {
      const longName = 'A'.repeat(100);
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName={longName}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByText(new RegExp(longName))).toBeInTheDocument();
    });

    it('should handle special characters in item names', () => {
      const specialName = 'Produto & Serviço "Premium" (100%)';
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName={specialName}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByText(/Produto & Serviço/)).toBeInTheDocument();
    });

    it('should handle empty danger message gracefully', () => {
      render(
        <DeleteConfirmationModal
          isOpen={true}
          itemName="Test"
          dangerMessage=""
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const modal = screen.getByRole('alertdialog');
      expect(modal).toBeInTheDocument();
    });
  });
});
