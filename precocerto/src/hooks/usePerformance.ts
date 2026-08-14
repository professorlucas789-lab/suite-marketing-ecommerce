/**
 * Hook para Performance e Otimização
 * Fase 9: Performance e Otimização
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import type {
  CacheConfig,
  CacheStats,
  DataIndex,
  BatchJob,
  PerformanceMetric,
  PerformanceReport,
  QueryOptimization,
  ResourceLimit,
  PerformanceDashboard,
  ScalabilityMetrics,
  MemoryMetrics,
} from '../types/performance';
import { PerformanceService } from '../services/performanceService';

export function usePerformance() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [dashboard, setDashboard] = useState<PerformanceDashboard | null>(null);
  const [memoryMetrics, setMemoryMetrics] = useState<MemoryMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const performanceTimers = useRef<Map<string, number>>(new Map());

  /**
   * Iniciar medição de performance
   */
  const startMeasurement = useCallback((operationId: string) => {
    performanceTimers.current.set(operationId, performance.now());
  }, []);

  /**
   * Finalizar medição e registrar
   */
  const endMeasurement = useCallback(
    (operationId: string, operationName: string, itemsProcessed: number = 1) => {
      const startTime = performanceTimers.current.get(operationId);
      if (!startTime) {
        console.warn(`Medição não iniciada para ${operationId}`);
        return;
      }

      const duration = performance.now() - startTime;
      const metric = PerformanceService.recordMetric(operationName, duration, itemsProcessed);

      setMetrics((prev) => [metric, ...prev].slice(0, 100)); // Manter últimas 100
      performanceTimers.current.delete(operationId);

      return metric;
    },
    []
  );

  /**
   * Armazenar no cache
   */
  const cacheSet = useCallback((key: string, value: any, ttl: number = 3600) => {
    PerformanceService.cacheSet(key, value, ttl);
  }, []);

  /**
   * Recuperar do cache
   */
  const cacheGet = useCallback((key: string): any | null => {
    return PerformanceService.cacheGet(key);
  }, []);

  /**
   * Obter estatísticas de cache
   */
  const getCacheStats = useCallback(() => {
    const stats = PerformanceService.getCacheStats('default');
    setCacheStats(stats);
    return stats;
  }, []);

  /**
   * Criar índice
   */
  const createIndex = useCallback(
    (name: string, column: string, targetTable: string, data: Array<{ id: number; [key: string]: any }>): DataIndex => {
      return PerformanceService.createIndex(name, column, targetTable, data);
    },
    []
  );

  /**
   * Buscar usando índice
   */
  const searchByIndex = useCallback((indexName: string, value: string): number[] => {
    return PerformanceService.searchByIndex(indexName, value);
  }, []);

  /**
   * Criar job de batch
   */
  const createBatchJob = useCallback(
    (config: Omit<BatchJob, 'id' | 'createdAt' | 'status' | 'progress' | 'processedItems' | 'resultCount' | 'errorCount'>) => {
      const job = PerformanceService.createBatchJob(config);
      setBatchJobs((prev) => [job, ...prev]);
      return job;
    },
    []
  );

  /**
   * Processar batch
   */
  const processBatch = useCallback(
    async (jobId: string, processor: (item: any, index: number) => Promise<any>, items: any[]) => {
      try {
        setLoading(true);
        setError(null);

        const result = await PerformanceService.processBatch(jobId, processor, items);
        if (result) {
          setBatchJobs((prev) => prev.map((j) => (j.id === jobId ? result : j)));
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao processar batch';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Gerar relatório de performance
   */
  const generateReport = useCallback((): PerformanceReport => {
    return PerformanceService.generatePerformanceReport();
  }, []);

  /**
   * Otimizar query
   */
  const optimizeQuery = useCallback((queryName: string, originalDuration: number): QueryOptimization => {
    return PerformanceService.optimizeQuery(queryName, originalDuration);
  }, []);

  /**
   * Obter dashboard de performance
   */
  const getDashboard = useCallback(() => {
    const dash = PerformanceService.generatePerformanceDashboard();
    setDashboard(dash);
    return dash;
  }, []);

  /**
   * Obter métricas de escalabilidade
   */
  const getScalabilityMetrics = useCallback(
    (dataVolumeGB: number, numberOfRecords: number, numberOfLojas: number, numberOfModels: number): ScalabilityMetrics => {
      return PerformanceService.generateScalabilityMetrics(dataVolumeGB, numberOfRecords, numberOfLojas, numberOfModels);
    },
    []
  );

  /**
   * Obter métricas de memória
   */
  const getMemoryMetrics = useCallback(() => {
    const mem = PerformanceService.getMemoryMetrics();
    setMemoryMetrics(mem);
    return mem;
  }, []);

  /**
   * Limpar cache
   */
  const clearCache = useCallback(() => {
    PerformanceService.clearCache();
    setCacheStats(null);
  }, []);

  /**
   * Limpar métricas antigas
   */
  const clearOldMetrics = useCallback((ageHours: number = 24): number => {
    return PerformanceService.clearOldMetrics(ageHours);
  }, []);

  /**
   * Obter status geral de performance
   */
  const getPerformanceStatus = useCallback(() => {
    return PerformanceService.getPerformanceStatus();
  }, []);

  /**
   * Definir limite de recurso
   */
  const setResourceLimit = useCallback((type: 'MEMORY' | 'CPU' | 'STORAGE', value: number, unit: string, threshold: number): ResourceLimit => {
    return PerformanceService.setResourceLimit(type, value, unit, threshold);
  }, []);

  /**
   * Verificar limites de recurso
   */
  const checkResourceLimits = useCallback((limits: ResourceLimit[]): ResourceLimit[] => {
    return PerformanceService.checkResourceLimits(limits);
  }, []);

  /**
   * Monitorar performance continuamente
   */
  useEffect(() => {
    const interval = setInterval(() => {
      getCacheStats();
      getMemoryMetrics();
      getDashboard();
    }, 5000); // A cada 5 segundos

    return () => clearInterval(interval);
  }, [getCacheStats, getMemoryMetrics, getDashboard]);

  /**
   * Obter métricas recentes
   */
  const getRecentMetrics = useCallback((limit: number = 20): PerformanceMetric[] => {
    return metrics.slice(0, limit);
  }, [metrics]);

  /**
   * Obter estatísticas por operação
   */
  const getMetricsByOperation = useCallback(
    (operationName: string) => {
      const operationMetrics = metrics.filter((m) => m.operation === operationName);
      if (operationMetrics.length === 0) {
        return {
          operation: operationName,
          count: 0,
          avgDuration: 0,
          minDuration: 0,
          maxDuration: 0,
        };
      }

      const durations = operationMetrics.map((m) => m.duration);
      const sum = durations.reduce((a, b) => a + b);

      return {
        operation: operationName,
        count: operationMetrics.length,
        avgDuration: Math.round(sum / durations.length),
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
      };
    },
    [metrics]
  );

  /**
   * Obter resumo de performance
   */
  const getPerformanceSummary = useCallback(() => {
    const status = getPerformanceStatus();
    const report = generateReport();

    return {
      ...status,
      avgResponseTime: report.summary.avgResponseTime,
      p95ResponseTime: report.summary.p95ResponseTime,
      cacheHitRate: cacheStats?.hitRate || 0,
      totalMetrics: metrics.length,
      totalBatches: batchJobs.length,
    };
  }, [getPerformanceStatus, generateReport, cacheStats, metrics.length, batchJobs.length]);

  /**
   * Exportar métricas
   */
  const exportMetrics = useCallback((): string => {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        cacheStats,
        recentMetrics: getRecentMetrics(50),
        batchJobs: batchJobs.slice(0, 20),
        dashboard,
        memoryMetrics,
      },
      null,
      2
    );
  }, [cacheStats, getRecentMetrics, batchJobs, dashboard, memoryMetrics]);

  return {
    // Estado
    cacheStats,
    batchJobs,
    metrics,
    dashboard,
    memoryMetrics,
    loading,
    error,

    // Medição
    startMeasurement,
    endMeasurement,

    // Cache
    cacheSet,
    cacheGet,
    getCacheStats,
    clearCache,

    // Índices
    createIndex,
    searchByIndex,

    // Batch
    createBatchJob,
    processBatch,

    // Otimização
    optimizeQuery,

    // Relatórios
    generateReport,
    getDashboard,
    getScalabilityMetrics,
    getMemoryMetrics,
    getPerformanceStatus,
    getPerformanceSummary,

    // Limites
    setResourceLimit,
    checkResourceLimits,

    // Gerenciamento
    clearOldMetrics,
    getRecentMetrics,
    getMetricsByOperation,
    exportMetrics,
  };
}
