/**
 * Lista de lojas com gestão (CRUD)
 * Fase 6: Sistema Multi-Loja - Fase 2
 */

import React, { useState, useEffect } from 'react';
import { Store } from '../types/store';
import { getAllStores, deleteStore } from '../utils/storeUtils';
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

  const storeTypeLabels: Record<string, string> = {
    farmacia: 'Farmácia',
    informatica: 'Informática',
    ortopedico: 'Ortopédico',
    generico: 'Genérico',
  };

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
      const message = err instanceof Error ? err.message : 'Erro ao carregar lojas';
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
      const message = err instanceof Error ? err.message : 'Erro ao deletar loja';
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
        <span className="ml-2 text-slate-600 dark:text-slate-400">A carregar lojas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Lojas</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Gerencie todas as suas lojas e configurações
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
          Criar Loja
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
              {selectedStore ? 'Editar Loja' : 'Criar Nova Loja'}
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
            <p className="text-slate-600 dark:text-slate-400">Nenhuma loja criada ainda</p>
          </div>
        ) : (
          stores.map((store) => (
            <div
              key={store.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-lg dark:hover:shadow-slate-800 transition-shadow"
            >
              {/* Delete Confirmation */}
              {deleteConfirm === store.id && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-40 p-2">
                  <div className="bg-white dark:bg-slate-800 rounded p-4 text-center">
                    <p className="text-sm font-medium text-slate-900 dark:text-white mb-3">
                      Tem certeza que deseja deletar {store.nome}?
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
                        Deletar
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
                      {storeTypeLabels[store.tipo] || store.tipo}
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
                    title="Deletar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Store Info */}
              <div className="space-y-2 text-sm mb-4">
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
          ))
        )}
      </div>
    </div>
  );
}
