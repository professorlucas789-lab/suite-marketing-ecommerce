/**
 * Painel Admin Unificado - Visão de todas as lojas
 * Fase 6: Sistema Multi-Loja - Fase 4
 */

import React, { useState, useEffect } from 'react';
import { Store, StoreStats } from '../types/store';
import { getAllStores } from '../utils/storeUtils';
import { getStoreTypeLabel, STORE_TYPE_OPTIONS } from '../utils/businessUnitMapping';
import { useStoreStats } from '../hooks/useStoreData';
import { Loader2, AlertCircle, TrendingUp, Users, Package, BarChart3, Filter } from 'lucide-react';

interface AdminDashboardProps {
  onSelectStore?: (storeId: string) => void;
}

export function AdminDashboard({ onSelectStore }: AdminDashboardProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [storesStats, setStoresStats] = useState<Map<string, StoreStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'nome' | 'produtos' | 'utilizadores' | 'margem'>(
    'nome'
  );

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

  const storeTypeColors: Record<string, string> = {
    farmacia: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300',
    informatica: 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
    papelaria_informatica: 'bg-cyan-100 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300',
    colegio: 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300',
    ortopedico_hospitalar: 'bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300',
    ortopedico: 'bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300',
    mobiliario_escolar_escritorio: 'bg-stone-100 dark:bg-stone-900/40 text-stone-700 dark:text-stone-300',
    escritorio_central: 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
    generico: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  };

  const filteredStores = filterType
    ? stores.filter((s) => s.tipo === filterType)
    : stores;

  const sortedStores = [...filteredStores].sort((a, b) => {
    switch (sortBy) {
      case 'nome':
        return a.nome.localeCompare(b.nome);
      case 'produtos':
        const statsA = storesStats.get(a.id);
        const statsB = storesStats.get(b.id);
        return (statsB?.totalProdutos || 0) - (statsA?.totalProdutos || 0);
      case 'utilizadores':
        const usersA = storesStats.get(a.id);
        const usersB = storesStats.get(b.id);
        return (usersB?.totalUtilizadores || 0) - (usersA?.totalUtilizadores || 0);
      case 'margem':
        const margemA = storesStats.get(a.id);
        const margemB = storesStats.get(b.id);
        return (margemB?.margemMedia || 0) - (margemA?.margemMedia || 0);
      default:
        return 0;
    }
  });

  // Calcular KPIs consolidados
  const totalStores = stores.length;
  const totalProdutos = Array.from(storesStats.values()).reduce(
    (sum, stats) => sum + (stats?.totalProdutos || 0),
    0
  );
  const totalUtilizadores = Array.from(storesStats.values()).reduce(
    (sum, stats) => sum + (stats?.totalUtilizadores || 0),
    0
  );
  const margemMediaGlobal =
    Array.from(storesStats.values()).reduce((sum, stats) => sum + (stats?.margemMedia || 0), 0) /
    (storesStats.size || 1);
  const valorTotalStockGlobal = Array.from(storesStats.values()).reduce(
    (sum, stats) => sum + (stats?.valorTotalStock || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-emerald-600" />
        <span className="ml-2 text-slate-600 dark:text-slate-400">A carregar painel admin...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Painel Admin</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Monitorize todas as suas lojas</p>
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

      {/* Global KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Total Lojas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Lojas</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {totalStores}
              </p>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/30 rounded-lg">
              <Package size={24} className="text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Total Produtos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Produtos</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {totalProdutos}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
              <Package size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Total Utilizadores */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Utilizadores</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {totalUtilizadores}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-950/30 rounded-lg">
              <Users size={24} className="text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Margem Média Global */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Margem Média</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {margemMediaGlobal.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-950/30 rounded-lg">
              <TrendingUp size={24} className="text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        {/* Valor Total Stock */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Stock Total</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                €{(valorTotalStockGlobal / 1000).toFixed(1)}k
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-950/30 rounded-lg">
              <BarChart3 size={24} className="text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters e Sort */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-slate-600 dark:text-slate-400" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Filtros e Ordenação</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Filter by Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tipo de Loja
            </label>
            <select
              value={filterType || ''}
              onChange={(e) => setFilterType(e.target.value || null)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Todas as Lojas</option>
              {STORE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Sort by */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Ordenar Por
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="nome">Nome (A-Z)</option>
              <option value="produtos">Produtos (Mais)</option>
              <option value="utilizadores">Utilizadores (Mais)</option>
              <option value="margem">Margem (Maior)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stores Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {filterType ? `Lojas - ${getStoreTypeLabel(filterType)}` : 'Todas as Lojas'}
        </h2>

        {sortedStores.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <Package size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Nenhuma loja encontrada</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedStores.map((store) => (
              <div
                key={store.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-lg dark:hover:shadow-slate-800 transition-shadow cursor-pointer"
                onClick={() => onSelectStore?.(store.id)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{store.nome}</h3>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded mt-1 ${
                        storeTypeColors[store.tipo]
                      }`}
                    >
                      {getStoreTypeLabel(store.tipo)}
                    </span>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      store.ativo ? 'bg-green-500' : 'bg-slate-400'
                    }`}
                  />
                </div>

                {/* Info */}
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-4 space-y-1">
                  <p>📧 {store.email}</p>
                  <p>📍 {store.endereco}</p>
                </div>

                {/* Stats */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded p-3 space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Produtos:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {storesStats.get(store.id)?.totalProdutos || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Utilizadores:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {storesStats.get(store.id)?.totalUtilizadores || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Margem:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {(storesStats.get(store.id)?.margemMedia || 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Stock:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      €{(storesStats.get(store.id)?.valorTotalStock || 0).toFixed(0)}
                    </span>
                  </div>
                </div>

                {/* Button */}
                <button
                  onClick={() => onSelectStore?.(store.id)}
                  className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Ver Detalhes →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
