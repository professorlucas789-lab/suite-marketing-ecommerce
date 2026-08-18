/**
 * Hook customizado para gerenciar alertas de validade
 * Semana 1: Padrão reutilizável seguindo arquitetura existente
 *
 * Padrão de retorno: [data, loading, error, actions]
 */

import { useState, useEffect, useCallback } from 'react';
import { ExpiryAlert, AlertSeverity } from '../types/notifications';
import { ExpiryAlertService } from '../services/expiryAlertService';

export interface ExpiryAlertsState {
  alerts: ExpiryAlert[];
  summary: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
  loading: boolean;
  error: string | null;
}

export interface ExpiryAlertsActions {
  // Ações para alertas
  acknowledgeAlert: (alertId: string, userId: string) => Promise<void>;
  resolveAlert: (alertId: string, userId: string, reason: string) => Promise<void>;
  refetch: () => Promise<void>;

  // Filtros
  filterBySeverity: (severity: AlertSeverity | 'ALL') => void;
  filterByResolved: (resolved: boolean | 'ALL') => void;
}

export function useExpiryAlerts(storeId: string): [ExpiryAlertsState, ExpiryAlertsActions] {
  const [state, setState] = useState<ExpiryAlertsState>({
    alerts: [],
    summary: {
      critical: 0,
      warning: 0,
      info: 0,
      total: 0,
    },
    loading: true,
    error: null,
  });

  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'ALL'>('ALL');
  const [filterResolved, setFilterResolved] = useState<boolean | 'ALL'>('ALL');

  /**
   * Carregar alertas quando storeId muda ou filtros mudam
   */
  const loadAlerts = useCallback(async () => {
    if (!storeId) {
      setState({
        alerts: [],
        summary: { critical: 0, warning: 0, info: 0, total: 0 },
        loading: false,
        error: 'storeId não fornecido',
      });
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      // Determinar filtros
      const filters: any = {};
      if (filterSeverity !== 'ALL') {
        filters.severity = filterSeverity;
      }
      if (filterResolved !== 'ALL') {
        filters.resolved = filterResolved === true;
      }

      // Buscar alertas
      const alerts = await ExpiryAlertService.listAlerts(storeId, filters);

      // Buscar resumo
      const summary = await ExpiryAlertService.getAlertsSummary(storeId);

      setState({
        alerts,
        summary,
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar alertas';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [storeId, filterSeverity, filterResolved]);

  /**
   * Carregar alertas ao montar componente ou quando storeId/filtros mudam
   */
  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  /**
   * Reconhecer alerta
   */
  const acknowledgeAlert = useCallback(
    async (alertId: string, userId: string) => {
      try {
        await ExpiryAlertService.acknowledgeAlert(storeId, alertId, userId);
        // Recarregar alertas
        await loadAlerts();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao reconhecer alerta';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
      }
    },
    [storeId, loadAlerts]
  );

  /**
   * Resolver alerta
   */
  const resolveAlert = useCallback(
    async (alertId: string, userId: string, reason: string) => {
      try {
        await ExpiryAlertService.resolveAlert(storeId, alertId, userId, reason);
        // Recarregar alertas
        await loadAlerts();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao resolver alerta';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
      }
    },
    [storeId, loadAlerts]
  );

  /**
   * Filtrar por severidade
   */
  const filterBySeverity = useCallback((severity: AlertSeverity | 'ALL') => {
    setFilterSeverity(severity);
  }, []);

  /**
   * Filtrar por status resolvido
   */
  const filterByResolved = useCallback((resolved: boolean | 'ALL') => {
    setFilterResolved(resolved);
  }, []);

  /**
   * Recarregar alertas manualmente
   */
  const refetch = useCallback(async () => {
    await loadAlerts();
  }, [loadAlerts]);

  const actions: ExpiryAlertsActions = {
    acknowledgeAlert,
    resolveAlert,
    refetch,
    filterBySeverity,
    filterByResolved,
  };

  return [state, actions];
}

/**
 * Hook para monitorar alertas críticos em tempo real
 * Útil para mostrar notificações urgentes no dashboard
 */
export function useCriticalExpiryAlerts(storeId: string): {
  criticalAlerts: ExpiryAlert[];
  warningAlerts: ExpiryAlert[];
  loading: boolean;
  error: string | null;
} {
  const [state, actions] = useExpiryAlerts(storeId);

  const criticalAlerts = state.alerts.filter((alert) => alert.severity === 'CRITICAL');
  const warningAlerts = state.alerts.filter((alert) => alert.severity === 'WARNING');

  return {
    criticalAlerts,
    warningAlerts,
    loading: state.loading,
    error: state.error,
  };
}

/**
 * Hook para verificar se há alertas não resolvidos
 */
export function useHasUnresolvedAlerts(storeId: string): {
  hasAlerts: boolean;
  count: number;
  criticalCount: number;
} {
  const [state] = useExpiryAlerts(storeId);

  return {
    hasAlerts: state.alerts.length > 0,
    count: state.alerts.length,
    criticalCount: state.summary.critical,
  };
}
