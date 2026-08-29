/**
 * Hook para Automação de Análises
 * FASE 8: Cloud Functions Automáticas
 *
 * Gerencia configuração e execução de análises automáticas
 */

import { useState, useEffect, useCallback } from 'react';
import { useStore } from './useStore';
import { AutomationService } from '../services/automationService';
import { NotificationService } from '../services/notificationService';
import {
  AutomationConfig,
  AutomationExecutionLog,
  AnomalyReport,
  WeeklyReport,
} from '../types/automation';
import { Product, Sale } from '../types/store';

interface UseAutomationState {
  config: AutomationConfig | null;
  isLoading: boolean;
  error: string | null;

  // Execução
  lastExecutionLog: AutoomationExecutionLog | null;
  isExecuting: boolean;

  // Relatórios
  lastAnomalyReport: AnomalyReport | null;
  lastWeeklyReport: WeeklyReport | null;
}

export function useAutomation() {
  const { currentStore } = useStore();
  const [state, setState] = useState<UseAutomationState>({
    config: null,
    isLoading: false,
    error: null,
    lastExecutionLog: null,
    isExecuting: false,
    lastAnomalyReport: null,
    lastWeeklyReport: null,
  });

  /**
   * Carregar configuração de automação
   */
  useEffect(() => {
    if (!currentStore?.storeId) return;

    const loadConfig = async () => {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const config = await AutomationService.getAutomationConfig(currentStore.storeId);
        setState((prev) => ({
          ...prev,
          config,
          isLoading: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Erro ao carregar configuração',
          isLoading: false,
        }));
      }
    };

    loadConfig();
  }, [currentStore?.storeId]);

  /**
   * Atualizar configuração de automação
   */
  const updateConfig = useCallback(
    async (updates: Partial<AutomationConfig>) => {
      if (!currentStore?.storeId) return;

      try {
        AutomationService.validateAutomationConfig(updates);
        await AutomationService.updateAutomationConfig(currentStore.storeId, updates);

        setState((prev) => ({
          ...prev,
          config: prev.config
            ? {
                ...prev.config,
                ...updates,
                updatedAt: new Date().toISOString(),
              }
            : null,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Erro ao atualizar configuração',
        }));
        throw err;
      }
    },
    [currentStore?.storeId]
  );

  /**
   * Executar análise preditiva manualmente
   */
  const executeAnalysis = useCallback(
    async (products: Product[], sales: Sale[]) => {
      if (!currentStore?.storeId) return;

      setState((prev) => ({ ...prev, isExecuting: true }));
      try {
        const log = await AutomationService.runAutomaticAnalysis(
          currentStore.storeId,
          products,
          sales
        );

        setState((prev) => ({
          ...prev,
          lastExecutionLog: log,
          isExecuting: false,
        }));

        return log;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Erro ao executar análise',
          isExecuting: false,
        }));
        throw err;
      }
    },
    [currentStore?.storeId]
  );

  /**
   * Gerar relatório de anomalias
   */
  const generateAnomalyReport = useCallback(
    async (fromDate: Date, toDate: Date) => {
      if (!currentStore?.storeId) return;

      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const report = await AutomationService.generateAnomalyReport(
          currentStore.storeId,
          fromDate,
          toDate
        );

        setState((prev) => ({
          ...prev,
          lastAnomalyReport: report,
          isLoading: false,
        }));

        return report;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Erro ao gerar relatório',
          isLoading: false,
        }));
        throw err;
      }
    },
    [currentStore?.storeId]
  );

  /**
   * Gerar relatório semanal
   */
  const generateWeeklyReport = useCallback(
    async (
      startDate: Date,
      endDate: Date,
      kpis: Record<string, any>
    ) => {
      if (!currentStore?.storeId) return;

      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const report = await AutomationService.generateWeeklyReport(
          currentStore.storeId,
          startDate,
          endDate,
          kpis
        );

        setState((prev) => ({
          ...prev,
          lastWeeklyReport: report,
          isLoading: false,
        }));

        return report;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Erro ao gerar relatório semanal',
          isLoading: false,
        }));
        throw err;
      }
    },
    [currentStore?.storeId]
  );

  /**
   * Testar configuração de notificação
   */
  const testNotificationChannel = useCallback(
    async (
      channel: 'email' | 'whatsapp' | 'sms',
      recipient: string
    ): Promise<boolean> => {
      try {
        return await NotificationService.testNotificationConfig(
          currentStore?.storeId || '',
          channel,
          recipient
        );
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Erro ao testar canal de notificação',
        }));
        return false;
      }
    },
    [currentStore?.storeId]
  );

  /**
   * Limpar erro
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // Estado
    config: state.config,
    isLoading: state.isLoading,
    error: state.error,
    isExecuting: state.isExecuting,

    // Relatórios
    lastExecutionLog: state.lastExecutionLog,
    lastAnomalyReport: state.lastAnomalyReport,
    lastWeeklyReport: state.lastWeeklyReport,

    // Ações
    updateConfig,
    executeAnalysis,
    generateAnomalyReport,
    generateWeeklyReport,
    testNotificationChannel,
    clearError,

    // Helpers
    isConfigured: state.config?.enableAutoAnalysis || false,
    nextExecutionTime: state.config?.nextExecutionAt,
  };
}
