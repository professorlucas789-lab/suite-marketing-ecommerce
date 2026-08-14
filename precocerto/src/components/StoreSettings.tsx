/**
 * Configurações de loja
 * Fase 6: Sistema Multi-Loja - Fase 2
 */

import React, { useState, useEffect } from 'react';
import { Store } from '../types/store';
import { updateStore } from '../utils/storeUtils';
import { AlertCircle, Loader2, Check, Settings } from 'lucide-react';

interface StoreSettingsProps {
  store: Store;
  onUpdate?: (store: Store) => void;
}

export function StoreSettings({ store, onUpdate }: StoreSettingsProps) {
  const [formData, setFormData] = useState({
    horaAbertura: '08:00',
    horaFecho: '22:00',
    diasTrabalhoPorSemana: 6,
    ativoParaVendas: true,
    permiteRemocaoProdutos: true,
    notificacoesAtivas: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const fieldValue =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: fieldValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      await updateStore(store.id, {
        ...store,
        ...formData,
      });

      setSuccess(true);
      onUpdate?.({ ...store, ...formData });

      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao guardar configurações';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-950/30 rounded-lg">
          <Settings size={24} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Configurações de {store.nome}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Personalize as definições da sua loja
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 dark:text-red-200">Erro</p>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
          <Check size={18} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800 dark:text-green-200">Sucesso</p>
            <p className="text-sm text-green-700 dark:text-green-300">
              Configurações atualizadas com sucesso
            </p>
          </div>
        </div>
      )}

      {/* Horário de Funcionamento */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Horário de Funcionamento</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Hora de Abertura
            </label>
            <input
              type="time"
              name="horaAbertura"
              value={formData.horaAbertura}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Hora de Fecho
            </label>
            <input
              type="time"
              name="horaFecho"
              value={formData.horaFecho}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Dias de Trabalho por Semana
            </label>
            <select
              name="diasTrabalhoPorSemana"
              value={formData.diasTrabalhoPorSemana}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            >
              {[5, 6, 7].map((days) => (
                <option key={days} value={days}>
                  {days} dias
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Operacionais */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Operações</h3>

        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <input
            type="checkbox"
            name="ativoParaVendas"
            checked={formData.ativoParaVendas}
            onChange={handleChange}
            disabled={loading}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
          />
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Ativo para Vendas</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Permite que os clientes façam compras nesta loja
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <input
            type="checkbox"
            name="permiteRemocaoProdutos"
            checked={formData.permiteRemocaoProdutos}
            onChange={handleChange}
            disabled={loading}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
          />
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Permite Remoção de Produtos</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Permite que os utilizadores removam produtos do sistema
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <input
            type="checkbox"
            name="notificacoesAtivas"
            checked={formData.notificacoesAtivas}
            onChange={handleChange}
            disabled={loading}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
          />
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Notificações Ativas</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Ativa notificações para eventos importantes da loja
            </p>
          </div>
        </label>
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'A guardar...' : 'Guardar Configurações'}
        </button>
      </div>
    </form>
  );
}
