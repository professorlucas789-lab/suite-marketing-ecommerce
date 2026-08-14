/**
 * Painel de Alertas de Segurança
 * Fase 6: Segurança e Auditoria
 */

import React, { useState } from 'react';
import { AlertTriangle, X, Shield, Clock, CheckCircle2 } from 'lucide-react';
import type { SecurityAlert } from '../types/audit';

interface SecurityAlertPanelProps {
  alerts: SecurityAlert[];
  onResolve?: (alertId: string, resolvedBy: string) => void;
  onDismiss?: (alertId: string) => void;
}

export function SecurityAlertPanel({
  alerts,
  onResolve,
  onDismiss,
}: SecurityAlertPanelProps) {
  const [resolveNote, setResolveNote] = useState<Record<string, string>>({});
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const activeAlerts = alerts.filter((a) => !a.resolved);
  const resolvedAlerts = alerts.filter((a) => a.resolved);

  const getAlertIcon = (type: SecurityAlert['type']) => {
    switch (type) {
      case 'UNAUTHORIZED_ACCESS':
        return '🔓';
      case 'MULTIPLE_FAILURES':
        return '❌';
      case 'UNUSUAL_ACTIVITY':
        return '⚠️';
      case 'PERMISSION_ABUSE':
        return '🚫';
      case 'DATA_ACCESS_VIOLATION':
        return '📊';
      default:
        return '⚡';
    }
  };

  const getAlertColor = (severity: 'WARNING' | 'CRITICAL') => {
    if (severity === 'CRITICAL') {
      return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
    }
    return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800';
  };

  const getTextColor = (severity: 'WARNING' | 'CRITICAL') => {
    if (severity === 'CRITICAL') {
      return 'text-red-800 dark:text-red-200';
    }
    return 'text-yellow-800 dark:text-yellow-200';
  };

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Alertas Ativos */}
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 dark:text-red-300">Alertas Ativos</p>
              <p className="text-3xl font-bold text-red-800 dark:text-red-200 mt-1">{activeAlerts.length}</p>
            </div>
            <AlertTriangle className="text-red-600 dark:text-red-400" size={32} />
          </div>
        </div>

        {/* Críticos */}
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700 dark:text-orange-300">Críticos</p>
              <p className="text-3xl font-bold text-orange-800 dark:text-orange-200 mt-1">
                {activeAlerts.filter((a) => a.severity === 'CRITICAL').length}
              </p>
            </div>
            <Shield className="text-orange-600 dark:text-orange-400" size={32} />
          </div>
        </div>

        {/* Resolvidos */}
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 dark:text-green-300">Resolvidos</p>
              <p className="text-3xl font-bold text-green-800 dark:text-green-200 mt-1">
                {resolvedAlerts.length}
              </p>
            </div>
            <CheckCircle2 className="text-green-600 dark:text-green-400" size={32} />
          </div>
        </div>
      </div>

      {/* Alertas Ativos */}
      {activeAlerts.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
            Alertas Ativos ({activeAlerts.length})
          </h3>

          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`border rounded-lg p-4 ${getAlertColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl flex-shrink-0 mt-1">
                      {getAlertIcon(alert.type)}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-semibold ${getTextColor(alert.severity)}`}>
                          {alert.type}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            alert.severity === 'CRITICAL'
                              ? 'bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                              : 'bg-yellow-200 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${getTextColor(alert.severity)}`}>
                        {alert.description}
                      </p>
                      {alert.userName && (
                        <p className={`text-xs mt-2 ${getTextColor(alert.severity)}`}>
                          👤 {alert.userName}
                          {alert.storeName && ` na loja ${alert.storeName}`}
                        </p>
                      )}
                      <p className={`text-xs mt-1 flex items-center gap-1 ${getTextColor(alert.severity)}`}>
                        <Clock size={12} />
                        {new Date(alert.timestamp).toLocaleString('pt-PT')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onDismiss?.(alert.id)}
                    className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Detalhes do Alerta */}
                {Object.keys(alert.details).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                    <button
                      onClick={() =>
                        setExpandedAlert(expandedAlert === alert.id ? null : alert.id)
                      }
                      className={`text-sm font-medium ${getTextColor(alert.severity)} hover:underline`}
                    >
                      {expandedAlert === alert.id ? 'Ocultar' : 'Ver'} Detalhes
                    </button>

                    {expandedAlert === alert.id && (
                      <div className="mt-2 space-y-1 text-sm">
                        {Object.entries(alert.details).map(([key, value]) => (
                          <p key={key} className={getTextColor(alert.severity)}>
                            <span className="font-medium">{key}:</span>{' '}
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Ações */}
                <div className="mt-3 pt-3 border-t border-current border-opacity-20 flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Nota de resolução (opcional)"
                      value={resolveNote[alert.id] || ''}
                      onChange={(e) =>
                        setResolveNote({ ...resolveNote, [alert.id]: e.target.value })
                      }
                      className={`w-full px-3 py-1 rounded text-sm border ${
                        alert.severity === 'CRITICAL'
                          ? 'border-red-200 dark:border-red-800 bg-white dark:bg-slate-800'
                          : 'border-yellow-200 dark:border-yellow-800 bg-white dark:bg-slate-800'
                      }`}
                    />
                  </div>
                  <button
                    onClick={() => {
                      onResolve?.(alert.id, resolveNote[alert.id] || 'Resolvido');
                      setResolveNote({ ...resolveNote, [alert.id]: '' });
                    }}
                    className={`px-3 py-1 rounded text-sm font-medium text-white transition-colors ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-yellow-600 hover:bg-yellow-700'
                    }`}
                  >
                    Resolver
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas Resolvidos */}
      {resolvedAlerts.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
            Alertas Resolvidos ({resolvedAlerts.length})
          </h3>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {resolvedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded p-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">{alert.type}</p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">{alert.description}</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Resolvido por {alert.resolvedBy} em{' '}
                      {alert.resolvedAt && new Date(alert.resolvedAt).toLocaleString('pt-PT')}
                    </p>
                  </div>
                  <CheckCircle2 className="text-green-600 dark:text-green-400 flex-shrink-0" size={20} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sem Alertas */}
      {activeAlerts.length === 0 && resolvedAlerts.length === 0 && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-8 text-center">
          <CheckCircle2 className="text-green-600 dark:text-green-400 mx-auto mb-3" size={32} />
          <p className="font-semibold text-green-800 dark:text-green-200">Sistema Seguro</p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            Nenhum alerta de segurança ativa no momento
          </p>
        </div>
      )}
    </div>
  );
}
