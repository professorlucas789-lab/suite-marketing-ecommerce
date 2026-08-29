/**
 * Componente: ExpiryAlertPanel
 * Painel para visualizar alertas de validade
 * FASE 1: Notificações Inteligentes
 *
 * Mostra:
 * - Lista de alertas com filtro por severidade
 * - Ações: Reconhecer, Resolver
 * - Status visual por cores (Critical/Warning/Info)
 */

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Clock, Trash2, Eye, EyeOff } from 'lucide-react';
import { ExpiryAlert, AlertSeverity } from '../types/notifications';
import { useExpiryAlerts } from '../hooks/useExpiryAlerts';
import { useAuth } from '../hooks/useAuth';

type AlertFilter = 'ALL' | 'CRITICAL' | 'WARNING' | 'INFO' | 'RESOLVED';

interface ExpiryAlertPanelProps {
  compact?: boolean;
  showResolved?: boolean;
}

export function ExpiryAlertPanel({ compact = false, showResolved = false }: ExpiryAlertPanelProps) {
  const { alerts, alertsSummary, isLoading, error, acknowledgeAlert, resolveAlert, clearError } = useExpiryAlerts();
  const { user } = useAuth();
  const [filter, setFilter] = useState<AlertFilter>('ALL');
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [resolveReason, setResolveReason] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);

  if (!user?.uid) {
    return <div className="p-4 text-center text-gray-500">Faça login para ver alertas</div>;
  }

  // Filtrar alertas
  const filteredAlerts = alerts.filter((alert) => {
    if (showResolved) {
      return true;
    }
    if (!alert.resolvedAt) {
      if (filter === 'ALL') return true;
      if (filter === 'CRITICAL') return alert.severity === 'CRITICAL';
      if (filter === 'WARNING') return alert.severity === 'WARNING';
      if (filter === 'INFO') return alert.severity === 'INFO';
    }
    return false;
  });

  const handleResolveClick = (alertId: string) => {
    setSelectedAlert(alertId);
    setShowResolveModal(true);
  };

  const handleResolveSubmit = async () => {
    if (!selectedAlert || !user?.uid) return;

    try {
      await resolveAlert(selectedAlert, user.uid, resolveReason || 'Resolvido');
      setShowResolveModal(false);
      setSelectedAlert(null);
      setResolveReason('');
    } catch (err) {
      console.error('Erro ao resolver alerta:', err);
    }
  };

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-200';
      case 'WARNING':
        return 'bg-yellow-50 border-yellow-200';
      case 'INFO':
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'WARNING':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'INFO':
        return <Eye className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className={`space-y-4 ${compact ? 'p-3' : 'p-6'}`}>
      {/* Header com resumo */}
      <div className="flex items-center justify-between">
        <h2 className={compact ? 'text-lg' : 'text-2xl'} >Alertas de Validade</h2>
        <div className="flex gap-2">
          {alertsSummary.critical > 0 && (
            <div className="flex items-center gap-1 px-3 py-1 bg-red-100 rounded-full">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-600">{alertsSummary.critical} Críticos</span>
            </div>
          )}
          {alertsSummary.warning > 0 && (
            <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 rounded-full">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-600">{alertsSummary.warning} Avisos</span>
            </div>
          )}
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="p-3 bg-red-100 border border-red-300 rounded-lg flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {f === 'ALL' ? `Todos (${alerts.length})` : f}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="p-8 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
          <p className="mt-2 text-gray-500">Carregando alertas...</p>
        </div>
      )}

      {/* Lista de alertas */}
      {!isLoading && filteredAlerts.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-600" />
          <p>Nenhum alerta neste momento</p>
        </div>
      )}

      {!isLoading && filteredAlerts.length > 0 && (
        <div className="space-y-2">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 border-l-4 rounded-lg ${getSeverityColor(alert.severity)} ${
                alert.resolvedAt ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {alert.productName}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Expira em <strong>{alert.daysUntilExpiry}</strong> dias
                      {alert.expiryDate && ` (${new Date(alert.expiryDate).toLocaleDateString('pt-PT')})`}
                    </p>
                    {alert.quantity && (
                      <p className="text-sm text-gray-600">
                        Quantidade: <strong>{alert.quantity}</strong> unidade(s)
                      </p>
                    )}
                    {alert.batchNumber && (
                      <p className="text-sm text-gray-600">
                        Lote: <strong>{alert.batchNumber}</strong>
                      </p>
                    )}
                  </div>
                </div>

                {/* Ações */}
                {!alert.resolvedAt && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => acknowledgeAlert(alert.id, user.uid)}
                      className="p-2 hover:bg-white rounded-lg transition text-gray-600 hover:text-blue-600"
                      title="Reconhecer alerta"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleResolveClick(alert.id)}
                      className="p-2 hover:bg-white rounded-lg transition text-gray-600 hover:text-green-600"
                      title="Resolver alerta"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {alert.resolvedAt && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CheckCircle className="w-4 h-4" />
                    <span>Resolvido</span>
                  </div>
                )}
              </div>

              {/* Status de reconhecimento */}
              {alert.acknowledgedAt && !alert.resolvedAt && (
                <p className="text-xs text-gray-500 mt-2">
                  ✓ Reconhecido em {new Date(alert.acknowledgedAt).toLocaleDateString('pt-PT')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de resolução */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Resolver Alerta</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo (opcional)
                </label>
                <textarea
                  value={resolveReason}
                  onChange={(e) => setResolveReason(e.target.value)}
                  placeholder="Ex: Produto vendido, removido do stock, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowResolveModal(false);
                    setResolveReason('');
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleResolveSubmit}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Resolver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
