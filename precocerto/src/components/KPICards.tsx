/**
 * Cards de KPIs (Key Performance Indicators)
 * Fase 6: Sistema Multi-Loja - Fase 4
 */

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  DollarSign,
  Activity,
  AlertCircle,
} from 'lucide-react';

interface KPIData {
  label: string;
  value: string | number;
  unit?: string;
  change?: number; // Percentage change
  target?: number;
  icon?: React.ReactNode;
  color: 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'emerald';
  trend?: 'up' | 'down' | 'neutral';
}

interface KPICardsProps {
  kpis: KPIData[];
  columns?: number;
}

const colorClasses = {
  green: {
    bg: 'bg-green-50 dark:bg-green-950/20',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/20',
    border: 'border-purple-200 dark:border-purple-800',
    icon: 'text-purple-600 dark:text-purple-400',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    border: 'border-orange-200 dark:border-orange-800',
    icon: 'text-orange-600 dark:text-orange-400',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
};

export function KPICards({ kpis, columns = 3 }: KPICardsProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid gap-4 ${gridCols[columns as keyof typeof gridCols]}`}>
      {kpis.map((kpi, index) => (
        <div
          key={index}
          className={`border rounded-lg p-4 ${colorClasses[kpi.color].bg} ${
            colorClasses[kpi.color].border
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {kpi.label}
              </p>
              {kpi.target && (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Meta: {kpi.target}
                </p>
              )}
            </div>
            {kpi.icon ? (
              <div className={`p-2 ${colorClasses[kpi.color].icon}`}>
                {kpi.icon}
              </div>
            ) : (
              <div className={`p-2 ${colorClasses[kpi.color].icon}`}>
                <Activity size={20} />
              </div>
            )}
          </div>

          {/* Value */}
          <div className="mb-2">
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {kpi.value}
              {kpi.unit && <span className="text-sm text-slate-600 dark:text-slate-400 ml-1">{kpi.unit}</span>}
            </p>
          </div>

          {/* Change */}
          {kpi.change !== undefined && (
            <div className="flex items-center gap-1">
              {kpi.trend === 'up' ? (
                <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
              ) : kpi.trend === 'down' ? (
                <TrendingDown size={16} className="text-red-600 dark:text-red-400" />
              ) : (
                <Activity size={16} className="text-slate-600 dark:text-slate-400" />
              )}
              <span
                className={`text-sm font-medium ${
                  kpi.change > 0
                    ? 'text-green-600 dark:text-green-400'
                    : kpi.change < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {kpi.change > 0 ? '+' : ''}{kpi.change}%
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Component com dados pré-configurados para tipos comuns
export function StoreKPICards({ stats, previousStats }: {
  stats: any;
  previousStats?: any;
}) {
  const calculateChange = (current: number, previous: number | undefined) => {
    if (!previous || previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  };

  const kpis: KPIData[] = [
    {
      label: 'Total de Produtos',
      value: stats?.totalProdutos || 0,
      change: calculateChange(stats?.totalProdutos, previousStats?.totalProdutos),
      trend: (stats?.totalProdutos || 0) >= (previousStats?.totalProdutos || 0) ? 'up' : 'down',
      icon: <Package size={20} />,
      color: 'blue',
    },
    {
      label: 'Utilizadores Ativos',
      value: stats?.totalUtilizadores || 0,
      change: calculateChange(stats?.totalUtilizadores, previousStats?.totalUtilizadores),
      trend: (stats?.totalUtilizadores || 0) >= (previousStats?.totalUtilizadores || 0) ? 'up' : 'down',
      icon: <Users size={20} />,
      color: 'purple',
    },
    {
      label: 'Preço Médio',
      value: `€${(stats?.precoMedio || 0).toFixed(2)}`,
      change: calculateChange(stats?.precoMedio, previousStats?.precoMedio),
      trend: (stats?.precoMedio || 0) >= (previousStats?.precoMedio || 0) ? 'up' : 'neutral',
      icon: <DollarSign size={20} />,
      color: 'orange',
    },
    {
      label: 'Margem Média',
      value: `${(stats?.margemMedia || 0).toFixed(1)}%`,
      change: calculateChange(stats?.margemMedia, previousStats?.margemMedia),
      trend: (stats?.margemMedia || 0) >= (previousStats?.margemMedia || 0) ? 'up' : 'down',
      icon: <TrendingUp size={20} />,
      color: 'green',
    },
    {
      label: 'Valor Total Stock',
      value: `€${(stats?.valorTotalStock || 0).toFixed(0)}`,
      change: calculateChange(stats?.valorTotalStock, previousStats?.valorTotalStock),
      trend: (stats?.valorTotalStock || 0) >= (previousStats?.valorTotalStock || 0) ? 'up' : 'neutral',
      icon: <Activity size={20} />,
      color: 'emerald',
    },
  ];

  return <KPICards kpis={kpis} columns={5} />;
}

// Component para KPIs com alertas
export function HealthCheckKPIs({ stats }: { stats: any }) {
  const getHealthStatus = (margem: number) => {
    if (margem >= 35) return { status: 'Saudável', color: 'green' as const };
    if (margem >= 25) return { status: 'Aceitável', color: 'orange' as const };
    return { status: 'Crítico', color: 'red' as const };
  };

  const getStockStatus = (valor: number) => {
    if (valor >= 5000) return { status: 'Ótimo', color: 'green' as const };
    if (valor >= 2000) return { status: 'Bom', color: 'blue' as const };
    return { status: 'Baixo', color: 'red' as const };
  };

  const margemStatus = getHealthStatus(stats?.margemMedia || 0);
  const stockStatus = getStockStatus(stats?.valorTotalStock || 0);

  const kpis: KPIData[] = [
    {
      label: 'Saúde da Loja',
      value: margemStatus.status,
      color: margemStatus.color,
      icon: margemStatus.color === 'green' ?
        <TrendingUp size={20} /> :
        margemStatus.color === 'orange' ?
        <Activity size={20} /> :
        <AlertCircle size={20} />,
    },
    {
      label: 'Status Stock',
      value: stockStatus.status,
      color: stockStatus.color,
      icon: <Package size={20} />,
    },
    {
      label: 'Eficiência',
      value: `${(stats?.margemMedia || 0).toFixed(0)}%`,
      color: 'purple',
      target: 35,
      icon: <TrendingUp size={20} />,
    },
  ];

  return <KPICards kpis={kpis} columns={3} />;
}
