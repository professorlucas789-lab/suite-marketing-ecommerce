/**
 * Painel de Análise Preditiva
 * FASE 5-6: Dashboard de Previsões
 *
 * Exibe previsões de demanda, tendências e recomendações automáticas
 */

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Package, Zap } from 'lucide-react';
import { usePredictiveAnalytics } from '../hooks/usePredictiveAnalytics';
import { useAnomalyDetection } from '../hooks/useAnomalyDetection';
import { Product, Sale } from '../types/store';
import { motion } from 'motion/react';

interface PredictiveAnalyticsPanelProps {
  storeId: string;
  products: Product[];
  sales: Sale[];
  enabled?: boolean;
}

export function PredictiveAnalyticsPanel({
  storeId,
  products,
  sales,
  enabled = true,
}: PredictiveAnalyticsPanelProps) {
  const { forecasts, trends, reorders, dashboard, isLoading, error } = usePredictiveAnalytics(
    storeId,
    products,
    sales,
    enabled
  );

  const { criticalAnomalies } = useAnomalyDetection(storeId, sales, products, enabled);

  // Calcular KPIs
  const kpis = useMemo(() => {
    const totalForecastedRevenue = forecasts.reduce((sum, f) => sum + f.predictedRevenue, 0);
    const urgentReorders = reorders.filter((r) => r.recommendedUrgency === 'immediate').length;
    const growingProducts = trends.filter((t) => t.salesTrend.direction === 'increasing').length;

    return {
      totalForecastedRevenue: Math.round(totalForecastedRevenue),
      urgentReorders,
      growingProducts,
      totalAnomalies: criticalAnomalies.length,
    };
  }, [forecasts, reorders, trends, criticalAnomalies]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Receita Prevista
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                Kz{kpis.totalForecastedRevenue.toLocaleString('pt-PT')}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Reabastecimento Urgente
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {kpis.urgentReorders}
              </p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950">
              <Package className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Produtos em Crescimento
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {kpis.growingProducts}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Anomalias Críticas
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {kpis.totalAnomalies}
              </p>
            </div>
            <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-950">
              <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Alertas Críticos */}
      {criticalAnomalies.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950"
        >
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-red-900 dark:text-red-100">
            <Zap className="h-5 w-5" />
            Anomalias Detectadas
          </h3>
          <div className="space-y-2">
            {criticalAnomalies.slice(0, 3).map((anomaly) => (
              <div
                key={anomaly.id}
                className="rounded border border-red-300 bg-white p-3 text-sm dark:border-red-800 dark:bg-red-900"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {anomaly.description}
                    </p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      {anomaly.possibleCauses[0]}
                    </p>
                  </div>
                  <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-800 dark:text-red-100">
                    {anomaly.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Previsões por Produto */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="border-b border-gray-200 p-4 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Produtos com Maior Demanda
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {forecasts.slice(0, 5).map((forecast) => (
              <div key={forecast.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {forecast.productName}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Previsto: {forecast.predictedUnits} unidades
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {forecast.confidence}%
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">confiança</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Reabastecimento Recomendado */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="border-b border-gray-200 p-4 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Reabastecimento Recomendado
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {reorders.slice(0, 5).map((reorder) => (
              <div
                key={reorder.id}
                className={`p-4 ${
                  reorder.recommendedUrgency === 'immediate'
                    ? 'bg-red-50 dark:bg-red-950'
                    : reorder.recommendedUrgency === 'soon'
                      ? 'bg-yellow-50 dark:bg-yellow-950'
                      : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {reorder.productName}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Stock: {reorder.currentStock} → Reabastecer: {reorder.recommendedQuantity}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold ${
                      reorder.recommendedUrgency === 'immediate'
                        ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                        : reorder.recommendedUrgency === 'soon'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                    }`}
                  >
                    {reorder.recommendedUrgency === 'immediate'
                      ? '🚨 Imediato'
                      : reorder.recommendedUrgency === 'soon'
                        ? '⚠️ Breve'
                        : '📋 Planeado'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Tendências */}
      {trends.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="border-b border-gray-200 p-4 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">Análise de Tendências</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {trends.slice(0, 6).map((trend) => (
              <div
                key={trend.id}
                className="rounded border border-gray-200 p-3 dark:border-gray-800"
              >
                <p className="font-medium text-gray-900 dark:text-white">{trend.productName}</p>
                <div className="mt-2 flex items-center gap-2">
                  {trend.salesTrend.direction === 'increasing' ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">
                        +{trend.salesTrend.percentageChange.toFixed(1)}%
                      </span>
                    </>
                  ) : trend.salesTrend.direction === 'decreasing' ? (
                    <>
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-600">
                        {trend.salesTrend.percentageChange.toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="h-4 w-4 rounded-full bg-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Estável</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
