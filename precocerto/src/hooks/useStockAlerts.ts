/**
 * Hook: useStockAlerts
 * Gerenciar alertas de stock baixo
 * FASE 2: Gestão de Estoque Automática
 */

import { useState, useCallback, useEffect } from 'react';
import { StockAlert, ReorderReport } from '../types/inventory';
import { StockService } from '../services/stockService';
import { useStore } from './useStore';

export interface UseStockAlertsReturn {
  // Estado
  alerts: StockAlert[];
  reorderReport: ReorderReport | null;
  isLoading: boolean;
  error: string | null;

  // Ações
  getStockAlerts: (filters?: any) => Promise<void>;
  acknowledgeAlert: (alertId: string, userId: string) => Promise<void>;
  generateReorderReport: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
  clearError: () => void;
}

export function useStockAlerts(): UseStockAlertsReturn {
  const { currentStore } = useStore();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [reorderReport, setReorderReport] = useState<ReorderReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Obter alertas de stock
   */
  const getStockAlerts = useCallback(
    async (filters?: any) => {
      if (!currentStore?.storeId) {
        setError('Loja não selecionada');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const loadedAlerts = await StockService.getStockAlerts(
          currentStore.storeId,
          filters
        );

        setAlerts(loadedAlerts);

        console.log(`✅ ${loadedAlerts.length} alertas de stock carregados`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar alertas';
        setError(errorMessage);
        console.error('Erro ao carregar alertas:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [currentStore?.storeId]
  );

  /**
   * Reconhecer alerta
   */
  const acknowledgeAlert = useCallback(
    async (alertId: string, userId: string) => {
      if (!currentStore?.storeId) {
        setError('Loja não selecionada');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        await StockService.acknowledgeStockAlert(currentStore.storeId, alertId, userId);

        // Atualizar lista local
        setAlerts((prev) =>
          prev.map((alert) =>
            alert.id === alertId
              ? { ...alert, acknowledgedAt: new Date().toISOString() }
              : alert
          )
        );

        console.log(`✅ Alerta reconhecido: ${alertId}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao reconhecer alerta';
        setError(errorMessage);
        console.error('Erro ao reconhecer alerta:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [currentStore?.storeId]
  );

  /**
   * Gerar relatório de reabastecimento
   */
  const generateReorderReport = useCallback(async () => {
    if (!currentStore?.storeId) {
      setError('Loja não selecionada');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const report = await StockService.generateReorderReport(currentStore.storeId);
      setReorderReport(report);

      console.log(`✅ Relatório de reabastecimento gerado: ${report.totalItems} itens`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar relatório';
      setError(errorMessage);
      console.error('Erro ao gerar relatório:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentStore?.storeId]);

  /**
   * Atualizar tudo
   */
  const refreshAlerts = useCallback(async () => {
    await getStockAlerts({ resolved: false });
    await generateReorderReport();
  }, [getStockAlerts, generateReorderReport]);

  /**
   * Limpar erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Carregar alertas ao montar ou mudar de loja
  useEffect(() => {
    if (currentStore?.storeId) {
      refreshAlerts();
    }
  }, [currentStore?.storeId, refreshAlerts]);

  return {
    // Estado
    alerts,
    reorderReport,
    isLoading,
    error,

    // Ações
    getStockAlerts,
    acknowledgeAlert,
    generateReorderReport,
    refreshAlerts,
    clearError,
  };
}
