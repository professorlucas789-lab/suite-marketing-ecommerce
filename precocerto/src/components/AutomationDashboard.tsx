/**
 * AutomationDashboard Component
 * Painel de controle para automações e notificações
 * Fase: Integrações Avançadas
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Bell,
  AlertTriangle,
  Mailbox,
  Zap,
  CheckCircle2,
  AlertCircle,
  Settings,
  Play,
  RefreshCw,
} from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useAutomatedNotifications } from '../hooks/useAutomatedNotifications';

export default function AutomationDashboard() {
  const { currentStore } = useStore();
  const userId = 'current-user'; // TODO: Obter do contexto de autenticação
  const storeId = currentStore?.storeId || '';

  const [state, actions] = useAutomatedNotifications(storeId, userId);
  const [testSending, setTestSending] = useState(false);

  const handleSendTest = async () => {
    setTestSending(true);
    try {
      await actions.sendTestNotification();
      alert('✅ Notificação de teste enviada!');
    } catch (error) {
      alert('❌ Erro ao enviar teste');
    } finally {
      setTestSending(false);
    }
  };

  const handleRunCheck = async () => {
    await actions.runImmediateCheck();
  };

  if (!storeId) {
    return (
      <div className="p-6 text-center text-slate-600 dark:text-slate-400">
        Seleciona uma loja para ver as automações
      </div>
    );
  }

  const automationCards = [
    {
      id: 'stock',
      title: '📦 Alertas de Stock',
      description: 'Notificações quando stock fica crítico ou baixo',
      icon: AlertTriangle,
      enabled: state.status.stockAlerts,
      onToggle: state.status.stockAlerts ? actions.disableStockAlerts : actions.enableStockAlerts,
      channels: ['in-app', 'WhatsApp', 'Email'],
    },
    {
      id: 'expiry',
      title: '⏰ Alertas de Vencimento',
      description: 'Notificações para produtos vencendo em breve',
      icon: AlertCircle,
      enabled: state.status.expiryAlerts,
      onToggle: state.status.expiryAlerts ? actions.disableExpiryAlerts : actions.enableExpiryAlerts,
      channels: ['in-app', 'WhatsApp', 'Email'],
    },
    {
      id: 'daily',
      title: '📊 Relatórios Diários',
      description: 'Resumo automático enviado cada manhã às 8h',
      icon: Mailbox,
      enabled: state.status.dailyReports,
      onToggle: state.status.dailyReports ? actions.disableDailyReports : actions.enableDailyReports,
      channels: ['Email', 'WhatsApp'],
    },
    {
      id: 'realtime',
      title: '⚡ Sincronização Real-Time',
      description: 'Dados atualizados instantaneamente entre abas',
      icon: Zap,
      enabled: state.status.realTimeSync,
      onToggle: () => {}, // Read-only
      channels: ['In-App'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 mb-2">
          <Bell className="text-blue-600" size={32} />
          Automações e Notificações
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Configura os alertas automáticos e recebe notificações de eventos críticos
        </p>
      </motion.div>

      {/* Status Geral */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle2 className="text-emerald-600" size={24} />
          <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
            Sistema de Automações Ativo
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-semibold mb-1">
              Notificações Não Lidas
            </p>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              {state.metrics.unreadNotifications}
            </p>
          </div>

          <div>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-semibold mb-1">
              Alertas Hoje
            </p>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              {state.metrics.alertsTriggeredToday}
            </p>
          </div>

          <div>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-semibold mb-1">
              Notificações Enviadas
            </p>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              {state.metrics.notificationsSent}
            </p>
          </div>

          <div>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-semibold mb-1">
              Última Verificação
            </p>
            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
              {state.metrics.lastCheckTime
                ? new Date(state.metrics.lastCheckTime).toLocaleTimeString('pt-PT')
                : 'Nunca'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Automation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {automationCards.map((card, index) => {
          const IconComponent = card.icon;

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`rounded-lg border-2 p-6 transition-all ${
                card.enabled
                  ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/30'
                  : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <IconComponent
                    className={card.enabled ? 'text-blue-600' : 'text-slate-400'}
                    size={24}
                  />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      {card.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {card.description}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ml-2 ${
                    card.enabled
                      ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {card.enabled ? '✅ Ativo' : '⭕ Desativo'}
                </div>
              </div>

              {/* Channels */}
              <div className="mb-4 flex flex-wrap gap-2">
                {card.channels.map((channel) => (
                  <span
                    key={channel}
                    className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded"
                  >
                    {channel}
                  </span>
                ))}
              </div>

              {/* Toggle Button */}
              {card.id !== 'realtime' && (
                <button
                  onClick={card.onToggle}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    card.enabled
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {card.enabled ? '🔴 Desativar' : '🟢 Ativar'}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
      >
        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Settings size={20} />
          Ações
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleRunCheck}
            disabled={state.loading}
            className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} className={state.loading ? 'animate-spin' : ''} />
            {state.loading ? 'Verificando...' : 'Verificar Alertas Agora'}
          </button>

          <button
            onClick={handleSendTest}
            disabled={testSending}
            className="py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Play size={18} />
            {testSending ? 'Enviando...' : 'Enviar Notificação Teste'}
          </button>
        </div>
      </motion.div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-6"
      >
        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
          💡 Dica: Como Funcionam as Automações
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
          <li>
            • <strong>Alertas de Stock:</strong> Notificado quando produto tem &lt;2 (crítico)
            ou &lt;5 (baixo)
          </li>
          <li>
            • <strong>Alertas de Vencimento:</strong> Notificado quando produto vence em &lt;7
            dias
          </li>
          <li>
            • <strong>Relatórios Diários:</strong> Resumo automático enviado cada manhã com
            KPIs
          </li>
          <li>
            • <strong>Sincronização Real-Time:</strong> Dados atualizados instantaneamente via
            Firestore
          </li>
        </ul>
      </motion.div>

      {/* Error Alert */}
      {state.error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-4"
        >
          <p className="text-red-700 dark:text-red-300">
            <span className="font-bold">Erro:</span> {state.error}
          </p>
        </motion.div>
      )}
    </div>
  );
}
