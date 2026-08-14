/**
 * Dashboard de Auditoria
 * Fase 6: Segurança e Auditoria
 */

import React, { useState, useMemo } from 'react';
import {
  Shield,
  AlertTriangle,
  Activity,
  Users,
  TrendingUp,
  Calendar,
  Filter,
  Download,
  ChevronDown,
} from 'lucide-react';
import type { AuditEntry, AuditFilter, SecurityAlert } from '../types/audit';

interface AuditDashboardProps {
  auditEntries: AuditEntry[];
  securityAlerts: SecurityAlert[];
  onExport?: () => void;
}

export function AuditDashboard({
  auditEntries,
  securityAlerts,
  onExport,
}: AuditDashboardProps) {
  const [filter, setFilter] = useState<AuditFilter>({});
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month' | 'all'>('week');

  // Filtrar entradas
  const filteredEntries = useMemo(() => {
    let filtered = auditEntries;

    if (filter.userId) filtered = filtered.filter((e) => e.userId === filter.userId);
    if (filter.storeId) filtered = filtered.filter((e) => e.storeId === filter.storeId);
    if (filter.actionType) filtered = filtered.filter((e) => e.actionType === filter.actionType);
    if (filter.severity) filtered = filtered.filter((e) => e.severity === filter.severity);
    if (filter.status) filtered = filtered.filter((e) => e.status === filter.status);

    // Filtro de data
    const now = new Date();
    const cutoffMap = {
      day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      all: new Date(0),
    };

    const cutoff = cutoffMap[dateRange];
    filtered = filtered.filter((e) => new Date(e.timestamp) > cutoff);

    return filtered;
  }, [auditEntries, filter, dateRange]);

  // Calcular estatísticas
  const stats = useMemo(
    () => ({
      total: filteredEntries.length,
      success: filteredEntries.filter((e) => e.status === 'SUCCESS').length,
      failures: filteredEntries.filter((e) => e.status === 'FAILURE').length,
      critical: filteredEntries.filter((e) => e.severity === 'CRITICAL').length,
      activeAlerts: securityAlerts.filter((a) => !a.resolved).length,
      uniqueUsers: new Set(filteredEntries.map((e) => e.userId)).size,
    }),
    [filteredEntries, securityAlerts]
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      case 'HIGH':
        return 'bg-orange-100 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-green-100 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    if (status === 'SUCCESS') return 'bg-green-500/10 text-green-700 dark:text-green-400';
    if (status === 'FAILURE') return 'bg-red-500/10 text-red-700 dark:text-red-400';
    return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Auditoria</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Monitorização e rastreamento de atividades</p>
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
        >
          <Download size={18} />
          Exportar Relatório
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Eventos</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <Activity className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
        </div>

        {/* Sucessos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Sucessos</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.success}</p>
            </div>
            <Shield className="text-green-600 dark:text-green-400" size={24} />
          </div>
        </div>

        {/* Falhas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Falhas</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.failures}</p>
            </div>
            <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
          </div>
        </div>

        {/* Críticos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Críticos</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {stats.critical}
              </p>
            </div>
            <TrendingUp className="text-orange-600 dark:text-orange-400" size={24} />
          </div>
        </div>

        {/* Alertas Ativos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Alertas Ativos</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {stats.activeAlerts}
              </p>
            </div>
            <Shield className="text-purple-600 dark:text-purple-400" size={24} />
          </div>
        </div>

        {/* Utilizadores */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Utilizadores</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {stats.uniqueUsers}
              </p>
            </div>
            <Users className="text-indigo-600 dark:text-indigo-400" size={24} />
          </div>
        </div>
      </div>

      {/* Filtros e Controles */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-slate-600 dark:text-slate-400" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Intervalo de Datas */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Período
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="day">Últimas 24 horas</option>
              <option value="week">Última semana</option>
              <option value="month">Último mês</option>
              <option value="all">Todos</option>
            </select>
          </div>

          {/* Tipo de Ação */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tipo de Ação
            </label>
            <select
              value={filter.actionType || ''}
              onChange={(e) =>
                setFilter({ ...filter, actionType: (e.target.value as any) || undefined })
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="">Todas</option>
              <option value="CREATE">Criar</option>
              <option value="UPDATE">Atualizar</option>
              <option value="DELETE">Apagar</option>
              <option value="LOGIN">Login</option>
            </select>
          </div>

          {/* Severidade */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Severidade
            </label>
            <select
              value={filter.severity || ''}
              onChange={(e) => setFilter({ ...filter, severity: (e.target.value as any) || undefined })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="">Todas</option>
              <option value="CRITICAL">Crítica</option>
              <option value="HIGH">Alta</option>
              <option value="MEDIUM">Média</option>
              <option value="LOW">Baixa</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Status
            </label>
            <select
              value={filter.status || ''}
              onChange={(e) => setFilter({ ...filter, status: (e.target.value as any) || undefined })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="">Todos</option>
              <option value="SUCCESS">Sucesso</option>
              <option value="FAILURE">Falha</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alertas de Segurança */}
      {stats.activeAlerts > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200">Alertas de Segurança Ativa</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Existem {stats.activeAlerts} alerta(s) de segurança que necessitam de atenção
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Log de Auditoria */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Log de Auditoria</h3>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredEntries.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
              Nenhuma entrada de auditoria encontrada
            </p>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() =>
                    setExpandedEntry(expandedEntry === entry.id ? null : entry.id)
                  }
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(entry.severity)}`}>
                        {entry.severity}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(entry.status)}`}>
                        {entry.status}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {entry.action}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      <p>{entry.userName} na loja {entry.storeName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        {new Date(entry.timestamp).toLocaleString('pt-PT')}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`flex-shrink-0 text-slate-400 dark:text-slate-600 transition-transform ${
                      expandedEntry === entry.id ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {/* Detalhes Expandidos */}
                {expandedEntry === entry.id && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Utilizador</p>
                        <p className="text-slate-900 dark:text-white">{entry.userName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Email</p>
                        <p className="text-slate-900 dark:text-white">{entry.userEmail}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Loja</p>
                        <p className="text-slate-900 dark:text-white">{entry.storeName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">IP Address</p>
                        <p className="text-slate-900 dark:text-white">{entry.ipAddress}</p>
                      </div>
                    </div>

                    {entry.changes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Alterações</p>
                        <div className="space-y-1">
                          {entry.changes.map((change, idx) => (
                            <div key={idx} className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded">
                              <p className="font-medium text-slate-900 dark:text-white">{change.field}</p>
                              <p className="text-slate-600 dark:text-slate-400">
                                De: {JSON.stringify(change.oldValue)} → Para: {JSON.stringify(change.newValue)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {entry.errorMessage && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-medium text-red-600 dark:text-red-400">Erro</p>
                        <p className="text-slate-900 dark:text-white">{entry.errorMessage}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {filteredEntries.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Mostrando {filteredEntries.length} de {auditEntries.length} entradas
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
