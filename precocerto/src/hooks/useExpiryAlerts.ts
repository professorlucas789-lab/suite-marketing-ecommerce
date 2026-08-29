/**
 * Hook: useExpiryAlerts
 * Gerenciar alertas de validade de produtos
 * FASE 1: Notificações Inteligentes
 *
 * Fornece interface reativa para:
 * - Buscar produtos expirando
 * - Listar alertas com filtros
 * - Reconhecer/resolver alertas
 * - Obter resumo de alertas
 */

import { useState, useCallback, useEffect } from 'react';
import { ExpiryAlert, AlertSeverity } from '../types/notifications';
import { ExpiryAlertService } from '../services/expiryAlertService';
import { useStore } from './useStore';

export interface UseExpiryAlertsReturn {
  // Estado
  alerts: ExpiryAlert[];
  alertsSummary: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
  isLoading: boolean;
  error: string | null;

  // Ações
  checkExpiringProducts: (daysThreshold?: number) => Promise<ExpiryAlert[]>;
  listAlerts: (filters?: {
    severity?: AlertSeverity;
    resolved?: boolean;
    limit?: number;
  }) => Promise<void>;
  acknowledgeAlert: (alertId: string, userId: string) => Promise<void>;
  resolveAlert: (alertId: string, userId: string, reason: string) => Promise<void>;
  refreshAlerts: () => Promise<void>;
  getAlertsSummary: () => Promise<void>;
  clearError: () => void;
}

export function useExpiryAlerts(): UseExpiryAlertsReturn {
  const { currentStore } = useStore();
  const [alerts, setAlerts] = useState<ExpiryAlert[]>([]);
  const [alertsSummary, setAlertsSummary] = useState({
    critical: 0,
    warning: 0,
    info: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Verificar produtos expirando
   */
  const checkExpiringProducts = useCallback(
    async (daysThreshold: number = 60): Promise<ExpiryAlert[]> => {
      if (!currentStore?.storeId) {
        setError('Loja não selecionada');
        return [];
      }

      try {
        setIsLoading(true);
        setError(null);

        const expiringProducts = await ExpiryAlertService.checkExpiringProducts(
          currentStore.storeId,
          daysThreshold
        );

        console.log(
          `✅ ${expiringProducts.length} produtos expirando nos próximos ${daysThreshold} dias`
        );

        return expiringProducts;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao verificar produtos';
        setError(errorMessage);
        console.error('Erro ao verificar produtos expirando:', err);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [currentStore?.storeId]
  );

  /**
   * Listar alertas com filtros
   */
  const listAlerts = useCallback(
    async (filters?: {
      severity?: AlertSeverity;
      resolved?: boolean;
      limit?: number;
    }) => {
      if (!currentStore?.storeId) {
        setError('Loja não selecionada');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const loadedAlerts = await ExpiryAlertService.listAlerts(
          currentStore.storeId,
          filters
        );

        setAlerts(loadedAlerts);

        console.log(`✅ ${loadedAlerts.length} alertas carregados`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao listar alertas';
        setError(errorMessage);
        console.error('Erro ao listar alertas:', err);
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

        await ExpiryAlertService.acknowledgeAlert(currentStore.storeId, alertId, userId);

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
   * Resolver alerta
   */
  const resolveAlert = useCallback(
    async (alertId: string, userId: string, reason: string) => {
      if (!currentStore?.storeId) {
        setError('Loja não selecionada');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        await ExpiryAlertService.resolveAlert(
          currentStore.storeId,
          alertId,
          userId,
          reason
        );

        // Atualizar lista local
        setAlerts((prev) =>
          prev.map((alert) =>
            alert.id === alertId
              ? { ...alert, resolvedAt: new Date().toISOString() }
              : alert
          )
        );

        console.log(`✅ Alerta resolvido: ${alertId}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao resolver alerta';
        setError(errorMessage);
        console.error('Erro ao resolver alerta:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [currentStore?.storeId]
  );

  /**
   * Obter resumo de alertas
   */
  const getAlertsSummary = useCallback(async () => {
    if (!currentStore?.storeId) {
      setError('Loja não selecionada');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const summary = await ExpiryAlertService.getAlertsSummary(currentStore.storeId);
      setAlertsSummary(summary);

      console.log(`✅ Resumo de alertas: ${summary.total} total`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao obter resumo';
      setError(errorMessage);
      console.error('Erro ao obter resumo de alertas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentStore?.storeId]);

  /**
   * Recarregar alertas e resumo
   */
  const refreshAlerts = useCallback(async () => {
    if (!currentStore?.storeId) {
      setError('Loja não selecionada');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Listar alertas não resolvidos
      await listAlerts({ resolved: false, limit: 100 });

      // Obter resumo
      await getAlertsSummary();

      console.log('✅ Alertas recarregados');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao recarregar';
      setError(errorMessage);
      console.error('Erro ao recarregar alertas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentStore?.storeId, listAlerts, getAlertsSummary]);

  /**
   * Limpar erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Recarregar alertas ao mudar de loja
  useEffect(() => {
    if (currentStore?.storeId) {
      refreshAlerts();
    }
  }, [currentStore?.storeId, refreshAlerts]);

  return {
    // Estado
    alerts,
    alertsSummary,
    isLoading,
    error,

    // Ações
    checkExpiringProducts,
    listAlerts,
    acknowledgeAlert,
    resolveAlert,
    refreshAlerts,
    getAlertsSummary,
    clearError,
  };
}
