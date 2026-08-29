/**
 * Configurações de Push Notifications
 * FASE 9: Dashboard Mobile com Push Notifications
 *
 * Painel para gerenciar preferências de notificações push
 */

import React, { useState } from 'react';
import {
  Bell,
  AlertCircle,
  Clock,
  Smartphone,
  CheckCircle,
  Trash2,
  Send,
} from 'lucide-react';
import { motion } from 'motion/react';
import { usePushNotifications } from '../hooks/usePushNotifications';

export function PushNotificationSettings() {
  const {
    config,
    isLoading,
    error,
    isPushEnabled,
    registeredDevices,
    updateConfig,
    toggleNotificationType,
    toggleQuietHours,
    updateQuietHours,
    unregisterDevice,
    clearError,
  } = usePushNotifications();

  const [activeSection, setActiveSection] = useState<'types' | 'quiet' | 'devices'>(
    'types'
  );

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-white dark:bg-slate-900 pb-20"
    >
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
        <Bell className="w-6 h-6 text-blue-500" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          Notificações Push
        </h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              <button
                onClick={clearError}
                className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1"
              >
                Descartar
              </button>
            </div>
          </motion.div>
        )}

        {/* Main Toggle */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Notificações Push
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {isPushEnabled ? 'Ativas' : 'Desativadas'}
              </p>
            </div>
            <button
              onClick={() => updateConfig({ enabled: !isPushEnabled })}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-colors
                ${
                  isPushEnabled
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                }
              `}
            >
              {isPushEnabled ? '✓ Ativa' : 'Inativa'}
            </button>
          </div>
        </div>

        {isPushEnabled && (
          <>
            {/* Section Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
              {(['types', 'quiet', 'devices'] as const).map((section) => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`
                    py-2 px-4 font-medium text-sm
                    border-b-2 transition-colors
                    ${
                      activeSection === section
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-600 dark:text-slate-400'
                    }
                  `}
                >
                  {section === 'types' && '📢 Tipos'}
                  {section === 'quiet' && '🌙 Silêncio'}
                  {section === 'devices' && '📱 Dispositivos'}
                </button>
              ))}
            </div>

            {/* Types Section */}
            {activeSection === 'types' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                {[
                  { key: 'criticalAlert', label: '🚨 Alertas Críticos', desc: 'Anomalias críticas' },
                  { key: 'urgentRestock', label: '⚡ Reabastecimento', desc: 'Urgente' },
                  { key: 'lowStock', label: '📦 Estoque Baixo', desc: 'Alerta de stock' },
                  { key: 'expiryAlert', label: '⏰ Validade', desc: 'Produtos vencendo' },
                  { key: 'dailyReport', label: '📊 Relatório Diário', desc: 'Resumo do dia' },
                  { key: 'weeklyReport', label: '📈 Relatório Semanal', desc: 'Resumo semanal' },
                ].map(({ key, label, desc }) => (
                  <motion.button
                    key={key}
                    onClick={() => toggleNotificationType(key as any)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-lg p-3 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="text-left">
                      <p className="font-medium text-slate-900 dark:text-white">{label}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{desc}</p>
                    </div>
                    <div
                      className={`
                        w-12 h-6 rounded-full transition-colors
                        ${
                          config?.enabledTypes[key as keyof typeof config.enabledTypes]
                            ? 'bg-green-500'
                            : 'bg-slate-300'
                        }
                      `}
                    />
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Quiet Hours Section */}
            {activeSection === 'quiet' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-500" />
                      <p className="font-medium text-slate-900 dark:text-white">
                        Horas de Silêncio
                      </p>
                    </div>
                    <button
                      onClick={() => toggleQuietHours(!config?.quietHours.enabled)}
                      className={`
                        px-3 py-1 rounded-lg text-xs font-medium
                        ${
                          config?.quietHours.enabled
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }
                      `}
                    >
                      {config?.quietHours.enabled ? '✓ Ativa' : 'Inativa'}
                    </button>
                  </div>

                  {config?.quietHours.enabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Início
                        </label>
                        <input
                          type="time"
                          value={config.quietHours.startTime}
                          onChange={(e) =>
                            updateQuietHours(
                              e.target.value,
                              config.quietHours.endTime
                            )
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Fim
                        </label>
                        <input
                          type="time"
                          value={config.quietHours.endTime}
                          onChange={(e) =>
                            updateQuietHours(
                              config.quietHours.startTime,
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                        💡 Notificações não críticas serão adiadas para após as{' '}
                        {config.quietHours.endTime}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Devices Section */}
            {activeSection === 'devices' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {registeredDevices.length > 0 ? (
                  registeredDevices.map((device) => (
                    <motion.div
                      key={device.deviceId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 flex items-start justify-between"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <Smartphone className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {device.deviceName || `${device.deviceType} (${device.deviceId.slice(0, 4)})`}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Registado em{' '}
                            {new Date(device.registeredAt).toLocaleDateString('pt-PT')}
                          </p>
                          {device.lastUsedAt && (
                            <p className="text-xs text-green-600 dark:text-green-400">
                              ✓ Ativo
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => unregisterDevice(device.deviceId)}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <Smartphone className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-600 dark:text-slate-400">
                      Nenhum dispositivo registado
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </>
        )}

        {/* Engagement Stats */}
        {config && (
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {config.totalNotificationsSent || 0}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">Enviadas</p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {config.totalNotificationsClicked || 0}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">Cliques</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
