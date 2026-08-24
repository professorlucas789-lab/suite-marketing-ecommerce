/**
 * ExecutiveDashboard Component
 * Dashboard executivo com KPIs, gráficos, alertas e métricas de negócio
 * NOVO (Phase 17): Dashboard visual para proprietários
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Download,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useExecutiveDashboard } from '../hooks/useExecutiveDashboard';
import { SalesMetric } from '../services/executiveDashboardService';

// Gráfico simples sem dependências externas
const SimpleLineChart = ({ data, dataKey }: { data: SalesMetric[]; dataKey: keyof SalesMetric }) => {
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => (d[dataKey] as number) || 0));
  const min = 0;
  const range = max - min || 1;

  return (
    <div className="h-48 flex items-end gap-1 bg-gradient-to-t from-blue-50 to-transparent dark:from-blue-900/20 p-4 rounded-lg">
      {data.map((point, idx) => {
        const value = (point[dataKey] as number) || 0;
        const height = ((value - min) / range) * 100;
        return (
          <div
            key={idx}
            className="flex-1 relative group"
            title={`${point.date}: ${value.toFixed(2)}`}
          >
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ delay: idx * 0.05 }}
              className="w-full bg-gradient-to-t from-blue-500 to-blue-300 dark:from-blue-400 dark:to-blue-200 rounded-t hover:opacity-80 transition-opacity"
            />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-2 py-1 rounded whitespace-nowrap">
              {value.toFixed(0)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function ExecutiveDashboard() {
  const { metrics, loading, error, refreshMetrics, daysBack, setDaysBack } =
    useExecutiveDashboard();
  const [expandedAlert, setExpandedAlert] = useState<number | null>(null);

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
      >
        <div className="flex items-start gap-4">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
              Erro ao Carregar Dashboard
            </h3>
            <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
            <button
              onClick={() => refreshMetrics()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (loading && !metrics) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center py-20"
      >
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando dashboard...</p>
        </div>
      </motion.div>
    );
  }

  if (!metrics) return null;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return null;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600 dark:text-green-400';
      case 'down':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-200 dark:bg-red-700 text-red-800 dark:text-red-100';
      case 'warning':
        return 'bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-100';
      default:
        return 'bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-100';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header com título e controlos */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 rounded-lg p-6 text-white">
        <div>
          <h1 className="text-3xl font-bold mb-1">📊 Dashboard Executivo</h1>
          <p className="text-blue-100">Visão geral de métricas de negócio e alertas críticos</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4" />
            <select
              value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              className="bg-transparent border-none text-white font-medium focus:outline-none"
            >
              <option value={7} className="text-gray-900">Últimos 7 dias</option>
              <option value={30} className="text-gray-900">Últimos 30 dias</option>
              <option value={90} className="text-gray-900">Últimos 90 dias</option>
            </select>
          </div>

          <button
            onClick={() => refreshMetrics()}
            disabled={loading}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg disabled:opacity-50 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.kpis.map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-2xl">{kpi.icon}</span>
              {getTrendIcon(kpi.trend)}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{kpi.label}</p>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {kpi.value.toLocaleString('pt-PT')}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{kpi.unit}</span>
            </div>

            <span className={`text-sm font-medium ${getTrendColor(kpi.trend)}`}>
              {kpi.percentageChange > 0 ? '+' : ''}{kpi.percentageChange.toFixed(1)}%
            </span>
          </motion.div>
        ))}
      </div>

      {/* Saúde da Loja */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          🏥 Saúde da Loja
        </h2>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">Saúde Geral</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {metrics.storeHealth.overall}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${metrics.storeHealth.overall}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(metrics.storeHealth.categories).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {value}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                {key === 'products' && 'Produtos'}
                {key === 'alerts' && 'Alertas'}
                {key === 'stock' && 'Stock'}
                {key === 'margins' && 'Margens'}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tendência de Vendas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          📈 Tendência de Vendas
        </h2>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Receita Diária</p>
            <SimpleLineChart data={metrics.salesTrend} dataKey="revenue" />
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Número de Pedidos</p>
            <SimpleLineChart data={metrics.salesTrend} dataKey="orders" />
          </div>
        </div>
      </motion.div>

      {/* Comparativa de Períodos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {[
          {
            label: 'Receita',
            current: `€${metrics.periodComparison.current.revenue}`,
            growth: metrics.periodComparison.growth.revenue,
            icon: '💰',
          },
          {
            label: 'Pedidos',
            current: metrics.periodComparison.current.orders,
            growth: metrics.periodComparison.growth.orders,
            icon: '📦',
          },
          {
            label: 'Margem Média',
            current: `${metrics.periodComparison.current.avgMargin.toFixed(1)}%`,
            growth: metrics.periodComparison.growth.margin,
            icon: '📊',
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">{item.icon}</span>
              <span className={`flex items-center gap-1 text-sm font-medium ${getTrendColor(
                item.growth >= 0 ? 'up' : 'down'
              )}`}>
                {item.growth >= 0 ? '+' : ''}{item.growth.toFixed(1)}%
                {getTrendIcon(item.growth >= 0 ? 'up' : 'down')}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{item.current}</p>
          </div>
        ))}
      </motion.div>

      {/* Top Produtos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          🏆 Top 5 Produtos
        </h2>

        <div className="space-y-3">
          {metrics.topProducts.map((product, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {idx + 1}. {product.name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {product.units} unidades | Margem: {product.margin.toFixed(1)}%
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold text-gray-900 dark:text-white">
                  €{product.revenue.toFixed(2)}
                </div>
                <div
                  className={`text-xs font-medium ${
                    product.status === 'good'
                      ? 'text-green-600 dark:text-green-400'
                      : product.status === 'warning'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {product.status === 'good' && '✓ Bom'}
                  {product.status === 'warning' && '⚠️ Aviso'}
                  {product.status === 'critical' && '🔴 Crítico'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Top Categorias */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          📂 Top 5 Categorias
        </h2>

        <div className="space-y-3">
          {metrics.topCategories.map((category, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {idx + 1}. {category.name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {category.products} produtos
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold text-gray-900 dark:text-white">
                  €{category.revenue.toFixed(2)}
                </div>
                {category.growth > 0 && (
                  <div className="text-xs font-medium text-green-600 dark:text-green-400">
                    ↑ {category.growth.toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Alertas Críticos */}
      {metrics.criticalAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            🚨 Alertas Críticos
          </h2>

          <div className="space-y-3">
            {metrics.criticalAlerts.map((alert, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-4 border-l-4 rounded-lg ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs font-bold uppercase px-2 py-1 rounded ${getSeverityBadgeColor(
                          alert.severity
                        )}`}
                      >
                        {alert.type === 'expiry' && 'Validade'}
                        {alert.type === 'stock' && 'Stock'}
                        {alert.type === 'margin' && 'Margem'}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {alert.timestamp.toLocaleTimeString('pt-PT')}
                      </span>
                    </div>

                    <div className="font-medium text-gray-900 dark:text-white mb-1">
                      {alert.productName}
                    </div>

                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {alert.message}
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedAlert(expandedAlert === idx ? null : idx)}
                    className="px-3 py-1 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors whitespace-nowrap"
                  >
                    Agir
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Seção vazia de alertas */}
      {metrics.criticalAlerts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800 text-center"
        >
          <div className="text-2xl mb-2">✅</div>
          <p className="font-medium text-green-900 dark:text-green-100">Sem Alertas Críticos</p>
          <p className="text-sm text-green-700 dark:text-green-300">
            Tudo funcionando normalmente na sua loja
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
