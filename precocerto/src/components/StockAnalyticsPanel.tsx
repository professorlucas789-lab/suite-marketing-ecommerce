/**
 * StockAnalyticsPanel Component
 * Dashboard de análise e alertas de estoque
 * Fase 5: Gestão de Estoque
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  TrendingDown,
  Package,
  AlertCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { Product } from '../types';
import { useStockAlerts } from '../hooks/useStockAlerts';
import { useStore } from '../contexts/StoreContext';

interface StockAnalyticsPanelProps {
  products: Product[];
}

export const StockAnalyticsPanel: React.FC<StockAnalyticsPanelProps> = ({
  products,
}) => {
  const { currentStore } = useStore();
  const storeId = currentStore?.storeId || '';

  const { alerts, criticalAlerts, warningAlerts } = useStockAlerts({
    storeId,
    autoFetch: true,
  });

  // Calcular estatísticas
  const stats = useMemo(() => {
    const lowStockProducts = products.filter(
      (p) => p.quantidade && p.quantidade < 20 // Threshold padrão
    );

    const outOfStockProducts = products.filter((p) => !p.quantidade || p.quantidade === 0);

    const totalProducts = products.length;
    const productsInStock = products.filter((p) => p.quantidade && p.quantidade > 0).length;

    return {
      totalProducts,
      productsInStock,
      outOfStockProducts: outOfStockProducts.length,
      lowStockProducts: lowStockProducts.length,
      percentageInStock: ((productsInStock / totalProducts) * 100).toFixed(1),
    };
  }, [products]);

  // Top 5 produtos com stock baixo
  const topLowStock = useMemo(() => {
    return products
      .filter((p) => p.quantidade && p.quantidade > 0)
      .sort((a, b) => (a.quantidade || 0) - (b.quantidade || 0))
      .slice(0, 5);
  }, [products]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'WARNING':
        return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Produtos */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Total Produtos
              </p>
              <p className="text-2xl font-bold dark:text-white">
                {stats.totalProducts}
              </p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>

        {/* Em Stock */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Em Stock
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.productsInStock}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                {stats.percentageInStock}%
              </p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>

        {/* Fora de Stock */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Fora de Stock
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.outOfStockProducts}
              </p>
            </div>
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </motion.div>

        {/* Stock Baixo */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Stock Baixo
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.lowStockProducts}
              </p>
            </div>
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
        >
          <h3 className="font-semibold text-lg dark:text-white mb-4">
            ⚠️ Alertas de Stock
          </h3>

          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityColor(
                  alert.severity
                )}`}
              >
                <div className="mt-0.5">
                  {alert.severity === 'CRITICAL' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{alert.productName}</p>
                  <p className="text-sm opacity-90">
                    Stock: {alert.currentQuantity} / Mínimo: {alert.minQuantity}
                  </p>
                  {alert.daysUntilStockout !== undefined && (
                    <p className="text-xs opacity-75 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      Esgota em ~{alert.daysUntilStockout} dias
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {alerts.length > 5 && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-4 text-center">
              +{alerts.length - 5} mais alertas...
            </p>
          )}
        </motion.div>
      )}

      {/* Top 5 Stock Baixo */}
      {topLowStock.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
        >
          <h3 className="font-semibold text-lg dark:text-white mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Top 5 - Stock Baixo
          </h3>

          <div className="space-y-3">
            {topLowStock.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium dark:text-white truncate">
                    {product.nome}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {product.categoria}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold dark:text-white">
                    {product.quantidade || 0}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    unidades
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {alerts.length === 0 && topLowStock.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
        >
          <div className="inline-block p-3 bg-green-100 dark:bg-green-900/40 rounded-full mb-3">
            <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <p className="font-semibold text-green-900 dark:text-green-300">
            Tudo em ordem!
          </p>
          <p className="text-sm text-green-700 dark:text-green-400 mt-1">
            Todos os produtos têm stock adequado
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default StockAnalyticsPanel;
