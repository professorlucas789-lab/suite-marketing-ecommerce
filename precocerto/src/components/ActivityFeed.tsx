/**
 * Feed de atividades em tempo real
 * Fase 6: Sistema Multi-Loja - Fase 3
 */

import React from 'react';
import { ActivityStream } from '../types/store';
import { AlertCircle, Loader2, Activity } from 'lucide-react';

interface ActivityFeedProps {
  activities: ActivityStream[];
  loading: boolean;
  error: string | null;
  limit?: number;
}

const activityTypeIcons: Record<string, React.ReactNode> = {
  produto_adicionado: '➕',
  produto_editado: '✏️',
  produto_deletado: '🗑️',
  utilizador_criado: '👤',
  utilizador_editado: '📝',
  utilizador_deletado: '🚫',
  loja_criada: '🏪',
  loja_editada: '🏪',
  loja_deletada: '🏪',
  preco_alterado: '💰',
  stock_alterado: '📦',
  relatorio_gerado: '📊',
};

const activityTypeLabels: Record<string, string> = {
  produto_adicionado: 'Produto Adicionado',
  produto_editado: 'Produto Editado',
  produto_deletado: 'Produto Deletado',
  utilizador_criado: 'Utilizador Criado',
  utilizador_editado: 'Utilizador Editado',
  utilizador_deletado: 'Utilizador Deletado',
  loja_criada: 'Loja Criada',
  loja_editada: 'Loja Editada',
  loja_deletada: 'Loja Deletada',
  preco_alterado: 'Preço Alterado',
  stock_alterado: 'Stock Alterado',
  relatorio_gerado: 'Relatório Gerado',
};

export function ActivityFeed({ activities, loading, error, limit }: ActivityFeedProps) {
  const displayedActivities = limit ? activities.slice(0, limit) : activities;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-emerald-600 dark:text-emerald-400" />
        <span className="ml-2 text-slate-600 dark:text-slate-400">A carregar atividades...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
        <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-800 dark:text-red-200">Erro ao carregar atividades</p>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (displayedActivities.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Nenhuma atividade registada</p>
      </div>
    );
  }

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;

    return date.toLocaleDateString('pt-PT');
  };

  return (
    <div className="space-y-3">
      {displayedActivities.map((activity) => (
        <div
          key={activity.id}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-slate-800 transition-shadow"
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="text-xl flex-shrink-0">
              {activityTypeIcons[activity.tipo] || '📌'}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {activityTypeLabels[activity.tipo] || activity.tipo}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {activity.userName}
                  </p>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                  {formatTime(activity.timestamp)}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                {activity.descricao}
              </p>

              {/* Tags */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {activity.visivel_para && (
                  <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium rounded">
                    {activity.visivel_para === 'admin' ? '🔒 Admin' : '🏪 Loja'}
                  </span>
                )}

                {/* Data tags */}
                {activity.dados &&
                  Object.entries(activity.dados)
                    .slice(0, 2)
                    .map(([key, value]) => (
                      <span
                        key={key}
                        className="inline-block px-2 py-1 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded"
                      >
                        {key}
                      </span>
                    ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Load more indicator */}
      {limit && activities.length > limit && (
        <div className="text-center py-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            +{activities.length - limit} mais atividades
          </p>
        </div>
      )}
    </div>
  );
}
