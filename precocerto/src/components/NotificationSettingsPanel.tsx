/**
 * NotificationSettingsPanel Component
 * Configurar preferências de notificação por utilizador
 * Fase 10: Automação de Alertas
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, Mail, MessageSquare, Phone, Save, RotateCcw } from 'lucide-react';
import { useUserAuth } from '../hooks/useUserAuth';

export interface NotificationPreferences {
  userId: string;
  channels: {
    inApp: boolean;
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
  };
  alertTypes: {
    expiry: boolean;
    lowStock: boolean;
    salesAnomaly: boolean;
    marginWarning: boolean;
    dailySummary: boolean;
  };
  email?: string;
  phone?: string;
  updatedAt: string;
}

interface NotificationSettingsPanelProps {
  onSave?: (preferences: NotificationPreferences) => Promise<void>;
}

export const NotificationSettingsPanel: React.FC<NotificationSettingsPanelProps> = ({ onSave }) => {
  const { user } = useUserAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    userId: user?.id || '',
    channels: {
      inApp: true,
      email: true,
      whatsapp: false,
      sms: false,
    },
    alertTypes: {
      expiry: true,
      lowStock: true,
      salesAnomaly: true,
      marginWarning: false,
      dailySummary: true,
    },
    email: user?.email || '',
    phone: '',
    updatedAt: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Carregar preferências do localStorage
  useEffect(() => {
      const saved = localStorage.getItem(`notificationPreferences-${user?.id}`);
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (error) {
        console.error('Erro ao carregar preferências:', error);
      }
    }
  }, [user?.id]);

  const handleChannelToggle = (channel: keyof typeof preferences.channels) => {
    setPreferences((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: !prev.channels[channel],
      },
    }));
  };

  const handleAlertTypeToggle = (alertType: keyof typeof preferences.alertTypes) => {
    setPreferences((prev) => ({
      ...prev,
      alertTypes: {
        ...prev.alertTypes,
        [alertType]: !prev.alertTypes[alertType],
      },
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const updated = {
        ...preferences,
        updatedAt: new Date().toISOString(),
      };

      // Guardar localmente
    localStorage.setItem(`notificationPreferences-${user?.id}`, JSON.stringify(updated));

      // Callback opcional
      if (onSave) {
        await onSave(updated);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Erro ao guardar preferências:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem(`notificationPreferences-${user?.id}`);
    setPreferences({
      userId: user?.id || '',
      channels: {
        inApp: true,
        email: true,
        whatsapp: false,
        sms: false,
      },
      alertTypes: {
        expiry: true,
        lowStock: true,
        salesAnomaly: true,
        marginWarning: false,
        dailySummary: true,
      },
      email: user?.email || '',
      phone: '',
      updatedAt: new Date().toISOString(),
    });
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
        className="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-900 dark:to-indigo-800 rounded-lg p-6 text-white"
      >
        <h1 className="text-2xl font-bold mb-2">🔔 Configurações de Notificações</h1>
        <p className="text-blue-100">Personalizar como e quando receber alertas</p>
      </motion.div>

      {/* Contact Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
      >
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">📞 Contactos</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={preferences.email}
              onChange={(e) => setPreferences((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="seu@email.com"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Usado para receber notificações por email
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Telefone (WhatsApp/SMS)
            </label>
            <input
              type="tel"
              value={preferences.phone}
              onChange={(e) => setPreferences((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+244 923 456 789"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Formato: +244 + número (exemplo: +244923456789)
            </p>
          </div>
        </div>
      </motion.div>

      {/* Channels Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
      >
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">📨 Canais de Notificação</h2>

        <div className="space-y-3">
          {/* In-App */}
          <motion.label
            whileHover={{ x: 4 }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
          >
            <input
              type="checkbox"
              checked={preferences.channels.inApp}
              onChange={() => handleChannelToggle('inApp')}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Notificações In-App</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Alertas no painel da aplicação
                </p>
              </div>
            </div>
          </motion.label>

          {/* Email */}
          <motion.label
            whileHover={{ x: 4 }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
          >
            <input
              type="checkbox"
              checked={preferences.channels.email}
              onChange={() => handleChannelToggle('email')}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Email</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Resumos e alertas por email
                </p>
              </div>
            </div>
          </motion.label>

          {/* WhatsApp */}
          <motion.label
            whileHover={{ x: 4 }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
          >
            <input
              type="checkbox"
              checked={preferences.channels.whatsapp}
              onChange={() => handleChannelToggle('whatsapp')}
              className="w-4 h-4 text-green-600 rounded"
              disabled={!preferences.phone}
            />
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">WhatsApp</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {preferences.phone
                    ? 'Alertas rápidos por WhatsApp'
                    : 'Adicione um telefone acima'}
                </p>
              </div>
            </div>
          </motion.label>

          {/* SMS */}
          <motion.label
            whileHover={{ x: 4 }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
          >
            <input
              type="checkbox"
              checked={preferences.channels.sms}
              onChange={() => handleChannelToggle('sms')}
              className="w-4 h-4 text-purple-600 rounded"
              disabled={!preferences.phone}
            />
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">SMS</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {preferences.phone ? 'Alertas críticos por SMS' : 'Adicione um telefone acima'}
                </p>
              </div>
            </div>
          </motion.label>
        </div>
      </motion.div>

      {/* Alert Types Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
      >
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">🎯 Tipos de Alerta</h2>

        <div className="space-y-3">
          {/* Expiry Alerts */}
          <motion.label
            whileHover={{ x: 4 }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
          >
            <input
              type="checkbox"
              checked={preferences.alertTypes.expiry}
              onChange={() => handleAlertTypeToggle('expiry')}
              className="w-4 h-4 text-red-600 rounded"
            />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">📅 Validade de Produtos</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Alertas quando produtos estão próximos de vencer
              </p>
            </div>
          </motion.label>

          {/* Low Stock Alerts */}
          <motion.label
            whileHover={{ x: 4 }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
          >
            <input
              type="checkbox"
              checked={preferences.alertTypes.lowStock}
              onChange={() => handleAlertTypeToggle('lowStock')}
              className="w-4 h-4 text-amber-600 rounded"
            />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">📦 Stock Baixo</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Alertas quando o estoque fica abaixo do mínimo
              </p>
            </div>
          </motion.label>

          {/* Sales Anomaly */}
          <motion.label
            whileHover={{ x: 4 }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
          >
            <input
              type="checkbox"
              checked={preferences.alertTypes.salesAnomaly}
              onChange={() => handleAlertTypeToggle('salesAnomaly')}
              className="w-4 h-4 text-orange-600 rounded"
            />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">⚠️ Anomalias de Vendas</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Alertas quando há padrões anormais em vendas
              </p>
            </div>
          </motion.label>

          {/* Margin Warning */}
          <motion.label
            whileHover={{ x: 4 }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
          >
            <input
              type="checkbox"
              checked={preferences.alertTypes.marginWarning}
              onChange={() => handleAlertTypeToggle('marginWarning')}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">💰 Aviso de Margem</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Alertas quando a margem fica abaixo do esperado
              </p>
            </div>
          </motion.label>

          {/* Daily Summary */}
          <motion.label
            whileHover={{ x: 4 }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
          >
            <input
              type="checkbox"
              checked={preferences.alertTypes.dailySummary}
              onChange={() => handleAlertTypeToggle('dailySummary')}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">📊 Resumo Diário</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Resumo de vendas e performance do dia
              </p>
            </div>
          </motion.label>
        </div>
      </motion.div>

      {/* Save/Reset Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3"
      >
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-medium rounded-lg transition"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Guardando...' : 'Guardar Preferências'}
        </button>

        <button
          onClick={handleReset}
          disabled={loading}
          className="px-4 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-medium rounded-lg transition flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Repor
        </button>
      </motion.div>

      {/* Success Message */}
      {saved && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
        >
          <p className="text-sm text-green-900 dark:text-green-100">
            ✅ Preferências guardadas com sucesso!
          </p>
        </motion.div>
      )}

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
      >
        <p className="text-sm text-blue-900 dark:text-blue-300">
          <strong>💡 Dica:</strong> Quanto mais canais ativar, mais rapidamente receberá alertas
          críticos. Recomenda-se ativar pelo menos In-App e Email.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default NotificationSettingsPanel;
