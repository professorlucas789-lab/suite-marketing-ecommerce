/**
 * useExecutiveDashboard Hook
 * Hook para gerenciar métricas do dashboard executivo
 * NOVO (Phase 17): Dashboard com KPIs e tendências
 *
 * Uso:
 * const { metrics, loading, error, refreshMetrics } = useExecutiveDashboard('store-id');
 */

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../contexts/StoreContext';
import { ExecutiveDashboardService, ExecutiveDashboardMetrics } from '../services/executiveDashboardService';

interface UseExecutiveDashboardReturn {
  metrics: ExecutiveDashboardMetrics | null;
  loading: boolean;
  error: string | null;
  refreshMetrics: () => Promise<void>;
  daysBack: number;
  setDaysBack: (days: number) => void;
}

export function useExecutiveDashboard(): UseExecutiveDashboardReturn {
  const { currentStore } = useStore();
  const [metrics, setMetrics] = useState<ExecutiveDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState(30);

  // Carregar métricas
  const refreshMetrics = useCallback(async () => {
    if (!currentStore?.storeId) {
      setError('Loja não selecionada');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`📊 Carregando métricas executivas para ${daysBack} dias...`);

      const dashboardMetrics = await ExecutiveDashboardService.getExecutiveDashboardMetrics(
        currentStore.storeId,
        daysBack
      );

      setMetrics(dashboardMetrics);
      console.log('✅ Métricas carregadas com sucesso');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao carregar métricas';
      setError(errorMsg);
      console.error('❌ Erro ao carregar métricas:', err);
    } finally {
      setLoading(false);
    }
  }, [currentStore?.storeId, daysBack]);

  // Carregar métricas ao montar e quando daysBack mudar
  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  return {
    metrics,
    loading,
    error,
    refreshMetrics,
    daysBack,
    setDaysBack,
  };
}
