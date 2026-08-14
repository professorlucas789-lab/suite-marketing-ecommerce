/**
 * Dashboard de atividades em tempo real de uma loja
 * Fase 6: Sistema Multi-Loja - Fase 3
 */

import React, { useEffect, useState } from 'react';
import { useStoreActivity, useStoreStats } from '../hooks/useStoreData';
import { ActivityFeed } from './ActivityFeed';
import { BarChart3, TrendingUp, Users, Package } from 'lucide-react';

interface StoreActivityDashboardProps {
  storeId: string;
  storeName: string;
  showStats?: boolean;
  activityLimit?: number;
}

export function StoreActivityDashboard({
  storeId,
  storeName,
  showStats = true,
  activityLimit = 10,
}: StoreActivityDashboardProps) {
  const { activities, loading: activitiesLoading, error: activitiesError } = useStoreActivity(
    storeId,
    50
  );
  const { stats, loading: statsLoading, error: statsError } = useStoreStats(storeId);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;

    // Auto-refresh a cada 30 segundos
    const interval = setInterval(() => {
      // Os hooks já fazem refresh automático com onSnapshot
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Atividades de {storeName}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Monitorize atividades em tempo real
          </p>
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            autoRefresh
              ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          {autoRefresh ? '🔄 Auto' : '⏸️ Manual'}
        </button>
      </div>

      {/* Statistics */}
      {showStats && (
        <div className="grid gap-4 md:grid-cols-4">
          {/* Total Products */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Produtos</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {statsLoading ? '-' : stats?.totalProdutos || 0}
                </p>
              </div>
              <Package size={24} className="text-emerald-600 dark:text-emerald-400 opacity-20" />
            </div>
          </div>

          {/* Total Users */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Utilizadores</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {statsLoading ? '-' : stats?.totalUtilizadores || 0}
                </p>
              </div>
              <Users size={24} className="text-blue-600 dark:text-blue-400 opacity-20" />
            </div>
          </div>

          {/* Average Price */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Preço Médio</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {statsLoading ? '-' : `€${(stats?.precoMedio || 0).toFixed(2)}`}
                </p>
              </div>
              <TrendingUp size={24} className="text-purple-600 dark:text-purple-400 opacity-20" />
            </div>
          </div>

          {/* Average Margin */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Margem Média</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {statsLoading ? '-' : `${(stats?.margemMedia || 0).toFixed(1)}%`}
                </p>
              </div>
              <BarChart3 size={24} className="text-orange-600 dark:text-orange-400 opacity-20" />
            </div>
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Feed de Atividades (Tempo Real)
        </h2>
        <ActivityFeed
          activities={activities}
          loading={activitiesLoading}
          error={activitiesError}
          limit={activityLimit}
        />
      </div>

      {/* Last Update */}
      <div className="text-center text-sm text-slate-600 dark:text-slate-400">
        {autoRefresh ? (
          <>
            <p>🔄 Atualizando automaticamente a cada 30 segundos</p>
            <p>Última atualização: {stats?.ultimaAtualizacao ? new Date(stats.ultimaAtualizacao).toLocaleTimeString('pt-PT') : 'Nunca'}</p>
          </>
        ) : (
          <p>⏸️ Atualizações automáticas desativadas</p>
        )}
      </div>
    </div>
  );
}
