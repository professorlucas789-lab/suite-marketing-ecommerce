/**
 * Lista de lojas com gestão (CRUD)
 * Fase 6: Sistema Multi-Loja - Fase 2
 */

import React, { useState, useEffect } from 'react';
import { Store } from '../types/store';
import { getAllStores, deleteStore } from '../utils/storeUtils';
import {
  getStoreBusinessSegmentLabel,
  getStoreOperationalUnitLabel,
  getStoreOperationalRules,
  getStoreTypeLabel,
} from '../utils/businessUnitMapping';
import {
  Plus,
  Edit2,
  Trash2,
  Building2,
  AlertCircle,
  Loader2,
  Check,
  Users,
} from 'lucide-react';
import { StoreForm } from './StoreForm';

export function StoreList() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllStores();
      setStores(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar unidades';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (storeId: string) => {
    try {
      setDeleting(true);
      await deleteStore(storeId);
      setStores((prev) => prev.filter((s) => s.id !== storeId));
      setDeleteConfirm(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao desativar unidade';
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSuccess = (storeId: string) => {
    setShowForm(false);
    setSelectedStore(null);
    loadStores();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-emerald-600" />
        <span className="ml-2 text-slate-600 dark:text-slate-400">A carregar unidades...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Unidades de Negócio</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Gerir lojas, farmácias, armazéns, postos de venda e escritórios por negócio
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedStore(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus size={18} />
          Criar Unidade
        </button>
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              {selectedStore ? 'Editar Unidade' : 'Criar Nova Unidade'}
            </h2>
            <StoreForm
              store={selectedStore || undefined}
              onSuccess={handleSuccess}
              onCancel={() => {
                setShowForm(false);
                setSelectedStore(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Stores Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stores.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Building2 size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Nenhuma unidade criada ainda</p>
          </div>
        ) : (
          stores.map((store) => {
            const rules = getStoreOperationalRules(store);

            return (
              <div
                key={store.id}
                className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-lg dark:hover:shadow-slate-800 transition-shadow"
              >
              {/* Delete Confirmation */}
              {deleteConfirm === store.id && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-40 p-2">
                  <div className="bg-white dark:bg-slate-800 rounded p-4 text-center">
                    <p className="text-sm font-medium text-slate-900 dark:text-white mb-3">
                      Tem certeza que deseja desativar {store.nome}?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        disabled={deleting}
                        className="flex-1 px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleDelete(store.id)}
                        disabled={deleting}
                        className="flex-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {deleting && <Loader2 size={14} className="animate-spin" />}
                        Desativar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Store Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-950/30 rounded-lg">
                    <Building2 size={20} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{store.nome}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {getStoreOperationalUnitLabel(store)} · {getStoreBusinessSegmentLabel(store)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedStore(store);
                      setShowForm(true);
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(store.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 rounded transition-colors"
                    title="Desativar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Store Info */}
              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Grupo:</span>
                  <span>{store.businessGroupName || 'Grupo não definido'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Módulo:</span>
                  <span>{getStoreTypeLabel(store.tipo)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Endereço:</span>
                  <span>{store.endereco}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Telefone:</span>
                  <span>{store.telefone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Email:</span>
                  <span className="truncate">{store.email}</span>
                </div>
              </div>

              <div className="mb-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">{rules.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${rules.canSell ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                    {rules.canSell ? 'Vende' : 'Não vende'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${rules.canManageStock ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                    {rules.canManageStock ? 'Stock' : 'Sem stock'}
                  </span>
                  {rules.requiresParentUnit && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                      Requer unidade principal
                    </span>
                  )}
                </div>
              </div>

              {/* Store Status */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      store.ativo ? 'bg-green-500' : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {store.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <button
                  className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                  title="Gerir utilizadores"
                >
                  <Users size={14} />
                  Utilizadores
                </button>
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
