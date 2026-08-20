/**
 * ExecutiveDashboard Component
 * Dashboard executivo consolidado com visão geral de todas as operações
 * Fase 7: Sincronização & Dashboard Executivo
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  AlertTriangle,
  Package,
  DollarSign,
  Clock,
  ShoppingCart,
  AlertCircle,
} from 'lucide-react';
import { Product } from '../types';
import { Sale } from '../types/sales';
import { useSalesAnalytics } from '../hooks/useSalesAnalytics';
import { useExpiryAlerts } from '../hooks/useExpiryAlerts';
import { useLowStockAlerts } from '../hooks/useLowStockAlerts';
import { useStore } from '../contexts/StoreContext';

interface ExecutiveDashboardProps {
  products: Product[];
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ products }) => {
  const { currentStore } = useStore();
  const { kpis, generateReport } = useSalesAnalytics();
  const [expiryAlertsState] = useExpiryAlerts(currentStore?.storeId || '');
  const { lowStockProducts } = useLowStockAlerts({ products, defaultMinQuantity: 10 });
  const expiryAlerts = expiryAlertsState.alerts;

  const [todaysSales, setTodaysSales] = useState<Sale[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'profit' | 'units'>('revenue');

  // Gerar relatório de hoje
  useEffect(() => {
    if (currentStore) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      generateReport(
        currentStore.storeId,
        today.toISOString().split('T')[0],
        tomorrow.toISOString().split('T')[0],
        'Hoje'
      );
    }
  }, [currentStore?.storeId]);

  // Estatísticas de estoque
  const stockStats = {
    total: products.length,
    outOfStock: products.filter((p) => (p.quantidadeDisponível || 0) === 0).length,
    lowStock: products.filter(
      (p) => (p.quantidadeDisponível || 0) > 0 && (p.quantidadeDisponível || 0) < 10
    ).length,
    inStock: products.filter((p) => (p.quantidadeDisponível || 0) >= 10).length,
  };

  // Top 3 produtos mais vendidos hoje
  const topProducts = products
    .sort((a, b) => (b.quantidadeVendida || 0) - (a.quantidadeVendida || 0))
    .slice(0, 3);

  // Alertas críticos (combinar todos os alertas)
  const criticalAlerts = [
    ...expiryAlerts.filter((a) => a.severity === 'CRITICAL').slice(0, 2),
    ...lowStockProducts
      .filter((item) => item.isCritical)
      .map((item) => ({
        id: item.product.id || item.product.nome,
        productName: item.product.nome,
        message: `Stock crítico: ${item.quantidadeDisponivel} unidade(s) disponível(is).`,
      }))
      .slice(0, 2),
  ].slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-900 dark:to-indigo-900 rounded-lg p-6 text-white"
      >
        <h1 className="text-3xl font-bold mb-2">📊 Dashboard Executivo</h1>
        <p className="text-purple-100">
          Visão consolidada de todas as operações
        </p>
        {currentStore && (
          <p className="text-sm text-purple-200 mt-2">Loja: {currentStore.storeName}</p>
        )}
      </motion.div>

      {/* KPIs Principais (Vendas de Hoje) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                VENDAS HOJE
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {kpis?.totalTransactions || 0}
              </p>
            </div>
            <ShoppingCart className="w-8 h-8 text-blue-300 dark:text-blue-700" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">
                RECEITA
              </p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                {((kpis?.totalRevenue || 0) / 1000).toFixed(1)}k Kz
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-300 dark:text-emerald-700" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">
                LUCRO
              </p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {((kpis?.totalProfit || 0) / 1000).toFixed(1)}k Kz
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-300 dark:text-purple-700" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">
                MARGEM MÉD.
              </p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                {(kpis?.avgMargin || 0).toFixed(1)}%
              </p>
            </div>
            <Clock className="w-8 h-8 text-amber-300 dark:text-amber-700" />
          </div>
        </div>
      </motion.div>

      {/* Estoque Status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            📦 Status de Estoque
          </h3>
          <Package className="w-5 h-5 text-slate-400" />
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {stockStats.total}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Total</p>
          </div>

          <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              {stockStats.inStock}
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">Em Stock</p>
          </div>

          <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
              {stockStats.lowStock}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Stock Baixo</p>
          </div>

          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-2xl font-bold text-red-900 dark:text-red-100">
              {stockStats.outOfStock}
            </p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">Sem Stock</p>
          </div>
        </div>
      </motion.div>

      {/* Alertas Críticos & Top Produtos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alertas Críticos */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              ⚠️ Alertas Críticos
            </h3>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>

          {criticalAlerts.length === 0 ? (
            <div className="text-center py-6 text-slate-500 dark:text-slate-400">
              <p>✅ Sem alertas críticos no momento</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {criticalAlerts.slice(0, 4).map((alert, idx) => (
                  <motion.div
                    key={`${alert.id}-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-red-900 dark:text-red-100 truncate">
                        {alert.productName}
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300 truncate">
                        {'message' in alert
                          ? alert.message
                          : `${alert.productName} expira em ${alert.daysUntilExpiry} dia(s).`}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Top 3 Produtos */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              🏆 Top Produtos (Vendas)
            </h3>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>

          {topProducts.length === 0 ? (
            <div className="text-center py-6 text-slate-500 dark:text-slate-400">
              <p>Sem dados de vendas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-600 dark:text-blue-400">#{idx + 1}</span>
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        {product.nome}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {product.categoria}
                    </p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {product.quantidadeVendida || 0}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">unidades</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4"
      >
        <p className="text-sm text-purple-900 dark:text-purple-300">
          <strong>💡 Dashboard em tempo real:</strong> Os dados são atualizados automaticamente.
          Clique em "Módulo de Vendas" para registar novas transações ou visualizar histórico
          completo.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default ExecutiveDashboard;
