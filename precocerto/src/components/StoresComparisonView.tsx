/**
 * Vista de Comparação de Lojas
 * Admin pode ver todas as lojas num formato comparativo
 * Fase 14: Listar Lojas do Utilizador
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Building2,
  TrendingUp,
  Package,
  Users,
  Calendar,
  AlertCircle,
  Loader2,
  BarChart3,
  Filter,
} from 'lucide-react';
import { getAllStores } from '../utils/storeUtils';
import { Store } from '../types/store';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface StoreWithStats extends Store {
  stats?: {
    totalProdutos: number;
    utilizadoresAtivos: number;
    ultimaAtualizacao: string;
    precoMedio: number;
    margemMedia: number;
  };
}

export function StoresComparisonView() {
  const [stores, setStores] = useState<StoreWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'nome' | 'produtos' | 'utilizadores'>('nome');

  useEffect(() => {
    const loadStores = async () => {
      try {
        setLoading(true);
        setError(null);

        const allStores = await getAllStores();
        const enrichedStores: StoreWithStats[] = [];

        for (const store of allStores) {
          try {
            const statsRef = doc(db, 'stores', store.id, 'stats', 'current');
            const statsSnap = await getDoc(statsRef);

            const stats = statsSnap.exists()
              ? statsSnap.data()
              : {
                  totalProdutos: store.totalProdutos || 0,
                  utilizadoresAtivos: 0,
                  ultimaAtualizacao: store.ultimaAtualizacao || new Date().toISOString(),
                  precoMedio: 0,
                  margemMedia: 0,
                };

            enrichedStores.push({
              ...store,
              stats: {
                totalProdutos: stats.totalProdutos || 0,
                utilizadoresAtivos: stats.utilizadoresAtivos || 0,
                ultimaAtualizacao: stats.ultimaAtualizacao,
                precoMedio: stats.precoMedio || 0,
                margemMedia: stats.margemMedia || 0,
              },
            });
          } catch (err) {
            console.warn(`⚠️ Erro ao carregar stats da loja ${store.id}:`, err);
            enrichedStores.push(store);
          }
        }

        setStores(enrichedStores);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao carregar lojas';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    loadStores();
  }, []);

  const sortedStores = [...stores].sort((a, b) => {
    switch (sortBy) {
      case 'produtos':
        return (b.stats?.totalProdutos || 0) - (a.stats?.totalProdutos || 0);
      case 'utilizadores':
        return (b.stats?.utilizadoresAtivos || 0) - (a.stats?.utilizadoresAtivos || 0);
      case 'nome':
      default:
        return a.nome.localeCompare(b.nome);
    }
  });

  const getTotalStats = () => {
    return {
      totalLojas: stores.length,
      totalProdutos: stores.reduce((sum, s) => sum + (s.stats?.totalProdutos || 0), 0),
      totalUtilizadores: stores.reduce((sum, s) => sum + (s.stats?.utilizadoresAtivos || 0), 0),
      precoMedioGeral:
        stores.reduce((sum, s) => sum + (s.stats?.precoMedio || 0), 0) / stores.length,
      margemMediaGeral:
        stores.reduce((sum, s) => sum + (s.stats?.margemMedia || 0), 0) / stores.length,
    };
  };

  const getStoreTypeLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      farmacia: '💊 Farmácia',
      informatica: '💻 Informática',
      ortopedico: '🦴 Ortopédico',
      generico: '🏪 Genérico',
    };
    return labels[tipo] || tipo;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-emerald-600" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">Carregando lojas...</span>
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
            <BarChart3 size={32} className="text-emerald-600" />
            Comparação de Lojas
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Veja o desempenho consolidado de todas as lojas
          </p>
        </div>
      </motion.div>

      {/* Estatísticas Globais */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        {/* Total de Lojas */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200 uppercase">
                Total de Lojas
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                {totalStats.totalLojas}
              </p>
            </div>
            <Building2 size={24} className="text-emerald-300 dark:text-emerald-700" />
          </div>
        </div>

        {/* Total de Produtos */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-900 dark:text-blue-200 uppercase">
                Total de Produtos
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {totalStats.totalProdutos}
              </p>
            </div>
            <Package size={24} className="text-blue-300 dark:text-blue-700" />
          </div>
        </div>

        {/* Total de Utilizadores */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-900 dark:text-purple-200 uppercase">
                Utilizadores
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                {totalStats.totalUtilizadores}
              </p>
            </div>
            <Users size={24} className="text-purple-300 dark:text-purple-700" />
          </div>
        </div>

        {/* Preço Médio */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
          <div>
            <p className="text-xs font-medium text-orange-900 dark:text-orange-200 uppercase">
              Preço Médio
            </p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
              {totalStats.precoMedioGeral.toFixed(2)}€
            </p>
          </div>
        </div>

        {/* Margem Média */}
        <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-900/10 rounded-xl p-4 border border-rose-200 dark:border-rose-800">
          <div>
            <p className="text-xs font-medium text-rose-900 dark:text-rose-200 uppercase">
              Margem Média
            </p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
              {totalStats.margemMediaGeral.toFixed(1)}%
            </p>
          </div>
        </div>
      </motion.div>

      {/* Filtro e Ordenação */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-2"
      >
        <Filter size={18} className="text-slate-600 dark:text-slate-400" />
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Ordenar por:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
        >
          <option value="nome">Nome</option>
          <option value="produtos">Total de Produtos</option>
          <option value="utilizadores">Utilizadores Ativos</option>
        </select>
      </motion.div>

      {/* Tabela de Lojas */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Loja
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Tipo
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                  Produtos
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                  Utilizadores
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                  Preço Médio
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                  Margem
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStores.map((store, index) => (
                <tr
                  key={store.id}
                  className={`border-b border-slate-200 dark:border-slate-700 ${
                    index % 2 === 0
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-slate-50 dark:bg-slate-800/30'
                  } hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors`}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{store.nome}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{store.endereco}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {getStoreTypeLabel(store.tipo)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium">
                      <Package size={14} />
                      {store.stats?.totalProdutos || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium">
                      <Users size={14} />
                      {store.stats?.utilizadoresAtivos || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {store.stats?.precoMedio
                        ? store.stats.precoMedio.toFixed(2)
                        : '-'}
                      €
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`font-semibold ${
                        store.stats && store.stats.margemMedia > 30
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-orange-600 dark:text-orange-400'
                      }`}
                    >
                      {store.stats?.margemMedia
                        ? store.stats.margemMedia.toFixed(1)
                        : '-'}
                      %
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        store.ativo
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        store.ativo ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-red-600 dark:bg-red-400'
                      }`}></span>
                      {store.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {sortedStores.length === 0 && (
        <div className="text-center py-12">
          <Building2 size={48} className="text-slate-400 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Nenhuma loja encontrada</p>
        </div>
      )}
    </div>
  );
}
