/**
 * Comparação de desempenho entre lojas
 * Fase 6: Sistema Multi-Loja - Fase 4
 */

import React, { useState, useEffect } from 'react';
import { Store } from '../types/store';
import { getAllStores, getStore } from '../utils/storeUtils';
import { useStoreStats } from '../hooks/useStoreData';
import { AlertCircle, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

interface ComparisonMetrics {
  totalProdutos: number;
  totalUtilizadores: number;
  precoMedio: number;
  margemMedia: number;
  valorTotalStock: number;
}

export function StoreComparison() {
  const [stores, setStores] = useState<Store[]>([]);
  const [store1Id, setStore1Id] = useState<string>('');
  const [store2Id, setStore2Id] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stats1 = useStoreStats(store1Id);
  const stats2 = useStoreStats(store2Id);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllStores();
      setStores(data);
      if (data.length >= 2) {
        setStore1Id(data[0].id);
        setStore2Id(data[1].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar lojas';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getComparisonIcon = (value1: number, value2: number) => {
    if (value1 > value2)
      return <TrendingUp size={16} className="text-green-600 dark:text-green-400" />;
    if (value1 < value2)
      return <TrendingDown size={16} className="text-red-600 dark:text-red-400" />;
    return <span className="text-slate-400">=</span>;
  };

  const getPercentageDiff = (value1: number, value2: number): string => {
    if (value2 === 0) return '0%';
    const diff = ((value1 - value2) / value2) * 100;
    return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
  };

  const store1 = stores.find((s) => s.id === store1Id);
  const store2 = stores.find((s) => s.id === store2Id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-emerald-600" />
        <span className="ml-2 text-slate-600 dark:text-slate-400">A carregar comparação...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
        <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-800 dark:text-red-200">Erro</p>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Comparação de Lojas
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Compare métricas de desempenho entre duas lojas
        </p>
      </div>

      {/* Store Selection */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Store 1 Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Loja 1
            </label>
            <select
              value={store1Id}
              onChange={(e) => setStore1Id(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Selecione uma loja</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.nome} ({store.tipo})
                </option>
              ))}
            </select>
          </div>

          {/* Store 2 Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Loja 2
            </label>
            <select
              value={store2Id}
              onChange={(e) => setStore2Id(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Selecione uma loja</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.nome} ({store.tipo})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      {store1Id && store2Id && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
            Métricas de Desempenho
          </h2>

          <div className="space-y-4">
            {/* Total Produtos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Total de Produtos
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats1.stats?.totalProdutos || 0}
                </span>
                {getComparisonIcon(
                  stats1.stats?.totalProdutos || 0,
                  stats2.stats?.totalProdutos || 0
                )}
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats2.stats?.totalProdutos || 0}
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {getPercentageDiff(
                    stats1.stats?.totalProdutos || 0,
                    stats2.stats?.totalProdutos || 0
                  )}
                </p>
              </div>
            </div>

            {/* Total Utilizadores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Total de Utilizadores
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats1.stats?.totalUtilizadores || 0}
                </span>
                {getComparisonIcon(
                  stats1.stats?.totalUtilizadores || 0,
                  stats2.stats?.totalUtilizadores || 0
                )}
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats2.stats?.totalUtilizadores || 0}
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {getPercentageDiff(
                    stats1.stats?.totalUtilizadores || 0,
                    stats2.stats?.totalUtilizadores || 0
                  )}
                </p>
              </div>
            </div>

            {/* Preço Médio */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Preço Médio
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  €{(stats1.stats?.precoMedio || 0).toFixed(2)}
                </span>
                {getComparisonIcon(
                  stats1.stats?.precoMedio || 0,
                  stats2.stats?.precoMedio || 0
                )}
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  €{(stats2.stats?.precoMedio || 0).toFixed(2)}
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {getPercentageDiff(
                    stats1.stats?.precoMedio || 0,
                    stats2.stats?.precoMedio || 0
                  )}
                </p>
              </div>
            </div>

            {/* Margem Média */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Margem Média
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {(stats1.stats?.margemMedia || 0).toFixed(1)}%
                </span>
                {getComparisonIcon(
                  stats1.stats?.margemMedia || 0,
                  stats2.stats?.margemMedia || 0
                )}
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {(stats2.stats?.margemMedia || 0).toFixed(1)}%
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {getPercentageDiff(
                    stats1.stats?.margemMedia || 0,
                    stats2.stats?.margemMedia || 0
                  )}
                </p>
              </div>
            </div>

            {/* Valor Total Stock */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Valor Total Stock
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  €{(stats1.stats?.valorTotalStock || 0).toFixed(0)}
                </span>
                {getComparisonIcon(
                  stats1.stats?.valorTotalStock || 0,
                  stats2.stats?.valorTotalStock || 0
                )}
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  €{(stats2.stats?.valorTotalStock || 0).toFixed(0)}
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {getPercentageDiff(
                    stats1.stats?.valorTotalStock || 0,
                    stats2.stats?.valorTotalStock || 0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Store Info */}
      {store1Id && store2Id && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {store1 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{store1.nome}</h3>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <p>📧 {store1.email}</p>
                <p>📍 {store1.endereco}</p>
                <p>📞 {store1.telefone}</p>
                <p className="text-xs">
                  Criada:{' '}
                  {new Date(store1.dataCriacao).toLocaleDateString('pt-PT')}
                </p>
              </div>
            </div>
          )}

          {store2 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{store2.nome}</h3>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <p>📧 {store2.email}</p>
                <p>📍 {store2.endereco}</p>
                <p>📞 {store2.telefone}</p>
                <p className="text-xs">
                  Criada:{' '}
                  {new Date(store2.dataCriacao).toLocaleDateString('pt-PT')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
