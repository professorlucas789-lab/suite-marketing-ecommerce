/**
 * Dashboard Executivo Mobile
 * FASE 9: Dashboard Mobile com Push Notifications
 *
 * Versão otimizada para dispositivos móveis com data economy
 */

import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Package,
  Battery,
  Wifi,
  WifiOff,
  Bell,
  Settings,
} from 'lucide-react';
import { motion } from 'motion/react';
import { usePredictiveAnalyticsWithFirebase } from '../hooks/usePredictiveAnalyticsWithFirebase';
import { Product, Sale } from '../types/store';

interface MobileExecutiveDashboardProps {
  storeId: string;
  products: Product[];
  sales: Sale[];
  isOnline?: boolean;
  onSettingsClick?: () => void;
  onNotificationsClick?: () => void;
}

/**
 * Componente de Dashboard Mobile
 * Otimizado para velocidade e economia de dados
 */
export function MobileExecutiveDashboard({
  storeId,
  products,
  sales,
  isOnline = true,
  onSettingsClick,
  onNotificationsClick,
}: MobileExecutiveDashboardProps) {
  const { dashboard, anomalies, reorders, forecasts, isLoading } =
    usePredictiveAnalyticsWithFirebase(storeId, products, sales);

  // Calcular health score de forma otimizada
  const healthScore = useMemo(() => {
    if (!dashboard?.healthScore) return 0;
    return dashboard.healthScore.overallScore || 0;
  }, [dashboard]);

  // Obter cor do health score
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getHealthBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 dark:bg-green-900/20';
    if (score >= 60) return 'bg-blue-50 dark:bg-blue-900/20';
    if (score >= 40) return 'bg-yellow-50 dark:bg-yellow-900/20';
    return 'bg-red-50 dark:bg-red-900/20';
  };

  const getHealthStatus = (score: number) => {
    if (score >= 80) return { label: 'Excelente', emoji: '✅' };
    if (score >= 60) return { label: 'Bom', emoji: '👍' };
    if (score >= 40) return { label: 'Atenção', emoji: '⚠️' };
    return { label: 'Crítico', emoji: '🚨' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-900">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
          <Battery className="w-8 h-8 text-blue-500" />
        </motion.div>
      </div>
    );
  }

  const status = getHealthStatus(healthScore);
  const criticalAlerts = anomalies?.filter((a) => a.severity === 'CRITICAL') || [];
  const urgentReorders = reorders?.filter((r) => r.recommendedUrgency === 'immediate') || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-white dark:bg-slate-900 pb-20"
    >
      {/* Header com Status Online */}
      <div className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">PreçoCerto</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">Dashboard Mobile</p>
        </div>

        <div className="flex items-center gap-2">
          {!isOnline && <WifiOff className="w-5 h-5 text-amber-500" />}
          {isOnline && <Wifi className="w-5 h-5 text-green-500" />}

          <button
            onClick={onNotificationsClick}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <Bell className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            {criticalAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          <button
            onClick={onSettingsClick}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <Settings className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Health Score - Destaque Principal */}
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className={`
            rounded-lg p-6 text-center
            ${getHealthBgColor(healthScore)}
            border border-slate-200 dark:border-slate-700
          `}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl">{status.emoji}</span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {status.label}
            </span>
          </div>

          <div className="flex items-baseline justify-center gap-1">
            <span className={`text-4xl font-bold ${getHealthColor(healthScore)}`}>
              {Math.round(healthScore)}
            </span>
            <span className="text-slate-600 dark:text-slate-400">/100</span>
          </div>

          {/* Progress bar */}
          <div className="mt-3 w-full bg-slate-300 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${healthScore}%` }}
              className={`h-full rounded-full transition-colors ${
                healthScore >= 80
                  ? 'bg-green-500'
                  : healthScore >= 60
                    ? 'bg-blue-500'
                    : healthScore >= 40
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
              }`}
            />
          </div>
        </motion.div>

        {/* KPIs Essenciais */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Hoje</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              Kz {(dashboard?.predictions?.nextDayRevenue || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Próx. 7 dias</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              Kz {(dashboard?.predictions?.nextWeekRevenue || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Alertas Críticos */}
        {criticalAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-800 dark:text-red-300">
                  {criticalAlerts.length} Alerta(s) Crítico(s)
                </p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  {criticalAlerts[0]?.description}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Reabastecimento Urgente */}
        {urgentReorders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  {urgentReorders.length} Reabastecimento(s) Urgente(s)
                </p>
                <div className="text-sm text-amber-700 dark:text-amber-400 mt-2 space-y-1">
                  {urgentReorders.slice(0, 2).map((r) => (
                    <p key={r.id}>• {r.productName}: {r.recommendedQuantity} unidades</p>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Top 3 Produtos em Foco */}
        {forecasts && forecasts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white px-1">
              📈 Produtos em Destaque
            </p>
            {forecasts.slice(0, 3).map((forecast) => (
              <motion.div
                key={forecast.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white truncate">
                    {forecast.productName}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Previsão: {forecast.predictedUnits} un.
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {forecast.trend === 'increasing' ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {forecast.confidence}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Confiança das Previsões */}
        {dashboard && (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Confiança de Previsão
              </p>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {Math.round(dashboard.healthScore?.forecastConfidence || 0)}%
              </span>
            </div>
            <div className="w-full bg-slate-300 dark:bg-slate-700 rounded-full h-2">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{
                  width: `${Math.round(dashboard.healthScore?.forecastConfidence || 0)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3 text-center text-xs text-slate-600 dark:text-slate-400">
        {isOnline ? 'Sincronizado' : 'Modo Offline'} •{' '}
        {new Date().toLocaleTimeString('pt-PT', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </motion.div>
  );
}
