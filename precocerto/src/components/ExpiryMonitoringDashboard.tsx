/**
 * Dashboard de Monitoramento de Validade
 * Semana 2: Visualização completa com gráficos e KPIs
 *
 * Componentes:
 * - KPI cards com métricas por severidade
 * - Gráfico de produtos expirando por período
 * - Tabela com % de dias para expirar
 * - Histórico de alertas gerados
 */

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Package,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ExpiryAlert } from '../types/notifications';
import { useExpiryAlerts } from '../hooks/useExpiryAlerts';

interface ExpiryMonitoringDashboardProps {
  storeId: string;
  className?: string;
}

/**
 * KPI Card
 */
const KPICard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  bgColor: string;
}> = ({ title, value, icon, trend, bgColor }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${bgColor} rounded-lg p-6 text-white`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>{icon}</div>
        {trend && (
          <div className="flex items-center gap-1">
            {trend.isPositive ? (
              <TrendingDown className="w-4 h-4" />
            ) : (
              <TrendingUp className="w-4 h-4" />
            )}
            <span className="text-sm font-semibold">{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <p className="text-sm font-semibold opacity-80 mb-1">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </motion.div>
  );
};

/**
 * Gráfico de distribuição de alertas por período
 */
const ExpiryTrendChart: React.FC<{ alerts: ExpiryAlert[] }> = ({ alerts }) => {
  const chartData = useMemo(() => {
    // Agrupar produtos por período de expiração
    const periods = {
      '0-7 dias': 0,
      '7-30 dias': 0,
      '30-60 dias': 0,
      '60+ dias': 0,
    };

    alerts.forEach((alert) => {
      if (alert.daysUntilExpiry <= 7) periods['0-7 dias']++;
      else if (alert.daysUntilExpiry <= 30) periods['7-30 dias']++;
      else if (alert.daysUntilExpiry <= 60) periods['30-60 dias']++;
      else periods['60+ dias']++;
    });

    return Object.entries(periods).map(([period, count]) => ({
      periodo: period,
      produtos: count,
    }));
  }, [alerts]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        Distribuição de Expiração
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="periodo" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="produtos" fill="#3b82f6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Gráfico de pizza com severidades
 */
const SeverityPieChart: React.FC<{
  summary: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
}> = ({ summary }) => {
  const data = [
    { name: 'Críticos', value: summary.critical, color: '#ef4444' },
    { name: 'Avisos', value: summary.warning, color: '#eab308' },
    { name: 'Info', value: summary.info, color: '#3b82f6' },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 flex items-center justify-center h-80">
        <p className="text-gray-500 dark:text-gray-400">Sem alertas para exibir</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <BarChart3 className="w-5 h-5" />
        Composição de Severidade
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Tabela de produtos por % de dias até expirar
 */
const ProductsPercentageTable: React.FC<{ alerts: ExpiryAlert[] }> = ({ alerts }) => {
  const sortedAlerts = useMemo(() => {
    // Calcular % de dias até expirar (100% = data de validade é hoje, 0% = 365 dias)
    return alerts
      .map((alert) => {
        let percentage;
        if (alert.daysUntilExpiry <= 0) {
          percentage = 100; // Expirado
        } else if (alert.daysUntilExpiry <= 30) {
          percentage = 100 - (alert.daysUntilExpiry / 30) * 50; // 50-100%
        } else if (alert.daysUntilExpiry <= 365) {
          percentage = (alert.daysUntilExpiry / 365) * 50; // 0-50%
        } else {
          percentage = 0; // Muito longe
        }

        return { ...alert, percentage };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10);
  }, [alerts]);

  const getPercentageColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <Package className="w-5 h-5" />
        Top 10 Produtos por Urgência
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Produto
              </th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Dias
              </th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Urgência
              </th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAlerts.map((alert) => (
              <tr
                key={alert.id}
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                  <div>
                    <p>{alert.productName}</p>
                    {alert.batchNumber && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Lote: {alert.batchNumber}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-bold">
                  <span
                    className={
                      alert.severity === 'CRITICAL'
                        ? 'text-red-600 dark:text-red-400'
                        : alert.severity === 'WARNING'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-blue-600 dark:text-blue-400'
                    }
                  >
                    {alert.daysUntilExpiry}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                        : alert.severity === 'WARNING'
                          ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200'
                          : 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                    }`}
                  >
                    {alert.severity}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${alert.percentage}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-full ${
                          alert.percentage >= 80
                            ? 'bg-red-600'
                            : alert.percentage >= 50
                              ? 'bg-yellow-600'
                              : 'bg-blue-600'
                        }`}
                      />
                    </div>
                    <span className={`text-xs font-bold w-8 text-right ${getPercentageColor(alert.percentage)}`}>
                      {Math.round(alert.percentage)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Dashboard Principal
 */
export const ExpiryMonitoringDashboard: React.FC<ExpiryMonitoringDashboardProps> = ({
  storeId,
  className = '',
}) => {
  const [state] = useExpiryAlerts(storeId);

  // Calcular estatísticas
  const stats = useMemo(() => {
    const total = state.alerts.length;
    const averageDays =
      total > 0
        ? Math.round(state.alerts.reduce((sum, a) => sum + a.daysUntilExpiry, 0) / total)
        : 0;
    const criticalPercentage =
      total > 0 ? Math.round((state.summary.critical / total) * 100) : 0;

    return {
      total,
      averageDays,
      criticalPercentage,
    };
  }, [state]);

  return (
    <div className={className}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Monitoramento de Validade
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Acompanhe em tempo real produtos expirando por loja
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Alertas Críticos"
          value={state.summary.critical}
          icon={<AlertTriangle className="w-8 h-8" />}
          bgColor="bg-gradient-to-br from-red-500 to-red-600"
          trend={{ value: 5, isPositive: true }}
        />
        <KPICard
          title="Avisos"
          value={state.summary.warning}
          icon={<Clock className="w-8 h-8" />}
          bgColor="bg-gradient-to-br from-yellow-500 to-yellow-600"
        />
        <KPICard
          title="Total de Alertas"
          value={stats.total}
          icon={<Package className="w-8 h-8" />}
          bgColor="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <KPICard
          title="Média de Dias"
          value={`${stats.averageDays}d`}
          icon={<Calendar className="w-8 h-8" />}
          bgColor="bg-gradient-to-br from-purple-500 to-purple-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ExpiryTrendChart alerts={state.alerts} />
        <SeverityPieChart summary={state.summary} />
      </div>

      {/* Products Table */}
      <ProductsPercentageTable alerts={state.alerts} />

      {/* Loading state */}
      {state.loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error state */}
      {state.error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <p className="text-red-800 dark:text-red-300 font-semibold">Erro ao carregar dados</p>
          <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>
        </motion.div>
      )}
    </div>
  );
};

export default ExpiryMonitoringDashboard;
