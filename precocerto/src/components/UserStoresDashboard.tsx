/**
 * Dashboard de Lojas do Utilizador
 * Mostra as lojas que o utilizador tem acesso
 * Fase 14: Listar Lojas do Utilizador
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Building2,
  MapPin,
  Users,
  Package,
  TrendingUp,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  AlertCircle,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useUserAuth } from '../hooks/useUserAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Store, StoreStats } from '../types/store';
import {
  getStoreBusinessSegmentLabel,
  getStoreOperationalUnitLabel,
  getStoreOperationalRules,
} from '../utils/businessUnitMapping';

interface StoreCardData extends Store {
  stats?: {
    totalProdutos: number;
    utilizadoresAtivos: number;
    ultimaAtualizacao: string;
  };
}

export function UserStoresDashboard() {
  const { userStores, currentStore, switchStore, loading: storeLoading } = useStore();
  const { papel } = useUserAuth();

  const [storesData, setStoresData] = useState<StoreCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string | null>(currentStore?.storeId || null);

  // Carregar dados das lojas
  useEffect(() => {
    const loadStoresData = async () => {
      try {
        setLoading(true);
        setError(null);

        const enrichedStores: StoreCardData[] = [];

        for (const store of userStores) {
          try {
            // Tentar carregar estatísticas da loja
            const statsRef = doc(db, 'lojas', store.id, 'stats', 'current');
            const statsSnap = await getDoc(statsRef);

            const stats = statsSnap.exists()
              ? statsSnap.data()
              : {
                  totalProdutos: 0,
                  utilizadoresAtivos: 0,
                  ultimaAtualizacao: new Date().toISOString(),
                };

            enrichedStores.push({
              ...store,
              stats: {
                totalProdutos: stats.totalProdutos || store.totalProdutos || 0,
                utilizadoresAtivos: stats.utilizadoresAtivos || 0,
                ultimaAtualizacao: stats.ultimaAtualizacao || store.ultimaAtualizacao || new Date().toISOString(),
              },
            });
          } catch (err) {
            console.warn(`⚠️ Erro ao carregar stats da loja ${store.id}:`, err);
            enrichedStores.push(store);
          }
        }

        setStoresData(enrichedStores);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao carregar unidades';
        setError(errorMsg);
        console.error('Erro ao carregar dados das lojas:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!storeLoading) {
      loadStoresData();
    }
  }, [userStores, storeLoading]);

  const handleSelectStore = async (storeId: string) => {
    try {
      setSelectedStore(storeId);
      await switchStore(storeId);
    } catch (err) {
      console.error('Erro ao mudar de unidade:', err);
      setError('Erro ao selecionar unidade');
    }
  };

  const getTotalStats = () => {
    return {
      totalProdutos: storesData.reduce((sum, s) => sum + (s.stats?.totalProdutos || 0), 0),
      totalUtilizadores: storesData.reduce((sum, s) => sum + (s.stats?.utilizadoresAtivos || 0), 0),
      totalLojas: storesData.length,
    };
  };

  const getStoreTypeColor = (tipo: string) => {
    const colors: Record<string, string> = {
      farmacia: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
      informatica: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      ortopedico: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      generico: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    };
    return colors[tipo] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  };

  if (storeLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-emerald-600" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">Carregando suas unidades...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-red-200 dark:border-red-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-red-600 dark:text-red-400 mt-1 flex-shrink-0" size={20} />
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-200">Erro ao carregar</h3>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (storesData.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl p-12 border border-slate-200 dark:border-slate-700 text-center">
        <Building2 size={48} className="text-slate-400 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
          Nenhuma unidade atribuída
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Você ainda não tem acesso a nenhuma unidade. Contacte o administrador.
        </p>
      </div>
    );
  }

  const totalStats = getTotalStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 size={32} className="text-emerald-600" />
            Suas Unidades
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Gerir as unidades a que tem acesso e ver o desempenho de cada uma
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-emerald-600">{totalStats.totalLojas}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Total de unidades</div>
        </div>
      </motion.div>

      {/* Estatísticas Consolidadas */}
      {totalStats.totalLojas > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {/* Total de Produtos */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Total de Produtos</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {totalStats.totalProdutos}
                </p>
              </div>
              <Package size={32} className="text-blue-300 dark:text-blue-700" />
            </div>
          </div>

          {/* Utilizadores Ativos */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                  Utilizadores Ativos
                </p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                  {totalStats.totalUtilizadores}
                </p>
              </div>
              <Users size={32} className="text-emerald-300 dark:text-emerald-700" />
            </div>
          </div>

          {/* Loja Atual */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-900 dark:text-purple-200">Unidade Atual</p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-2 truncate">
                  {currentStore?.storeName || 'Não selecionada'}
                </p>
              </div>
              <CheckCircle size={32} className="text-purple-300 dark:text-purple-700" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Grid de Lojas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {storesData.map((store, index) => {
            const rules = getStoreOperationalRules(store);

            return (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleSelectStore(store.id)}
                className={`rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                  selectedStore === store.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 shadow-lg shadow-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
                }`}
              >
            {/* Header da Loja */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                    {store.nome}
                  </h3>
                  <div className={`inline-block px-2 py-1 rounded text-xs font-semibold mt-2 ${getStoreTypeColor(
                    store.tipo
                  )}`}>
                    {getStoreOperationalUnitLabel(store)}
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {getStoreBusinessSegmentLabel(store)}
                  </p>
                </div>
                {selectedStore === store.id && <CheckCircle size={24} className="text-emerald-600" />}
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-4 space-y-3">
              {/* Endereço */}
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-slate-400 dark:text-slate-600 mt-1 flex-shrink-0" />
                <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                  {store.endereco || 'Endereço não fornecido'}
                </p>
              </div>

              {/* Contactos */}
              {(store.telefone || store.email) && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  {store.telefone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-400 dark:text-slate-600" />
                      <p className="text-xs text-slate-600 dark:text-slate-400">{store.telefone}</p>
                    </div>
                  )}
                  {store.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-slate-400 dark:text-slate-600" />
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{store.email}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Estatísticas */}
              {store.stats && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Package size={14} />
                      Produtos
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {store.stats.totalProdutos}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Users size={14} />
                      Utilizadores
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {store.stats.utilizadoresAtivos}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500 pt-2">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      Atualizado
                    </span>
                    <span>
                      {new Date(store.stats.ultimaAtualizacao).toLocaleDateString('pt-PT')}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">{rules.summary}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span
                className={`text-xs font-medium ${
                  store.ativo
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {store.ativo ? '✓ Ativa' : '✗ Inativa'}
              </span>
              <ChevronRight
                size={18}
                className={`transition-transform ${selectedStore === store.id ? 'text-emerald-600' : 'text-slate-400'}`}
              />
            </div>
          </motion.div>
            );
          })}
      </div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
      >
        <p className="text-sm text-blue-900 dark:text-blue-200">
          <span className="font-semibold">Dica:</span> Clique numa unidade para selecioná-la como sua unidade de trabalho atual.
          Produtos, categorias e configurações passam a seguir a unidade selecionada.
        </p>
      </motion.div>
    </div>
  );
}
