/**
 * Hook para Sistema de Exportação Avançada
 * Fase 7: Exportação Avançada
 */

import { useCallback, useState } from 'react';
import type {
  ExportConfig,
  ExportData,
  ExportFormat,
  EmailConfig,
  ScheduledExport,
  ExportJob,
  ExportHistory,
} from '../types/export';
import { ExportService, ExportCacheService } from '../services/exportService';

export function useExport() {
  const [exports, setExports] = useState<ExportConfig[]>([]);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [history, setHistory] = useState<ExportHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Criar configuração de exportação
   */
  const createExportConfig = useCallback(
    (config: Omit<ExportConfig, 'id' | 'createdAt' | 'status' | 'downloadUrl' | 'fileSize'>): ExportConfig => {
      const fullConfig: ExportConfig = {
        ...config,
        id: `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        status: 'PENDING',
      };

      setExports((prev) => [fullConfig, ...prev]);
      return fullConfig;
    },
    []
  );

  /**
   * Iniciar tarefa de exportação
   */
  const startExportJob = useCallback(
    async (exportConfig: ExportConfig, data: ExportData) => {
      try {
        setLoading(true);
        setError(null);

        // Validar configuração
        const validationErrors = ExportService.validateExportConfig(exportConfig);
        if (validationErrors.length > 0) {
          throw new Error(`Validação falhou: ${validationErrors.join(', ')}`);
        }

        // Criar tarefa
        const job: ExportJob = {
          id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          config: exportConfig,
          progress: 0,
          startTime: new Date().toISOString(),
          status: 'PROCESSING',
        };

        setJobs((prev) => [job, ...prev]);

        // Simular processamento
        for (let i = 0; i <= 100; i += 20) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          setJobs((prev) =>
            prev.map((j) => (j.id === job.id ? { ...j, progress: Math.min(i, 100) } : j))
          );
        }

        // Gerar conteúdo baseado no formato
        let content: string;
        const fileName = ExportService.generateFileName(
          exportConfig.title,
          exportConfig.format
        );

        switch (exportConfig.format) {
          case 'JSON':
            content = ExportService.generateJSON(data);
            break;
          case 'CSV':
            content = ExportService.generateCSV(data);
            break;
          case 'PDF':
            content = ExportService.generateHTMLForPDF(data);
            break;
          case 'XLSX':
            // Em produção, usar library de Excel
            content = ExportService.generateJSON(data);
            break;
          default:
            content = ExportService.generateJSON(data);
        }

        const fileSize = ExportService.estimateFileSize(data, exportConfig.format);

        // Completar tarefa
        const completedJob: ExportJob = {
          ...job,
          progress: 100,
          endTime: new Date().toISOString(),
          status: 'COMPLETED',
          resultUrl: `blob:${Date.now()}`,
          resultSize: fileSize,
        };

        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? completedJob : j))
        );

        // Adicionar ao histórico
        setHistory((prev) => [
          {
            id: `hist-${Date.now()}`,
            fileName,
            format: exportConfig.format,
            fileSize,
            downloadCount: 0,
            createdAt: new Date().toISOString(),
            createdBy: exportConfig.createdBy,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            isExpired: false,
          },
          ...prev,
        ]);

        // Cache
        ExportCacheService.set(job.id, data);

        return completedJob;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao gerar exportação';
        setError(message);

        const failedJob: ExportJob = {
          id: `job-${Date.now()}`,
          config: exportConfig,
          progress: 0,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          status: 'FAILED',
          errorMessage: message,
        };

        setJobs((prev) => [failedJob, ...prev]);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Cancelar tarefa
   */
  const cancelExportJob = useCallback((jobId: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, status: 'CANCELLED' as const, endTime: new Date().toISOString() }
          : j
      )
    );
  }, []);

  /**
   * Download de arquivo de exportação
   */
  const downloadExport = useCallback((jobId: string, fileName: string) => {
    try {
      const job = jobs.find((j) => j.id === jobId);
      if (!job || job.status !== 'COMPLETED') {
        throw new Error('Tarefa não concluída');
      }

      // Atualizar contagem de downloads
      setHistory((prev) =>
        prev.map((h) =>
          h.fileName === fileName
            ? { ...h, downloadCount: h.downloadCount + 1 }
            : h
        )
      );

      // Simular download
      console.log(`Download iniciado: ${fileName}`);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer download';
      setError(message);
      return false;
    }
  }, [jobs]);

  /**
   * Enviar exportação por email
   */
  const sendExportByEmail = useCallback(
    async (jobId: string, emailConfig: EmailConfig) => {
      try {
        setLoading(true);
        const job = jobs.find((j) => j.id === jobId);

        if (!job || job.status !== 'COMPLETED') {
          throw new Error('Tarefa não concluída');
        }

        // Simular envio de email
        console.log(`Email enviado para: ${Array.isArray(emailConfig.to) ? emailConfig.to.join(', ') : emailConfig.to}`);

        // Em produção, usar serviço de email real (SendGrid, Nodemailer, etc.)

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao enviar email';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [jobs]
  );

  /**
   * Agendar exportação recorrente
   */
  const scheduleExport = useCallback((schedule: ScheduledExport): void => {
    ExportService.prepareScheduledExport({} as ExportConfig, schedule);
    console.log(`Exportação agendada: próxima execução em ${schedule.nextRun}`);
  }, []);

  /**
   * Obter jobs em progresso
   */
  const getActiveJobs = useCallback((): ExportJob[] => {
    return jobs.filter(
      (j) =>
        j.status === 'PROCESSING' || j.status === 'PENDING'
    );
  }, [jobs]);

  /**
   * Obter histórico de exportações
   */
  const getExportHistory = useCallback(
    (limit: number = 10): ExportHistory[] => {
      return history.slice(0, limit);
    },
    [history]
  );

  /**
   * Limpar histórico expirado
   */
  const cleanExpiredExports = useCallback(() => {
    const now = new Date();
    const expired = history.filter(
      (h) => new Date(h.expiresAt) < now
    );

    setHistory((prev) =>
      prev.filter((h) => !(new Date(h.expiresAt) < now))
    );

    return expired.length;
  }, [history]);

  /**
   * Obter estatísticas de exportação
   */
  const getExportStats = useCallback(
    () => ({
      totalExports: exports.length,
      totalJobs: jobs.length,
      completedJobs: jobs.filter((j) => j.status === 'COMPLETED').length,
      failedJobs: jobs.filter((j) => j.status === 'FAILED').length,
      activeJobs: getActiveJobs().length,
      historyItems: history.length,
      totalExportedSize: history.reduce((sum, h) => sum + h.fileSize, 0),
    }),
    [exports, jobs, history, getActiveJobs]
  );

  /**
   * Retentar tarefa falhada
   */
  const retryFailedJob = useCallback(
    async (jobId: string, data: ExportData) => {
      const failedJob = jobs.find((j) => j.id === jobId && j.status === 'FAILED');
      if (!failedJob) {
        throw new Error('Tarefa não encontrada ou não falhou');
      }

      return startExportJob(failedJob.config, data);
    },
    [jobs, startExportJob]
  );

  return {
    // Estado
    exports,
    jobs,
    history,
    loading,
    error,

    // Funções
    createExportConfig,
    startExportJob,
    cancelExportJob,
    downloadExport,
    sendExportByEmail,
    scheduleExport,
    getActiveJobs,
    getExportHistory,
    cleanExpiredExports,
    getExportStats,
    retryFailedJob,
  };
}
