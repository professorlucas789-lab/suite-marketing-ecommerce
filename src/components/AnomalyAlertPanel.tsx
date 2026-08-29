/**
 * Painel de Alertas de Anomalias
 * FASE 5-6: Detecção de Padrões Anormais
 *
 * Exibe e gerencia alertas de anomalias em vendas
 */

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, X, ChevronDown } from 'lucide-react';
import { useAnomalyDetection } from '../hooks/useAnomalyDetection';
import { SalesAnomaly } from '../types/analytics';
import { Sale, Product } from '../types/store';
import { motion, AnimatePresence } from 'motion/react';

interface AnomalyAlertPanelProps {
  storeId: string;
  sales: Sale[];
  products: Product[];
  enabled?: boolean;
  compact?: boolean;
}

export function AnomalyAlertPanel({
  storeId,
  sales,
  products,
  enabled = true,
  compact = false,
}: AnomalyAlertPanelProps) {
  const { anomalies, isLoading, error, acknowledgeAnomaly } = useAnomalyDetection(
    storeId,
    sales,
    products,
    enabled
  );

  const [expandedAnomalies, setExpandedAnomalies] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'unacknowledged' | 'critical'>('unacknowledged');

  // Filtrar anomalias
  const filteredAnomalies = React.useMemo(() => {
    let filtered = anomalies;

    if (filter === 'unacknowledged') {
      filtered = filtered.filter((a) => !a.acknowledged);
    } else if (filter === 'critical') {
      filtered = filtered.filter((a) => a.severity === 'CRITICAL');
    }

    return filtered.sort((a, b) => {
      // Críticas primeiro
      if (a.severity !== b.severity) {
        return a.severity === 'CRITICAL' ? -1 : b.severity === 'CRITICAL' ? 1 : 0;
      }
      // Depois não reconhecidas
      return a.acknowledged && !b.acknowledged ? 1 : -1;
    });
  }, [anomalies, filter]);

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedAnomalies);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedAnomalies(newSet);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (anomalies.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center dark:border-green-900 dark:bg-green-950">
        <CheckCircle className="mx-auto h-12 w-12 text-green-600 dark:text-green-400" />
        <h3 className="mt-4 font-semibold text-green-900 dark:text-green-100">
          Sem Anomalias Detectadas
        </h3>
        <p className="mt-2 text-sm text-green-700 dark:text-green-300">
          Todos os padrões de vendas estão normais.
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 p-4 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Anomalias ({filteredAnomalies.length})
          </h3>
        </div>
        <div className="space-y-2 p-4">
          {filteredAnomalies.slice(0, 3).map((anomaly) => (
            <div
              key={anomaly.id}
              className="rounded border-l-4 border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {anomaly.description}
              </p>
            </div>
          ))}
          {filteredAnomalies.length > 3 && (
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Ver mais {filteredAnomalies.length - 3} anomalias
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('unacknowledged')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'unacknowledged'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          Não Reconhecidas
        </button>
        <button
          onClick={() => setFilter('critical')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'critical'
              ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          Críticas
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          Todas ({anomalies.length})
        </button>
      </div>

      {/* Lista de Anomalias */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredAnomalies.map((anomaly, index) => (
            <motion.div
              key={anomaly.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-lg border-l-4 ${
                anomaly.severity === 'CRITICAL'
                  ? 'border-l-red-500 bg-red-50 dark:bg-red-950'
                  : anomaly.severity === 'WARNING'
                    ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950'
                    : 'border-l-blue-500 bg-blue-50 dark:bg-blue-950'
              } ${anomaly.acknowledged ? 'opacity-60' : ''}`}
            >
              <button
                onClick={() => toggleExpanded(anomaly.id)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between p-4">
                  <div className="flex flex-1 items-start gap-3">
                    <div
                      className={`mt-1 rounded-full p-1 ${
                        anomaly.severity === 'CRITICAL'
                          ? 'bg-red-100 dark:bg-red-900'
                          : anomaly.severity === 'WARNING'
                            ? 'bg-yellow-100 dark:bg-yellow-900'
                            : 'bg-blue-100 dark:bg-blue-900'
                      }`}
                    >
                      <AlertTriangle
                        className={`h-4 w-4 ${
                          anomaly.severity === 'CRITICAL'
                            ? 'text-red-600 dark:text-red-400'
                            : anomaly.severity === 'WARNING'
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-blue-600 dark:text-blue-400'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {anomaly.description}
                      </p>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        {new Date(anomaly.date).toLocaleDateString('pt-PT')}
                        {anomaly.acknowledged && ' • Reconhecida'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-1 text-xs font-semibold ${
                        anomaly.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                          : anomaly.severity === 'WARNING'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                      }`}
                    >
                      {anomaly.severity}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-600 transition-transform dark:text-gray-400 ${
                        expandedAnomalies.has(anomaly.id) ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>
              </button>

              {/* Detalhes Expandidos */}
              <AnimatePresence>
                {expandedAnomalies.has(anomaly.id) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-gray-200 px-4 pb-4 pt-3 dark:border-gray-700"
                  >
                    {/* Desvio */}
                    <div className="mb-3 space-y-2">
                      <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Valor Observado vs Esperado
                        </p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {anomaly.actualValue.toFixed(2)} vs{' '}
                          {anomaly.expectedValue.toFixed(2)} (
                          {anomaly.deviationPercentage > 0 ? '+' : ''}
                          {anomaly.deviationPercentage.toFixed(1)}%)
                        </p>
                      </div>
                    </div>

                    {/* Possíveis Causas */}
                    {anomaly.possibleCauses && anomaly.possibleCauses.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Possíveis Causas
                        </p>
                        <ul className="mt-1 space-y-1">
                          {anomaly.possibleCauses.map((cause, i) => (
                            <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                              • {cause}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Ações Recomendadas */}
                    {anomaly.recommendedActions && anomaly.recommendedActions.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Ações Recomendadas
                        </p>
                        <ul className="mt-1 space-y-1">
                          {anomaly.recommendedActions.map((action, i) => (
                            <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                              • {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Botões de Ação */}
                    {!anomaly.acknowledged && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => acknowledgeAnomaly(anomaly.id)}
                          className="flex-1 rounded bg-green-100 py-2 text-sm font-medium text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-100 dark:hover:bg-green-800"
                        >
                          <CheckCircle className="mb-1 inline h-4 w-4 mr-1" />
                          Reconhecer
                        </button>
                        <button className="rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredAnomalies.length === 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center dark:border-green-900 dark:bg-green-950">
          <CheckCircle className="mx-auto h-12 w-12 text-green-600 dark:text-green-400" />
          <h3 className="mt-4 font-semibold text-green-900 dark:text-green-100">
            Sem Anomalias neste Filtro
          </h3>
          <p className="mt-2 text-sm text-green-700 dark:text-green-300">
            Todos os padrões estão normais.
          </p>
        </div>
      )}
    </div>
  );
}
