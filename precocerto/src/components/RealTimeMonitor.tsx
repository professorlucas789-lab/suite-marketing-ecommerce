/**
 * Monitor em tempo real de mudanças na loja
 * Fase 6: Sistema Multi-Loja - Fase 3
 */

import React, { useEffect, useState } from 'react';
import { useStoreActivity } from '../hooks/useStoreData';
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';

interface RealTimeEvent {
  id: string;
  type: 'add' | 'update' | 'delete';
  entityType: string;
  entity: string;
  timestamp: Date;
}

interface StoreMonitorProps {
  storeId: string;
  maxEvents?: number;
}

export function RealTimeMonitor({ storeId, maxEvents = 5 }: StoreMonitorProps) {
  const { activities, loading } = useStoreActivity(storeId, 100);
  const [recentEvents, setRecentEvents] = useState<RealTimeEvent[]>([]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive || loading) return;

    // Converter atividades para eventos
    const events: RealTimeEvent[] = activities
      .slice(0, maxEvents)
      .map((activity) => ({
        id: activity.id,
        type: activity.tipo.includes('adicionado')
          ? 'add'
          : activity.tipo.includes('editado')
            ? 'update'
            : 'delete',
        entityType: activity.tipo.split('_')[0],
        entity: activity.descricao,
        timestamp: new Date(activity.timestamp),
      }));

    setRecentEvents(events);
  }, [activities, loading, isLive, maxEvents]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'add':
        return <TrendingUp size={16} className="text-green-600 dark:text-green-400" />;
      case 'update':
        return <Zap size={16} className="text-blue-600 dark:text-blue-400" />;
      case 'delete':
        return <TrendingDown size={16} className="text-red-600 dark:text-red-400" />;
      default:
        return <Activity size={16} className="text-slate-600 dark:text-slate-400" />;
    }
  };

  const getEventBg = (type: string) => {
    switch (type) {
      case 'add':
        return 'bg-green-100 dark:bg-green-950/30';
      case 'update':
        return 'bg-blue-100 dark:bg-blue-950/30';
      case 'delete':
        return 'bg-red-100 dark:bg-red-950/30';
      default:
        return 'bg-slate-100 dark:bg-slate-800';
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'agora';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m atrás`;
    return `${Math.floor(diffSeconds / 3600)}h atrás`;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-center py-6">
          <Activity size={20} className="animate-spin text-emerald-600 dark:text-emerald-400 mr-2" />
          <span className="text-sm text-slate-600 dark:text-slate-400">A monitorizar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}
          />
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {isLive ? '🔴 Monitorização Ativa' : '⊙ Monitorização Pausa'}
          </span>
        </div>
        <button
          onClick={() => setIsLive(!isLive)}
          className="text-xs px-3 py-1 rounded-lg font-medium transition-colors"
          style={{
            backgroundColor: isLive
              ? '#dcfce7'
              : '#f5f3ff',
            color: isLive ? '#166534' : '#6b21a8',
          }}
        >
          {isLive ? 'Pausar' : 'Retomar'}
        </button>
      </div>

      {/* Events Timeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        {recentEvents.length === 0 ? (
          <div className="text-center py-8">
            <Activity size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">Sem eventos recentes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentEvents.map((event, index) => (
              <div key={event.id} className="flex items-start gap-3">
                {/* Timeline Line */}
                <div className="flex flex-col items-center">
                  <div className={`p-1.5 rounded-lg ${getEventBg(event.type)}`}>
                    {getEventIcon(event.type)}
                  </div>
                  {index < recentEvents.length - 1 && (
                    <div className="w-0.5 h-8 bg-slate-200 dark:bg-slate-700 my-1" />
                  )}
                </div>

                {/* Event Info */}
                <div className="flex-1 pt-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white text-sm">
                        {event.entity}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {event.entityType}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                      {formatTimeAgo(event.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-2">
        {/* Adds */}
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
            {recentEvents.filter((e) => e.type === 'add').length}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400">Adições</p>
        </div>

        {/* Updates */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {recentEvents.filter((e) => e.type === 'update').length}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">Atualizações</p>
        </div>

        {/* Deletes */}
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">
            {recentEvents.filter((e) => e.type === 'delete').length}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400">Removidas</p>
        </div>
      </div>
    </div>
  );
}
