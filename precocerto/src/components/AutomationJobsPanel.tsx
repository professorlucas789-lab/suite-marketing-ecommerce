/**
 * AutomationJobsPanel Component
 * Painel para gerenciar e monitorar jobs agendados
 * FASE 4: Otimizações
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader,
  RefreshCw,
  Plus,
  Pause,
  RotateCw,
} from 'lucide-react';
import { useAlertAutomation, AutomationJobResult } from '../hooks/useAlertAutomation';
import { ScheduledJob } from '../services/alertAutomationScheduler';

interface Job {
  id: string;
  name: string;
  description: string;
  cron: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  nextRun?: string;
  lastRun?: string;
  action: () => Promise<void>;
}

export default function AutomationJobsPanel() {
  const {
    jobs,
    jobResults,
    isLoading,
    error,
    runDailyExpiryCheck,
    runDailyLowStockCheck,
    runRetryFailedNotifications,
    runDailyAlertReplication,
    runDailyAlertAggregation,
    runEscalateAlerts,
    runMonthlyArchival,
  } = useAlertAutomation();

  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [runningJob, setRunningJob] = useState<string | null>(null);

  // Mapa de jobs disponíveis
  const availableJobs: Job[] = [
    {
      id: 'expiryCheck',
      name: 'Verificação de Validade',
      description: 'Verificar produtos vencendo nos próximos 60 dias',
      cron: '0 7 * * *',
      frequency: 'daily',
      enabled: true,
      action: runDailyExpiryCheck,
    },
    {
      id: 'stockCheck',
      name: 'Verificação de Stock',
      description: 'Verificar produtos com stock baixo',
      cron: '0 12 * * *',
      frequency: 'daily',
      enabled: true,
      action: runDailyLowStockCheck,
    },
    {
      id: 'retryNotifications',
      name: 'Retry de Notificações',
      description: 'Resend de notificações falhadas',
      cron: '0 */3 * * *',
      frequency: 'daily',
      enabled: true,
      action: runRetryFailedNotifications,
    },
    {
      id: 'alertReplication',
      name: 'Replicação de Alertas',
      description: 'Resend de alertas críticos',
      cron: '0 6 * * *',
      frequency: 'daily',
      enabled: true,
      action: runDailyAlertReplication,
    },
    {
      id: 'alertAggregation',
      name: 'Agregação de Alertas',
      description: 'Gerar sumário diário de alertas',
      cron: '0 18 * * *',
      frequency: 'daily',
      enabled: true,
      action: runDailyAlertAggregation,
    },
    {
      id: 'escalateAlerts',
      name: 'Escalação de Alertas',
      description: 'Promover alertas antigos',
      cron: '0 */6 * * *',
      frequency: 'daily',
      enabled: true,
      action: runEscalateAlerts,
    },
    {
      id: 'monthlyArchival',
      name: 'Arquivação Mensal',
      description: 'Arquivar alertas resolvidos > 90 dias',
      cron: '0 3 1 * *',
      frequency: 'monthly',
      enabled: true,
      action: runMonthlyArchival,
    },
  ];

  const getJobStatus = (jobId: string): AutomationJobResult | undefined => {
    return jobResults.find((r) => r.jobName === jobId);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'running':
        return <Loader className="animate-spin text-blue-600 dark:text-blue-400" size={20} />;
      case 'success':
        return <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={20} />;
      case 'failed':
        return <AlertCircle className="text-red-600 dark:text-red-400" size={20} />;
      default:
        return <Clock className="text-slate-400 dark:text-slate-500" size={20} />;
    }
  };

  const handleRunJob = async (job: Job) => {
    setRunningJob(job.id);
    try {
      await job.action();
    } catch (err) {
      console.error(`Erro ao executar ${job.name}:`, err);
    } finally {
      setRunningJob(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            🤖 Automação de Alertas
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Gerenciar jobs agendados e automações
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw size={20} className="text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {/* Erro */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">❌ {error}</p>
        </div>
      )}

      {/* Sumário */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
        >
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Total de Jobs
          </p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            {availableJobs.length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900"
        >
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
            Sucedidos
          </p>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {jobResults.filter((r) => r.status === 'success').length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
        >
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
            Falhados
          </p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
            {jobResults.filter((r) => r.status === 'failed').length}
          </p>
        </motion.div>
      </div>

      {/* Jobs */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
          Jobs Disponíveis
        </h3>

        <AnimatePresence>
          {availableJobs.map((job, index) => {
            const jobStatus = getJobStatus(job.id);
            const isRunning = runningJob === job.id;

            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                {/* Header do Job */}
                <button
                  onClick={() =>
                    setExpandedJob(expandedJob === job.id ? null : job.id)
                  }
                  className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(jobStatus?.status)}
                    <div className="text-left">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        {job.name}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {job.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {job.cron}
                    </span>
                  </div>
                </button>

                {/* Detalhes do Job */}
                <AnimatePresence>
                  {expandedJob === job.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-950 space-y-3"
                    >
                      {/* Status do Job */}
                      {jobStatus && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Última Execução
                          </p>
                          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                            {jobStatus.startedAt && (
                              <p>
                                ⏱️ Iniciado:{' '}
                                {new Date(jobStatus.startedAt).toLocaleString('pt-PT')}
                              </p>
                            )}
                            {jobStatus.completedAt && (
                              <p>
                                ✅ Concluído:{' '}
                                {new Date(jobStatus.completedAt).toLocaleString('pt-PT')}
                              </p>
                            )}
                            {jobStatus.result && (
                              <p className="mt-2">
                                📊 Resultado: {JSON.stringify(jobStatus.result)}
                              </p>
                            )}
                            {jobStatus.error && (
                              <p className="text-red-600 dark:text-red-400">
                                ❌ Erro: {jobStatus.error}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Botões */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRunJob(job)}
                          disabled={isRunning}
                          className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                        >
                          {isRunning ? (
                            <>
                              <Loader size={16} className="animate-spin" />
                              Executando...
                            </>
                          ) : (
                            <>
                              <Play size={16} />
                              Executar Agora
                            </>
                          )}
                        </button>

                        {job.enabled && (
                          <button className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                            <Pause size={16} />
                            Desativar
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Histórico de Execuções */}
      {jobResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">
            Histórico de Execuções
          </h3>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {jobResults.slice(-10).reverse().map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg text-sm ${
                  result.status === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900'
                    : result.status === 'failed'
                    ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900'
                    : result.status === 'running'
                    ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900'
                    : 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold">
                      {result.status === 'success'
                        ? '✅'
                        : result.status === 'failed'
                        ? '❌'
                        : result.status === 'running'
                        ? '🔄'
                        : '⏳'}{' '}
                      {result.jobName}
                    </p>
                    {result.startedAt && (
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(result.startedAt).toLocaleString('pt-PT')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
