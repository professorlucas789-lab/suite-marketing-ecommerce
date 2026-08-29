/**
 * Hook: useStockAlerts
 * Gerenciar alertas de stock baixo
 * FASE 2: Gestão de Estoque Automática
 */

import { useState, useCallback, useEffect } from 'react';
import { StockAlert, ReorderReport } from '../types/inventory';
import { StockService } from '../services/stockService';
import { useStore } from '../contexts/StoreContext';

const normalizeStockAlerts = (alerts: StockAlert[] | null | undefined): StockAlert[] =>
  Array.isArray(alerts)
    ? alerts.filter((alert): alert is StockAlert =>
        Boolean(alert && typeof alert === 'object' && alert.productId)
      )
    : [];

const normalizeReorderReport = (report: ReorderReport | null | undefined): ReorderReport | null => {
  if (!report) return null;

  const itemsToReorder = Array.isArray(report.itemsToReorder)
    ? report.itemsToReorder.filter((item) => Boolean(item && typeof item === 'object' && item.productId))
    : [];

  return {
    ...report,
    itemsToReorder,
    totalItems: itemsToReorder.length,
    totalSuggestedCost: itemsToReorder.reduce(
      (sum, item) => sum + (Number(item.estimatedCost) || 0),
      0
    ),
  };
};

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

        setAlerts(normalizeStockAlerts(loadedAlerts));

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
          normalizeStockAlerts(prev).map((alert) =>
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
      const safeReport = normalizeReorderReport(report);
      setReorderReport(safeReport);

      console.log(`✅ Relatório de reabastecimento gerado: ${safeReport?.totalItems || 0} itens`);
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
