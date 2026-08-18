/**
 * AlertMonitorPanel Component
 * Monitorar alertas em tempo real e testar automação
 * Fase 10: Automação de Alertas
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, TestTube, Clock, AlertCircle, CheckCircle2, XCircle, Play, Pause } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { runAllAlertChecks } from '../services/alertAutomationService';

interface AlertLog {
  id: string;
  type: 'expiry' | 'stock' | 'margin' | 'summary';
  status: 'success' | 'failed' | 'pending';
  message: string;
  count: number;
  timestamp: string;
  nextRun?: string;
}

interface AutomationConfig {
  expiryCheckTime: string; // HH:MM
  stockCheckTime: string;
  marginCheckTime: string;
  summaryTime: string;
  enabled: boolean;
}

export const AlertMonitorPanel: React.FC = () => {
  const { currentStore } = useStore();
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [automationConfig, setAutomationConfig] = useState<AutomationConfig>({
    expiryCheckTime: '07:00',
    stockCheckTime: '12:00',
    marginCheckTime: '15:00',
    summaryTime: '18:00',
    enabled: false,
  });

  // Carregar config do localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`alertAutomation-${currentStore?.storeId}`);
    if (saved) {
      try {
        setAutomationConfig(JSON.parse(saved));
      } catch (error) {
        console.error('Erro ao carregar config:', error);
      }
    }
  }, [currentStore?.storeId]);

  const handleTestAlerts = async () => {
    if (!currentStore) return;

    try {
      setLoading(true);
      const results = await runAllAlertChecks(currentStore.storeId);

      // Adicionar ao log
      const newLogs: AlertLog[] = [
        {
          id: `expiry-${Date.now()}`,
          type: 'expiry',
          status: results.expiryAlerts.length > 0 ? 'success' : 'pending',
          message: `${results.expiryAlerts.length} produtos com validade próxima`,
          count: results.expiryAlerts.length,
          timestamp: new Date().toISOString(),
        },
        {
          id: `stock-${Date.now()}`,
          type: 'stock',
          status: results.stockAlerts.length > 0 ? 'success' : 'pending',
          message: `${results.stockAlerts.length} produtos com stock baixo`,
          count: results.stockAlerts.length,
          timestamp: new Date().toISOString(),
        },
        {
          id: `margin-${Date.now()}`,
          type: 'margin',
          status: results.marginAnomalies.length > 0 ? 'success' : 'pending',
          message: `${results.marginAnomalies.length} anomalias de margem detectadas`,
          count: results.marginAnomalies.length,
          timestamp: new Date().toISOString(),
        },
      ];

      setLogs((prev) => [...newLogs, ...prev].slice(0, 20)); // Keep last 20 logs
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setLogs((prev) => [
        {
          id: `error-${Date.now()}`,
          type: 'expiry',
          status: 'failed',
          message: `Erro ao executar verificações: ${errorMessage}`,
          count: 0,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!currentStore) return;

    try {
      localStorage.setItem(`alertAutomation-${currentStore.storeId}`, JSON.stringify(automationConfig));
      alert('Configuração guardada com sucesso!');
    } catch (error) {
      console.error('Erro ao guardar config:', error);
      alert('Erro ao guardar configuração');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-900 dark:to-purple-800 rounded-lg p-6 text-white"
      >
        <h1 className="text-2xl font-bold mb-2">⚙️ Monitoramento de Alertas</h1>
        <p className="text-indigo-100">Visualizar logs de alertas e configurar automação</p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Test Alerts Button */}
        <motion.button
          whileHover={{ y: -2 }}
          onClick={handleTestAlerts}
          disabled={loading || !currentStore}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-medium rounded-lg transition"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <TestTube className="w-4 h-4" />
              Testar Alertas Agora
            </>
          )}
        </motion.button>

        {/* Automation Toggle */}
        <motion.button
          whileHover={{ y: -2 }}
          onClick={() =>
            setAutomationConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
          }
          className={`flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-lg transition ${
            automationConfig.enabled
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 text-slate-900 dark:text-white'
          }`}
        >
          {automationConfig.enabled ? (
            <>
              <Play className="w-4 h-4" />
              Automação Ativa
            </>
          ) : (
            <>
              <Pause className="w-4 h-4" />
              Automação Inativa
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Automation Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
      >
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          Agendamento de Verificações
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              ⏰ Verificação de Validade
            </label>
            <input
              type="time"
              value={automationConfig.expiryCheckTime}
              onChange={(e) =>
                setAutomationConfig((prev) => ({
                  ...prev,
                  expiryCheckTime: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Padrão: 07:00 (pela manhã)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              📦 Verificação de Stock
            </label>
            <input
              type="time"
              value={automationConfig.stockCheckTime}
              onChange={(e) =>
                setAutomationConfig((prev) => ({
                  ...prev,
                  stockCheckTime: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Padrão: 12:00 (meio-dia)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              💰 Verificação de Margem
            </label>
            <input
              type="time"
              value={automationConfig.marginCheckTime}
              onChange={(e) =>
                setAutomationConfig((prev) => ({
                  ...prev,
                  marginCheckTime: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Padrão: 15:00 (tarde)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              📊 Resumo Diário
            </label>
            <input
              type="time"
              value={automationConfig.summaryTime}
              onChange={(e) =>
                setAutomationConfig((prev) => ({
                  ...prev,
                  summaryTime: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Padrão: 18:00 (fim de dia)</p>
          </div>
        </div>

        <button
          onClick={handleSaveConfig}
          className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition"
        >
          Guardar Configuração
        </button>
      </motion.div>

      {/* Alert Logs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
      >
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          Histórico de Alertas
        </h2>

        {logs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <p className="text-slate-500 dark:text-slate-400">
              Nenhum alerta executado ainda. Clique em "Testar Alertas Agora" para começar.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {logs.map((log, idx) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    log.status === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                      : log.status === 'failed'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <div className="mt-0.5">
                    {log.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : log.status === 'failed' ? (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium text-sm ${
                        log.status === 'success'
                          ? 'text-emerald-900 dark:text-emerald-100'
                          : log.status === 'failed'
                            ? 'text-red-900 dark:text-red-100'
                            : 'text-blue-900 dark:text-blue-100'
                      }`}
                    >
                      {log.message}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {new Date(log.timestamp).toLocaleTimeString('pt-AO')}
                      {log.count > 0 && ` • ${log.count} item(ns)`}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4"
      >
        <p className="text-sm text-indigo-900 dark:text-indigo-300">
          <strong>💡 Automação Ativa:</strong> Quando ativada, as verificações rodam nos horários
          configurados acima. Certifique-se de que as preferências de notificação estão configuradas
          corretamente para receber alertas.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default AlertMonitorPanel;
