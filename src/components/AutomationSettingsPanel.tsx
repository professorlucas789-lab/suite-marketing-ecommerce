/**
 * Painel de Configurações de Automação
 * FASE 8: Cloud Functions Automáticas
 *
 * Permite configurar análises automáticas e notificações
 */

import React, { useState } from 'react';
import {
  Clock,
  Mail,
  MessageCircle,
  Phone,
  Bell,
  AlertCircle,
  CheckCircle,
  Loader,
  Save,
  Send,
  Calendar,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAutomation } from '../hooks/useAutomation';

interface AutomationSettingsPanelProps {
  compact?: boolean;
}

export function AutomationSettingsPanel({ compact = false }: AutomationSettingsPanelProps) {
  const {
    config,
    isLoading,
    error,
    isExecuting,
    updateConfig,
    testNotificationChannel,
    clearError,
  } = useAutomation();

  const [activeTab, setActiveTab] = useState<'analysis' | 'notifications'>('analysis');
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, boolean>>({});

  const handleToggleAnalysis = async () => {
    try {
      await updateConfig({
        enableAutoAnalysis: !config?.enableAutoAnalysis,
      });
    } catch (err) {
      console.error('Erro ao atualizar automação:', err);
    }
  };

  const handleScheduleChange = async (schedule: 'daily' | 'twice-daily' | 'weekly') => {
    try {
      await updateConfig({ analysisSchedule: schedule });
    } catch (err) {
      console.error('Erro ao atualizar agendamento:', err);
    }
  };

  const handleTimeChange = async (time: string) => {
    try {
      await updateConfig({ analysisTime: time });
    } catch (err) {
      console.error('Erro ao atualizar hora de análise:', err);
    }
  };

  const handleToggleChannel = async (channel: 'email' | 'whatsapp' | 'sms') => {
    try {
      const current = config?.notificationChannels || {};
      await updateConfig({
        notificationChannels: {
          ...current,
          [channel]: !current[channel as keyof typeof current],
        },
      });
    } catch (err) {
      console.error('Erro ao atualizar canal de notificação:', err);
    }
  };

  const handleToggleAlertType = async (type: string) => {
    try {
      const current = config?.alertThresholds || {};
      await updateConfig({
        alertThresholds: {
          ...current,
          [type]: !current[type as keyof typeof current],
        },
      });
    } catch (err) {
      console.error('Erro ao atualizar tipo de alerta:', err);
    }
  };

  const handleTestChannel = async (channel: 'email' | 'whatsapp' | 'sms') => {
    setTestingChannel(channel);
    try {
      const recipient = getTestRecipient(channel);
      if (!recipient) {
        setTestResult((prev) => ({ ...prev, [channel]: false }));
        return;
      }

      const success = await testNotificationChannel(channel, recipient);
      setTestResult((prev) => ({ ...prev, [channel]: success }));
    } catch (err) {
      console.error(`Erro ao testar ${channel}:`, err);
      setTestResult((prev) => ({ ...prev, [channel]: false }));
    } finally {
      setTestingChannel(null);
    }
  };

  const getTestRecipient = (channel: 'email' | 'whatsapp' | 'sms'): string => {
    if (channel === 'email') {
      return config?.recipients?.email?.[0] || '';
    }
    return config?.recipients?.phoneNumber || '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        rounded-lg border border-slate-200 bg-white
        dark:border-slate-700 dark:bg-slate-900
        ${compact ? 'p-4' : 'p-6'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Automação de Análises
          </h2>
        </div>
        {config?.enableAutoAnalysis && (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300">
            <CheckCircle className="w-4 h-4" />
            Ativa
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900 dark:border-red-700 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={clearError}
              className="text-sm text-red-600 dark:text-red-300 hover:underline mt-1"
            >
              Descartar
            </button>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 mb-6">
        {(['analysis', 'notifications'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              py-2 px-4 font-medium text-sm
              border-b-2 transition-colors
              ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400'
              }
            `}
          >
            {tab === 'analysis' ? '📊 Análise' : '🔔 Notificações'}
          </button>
        ))}
      </div>

      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Análise Preditiva Automática</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Executar análises automaticamente conforme agendado
              </p>
            </div>
            <button
              onClick={handleToggleAnalysis}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                ${
                  config?.enableAutoAnalysis
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                }
              `}
            >
              {config?.enableAutoAnalysis ? 'Ativa' : 'Inativa'}
            </button>
          </div>

          {/* Schedule Configuration */}
          {config?.enableAutoAnalysis && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                  Frequência
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['daily', 'twice-daily', 'weekly'] as const).map((schedule) => (
                    <button
                      key={schedule}
                      onClick={() => handleScheduleChange(schedule)}
                      className={`
                        py-2 px-3 rounded-lg text-sm font-medium transition-colors
                        ${
                          config?.analysisSchedule === schedule
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }
                      `}
                    >
                      {schedule === 'daily' && 'Diária'}
                      {schedule === 'twice-daily' && '2x ao Dia'}
                      {schedule === 'weekly' && 'Semanal'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Configuration */}
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                  Hora (UTC)
                </label>
                <input
                  type="time"
                  value={config?.analysisTime || '07:00'}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className={`
                    w-full px-3 py-2 rounded-lg border
                    border-slate-200 dark:border-slate-700
                    bg-white dark:bg-slate-800
                    text-slate-900 dark:text-white
                  `}
                />
              </div>

              {/* Alert Types */}
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-3">
                  Tipos de Alerta
                </label>
                <div className="space-y-2">
                  {[
                    { key: 'criticalAnomaly', label: '🚨 Anomalias Críticas' },
                    { key: 'lowStockWarning', label: '📦 Estoque Baixo' },
                    { key: 'expiryWarning', label: '⏰ Validade' },
                    { key: 'highMarginDeviation', label: '💰 Desvios de Margin' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={
                          config?.alertThresholds?.[
                            key as keyof typeof config.alertThresholds
                          ] || false
                        }
                        onChange={() => handleToggleAlertType(key)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Next Execution */}
              {config?.nextExecutionAt && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    ⏱️ Próxima execução: {new Date(config.nextExecutionAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Manual Execution */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Executar análise manualmente agora
            </p>
            <button
              disabled={isExecuting}
              className={`
                w-full py-2 px-4 rounded-lg font-medium
                flex items-center justify-center gap-2 transition-colors
                ${
                  isExecuting
                    ? 'bg-slate-200 text-slate-700 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }
              `}
            >
              {isExecuting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  A executar...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Executar Análise
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Notification Channels */}
          <div className="space-y-3">
            {[
              { key: 'email', icon: Mail, label: 'Email', test: true },
              { key: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', test: true },
              { key: 'sms', icon: Phone, label: 'SMS', test: true },
              { key: 'inApp', icon: Bell, label: 'In-App', test: false },
            ].map(({ key, icon: Icon, label, test }) => (
              <div key={key} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-blue-500" />
                    <span className="font-medium text-slate-900 dark:text-white">{label}</span>
                  </div>
                  <button
                    onClick={() => handleToggleChannel(key as any)}
                    className={`
                      px-3 py-1 rounded-lg text-sm font-medium transition-colors
                      ${
                        config?.notificationChannels?.[key as keyof typeof config.notificationChannels]
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }
                    `}
                  >
                    {config?.notificationChannels?.[key as keyof typeof config.notificationChannels]
                      ? 'Ativa'
                      : 'Inativa'}
                  </button>
                </div>

                {/* Test Button */}
                {test && config?.notificationChannels?.[key as keyof typeof config.notificationChannels] && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestChannel(key as any)}
                      disabled={testingChannel === key}
                      className={`
                        flex-1 py-2 px-3 rounded-lg text-sm font-medium
                        flex items-center justify-center gap-2 transition-colors
                        ${
                          testingChannel === key
                            ? 'bg-slate-300 text-slate-700 cursor-not-allowed'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300'
                        }
                      `}
                    >
                      {testingChannel === key ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          A testar...
                        </>
                      ) : (
                        '🧪 Testar'
                      )}
                    </button>

                    {testResult[key] !== undefined && (
                      <span className={testResult[key] ? 'text-green-600' : 'text-red-600'}>
                        {testResult[key] ? '✓' : '✗'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Recipients Configuration */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
              Email para Notificações
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              defaultValue={config?.recipients?.email?.[0] || ''}
              className={`
                w-full px-3 py-2 rounded-lg border
                border-slate-200 dark:border-slate-700
                bg-white dark:bg-slate-900
                text-slate-900 dark:text-white
              `}
            />
          </div>

          {/* Save Button */}
          <button className="w-full py-2 px-4 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            Guardar Configurações
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
