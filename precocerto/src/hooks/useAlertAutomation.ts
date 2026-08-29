/**
 * Hook: useAlertAutomation
 * Gerenciar e executar jobs de automação de alertas
 * FASE 4: Otimizações
 */

import { useState, useCallback, useEffect } from 'react';
import {
  AlertAutomationScheduler,
  ScheduledJob,
  AlertAggregation,
} from '../services/alertAutomationScheduler';

export interface AutomationJobResult {
  jobName: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startedAt?: string;
  completedAt?: string;
  result?: any;
  error?: string;
}

export interface UseAlertAutomationReturn {
  // Estado
  jobs: ScheduledJob[];
  jobResults: AutomationJobResult[];
  isLoading: boolean;
  error: string | null;

  // Ações
  loadJobs: () => Promise<void>;
  runDailyExpiryCheck: () => Promise<void>;
  runDailyLowStockCheck: () => Promise<void>;
  runRetryFailedNotifications: () => Promise<void>;
  runDailyAlertReplication: () => Promise<void>;
  runDailyAlertAggregation: () => Promise<void>;
  runEscalateAlerts: () => Promise<void>;
  runMonthlyArchival: () => Promise<void>;

  // Gestão de jobs
  registerJob: (
    job: Omit<ScheduledJob, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
}

export function useAlertAutomation(): UseAlertAutomationReturn {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [jobResults, setJobResults] = useState<AutomationJobResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carregar lista de jobs agendados
   */
  const loadJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const loadedJobs = await AlertAutomationScheduler.listScheduledJobs();
      setJobs(loadedJobs);

      console.log(`✅ ${loadedJobs.length} jobs carregados`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar jobs';
      setError(errorMessage);
      console.error('Erro ao carregar jobs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Executar job e registar resultado
   */
  const executeJob = useCallback(
    async (jobName: string, jobFn: () => Promise<any>) => {
      const jobResult: AutomationJobResult = {
        jobName,
        status: 'running',
        startedAt: new Date().toISOString(),
      };

      // Atualizar estado
      setJobResults((prev) => [...prev, jobResult]);

      try {
        console.log(`🚀 Executando job: ${jobName}`);

        const result = await jobFn();

        // Marcar como sucesso
        setJobResults((prev) =>
          prev.map((r) =>
            r.jobName === jobName
              ? {
                  ...r,
                  status: 'success',
                  completedAt: new Date().toISOString(),
                  result,
                }
              : r
          )
        );

        console.log(`✅ Job concluído: ${jobName}`, result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';

        // Marcar como falha
        setJobResults((prev) =>
          prev.map((r) =>
            r.jobName === jobName
              ? {
                  ...r,
                  status: 'failed',
                  completedAt: new Date().toISOString(),
                  error: errorMessage,
                }
              : r
          )
        );

        console.error(`❌ Job falhou: ${jobName}`, err);
      }
    },
    []
  );

  /**
   * Executar verificação diária de validade
   */
  const runDailyExpiryCheck = useCallback(async () => {
    await executeJob('dailyExpiryCheck', () =>
      AlertAutomationScheduler.dailyExpiryCheck()
    );
  }, [executeJob]);

  /**
   * Executar verificação diária de stock
   */
  const runDailyLowStockCheck = useCallback(async () => {
    await executeJob('dailyLowStockCheck', () =>
      AlertAutomationScheduler.dailyLowStockCheck()
    );
  }, [executeJob]);

  /**
   * Executar retry de notificações falhadas
   */
  const runRetryFailedNotifications = useCallback(async () => {
    await executeJob('retryFailedNotifications', () =>
      AlertAutomationScheduler.retryFailedNotifications()
    );
  }, [executeJob]);

  /**
   * Executar replicação diária de alertas
   */
  const runDailyAlertReplication = useCallback(async () => {
    await executeJob('dailyAlertReplication', () =>
      AlertAutomationScheduler.dailyAlertReplication()
    );
  }, [executeJob]);

  /**
   * Executar agregação diária de alertas
   */
  const runDailyAlertAggregation = useCallback(async () => {
    await executeJob('dailyAlertAggregation', () =>
      AlertAutomationScheduler.dailyAlertAggregation()
    );
  }, [executeJob]);

  /**
   * Executar escalação automática de alertas
   */
  const runEscalateAlerts = useCallback(async () => {
    await executeJob('escalateAlerts', () =>
      AlertAutomationScheduler.escalateAlertsAutomatically()
    );
  }, [executeJob]);

  /**
   * Executar arquivação mensal
   */
  const runMonthlyArchival = useCallback(async () => {
    await executeJob('monthlyArchival', () =>
      AlertAutomationScheduler.monthlyAlertArchival()
    );
  }, [executeJob]);

  /**
   * Registar novo job agendado
   */
  const registerJob = useCallback(
    async (job: Omit<ScheduledJob, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        await AlertAutomationScheduler.registerScheduledJob(job);
        await loadJobs(); // Recarregar lista
        console.log(`✅ Job registado: ${job.name}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao registar job';
        setError(errorMessage);
        console.error('Erro ao registar job:', err);
      }
    },
    [loadJobs]
  );

  // Carregar jobs ao montar
  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  return {
    jobs,
    jobResults,
    isLoading,
    error,
    loadJobs,
    runDailyExpiryCheck,
    runDailyLowStockCheck,
    runRetryFailedNotifications,
    runDailyAlertReplication,
    runDailyAlertAggregation,
    runEscalateAlerts,
    runMonthlyArchival,
    registerJob,
  };
}
