/**
 * Hook para Sistema de Auditoria
 * Fase 6: Segurança e Auditoria
 */

import { useCallback, useState } from 'react';
import type { AuditEntry, AuditFilter, AuditStats, AccessLog, SecurityAlert } from '../types/audit';

export function useAudit() {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Log uma ação na auditoria
   */
  const logAction = useCallback(
    async (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
      try {
        setLoading(true);
        setError(null);

        const auditEntry: AuditEntry = {
          ...entry,
          id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
        };

        // Adicionar localmente
        setAuditEntries((prev) => [auditEntry, ...prev]);

        // Em produção, enviar para backend
        // await fetch('/api/audit/log', { method: 'POST', body: JSON.stringify(auditEntry) });

        // Verificar se precisa gerar alerta
        checkForSecurityAlerts(auditEntry);

        return auditEntry;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao registar auditoria';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Log de acesso de utilizador
   */
  const logAccess = useCallback(
    async (userId: string, storeId: string, accessType: AccessLog['accessType']) => {
      try {
        const accessLog: AccessLog = {
          id: `access-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          userName: 'User', // obtido do contexto em produção
          storeId,
          storeName: 'Store', // obtido do contexto em produção
          accessTime: new Date().toISOString(),
          duration: 0,
          ipAddress: 'unknown',
          userAgent: navigator.userAgent,
          accessType,
          status: 'ACTIVE',
        };

        setAccessLogs((prev) => [accessLog, ...prev]);
        return accessLog;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao registar acesso';
        setError(message);
      }
    },
    []
  );

  /**
   * Fechar sessão de acesso
   */
  const closeAccessLog = useCallback((accessLogId: string) => {
    setAccessLogs((prev) =>
      prev.map((log) =>
        log.id === accessLogId
          ? {
              ...log,
              exitTime: new Date().toISOString(),
              status: 'CLOSED' as const,
              duration: Math.floor(
                (new Date().getTime() - new Date(log.accessTime).getTime()) / 1000
              ),
            }
          : log
      )
    );
  }, []);

  /**
   * Filtrar entradas de auditoria
   */
  const filterAuditEntries = useCallback(
    (filter: AuditFilter): AuditEntry[] => {
      return auditEntries.filter((entry) => {
        if (filter.userId && entry.userId !== filter.userId) return false;
        if (filter.storeId && entry.storeId !== filter.storeId) return false;
        if (filter.action && entry.action !== filter.action) return false;
        if (filter.actionType && entry.actionType !== filter.actionType) return false;
        if (filter.entityType && entry.entityType !== filter.entityType) return false;
        if (filter.severity && entry.severity !== filter.severity) return false;
        if (filter.status && entry.status !== filter.status) return false;

        if (filter.startDate && filter.endDate) {
          const entryDate = new Date(entry.timestamp);
          const startDate = new Date(filter.startDate);
          const endDate = new Date(filter.endDate);
          if (entryDate < startDate || entryDate > endDate) return false;
        }

        return true;
      });
    },
    [auditEntries]
  );

  /**
   * Obter estatísticas de auditoria
   */
  const getAuditStats = useCallback(
    (storeId?: string): AuditStats => {
      const filtered = storeId
        ? auditEntries.filter((e) => e.storeId === storeId)
        : auditEntries;

      const loginEntries = filtered.filter((e) => e.actionType === 'LOGIN');
      const failureEntries = filtered.filter((e) => e.status === 'FAILURE');
      const criticalEntries = filtered.filter((e) => e.severity === 'CRITICAL');

      const uniqueUsers = new Set(filtered.map((e) => e.userId)).size;

      const actionCounts: Record<string, number> = {};
      filtered.forEach((entry) => {
        actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
      });

      const userActivity = Array.from(
        new Set(filtered.map((e) => e.userId))
      ).map((userId) => {
        const userEntries = filtered.filter((e) => e.userId === userId);
        return {
          userId,
          userName: userEntries[0]?.userName || 'Unknown',
          actionCount: userEntries.length,
          lastActivity: userEntries[0]?.timestamp || '',
        };
      });

      return {
        totalEntries: filtered.length,
        totalLogins: loginEntries.length,
        totalFailures: failureEntries.length,
        uniqueUsers,
        criticalEvents: criticalEntries.length,
        dateRange: {
          start: filtered[filtered.length - 1]?.timestamp || new Date().toISOString(),
          end: filtered[0]?.timestamp || new Date().toISOString(),
        },
        actionCounts,
        userActivity,
      };
    },
    [auditEntries]
  );

  /**
   * Verificar se há atividades suspeitas
   */
  const checkForSecurityAlerts = useCallback((entry: AuditEntry) => {
    const alerts: SecurityAlert[] = [];

    // Múltiplas tentativas de login falhadas
    if (entry.actionType === 'LOGIN' && entry.status === 'FAILURE') {
      const recentFailures = auditEntries.filter(
        (e) =>
          e.userId === entry.userId &&
          e.actionType === 'LOGIN' &&
          e.status === 'FAILURE' &&
          new Date(e.timestamp).getTime() > Date.now() - 30 * 60 * 1000 // últimos 30 min
      );

      if (recentFailures.length >= 3) {
        alerts.push({
          id: `alert-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'MULTIPLE_FAILURES',
          severity: 'CRITICAL',
          userId: entry.userId,
          userName: entry.userName,
          description: `${recentFailures.length} tentativas de login falhadas`,
          details: {
            userId: entry.userId,
            attempts: recentFailures.length,
            lastAttempt: entry.timestamp,
          },
          resolved: false,
        });
      }
    }

    // Tentativa de acesso não autorizado
    if (entry.action === 'UNAUTHORIZED_ACCESS_ATTEMPT') {
      alerts.push({
        id: `alert-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'CRITICAL',
        userId: entry.userId,
        userName: entry.userName,
        storeId: entry.storeId,
        storeName: entry.storeName,
        description: `Tentativa de acesso não autorizado à loja ${entry.storeName}`,
        details: entry.metadata,
        resolved: false,
      });
    }

    // Atividade incomum (muitas ações em pouco tempo)
    if (entry.actionType === 'DELETE') {
      const recentActions = auditEntries.filter(
        (e) =>
          e.userId === entry.userId &&
          new Date(e.timestamp).getTime() > Date.now() - 5 * 60 * 1000 // últimos 5 min
      );

      if (recentActions.length > 10) {
        alerts.push({
          id: `alert-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'UNUSUAL_ACTIVITY',
          severity: 'WARNING',
          userId: entry.userId,
          userName: entry.userName,
          description: `Atividade incomum detectada: ${recentActions.length} ações em 5 minutos`,
          details: {
            actionCount: recentActions.length,
            timeWindow: '5 minutos',
          },
          resolved: false,
        });
      }
    }

    // Adicionar alertas
    if (alerts.length > 0) {
      setSecurityAlerts((prev) => [...alerts, ...prev]);
    }
  }, [auditEntries]);

  /**
   * Resolver alerta de segurança
   */
  const resolveSecurityAlert = useCallback(
    (alertId: string, resolvedBy: string) => {
      setSecurityAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId
            ? {
                ...alert,
                resolved: true,
                resolvedAt: new Date().toISOString(),
                resolvedBy,
              }
            : alert
        )
      );
    },
    []
  );

  /**
   * Obter alertas ativos
   */
  const getActiveAlerts = useCallback((): SecurityAlert[] => {
    return securityAlerts.filter((a) => !a.resolved);
  }, [securityAlerts]);

  /**
   * Limpar auditoria antiga (mais de 90 dias)
   */
  const purgeOldAuditEntries = useCallback((daysOld: number = 90) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const beforeCount = auditEntries.length;
    setAuditEntries((prev) =>
      prev.filter((entry) => new Date(entry.timestamp) > cutoffDate)
    );

    const purgCount = beforeCount - auditEntries.length;
    return purgCount;
  }, [auditEntries.length]);

  return {
    // Estado
    auditEntries,
    accessLogs,
    securityAlerts,
    loading,
    error,

    // Funções
    logAction,
    logAccess,
    closeAccessLog,
    filterAuditEntries,
    getAuditStats,
    resolveSecurityAlert,
    getActiveAlerts,
    purgeOldAuditEntries,
  };
}
