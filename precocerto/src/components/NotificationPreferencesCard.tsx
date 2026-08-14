/**
 * Cartão de Preferências de Notificação
 * Permite ao utilizador configurar suas preferências
 * Fase 13: Notificações
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Bell,
  Mail,
  Smartphone,
  Clock,
  AlertCircle,
  Package,
  Users,
  DollarSign,
  FileText,
  Shield,
  Wrench,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';

export function NotificationPreferencesCard() {
  const {
    preferences,
    loading,
    error,
    toggleChannel,
    toggleEvent,
    setQuietHours,
    setSummaryFrequency,
    resetPreferences,
  } = useNotificationPreferences();

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin">
            <Bell className="text-emerald-600" size={24} />
          </div>
          <span className="ml-3 text-slate-600 dark:text-slate-400">Carregando preferências...</span>
        </div>
      </div>
    );
  }

  if (error || !preferences) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-red-200 dark:border-red-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-red-600 dark:text-red-400 mt-1 flex-shrink-0" size={20} />
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-200">Erro ao carregar</h3>
            <p className="text-sm text-red-700 dark:text-red-300">{error || 'Tente novamente'}</p>
          </div>
        </div>
      </div>
    );
  }

  const handleToggleChannel = async (channel: 'email' | 'push' | 'inApp') => {
    try {
      setIsSaving(true);
      await toggleChannel(channel);
      setSuccessMessage('Preferência atualizada!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Erro ao atualizar canal:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEvent = async (eventType: keyof typeof preferences.eventos) => {
    try {
      setIsSaving(true);
      await toggleEvent(eventType);
      setSuccessMessage('Preferência atualizada!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Erro ao atualizar evento:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPreferences = async () => {
    if (!window.confirm('Tem certeza que deseja resetar para as preferências padrão?')) return;

    try {
      setIsSaving(true);
      await resetPreferences();
      setSuccessMessage('Preferências resetadas!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Erro ao resetar preferências:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell size={24} className="text-emerald-600" />
            Preferências de Notificação
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Controle como e quando recebe notificações
          </p>
        </div>
      </motion.div>

      {/* Success Message */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-4 rounded-lg"
        >
          <CheckCircle size={18} />
          <span className="text-sm font-medium">{successMessage}</span>
        </motion.div>
      )}

      {/* Seção 1: Canais de Notificação */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center gap-2 mb-4">
          <Mail size={20} className="text-blue-600" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Canais de Notificação</h3>
        </div>

        <div className="space-y-4">
          {/* Email */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Notificações por Email</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Receba resumos e alertas importantes por email
              </p>
            </div>
            <button
              onClick={() => handleToggleChannel('email')}
              disabled={isSaving}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                preferences.canais.email
                  ? 'bg-emerald-600 dark:bg-emerald-700'
                  : 'bg-slate-300 dark:bg-slate-600'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  preferences.canais.email ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Push */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Notificações Push</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Receba alertas em tempo real no navegador
              </p>
            </div>
            <button
              onClick={() => handleToggleChannel('push')}
              disabled={isSaving}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                preferences.canais.push
                  ? 'bg-emerald-600 dark:bg-emerald-700'
                  : 'bg-slate-300 dark:bg-slate-600'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  preferences.canais.push ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* In-App */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Notificações no App</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Receba alertas dentro da aplicação (sempre ativo)
              </p>
            </div>
            <button
              disabled
              className="relative inline-flex h-8 w-14 items-center rounded-full bg-emerald-600 dark:bg-emerald-700 cursor-not-allowed"
            >
              <span className="inline-block h-6 w-6 transform rounded-full bg-white translate-x-7" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Seção 2: Tipos de Eventos */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle size={20} className="text-orange-600" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tipos de Eventos</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Produto Adicionado */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-blue-600" />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Produto Adicionado</p>
            </div>
            <button
              onClick={() => handleToggleEvent('produtoAdicionado')}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.eventos.produtoAdicionado
                  ? 'bg-emerald-600 dark:bg-emerald-700'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  preferences.eventos.produtoAdicionado ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Produto Editado */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-green-600" />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Produto Editado</p>
            </div>
            <button
              onClick={() => handleToggleEvent('produtoEditado')}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.eventos.produtoEditado
                  ? 'bg-emerald-600 dark:bg-emerald-700'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  preferences.eventos.produtoEditado ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Produto Deletado */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-red-600" />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Produto Deletado</p>
            </div>
            <button
              onClick={() => handleToggleEvent('produtoDeletado')}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.eventos.produtoDeletado
                  ? 'bg-emerald-600 dark:bg-emerald-700'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  preferences.eventos.produtoDeletado ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Preço Alterado */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-amber-600" />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Preço Alterado</p>
            </div>
            <button
              onClick={() => handleToggleEvent('precoAlterado')}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.eventos.precoAlterado
                  ? 'bg-emerald-600 dark:bg-emerald-700'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  preferences.eventos.precoAlterado ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Relatórios Gerados */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-purple-600" />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Relatórios Gerados</p>
            </div>
            <button
              onClick={() => handleToggleEvent('relatoriosGerados')}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.eventos.relatoriosGerados
                  ? 'bg-emerald-600 dark:bg-emerald-700'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  preferences.eventos.relatoriosGerados ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Alertas de Segurança */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-red-600" />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Alertas de Segurança</p>
            </div>
            <button
              onClick={() => handleToggleEvent('alertasSeguranca')}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.eventos.alertasSeguranca
                  ? 'bg-emerald-600 dark:bg-emerald-700'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  preferences.eventos.alertasSeguranca ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Seção 3: Horário de Não Perturbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center gap-2 mb-4">
          <Clock size={20} className="text-indigo-600" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Horário de Não Perturbar</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="font-medium text-slate-800 dark:text-slate-200">
              Ativar horário de não perturbar
            </p>
            <button
              onClick={() =>
                setQuietHours(
                  !preferences.horarioNaoPerturbar.ativo,
                  preferences.horarioNaoPerturbar.horaInicio,
                  preferences.horarioNaoPerturbar.horaFim
                )
              }
              disabled={isSaving}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                preferences.horarioNaoPerturbar.ativo
                  ? 'bg-emerald-600 dark:bg-emerald-700'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  preferences.horarioNaoPerturbar.ativo ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {preferences.horarioNaoPerturbar.ativo && (
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    Hora de Início
                  </label>
                  <input
                    type="time"
                    value={preferences.horarioNaoPerturbar.horaInicio}
                    onChange={(e) =>
                      setQuietHours(
                        true,
                        e.target.value,
                        preferences.horarioNaoPerturbar.horaFim
                      )
                    }
                    disabled={isSaving}
                    className="w-full px-3 py-2 border border-indigo-200 dark:border-indigo-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    Hora de Fim
                  </label>
                  <input
                    type="time"
                    value={preferences.horarioNaoPerturbar.horaFim}
                    onChange={(e) =>
                      setQuietHours(
                        true,
                        preferences.horarioNaoPerturbar.horaInicio,
                        e.target.value
                      )
                    }
                    disabled={isSaving}
                    className="w-full px-3 py-2 border border-indigo-200 dark:border-indigo-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-indigo-700 dark:text-indigo-300">
                ℹ️ Notificações serão silenciadas entre{' '}
                <span className="font-semibold">{preferences.horarioNaoPerturbar.horaInicio}</span> e{' '}
                <span className="font-semibold">{preferences.horarioNaoPerturbar.horaFim}</span>
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Seção 4: Ações */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex gap-2"
      >
        <button
          onClick={handleResetPreferences}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          <RotateCcw size={18} />
          Resetar Padrão
        </button>
      </motion.div>
    </div>
  );
}
