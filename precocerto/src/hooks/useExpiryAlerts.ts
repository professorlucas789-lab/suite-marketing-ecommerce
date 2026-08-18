/**
 * useExpiryAlerts Hook
 * Hook para gerenciar alertas de validade
 * NOVO (Fase 13): Notificações inteligentes
 */

import { useEffect, useState } from 'react';
import { ExpiryAlert } from '../types/alerts';
import {
  subscribeToAlerts,
  getActiveAlerts,
  resolveAlert,
  checkExpiringProducts,
} from '../services/expiryAlertService';

interface UseExpiryAlertsProps {
  storeId: string;
}

export function useExpiryAlerts({ storeId }: UseExpiryAlertsProps) {
  const [alerts, setAlerts] = useState<ExpiryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`📌 Subscrevendo a alertas da loja: ${storeId}`);
      const unsubscribe = subscribeToAlerts(storeId, (updatedAlerts) => {
        setAlerts(updatedAlerts);
        setLoading(false);
      });

      return unsubscribe;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      setLoading(false);
    }
  }, [storeId]);

  // Operations
  const handleResolveAlert = async (
    alertId: string,
    motivo: string,
    userId: string
  ) => {
    if (!storeId) throw new Error('Store ID não fornecido');
    await resolveAlert(storeId, alertId, motivo, userId);
    // Atualizar lista local
    setAlerts(alerts.filter((a) => a.id !== alertId));
  };

  const handleCheckExpiring = async () => {
    if (!storeId) throw new Error('Store ID não fornecido');
    return checkExpiringProducts(storeId);
  };

  // Contadores
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING').length;
  const infoCount = alerts.filter((a) => a.severity === 'INFO').length;

  return {
    alerts,
    loading,
    error,
    criticalCount,
    warningCount,
    infoCount,
    totalAlerts: alerts.length,
    resolveAlert: handleResolveAlert,
    checkExpiring: handleCheckExpiring,
    getAlertsBySeverity: (severity: 'CRITICAL' | 'WARNING' | 'INFO') =>
      alerts.filter((a) => a.severity === severity),
  };
}
