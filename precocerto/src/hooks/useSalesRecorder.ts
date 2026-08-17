/**
 * useSalesRecorder Hook
 * Hook para registar vendas de forma rápida e fácil
 * Fase 6: Módulo de Vendas
 */

import { useState } from 'react';
import { Sale } from '../types/sales';
import { recordSale } from '../services/salesService';

export interface UseSalesRecorderReturn {
  recordedSale: Sale | null;
  loading: boolean;
  error: string | null;
  recordSale: (sale: Omit<Sale, 'id' | 'timestamp' | 'createdAt'>) => Promise<void>;
  reset: () => void;
}

export function useSalesRecorder(): UseSalesRecorderReturn {
  const [recordedSale, setRecordedSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRecordSale = async (sale: Omit<Sale, 'id' | 'timestamp' | 'createdAt'>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await recordSale(sale);
      setRecordedSale(result);
      console.log('✅ [useSalesRecorder] Venda registada com sucesso:', result.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao registar venda';
      setError(errorMessage);
      console.error('❌ [useSalesRecorder] Erro ao registar venda:', err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setRecordedSale(null);
    setError(null);
  };

  return {
    recordedSale,
    loading,
    error,
    recordSale: handleRecordSale,
    reset,
  };
}
