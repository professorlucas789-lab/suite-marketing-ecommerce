/**
 * Formulário para criar/editar loja
 * Fase 6: Sistema Multi-Loja - Fase 2
 */

import React, { useState, useEffect } from 'react';
import { Store, StoreType } from '../types/store';
import { createStore, updateStore } from '../utils/storeUtils';
import { getDefaultModuleForStoreType, STORE_TYPE_OPTIONS } from '../utils/businessUnitMapping';
import { Loader2, AlertCircle, Check } from 'lucide-react';

interface StoreFormProps {
  store?: Store;
  onSuccess?: (storeId: string) => void;
  onCancel?: () => void;
}

export function StoreForm({ store, onSuccess, onCancel }: StoreFormProps) {
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'generico' as StoreType,
    endereco: '',
    telefone: '',
    email: '',
    nif: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const storeTypes = STORE_TYPE_OPTIONS;

  useEffect(() => {
    if (store) {
      setFormData({
        nome: store.nome,
        tipo: store.tipo,
        endereco: store.endereco,
        telefone: store.telefone,
        email: store.email,
        nif: store.nif || '',
      });
    }
  }, [store]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      // Validações
      if (!formData.nome.trim()) throw new Error('Nome é obrigatório');
      if (!formData.endereco.trim()) throw new Error('Endereço é obrigatório');
      if (!formData.telefone.trim()) throw new Error('Telefone é obrigatório');
      if (!formData.email.trim()) throw new Error('Email é obrigatório');

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Email inválido');
      }

      let storeId: string;

      if (store) {
        // Atualizar loja existente
        await updateStore(store.id, {
          nome: formData.nome,
          tipo: formData.tipo,
          moduleId: store.tipo === formData.tipo
            ? store.moduleId || getDefaultModuleForStoreType(formData.tipo)
            : getDefaultModuleForStoreType(formData.tipo),
          endereco: formData.endereco,
          telefone: formData.telefone,
          email: formData.email,
          nif: formData.nif || undefined,
        });
        storeId = store.id;
      } else {
        // Criar nova loja
        storeId = await createStore({
          nome: formData.nome,
          tipo: formData.tipo,
          moduleId: getDefaultModuleForStoreType(formData.tipo),
          endereco: formData.endereco,
          telefone: formData.telefone,
          email: formData.email,
          nif: formData.nif || undefined,
          ativo: true,
          totalProdutos: 0,
          totalUtilizadores: 0,
        });
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.(storeId);
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao guardar loja';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 dark:text-red-200">Erro</p>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
          <Check size={18} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800 dark:text-green-200">
              {store ? 'Loja atualizada' : 'Loja criada'} com sucesso!
            </p>
          </div>
        </div>
      )}

      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Nome da Loja *
        </label>
        <input
          type="text"
          name="nome"
          value={formData.nome}
          onChange={handleChange}
          disabled={loading || success}
          placeholder="Ex: Farmácia Central"
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
        />
      </div>

      {/* Tipo de Loja */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Tipo de Loja *
        </label>
        <div className="grid grid-cols-2 gap-3">
          {storeTypes.map((type) => (
            <label
              key={type.value}
              className={`relative flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                formData.tipo === type.value
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <input
                type="radio"
                name="tipo"
                value={type.value}
                checked={formData.tipo === type.value}
                onChange={handleChange}
                disabled={loading || success}
                className="mt-1"
              />
              <div className="ml-3">
                <p className="font-medium text-slate-900 dark:text-slate-100">{type.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{type.descricao}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Endereço */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Endereço *
        </label>
        <input
          type="text"
          name="endereco"
          value={formData.endereco}
          onChange={handleChange}
          disabled={loading || success}
          placeholder="Ex: Rua Principal, 123, Lisboa"
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
        />
      </div>

      {/* Telefone e Email em grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Telefone *
          </label>
          <input
            type="tel"
            name="telefone"
            value={formData.telefone}
            onChange={handleChange}
            disabled={loading || success}
            placeholder="Ex: 212345678"
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled={loading || success}
            placeholder="Ex: loja@example.com"
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* NIF */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          NIF/CNPJ (Opcional)
        </label>
        <input
          type="text"
          name="nif"
          value={formData.nif}
          onChange={handleChange}
          disabled={loading || success}
          placeholder="Ex: 123456789"
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
        />
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading || success}
          className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'A guardar...' : store ? 'Atualizar Loja' : 'Criar Loja'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading || success}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
