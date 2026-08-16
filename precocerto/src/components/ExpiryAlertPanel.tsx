/**
 * Painel de Alertas de Validade
 * Semana 2: Componente reutilizável para exibição de alertas por severidade
 *
 * Padrão: Container com lógica (hook) + Presentacional com renderização
 * Responsivo: Desktop (tabela) + Mobile (cards)
 * Dark mode: Suportado via Tailwind
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  X,
  Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExpiryAlert, AlertSeverity } from '../types/notifications';
import { useExpiryAlerts } from '../hooks/useExpiryAlerts';
import { ExpiryAlertService } from '../services/expiryAlertService';

interface ExpiryAlertPanelProps {
  storeId: string;
  maxItems?: number;
  autoRefreshInterval?: number; // milliseconds
  onAlertResolved?: (alertId: string) => void;
  className?: string;
}

/**
 * Ícone de severidade com cores
 */
const SeverityIcon: React.FC<{ severity: AlertSeverity }> = ({ severity }) => {
  if (severity === 'CRITICAL') {
    return (
      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
      </div>
    );
  }

  if (severity === 'WARNING') {
    return (
      <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
        <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      </div>
    );
  }

  return (
    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
      <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
    </div>
  );
};

/**
 * Badge de status
 */
const StatusBadge: React.FC<{ severity: AlertSeverity }> = ({ severity }) => {
  const badgeStyles = {
    CRITICAL: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
    WARNING: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
    INFO: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
  };

  const labels = {
    CRITICAL: 'Crítico',
    WARNING: 'Aviso',
    INFO: 'Informação',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeStyles[severity]}`}>
      {labels[severity]}
    </span>
  );
};

/**
 * Cartão individual de alerta (Mobile)
 */
const AlertCard: React.FC<{
  alert: ExpiryAlert;
  onAcknowledge: () => void;
  onResolve: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ alert, onAcknowledge, onResolve, isExpanded, onToggle }) => {
  const daysColor =
    alert.severity === 'CRITICAL'
      ? 'text-red-600 dark:text-red-400'
      : alert.severity === 'WARNING'
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-blue-600 dark:text-blue-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
    >
      {/* Header do cartão */}
      <div className="flex items-start justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-start gap-3 flex-1">
          <SeverityIcon severity={alert.severity} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white truncate">
              {alert.productName}
            </p>
            <p className={`text-sm font-bold ${daysColor}`}>
              {alert.daysUntilExpiry} dias até expirar
            </p>
          </div>
        </div>
        <div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Conteúdo expandido */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Data de Validade:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {new Date(alert.expiryDate).toLocaleDateString('pt-PT')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Severidade:</span>
                <StatusBadge severity={alert.severity} />
              </div>
              {alert.quantity && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Quantidade:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {alert.quantity} unidades
                  </span>
                </div>
              )}
              {alert.batchNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Lote:</span>
                  <span className="font-mono text-xs text-gray-900 dark:text-white">
                    {alert.batchNumber}
                  </span>
                </div>
              )}
              {alert.notes && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Notas:</span>
                  <p className="text-gray-700 dark:text-gray-300 text-xs mt-1">{alert.notes}</p>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex gap-2">
              {!alert.acknowledgedAt && (
                <button
                  onClick={onAcknowledge}
                  className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  Reconhecer
                </button>
              )}
              <button
                onClick={onResolve}
                className="flex-1 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Resolvido
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/**
 * Linha de tabela (Desktop)
 */
const AlertTableRow: React.FC<{
  alert: ExpiryAlert;
  onAcknowledge: () => void;
  onResolve: () => void;
}> = ({ alert, onAcknowledge, onResolve }) => {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <SeverityIcon severity={alert.severity} />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{alert.productName}</p>
            {alert.batchNumber && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Lote: {alert.batchNumber}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <StatusBadge severity={alert.severity} />
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
          {alert.daysUntilExpiry} dias
        </span>
      </td>
      <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
        {new Date(alert.expiryDate).toLocaleDateString('pt-PT')}
      </td>
      <td className="px-4 py-3 text-center text-sm">
        {alert.quantity && <span className="text-gray-900 dark:text-white">{alert.quantity}</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2 justify-end">
          {!alert.acknowledgedAt && (
            <button
              onClick={onAcknowledge}
              className="px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
            >
              Reconhecer
            </button>
          )}
          <button
            onClick={onResolve}
            className="px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            Resolvido
          </button>
        </div>
      </td>
    </motion.tr>
  );
};

/**
 * Componente Principal
 */
export const ExpiryAlertPanel: React.FC<ExpiryAlertPanelProps> = ({
  storeId,
  maxItems = 10,
  autoRefreshInterval = 300000, // 5 minutos
  onAlertResolved,
  className = '',
}) => {
  const [state, actions] = useExpiryAlerts(storeId);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const userId = 'current-user'; // TODO: Obter do contexto

  // Auto-refresh
  React.useEffect(() => {
    if (!autoRefreshInterval) return;

    const interval = setInterval(() => {
      actions.refetch();
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, actions]);

  // Filtrar alertas por tab
  const filteredAlerts = React.useMemo(() => {
    let filtered = [...state.alerts];

    if (activeTab === 'critical') {
      filtered = filtered.filter((a) => a.severity === 'CRITICAL');
    } else if (activeTab === 'warning') {
      filtered = filtered.filter((a) => a.severity === 'WARNING');
    } else if (activeTab === 'info') {
      filtered = filtered.filter((a) => a.severity === 'INFO');
    }

    return filtered.slice(0, maxItems);
  }, [state.alerts, activeTab, maxItems]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await actions.acknowledgeAlert(alertId, userId);
    } catch (error) {
      console.error('Erro ao reconhecer alerta:', error);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await actions.resolveAlert(alertId, userId, 'Resolvido pelo utilizador');
      onAlertResolved?.(alertId);
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
    }
  };

  // Estado de carregamento
  if (state.loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Carregando alertas...</span>
        </div>
      </div>
    );
  }

  // Sem alertas
  if (filteredAlerts.length === 0) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400">
          Nenhum alerta de validade {activeTab !== 'all' ? `com severidade "${activeTab}"` : ''}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header com resumo */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Alertas de Validade
        </h2>

        {/* Resumo de contadores */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {state.summary.critical}
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">Críticos</div>
          </div>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {state.summary.warning}
            </div>
            <div className="text-sm text-yellow-600 dark:text-yellow-400">Avisos</div>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {state.summary.info}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Info</div>
          </div>
        </div>

        {/* Tabs de filtro */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['all', 'critical', 'warning', 'info'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {tab === 'all'
                ? 'Todos'
                : tab === 'critical'
                  ? 'Críticos'
                  : tab === 'warning'
                    ? 'Avisos'
                    : 'Info'}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: Tabela */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Produto
              </th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Severidade
              </th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Dias
              </th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Vencimento
              </th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Qtd.
              </th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredAlerts.map((alert) => (
                <AlertTableRow
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={() => handleAcknowledge(alert.id)}
                  onResolve={() => handleResolve(alert.id)}
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3">
        <AnimatePresence>
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isExpanded={expandedAlertId === alert.id}
              onToggle={() =>
                setExpandedAlertId(expandedAlertId === alert.id ? null : alert.id)
              }
              onAcknowledge={() => handleAcknowledge(alert.id)}
              onResolve={() => handleResolve(alert.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Erro */}
      {state.error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3"
        >
          <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 dark:text-red-300">Erro ao carregar alertas</p>
            <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ExpiryAlertPanel;
