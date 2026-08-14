/**
 * Visualização de Gerenciamento de Utilizadores
 * Integração com StoreUserManagement
 */

import React, { useState, useEffect } from 'react';
import { Store } from '../types/store';
import { getAllStores } from '../utils/storeUtils';
import { useAuth } from '../hooks/useAuth';
import { StoreUserManagement } from './StoreUserManagement';
import { Loader2, AlertCircle, Users } from 'lucide-react';

export function UsersManagementView() {
  const { user: currentUser } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllStores();
      setStores(data);
      // Selecionar primeira loja por padrão
      if (data.length > 0) {
        setSelectedStoreId(data[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar lojas';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const selectedStore = stores.find((s) => s.id === selectedStoreId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-emerald-600" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">A carregar lojas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Users size={28} className="text-emerald-600" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Gestão de Utilizadores
          </h1>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Gerir papéis, permissões e acesso dos utilizadores às suas lojas
        </p>
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

      {stores.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Nenhuma loja encontrada. Crie uma loja primeiro.
          </p>
          <button
            onClick={loadStores}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
          >
            Recarregar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Loja Selector Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 sticky top-4">
              <h2 className="font-semibold text-slate-900 dark:text-white mb-3">Suas Lojas</h2>
              <div className="space-y-2">
                {stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => setSelectedStoreId(store.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                      selectedStoreId === store.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="truncate">{store.nome}</div>
                    <div className={`text-xs ${selectedStoreId === store.id ? 'text-emerald-100' : 'text-slate-500'}`}>
                      {store.tipo}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Utilizadores Panel */}
          <div className="lg:col-span-3">
            {selectedStore ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <StoreUserManagement
                  storeId={selectedStore.id}
                  storeName={selectedStore.nome}
                />
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center py-12">
                <p className="text-slate-600 dark:text-slate-400">
                  Selecione uma loja para gerenciar utilizadores
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
