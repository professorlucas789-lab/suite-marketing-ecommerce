/**
 * Dashboard Executivo
 * FASE 7: Insights Prioritários e Recomendações
 *
 * Mostra visão de 360° da loja com KPIs, alertas e oportunidades
 */

import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  Target,
  DollarSign,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { usePredictiveAnalyticsWithFirebase } from '../hooks/usePredictiveAnalyticsWithFirebase';
import { Product, Sale } from '../types/store';
import { motion } from 'motion/react';

interface ExecutiveDashboardProps {
  storeId: string;
  storeName: string;
  products: Product[];
  sales: Sale[];
}

export function ExecutiveDashboard({
  storeId,
  storeName,
  products,
  sales,
}: ExecutiveDashboardProps) {
  const {
    forecasts,
    trends,
    anomalies,
    reorders,
    dashboard,
    isLoading,
    error,
    lastSync,
    getUrgentReorders,
  } = usePredictiveAnalyticsWithFirebase(storeId, products, sales);

  // Calcular health score
  const healthScore = useMemo(() => {
    if (!dashboard) {
      const criticalAnomalies = anomalies.filter((a) => a.severity === 'CRITICAL').length;
      const urgentReorders = getUrgentReorders().length;
      const salesHealth = Math.max(0, 100 - criticalAnomalies * 15);
      const stockHealth = Math.max(0, 100 - urgentReorders * 20);
      return (salesHealth + stockHealth) / 2;
    }
    return dashboard.healthScore.overallScore;
  }, [dashboard, anomalies, getUrgentReorders]);

  // KPIs principais
  const kpis = useMemo(() => {
    const totalRevenueForecast = forecasts.reduce((sum, f) => sum + f.predictedRevenue, 0);
    const nextWeekForecast = totalRevenueForecast * 7;
    const growingProducts = trends.filter((t) => t.salesTrend.direction === 'increasing').length;
    const deciningProducts = trends.filter((t) => t.salesTrend.direction === 'decreasing').length;
    const averageConfidence =
      forecasts.length > 0
        ? forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length
        : 0;

    return {
      totalRevenueForecast: Math.round(totalRevenueForecast),
      nextWeekForecast: Math.round(nextWeekForecast),
      growingProducts,
      deciningProducts,
      averageConfidence: Math.round(averageConfidence),
      criticalAnomalies: anomalies.filter((a) => a.severity === 'CRITICAL').length,
      urgentReorders: getUrgentReorders().length,
    };
  }, [forecasts, trends, anomalies, getUrgentReorders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">Carregando dashboard executivo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{storeName}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Dashboard Executivo • Análise Preditiva Ativa
          </p>
        </div>
        {lastSync && (
          <div className="text-right">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Última atualização:{' '}
              {lastSync.toLocaleTimeString('pt-PT', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p className="mt-1 rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-100">
              ✓ Sincronizado
            </p>
          </div>
        )}
      </motion.div>

      {/* Health Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Score de Saúde da Loja
            </p>
            <p className="mt-2 text-5xl font-bold text-gray-900 dark:text-white">
              {Math.round(healthScore)}
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {healthScore >= 80
                ? '✅ Excelente'
                : healthScore >= 60
                  ? '⚠️ Bom'
                  : '🔴 Requer Atenção'}
            </p>
          </div>
          <div
            className="relative h-32 w-32"
            style={{
              background: `conic-gradient(
                ${healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444'} 0% ${healthScore}%,
                #e5e7eb ${healthScore}% 100%
              )`,
              borderRadius: '50%',
            }}
          >
            <div className="absolute inset-2 rounded-full bg-white dark:bg-gray-900" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(healthScore)}%
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-gray-600 dark:text-gray-400">
                Receita Prevista (Hoje)
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                Kz{kpis.totalRevenueForecast.toLocaleString('pt-PT')}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500 opacity-20" />
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
              <p className="text-xs font-medium uppercase text-gray-600 dark:text-gray-400">
                Previsão (Próx. 7 dias)
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                Kz{kpis.nextWeekForecast.toLocaleString('pt-PT')}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500 opacity-20" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-gray-600 dark:text-gray-400">
                Produtos em Crescimento
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {kpis.growingProducts}
              </p>
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                {kpis.deciningProducts} em declínio
              </p>
            </div>
            <Activity className="h-8 w-8 text-purple-500 opacity-20" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-gray-600 dark:text-gray-400">
                Confiança de Previsão
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {kpis.averageConfidence}%
              </p>
            </div>
            <Target className="h-8 w-8 text-orange-500 opacity-20" />
          </div>
        </motion.div>
      </div>

      {/* Alertas Críticos */}
      {(kpis.criticalAnomalies > 0 || kpis.urgentReorders > 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="rounded-lg border-l-4 border-l-red-500 bg-red-50 p-4 dark:border-l-red-600 dark:bg-red-950"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100">
                ⚠️ Ações Imediatas Necessárias
              </h3>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {kpis.criticalAnomalies > 0 && (
                  <div className="text-sm text-red-800 dark:text-red-200">
                    🚨 {kpis.criticalAnomalies} anomalia(s) crítica(s) detectada(s)
                  </div>
                )}
                {kpis.urgentReorders > 0 && (
                  <div className="text-sm text-red-800 dark:text-red-200">
                    📦 {kpis.urgentReorders} produto(s) com reabastecimento urgente
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Produtos Top */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Crescimento */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="border-b border-gray-200 p-4 dark:border-gray-800">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Top 5 em Crescimento
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {trends
              .filter((t) => t.salesTrend.direction === 'increasing')
              .sort((a, b) => b.salesTrend.percentageChange - a.salesTrend.percentageChange)
              .slice(0, 5)
              .map((trend, idx) => (
                <div key={trend.id} className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {idx + 1}. {trend.productName}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Crescimento: +{trend.salesTrend.percentageChange.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800 dark:bg-green-900 dark:text-green-100">
                      +{trend.salesTrend.percentageChange.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </motion.div>

        {/* Reabastecimento Urgente */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="border-b border-gray-200 p-4 dark:border-gray-800">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
              <Package className="h-5 w-5 text-red-600" />
              Reabastecimento Urgente
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {getUrgentReorders().length > 0 ? (
              getUrgentReorders()
                .slice(0, 5)
                .map((reorder) => (
                  <div key={reorder.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {reorder.productName}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Stock: {reorder.currentStock} → Reabastecer: {reorder.recommendedQuantity}
                        </p>
                      </div>
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${
                          reorder.recommendedUrgency === 'immediate'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                        }`}
                      >
                        {reorder.recommendedUrgency === 'immediate' ? '🚨' : '⚠️'}
                      </span>
                    </div>
                  </div>
                ))
            ) : (
              <div className="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="mx-auto mb-2 h-6 w-6 text-green-600" />
                Stock em níveis normais
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Resumo de Confiança */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
      >
        <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
          Qualidade das Previsões
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Confiança Média</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {kpis.averageConfidence}%
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                style={{ width: `${kpis.averageConfidence}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {kpis.averageConfidence >= 85
              ? '✅ Previsões muito confiáveis'
              : kpis.averageConfidence >= 70
                ? '⚠️ Confiança adequada'
                : '📊 Coletar mais histórico para melhorar'}
          </p>
        </div>
      </motion.div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}
