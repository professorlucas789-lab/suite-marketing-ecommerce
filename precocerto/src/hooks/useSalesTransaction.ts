/**
 * Hook: useSalesTransaction
 * Handles recording multi-item sales transactions with Firebase
 * Designed for POS module with multiple products in single transaction
 *
 * FASE 3: Sales Module & Analytics
 */

import { useState } from 'react';
import { recordSaleTransaction } from '../services/salesService';
import type { SaleTransactionInput, SaleReceipt } from '../types/sales';

export interface UseSalesTransactionReturn {
  recordTransaction: (input: SaleTransactionInput) => Promise<SaleReceipt | null>;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  receipt: SaleReceipt | null;
  clearMessages: () => void;
}

export function useSalesTransaction(): UseSalesTransactionReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);

  const recordTransaction = async (input: SaleTransactionInput): Promise<SaleReceipt | null> => {
    // Validation
    if (!input.storeId) {
      setError('Loja obrigatória para registar venda');
      return null;
    }

    if (!input.userId) {
      setError('Utilizador obrigatório para registar venda');
      return null;
    }

    if (!input.items || input.items.length === 0) {
      setError('Adicione pelo menos um produto ao carrinho');
      return null;
    }

    // Validate each item
    for (const item of input.items) {
      if (!item.productId) {
        setError('Produto inválido no carrinho');
        return null;
      }
      if (item.quantity <= 0) {
        setError('A quantidade deve ser maior que zero');
        return null;
      }
      if (item.unitPrice <= 0) {
        setError('O preço unitário deve ser maior que zero');
        return null;
      }
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await recordSaleTransaction(input);
      setReceipt(result);
      setSuccessMessage(`Venda registada com sucesso! Recibo: ${result.receiptNumber}`);
      console.log('✅ [useSalesTransaction] Venda registada:', result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao registar venda';
      setError(errorMessage);
      console.error('❌ [useSalesTransaction] Erro ao registar venda:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
    setReceipt(null);
  };

  return {
    recordTransaction,
    isLoading,
    error,
    successMessage,
    receipt,
    clearMessages,
  };
}
