/**
 * useStockAlerts Hook
 * Gerenciar alertas de stock baixo
 * Padrão: [data, loading, error, actions]
 */

import { useState, useCallback, useEffect } from 'react';
import {
  checkLowStockAlerts,
  upsertStockAlertConfig,
} from '../services/stockService';
import { StockAlert, StockAlertConfig } from '../types/inventory';

interface UseStockAlertsOptions {
  storeId?: string;
  autoFetch?: boolean;
  refreshInterval?: number; // ms
}

export function useStockAlerts(options: UseStockAlertsOptions = {}) {
  const { storeId = '', autoFetch = true, refreshInterval = 60000 } = options; // 60s padrão

  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar alertas
  const fetchAlerts = useCallback(async () => {
    if (!storeId) return;

    try {
      setLoading(true);
      setError(null);

      const result = await checkLowStockAlerts(storeId);
      setAlerts(result);
      console.log(`✅ [useStockAlerts] ${result.length} alertas carregados`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar alertas';
      setError(message);
      console.error('❌ [useStockAlerts] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  // Auto-fetch ao montar
  useEffect(() => {
    if (autoFetch && storeId) {
      fetchAlerts();

      // Refresh periódico
      const interval = setInterval(fetchAlerts, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [storeId, autoFetch, refreshInterval, fetchAlerts]);

  // Configurar alerta
  const configureAlert = useCallback(
    async (config: Omit<StockAlertConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        setError(null);
        const result = await upsertStockAlertConfig(config);
        console.log('✅ [useStockAlerts] Configuração salva:', result.id);
        // Recarregar alertas
        await fetchAlerts();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao salvar configuração';
        setError(message);
        console.error('❌ [useStockAlerts] Erro:', err);
        return null;
      }
    },
    [fetchAlerts]
  );

  // Reconhecer alerta
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              acknowledgedAt: new Date().toISOString(),
            }
          : a
      )
    );
    console.log('✅ [useStockAlerts] Alerta reconhecido:', alertId);
  }, []);

  // Filtros rápidos
  const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL');
  const warningAlerts = alerts.filter((a) => a.severity === 'WARNING');
  const infoAlerts = alerts.filter((a) => a.severity === 'INFO');

  return {
    alerts,
    loading,
    error,
    fetchAlerts,
    configureAlert,
    acknowledgeAlert,
    // Filtros
    criticalAlerts,
    warningAlerts,
    infoAlerts,
  };
}
