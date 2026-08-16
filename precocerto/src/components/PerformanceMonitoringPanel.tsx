/**
 * Painel de Monitoramento de Performance
 * Fase 9: Performance e Otimização
 */

import React, { useState } from 'react';
import {
  Activity,
  Zap,
  Database,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3,
  Gauge,
  Server,
  Cpu,
  HardDrive,
} from 'lucide-react';
import type {
  CacheStats,
  PerformanceMetric,
  PerformanceDashboard,
  MemoryMetrics,
  BatchJob,
} from '../types/performance';

interface PerformanceMonitoringPanelProps {
  cacheStats?: CacheStats;
  metrics?: PerformanceMetric[];
  dashboard?: PerformanceDashboard;
  memoryMetrics?: MemoryMetrics;
  batchJobs?: BatchJob[];
  overallScore?: number;
  healthStatus?: boolean;
  issues?: string[];
}

export function PerformanceMonitoringPanel({
  cacheStats,
  metrics = [],
  dashboard,
  memoryMetrics,
  batchJobs = [],
  overallScore = 0,
  healthStatus = true,
  issues = [],
}: PerformanceMonitoringPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'cache' | 'metrics' | 'batch' | 'memory'>('overview');
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getHealthBackground = (score: number) => {
    if (score >= 90) return 'bg-green-100 dark:bg-green-950/30';
    if (score >= 70) return 'bg-yellow-100 dark:bg-yellow-950/30';
    return 'bg-red-100 dark:bg-red-950/30';
  };

  const getMetricColor = (metric: PerformanceMetric) => {
    if (metric.duration > 1000) return 'text-red-600 dark:text-red-400';
    if (metric.duration > 500) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getBatchStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-200';
      case 'PROCESSING':
        return 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200';
      case 'FAILED':
        return 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-200';
      case 'PENDING':
        return 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-gray-100 dark:bg-gray-950/30 text-gray-800 dark:text-gray-200';
    }
  };

  const getMemoryPercent = () => {
    if (!memoryMetrics) return 0;
    return (memoryMetrics.heapUsed / memoryMetrics.heapTotal) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Health Status Card */}
      <div className={`rounded-lg p-6 border border-slate-200 dark:border-slate-700 ${getHealthBackground(overallScore)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-bold ${getHealthColor(overallScore)}`}>{overallScore}</div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {healthStatus ? '✓ Sistema Saudável' : '⚠ Atenção Necessária'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {issues.length > 0 ? `${issues.length} problema(s) detectado(s)` : 'Sem problemas detectados'}
              </p>
            </div>
          </div>
          <div className="text-right">
            {healthStatus ? (
              <CheckCircle2 className="text-green-600 dark:text-green-400" size={40} />
            ) : (
              <AlertCircle className="text-red-600 dark:text-red-400" size={40} />
            )}
          </div>
        </div>

        {issues.length > 0 && (
          <div className="mt-4 space-y-2">
            {issues.map((issue, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <AlertCircle size={16} />
                <span>{issue}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Resp. Média</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {dashboard.kpis.avgResponseTime.toFixed(0)}ms
                </p>
              </div>
              <Clock className="text-blue-600 dark:text-blue-400" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Cache Hit</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {dashboard.kpis.cacheHitRate.toFixed(0)}%
                </p>
              </div>
              <HardDrive className="text-green-600 dark:text-green-400" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Batch Success</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {dashboard.kpis.batchSuccessRate.toFixed(0)}%
                </p>
              </div>
              <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Recursos</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {dashboard.kpis.resourceUtilization.toFixed(0)}%
                </p>
              </div>
              <Gauge className="text-orange-600 dark:text-orange-400" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('cache')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'cache'
              ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          Cache
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'metrics'
              ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          Métricas ({metrics.length})
        </button>
        <button
          onClick={() => setActiveTab('batch')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'batch'
              ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          Batch ({batchJobs.length})
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'memory'
              ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          Memória
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && dashboard && (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Operações Mais Lentas</h4>
            <div className="space-y-2">
              {dashboard.topSlowestOperations.map((op, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{op.operation}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Execuções: {op.count}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">{op.avgTime}ms</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {dashboard.recommendations.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Recomendações</h4>
              <div className="space-y-2">
                {dashboard.recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
                    💡 {rec}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cache Tab */}
      {activeTab === 'cache' && cacheStats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">Taxa Hit</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{cacheStats.hitRate.toFixed(1)}%</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">Taxa Miss</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{cacheStats.missRate.toFixed(1)}%</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">Itens</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{cacheStats.itemCount}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">Tamanho</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {(cacheStats.currentSize / 1024 / 1024).toFixed(1)}MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="space-y-3">
          {metrics.length === 0 ? (
            <div className="text-center py-12">
              <Activity size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-600 dark:text-slate-400">Nenhuma métrica registrada</p>
            </div>
          ) : (
            metrics.slice(0, 10).map((metric) => (
              <div
                key={metric.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Zap className={getMetricColor(metric)} size={20} />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">{metric.operation}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {new Date(metric.timestamp).toLocaleTimeString('pt-PT')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getMetricColor(metric)}`}>{metric.duration.toFixed(0)}ms</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{metric.throughput.toFixed(0)} items/s</p>
                  </div>
                </div>

                {expandedMetric === metric.id && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-sm">
                    <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                      <div>Cache Hit: {metric.cacheHit ? '✓' : '✗'}</div>
                      <div>Itens: {metric.itemsProcessed}</div>
                      <div>CPU: {metric.cpuUsage.toFixed(1)}%</div>
                      <div>Memória: {(metric.memoryUsed / 1024 / 1024).toFixed(1)}MB</div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setExpandedMetric(expandedMetric === metric.id ? null : metric.id)}
                  className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                >
                  {expandedMetric === metric.id ? 'Ocultar' : 'Ver'} Detalhes
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Batch Tab */}
      {activeTab === 'batch' && (
        <div className="space-y-3">
          {batchJobs.length === 0 ? (
            <div className="text-center py-12">
              <Database size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-600 dark:text-slate-400">Nenhum batch em processamento</p>
            </div>
          ) : (
            batchJobs.slice(0, 10).map((job) => (
              <div key={job.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-900 dark:text-white">{job.name}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getBatchStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {job.processedItems} / {job.itemCount} itens ({job.progress}%)
                    </p>

                    {job.status === 'PROCESSING' && (
                      <div className="mt-2">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-emerald-600 h-2 rounded-full transition-all"
                            style={{ width: `${job.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {job.endTime && (
                      <p className="text-xs text-slate-500 mt-2">
                        Duração: {job.actualDuration}s
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Memory Tab */}
      {activeTab === 'memory' && memoryMetrics && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Heap Usage</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${getMemoryPercent()}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{getMemoryPercent().toFixed(1)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Server size={18} className="text-blue-600" />
                <p className="text-sm text-slate-600 dark:text-slate-400">Heap Usado</p>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {(memoryMetrics.heapUsed / 1024 / 1024 / 1024).toFixed(2)}GB
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Cpu size={18} className="text-green-600" />
                <p className="text-sm text-slate-600 dark:text-slate-400">Externo</p>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {(memoryMetrics.external / 1024 / 1024).toFixed(1)}MB
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive size={18} className="text-orange-600" />
                <p className="text-sm text-slate-600 dark:text-slate-400">RSS</p>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {(memoryMetrics.rss / 1024 / 1024 / 1024).toFixed(2)}GB
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={18} className="text-purple-600" />
                <p className="text-sm text-slate-600 dark:text-slate-400">Array Buffers</p>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {(memoryMetrics.arrayBuffers / 1024 / 1024).toFixed(1)}MB
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
