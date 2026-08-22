/**
 * Hook customizado para gerenciar alertas de validade
 * OTIMIZADO: Usa real-time listeners (onSnapshot) em vez de polling
 *
 * Padrão de retorno: [data, loading, error, actions]
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, where, QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase';
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
   * OTIMIZADO: Usar real-time listeners em vez de polling
   * Reduz queries Firestore e melhora responsividade
   */
  useEffect(() => {
    if (!storeId) {
      setState({
        alerts: [],
        summary: { critical: 0, warning: 0, info: 0, total: 0 },
        loading: false,
        error: 'storeId não fornecido',
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const alertsRef = collection(db, 'stores', storeId, 'expiryAlerts');
      const constraints: QueryConstraint[] = [];

      // Aplicar filtros
      if (filterSeverity !== 'ALL') {
        constraints.push(where('severity', '==', filterSeverity));
      }

      if (filterResolved !== 'ALL') {
        if (filterResolved === false) {
          constraints.push(where('resolvedAt', '==', null));
        } else if (filterResolved === true) {
          constraints.push(where('resolvedAt', '!=', null));
        }
      }

      const q = query(alertsRef, ...constraints);

      // Real-time listener - atualiza automaticamente quando dados mudam
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const alerts: ExpiryAlert[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as ExpiryAlert[];

          // Calcular resumo
          const summary = {
            critical: alerts.filter((a) => a.severity === 'CRITICAL').length,
            warning: alerts.filter((a) => a.severity === 'WARNING').length,
            info: alerts.filter((a) => a.severity === 'INFO').length,
            total: alerts.length,
          };

          setState({
            alerts,
            summary,
            loading: false,
            error: null,
          });
        },
        (error) => {
          console.error('Erro ao escutar alertas:', error);
          setState((prev) => ({
            ...prev,
            loading: false,
            error: 'Erro ao carregar alertas em tempo real',
          }));
        }
      );

      return () => unsubscribe();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao configurar listener';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [storeId, filterSeverity, filterResolved]);

  /**
   * Recarregar alertas manualmente (fallback para casos edge)
   */
  const loadAlerts = useCallback(async () => {
    if (!storeId) return;

    try {
      const alerts = await ExpiryAlertService.listAlerts(storeId);
      const summary = await ExpiryAlertService.getAlertsSummary(storeId);

      setState({
        alerts,
        summary,
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao recarregar alertas';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [storeId]);

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
