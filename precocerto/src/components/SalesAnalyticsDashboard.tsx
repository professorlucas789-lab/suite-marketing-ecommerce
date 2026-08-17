/**
 * SalesAnalyticsDashboard Component
 * Dashboard de análise de vendas com KPIs e gráficos
 * Fase 6: Módulo de Vendas
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Package, DollarSign, Percent, Download } from 'lucide-react';
import { SalesReport } from '../types/sales';
import { useSalesAnalytics } from '../hooks/useSalesAnalytics';
import { useStore } from '../contexts/StoreContext';
import ReportExportDialog from './ReportExportDialog';

interface SalesAnalyticsDashboardProps {
  initialFromDate?: string;
  initialToDate?: string;
  products?: any[];
}

export const SalesAnalyticsDashboard: React.FC<SalesAnalyticsDashboardProps> = ({
  initialFromDate,
  initialToDate,
  products = [],
}) => {
  const { currentStore } = useStore();
  const { report, kpis, loading, generateReport } = useSalesAnalytics();

  const [dateRange, setDateRange] = useState({
    fromDate: initialFromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    toDate: initialToDate || new Date().toISOString().split('T')[0],
  });

  const [activeTab, setActiveTab] = useState<'kpis' | 'products' | 'categories' | 'daily'>('kpis');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  useEffect(() => {
    if (currentStore) {
      generateReport(currentStore.storeId, dateRange.fromDate, dateRange.toDate, 'Período Selecionado');
    }
  }, [currentStore?.storeId, dateRange]);

  if (!kpis) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center h-96"
      >
        <p className="text-slate-500 dark:text-slate-400">Carregando análises...</p>
      </motion.div>
    );
  }

  const tabs = [
    { id: 'kpis' as const, label: '📊 KPIs', icon: DollarSign },
    { id: 'products' as const, label: '📦 Top Produtos', icon: Package },
    { id: 'categories' as const, label: '🏷️ Categorias', icon: TrendingUp },
    { id: 'daily' as const, label: '📈 Vendas Diárias', icon: TrendingUp },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Seletor de Período */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Data Inicial
            </label>
            <input
              type="date"
              value={dateRange.fromDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, fromDate: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Data Final
            </label>
            <input
              type="date"
              value={dateRange.toDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, toDate: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-medium rounded-lg transition"
          >
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* KPIs Principais */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">TRANSAÇÕES</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {kpis.totalTransactions}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-300 dark:text-blue-700" />
          </div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">
                RECEITA TOTAL
              </p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                {(kpis.totalRevenue || 0).toFixed(0)} Kz
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-300 dark:text-emerald-700" />
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">LUCRO TOTAL</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {(kpis.totalProfit || 0).toFixed(0)} Kz
              </p>
            </div>
            <Package className="w-8 h-8 text-purple-300 dark:text-purple-700" />
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">MARGEM MÉD.</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                {(kpis.avgMargin || 0).toFixed(1)}%
              </p>
            </div>
            <Percent className="w-8 h-8 text-amber-300 dark:text-amber-700" />
          </div>
        </div>
      </motion.div>

      {/* KPIs Secundários */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">UNIDADES VENDIDAS</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{kpis.totalUnits}</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">TICKET MÉDIO</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {(kpis.avgTransactionValue || 0).toFixed(2)} Kz
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">CUSTO TOTAL</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {(kpis.totalCost || 0).toFixed(0)} Kz
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">LUCRO POR VENDA</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {(kpis.avgProfitPerTransaction || 0).toFixed(2)} Kz
          </p>
        </div>
      </motion.div>

      {/* Tabs de Detalhes */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 p-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'kpis' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Margem Mínima</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {(kpis.minMargin || 0).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Margem Máxima</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {(kpis.maxMargin || 0).toFixed(1)}%
                  </p>
                </div>
              </div>

              {kpis.paymentMethods && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="font-medium text-slate-900 dark:text-white mb-3">Métodos de Pagamento</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div className="text-center">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Dinheiro</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {kpis.paymentMethods.cash || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Cartão</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {kpis.paymentMethods.card || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Transferência</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {kpis.paymentMethods.transfer || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Cheque</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {kpis.paymentMethods.cheque || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Outro</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {kpis.paymentMethods.other || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'products' && report && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {report.topProducts && report.topProducts.length > 0 ? (
                <div className="space-y-2">
                  {report.topProducts.map((product, idx) => (
                    <div
                      key={product.productId}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {idx + 1}. {product.productName}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {product.salesCount} vendas • {product.quantity} unidades
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {(product.totalRevenue || 0).toFixed(0)} Kz
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          {(product.avgMargin || 0).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400">Sem dados</p>
              )}
            </motion.div>
          )}

          {activeTab === 'categories' && report && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {report.topCategories && report.topCategories.length > 0 ? (
                <div className="space-y-2">
                  {report.topCategories.map((category, idx) => (
                    <div
                      key={category.categoryId}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {idx + 1}. {category.categoryName}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {category.productsCount} produtos • {category.salesCount} vendas
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {(category.totalRevenue || 0).toFixed(0)} Kz
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          {(category.avgMargin || 0).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400">Sem dados</p>
              )}
            </motion.div>
          )}

          {activeTab === 'daily' && report && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {report.dailySales && report.dailySales.length > 0 ? (
                <div className="space-y-2">
                  {report.dailySales.map((daily, idx) => (
                    <div
                      key={daily.date}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {new Date(daily.date).toLocaleDateString('pt-PT', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {daily.transactions} transações • {daily.quantity} unidades
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {(daily.revenue || 0).toFixed(0)} Kz
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          +{(daily.profit || 0).toFixed(0)} Kz
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400">Sem dados</p>
              )}
            </motion.div>
          )}
        </div>

        {/* Export Button */}
        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={() => setExportDialogOpen(true)}
            disabled={!report}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-medium rounded-lg transition"
          >
            <Download className="w-4 h-4" />
            Exportar Relatório
          </button>
        </div>
      </div>

      {/* Export Dialog */}
      <ReportExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        salesReport={report}
        products={products}
        storeName={currentStore?.storeName || 'Loja'}
        alerts={[]}
      />
    </motion.div>
  );
};

export default SalesAnalyticsDashboard;
