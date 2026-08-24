/**
 * StockAnalyticsPanel Component
 * Análise de tendências, previsões e recomendações de reabastecimento
 * NOVO (Fase 13 Phase 2): Gestão de estoque
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Package,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useStockAlerts, useReorderSuggestions } from '../hooks/useStockAlerts';
import { useStockAnalytics } from '../hooks/useStockMovements';
import { getProductAvailableStock } from '../utils/stockUtils';

interface StockAnalyticsPanelProps {
  productId?: string;
}

export default function StockAnalyticsPanel({
  productId,
}: StockAnalyticsPanelProps) {
  const { currentStore, products } = useStore();
  const storeId = currentStore?.storeId || '';

  const [alertsState] = useStockAlerts(storeId);
  const { suggestions, loading: suggestionsLoading } = useReorderSuggestions(storeId);

  // Se productId fornecido, mostrar analytics de 1 produto
  const targetProduct = productId
    ? products.find((p) => p.id === productId)
    : undefined;

  const { analytics, loading: analyticsLoading } = useStockAnalytics(
    storeId,
    productId || ''
  );

  // Calcular estatísticas agregadas
  const stats = useMemo(() => {
    const criticalProducts = alertsState.alerts.filter(
      (a) => a.severity === 'CRITICAL'
    );
    const lowStockProducts = alertsState.alerts.filter(
      (a) => a.severity === 'WARNING'
    );

    const totalValue = products.reduce((sum, p) => {
      const price = p.precoVendaRecomendado || p.preco || 0;
      const qty = getProductAvailableStock(p);
      return sum + price * qty;
    }, 0);

    return {
      totalProducts: products.length,
      criticalCount: criticalProducts.length,
      warningCount: lowStockProducts.length,
      totalValue,
      averageQuantity:
        products.length > 0
          ? Math.round(
              products.reduce(
                (sum, p) => sum + getProductAvailableStock(p),
                0
              ) / products.length
            )
          : 0,
    };
  }, [products, alertsState.alerts]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 shadow-xs"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
              <Package size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {stats.totalProducts}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Total Produtos
          </p>
        </motion.div>

        {/* Critical */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-lg border border-red-200 dark:border-red-900/30 p-4 shadow-xs"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-950/30 rounded-lg">
              <AlertTriangle
                size={18}
                className="text-red-600 dark:text-red-400"
              />
            </div>
            <span className="text-2xl font-black text-red-600 dark:text-red-400">
              {stats.criticalCount}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Críticos
          </p>
        </motion.div>

        {/* Warning */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-900/30 p-4 shadow-xs"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/30 rounded-lg">
              <AlertTriangle
                size={18}
                className="text-amber-600 dark:text-amber-400"
              />
            </div>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {stats.warningCount}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Avisos
          </p>
        </motion.div>

        {/* Total Value */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-slate-900 rounded-lg border border-emerald-200 dark:border-emerald-900/30 p-4 shadow-xs"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/30 rounded-lg">
              <Package
                size={18}
                className="text-emerald-600 dark:text-emerald-400"
              />
            </div>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {(stats.totalValue / 1000).toFixed(1)}k
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Valor Total
          </p>
        </motion.div>
      </div>

      {/* Product Analytics (if productId provided) */}
      {productId && !analyticsLoading && analytics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm"
        >
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Análise: {analytics.productName}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Trending */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                {analytics.trend === 'increasing' ? (
                  <TrendingUp className="text-emerald-600 dark:text-emerald-400" />
                ) : analytics.trend === 'decreasing' ? (
                  <TrendingDown className="text-red-600 dark:text-red-400" />
                ) : (
                  <ArrowRight className="text-slate-600 dark:text-slate-400" />
                )}
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Tendência
                </span>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {analytics.trend === 'increasing'
                  ? '📈 Aumentando'
                  : analytics.trend === 'decreasing'
                  ? '📉 Diminuindo'
                  : '➡️ Estável'}
              </p>
            </div>

            {/* Avg Daily */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Média Diária
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {analytics.averageDaily.toFixed(1)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                unidades/dia
              </p>
            </div>

            {/* Days Until Empty */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <Clock size={14} className="text-slate-600 dark:text-slate-400" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Dias Até Vazio
                </span>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {analytics.daysUntilEmpty === 999
                  ? '∞'
                  : analytics.daysUntilEmpty}
              </p>
            </div>

            {/* Total In */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                Total Entrada
              </p>
              <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                +{analytics.totalIn}
              </p>
            </div>

            {/* Total Out */}
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                Total Saída
              </p>
              <p className="text-lg font-bold text-red-900 dark:text-red-100">
                -{analytics.totalOut}
              </p>
            </div>

            {/* Current */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                Quantidade Atual
              </p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {analytics.currentQuantity}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Reorder Suggestions */}
      {!suggestionsLoading && suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-900/30 p-6 shadow-sm"
        >
          <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-4">
            🎯 Recomendações de Reabastecimento
          </h3>

          <div className="space-y-3 max-h-48 overflow-y-auto">
            {suggestions.map((item) => (
              <div
                key={item.productId}
                className={`p-3 rounded-lg border ${
                  item.priority === 'URGENT'
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                    : item.priority === 'HIGH'
                    ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900'
                    : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p
                      className={`font-semibold ${
                        item.priority === 'URGENT'
                          ? 'text-red-900 dark:text-red-100'
                          : item.priority === 'HIGH'
                          ? 'text-orange-900 dark:text-orange-100'
                          : 'text-amber-900 dark:text-amber-100'
                      }`}
                    >
                      {item.productName}
                    </p>
                    <p
                      className={`text-sm mt-1 ${
                        item.priority === 'URGENT'
                          ? 'text-red-700 dark:text-red-300'
                          : item.priority === 'HIGH'
                          ? 'text-orange-700 dark:text-orange-300'
                          : 'text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      Atual: {item.currentQuantity} → Sugerido: +
                      {item.suggestedQuantity}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold text-white ${
                      item.priority === 'URGENT'
                        ? 'bg-red-600'
                        : item.priority === 'HIGH'
                        ? 'bg-orange-600'
                        : 'bg-amber-600'
                    }`}
                  >
                    {item.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
