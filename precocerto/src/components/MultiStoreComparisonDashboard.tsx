/**
 * MultiStoreComparisonDashboard Component
 * Dashboard de comparação de performance entre múltiplas lojas
 * Fase 9: Dashboard Multi-Loja
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Package,
  Percent,
  Award,
  AlertCircle,
  Zap,
  BarChart3,
  WalletCards,
  Landmark,
  ReceiptText,
} from 'lucide-react';
import { useMultiStoreAnalytics } from '../hooks/useMultiStoreAnalytics';
import { getPerformanceColor, generateStoreRecommendations } from '../services/multiStoreAnalyticsService';
import { StorePerformance } from '../services/multiStoreAnalyticsService';
import { useStore } from '../contexts/StoreContext';
import { formatKz } from '../utils';

interface MultiStoreComparisonDashboardProps {
  initialFromDate?: string;
  initialToDate?: string;
}

export const MultiStoreComparisonDashboard: React.FC<MultiStoreComparisonDashboardProps> = ({
  initialFromDate,
  initialToDate,
}) => {
  const { userStores } = useStore();
  const { comparison, loading, error, generateComparison } = useMultiStoreAnalytics();

  const [dateRange, setDateRange] = useState({
    fromDate: initialFromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    toDate: initialToDate || new Date().toISOString().split('T')[0],
  });

  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ranking' | 'financial' | 'metrics' | 'recommendations'>('ranking');

  useEffect(() => {
    generateComparison(dateRange.fromDate, dateRange.toDate, 'Período Selecionado', userStores);
  }, [dateRange.fromDate, dateRange.toDate, userStores.length]);

  const handleGenerateReport = () => {
    generateComparison(dateRange.fromDate, dateRange.toDate, 'Período Selecionado', userStores);
  };

  if (!comparison && loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center h-96"
      >
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 dark:text-slate-400">Carregando visão consolidada...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
      >
        <h1 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Visão Executiva Multi-Negócio</h1>
        <p className="text-slate-500">Receita, margem, stock, caixa, contas a receber e contas a pagar por unidade.</p>
      </motion.div>

      {/* Date Range Selector */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
      >
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
            onClick={handleGenerateReport}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-medium rounded-lg transition"
          >
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </button>
        </div>
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
        >
          <p className="text-sm text-red-900 dark:text-red-200">❌ {error}</p>
        </motion.div>
      )}

      {comparison && (
        <>
          {/* Consolidated KPIs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
          >
            <KPICard
              icon={<DollarSign className="w-5 h-5" />}
              label="Receita Total"
              value={comparison.consolidated.totalRevenue}
              format="currency"
              color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
            />
            <KPICard
              icon={<WalletCards className="w-5 h-5" />}
              label="Fluxo Líquido"
              value={comparison.consolidated.netCashFlow}
              format="currency"
              color="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            />
            <KPICard
              icon={<Percent className="w-5 h-5" />}
              label="Margem Média"
              value={comparison.consolidated.avgMargin}
              format="percentage"
              color="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
            />
            <KPICard
              icon={<Package className="w-5 h-5" />}
              label="Unidades Vendidas"
              value={comparison.consolidated.totalUnits}
              format="number"
              color="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
            />
            <KPICard
              icon={<BarChart3 className="w-5 h-5" />}
              label="Lojas Ativas"
              value={comparison.consolidated.storeCount}
              format="number"
              color="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
            />
            <KPICard
              icon={<ReceiptText className="w-5 h-5" />}
              label="A Receber"
              value={comparison.consolidated.receivables}
              format="currency"
              color="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
            />
            <KPICard
              icon={<CreditCard className="w-5 h-5" />}
              label="A Pagar"
              value={comparison.consolidated.payables}
              format="currency"
              color="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
            />
            <KPICard
              icon={<Landmark className="w-5 h-5" />}
              label="Saldo Operacional"
              value={comparison.consolidated.operationalBalance}
              format="currency"
              color="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
            />
            <KPICard
              icon={<AlertCircle className="w-5 h-5" />}
              label="Pendente Conciliação"
              value={comparison.consolidated.pendingReconciliation}
              format="currency"
              color="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
            />
          </motion.div>

          {/* Navigation Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-2"
          >
            {[
              { id: 'ranking' as const, label: 'Ranking', icon: Award },
              { id: 'financial' as const, label: 'Financeiro', icon: WalletCards },
              { id: 'metrics' as const, label: 'Métricas', icon: BarChart3 },
              { id: 'recommendations' as const, label: 'Recomendações', icon: Zap },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </motion.div>

          {/* Content by Tab */}
          <AnimatePresence mode="wait">
            {activeTab === 'ranking' && (
              <motion.div
                key="ranking"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                  Ranking de Lojas por Receita
                </h2>
                {comparison.stores.map((store, idx) => (
                  <StorePerformanceCard
                    key={store.storeId}
                    store={store}
                    rank={idx + 1}
                    isExpanded={expandedStore === store.storeId}
                    onToggle={() =>
                      setExpandedStore(expandedStore === store.storeId ? null : store.storeId)
                    }
                    averageMargin={comparison.insights.averageMetrics.avgMargin}
                  />
                ))}
              </motion.div>
            )}

            {activeTab === 'financial' && (
              <motion.div
                key="financial"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <FinancialComparison comparison={comparison} />
              </motion.div>
            )}

            {activeTab === 'metrics' && (
              <motion.div
                key="metrics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <MetricsComparison comparison={comparison} />
              </motion.div>
            )}

            {activeTab === 'recommendations' && (
              <motion.div
                key="recommendations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                  Recomendações por Loja
                </h2>
                {comparison.stores.map((store) => (
                  <RecommendationsCard
                    key={store.storeId}
                    store={store}
                    averageMargin={comparison.insights.averageMetrics.avgMargin}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Best and Worst Performers */}
          {comparison.insights.bestPerformer && comparison.insights.worstPerformer && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <motion.div
                whileHover={{ y: -2 }}
                className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <h3 className="font-bold text-emerald-900 dark:text-emerald-100">Melhor Desempenho</h3>
                </div>
                <p className="font-bold text-emerald-900 dark:text-emerald-100 text-lg">
                  {comparison.insights.bestPerformer.storeName}
                </p>
                <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-2">
                  Receita: {(comparison.insights.bestPerformer.metrics.totalRevenue / 1000).toFixed(1)}K Kz
                </p>
                <p className="text-sm text-emerald-800 dark:text-emerald-200">
                  Margem: {comparison.insights.bestPerformer.metrics.profitMargin.toFixed(1)}%
                </p>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold">
                    ⚠
                  </div>
                  <h3 className="font-bold text-red-900 dark:text-red-100">Atenção Necessária</h3>
                </div>
                <p className="font-bold text-red-900 dark:text-red-100 text-lg">
                  {comparison.insights.worstPerformer.storeName}
                </p>
                <p className="text-sm text-red-800 dark:text-red-200 mt-2">
                  Receita: {(comparison.insights.worstPerformer.metrics.totalRevenue / 1000).toFixed(1)}K Kz
                </p>
                <p className="text-sm text-red-800 dark:text-red-200">
                  Margem: {comparison.insights.worstPerformer.metrics.profitMargin.toFixed(1)}%
                </p>
              </motion.div>
            </motion.div>
          )}
        </>
      )}

      {!comparison && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center"
        >
          <p className="text-blue-900 dark:text-blue-100">
            Clique em "Gerar Relatório" para iniciar a análise comparativa entre lojas
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

/**
 * KPI Card Component
 */
const KPICard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  format: 'currency' | 'percentage' | 'number';
  color: string;
}> = ({ icon, label, value, format, color }) => {
  let formattedValue = '';
  if (format === 'currency') {
    formattedValue = formatKz(value);
  } else if (format === 'percentage') {
    formattedValue = `${value.toFixed(1)}%`;
  } else {
    formattedValue = value.toLocaleString('pt-AO');
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`${color} border rounded-lg p-4`}
    >
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
      </div>
      <p className="text-2xl font-bold">{formattedValue}</p>
    </motion.div>
  );
};

/**
 * Store Performance Card Component
 */
const StorePerformanceCard: React.FC<{
  store: StorePerformance;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
  averageMargin: number;
}> = ({ store, rank, isExpanded, onToggle, averageMargin }) => {
  const colors = getPerformanceColor(store.trends.efficiency);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`${colors.bg} border rounded-lg p-4 cursor-pointer transition`}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`w-9 h-9 rounded-lg ${colors.badge} flex items-center justify-center text-sm font-black`}>
            {rank}
          </span>
          <div>
            <p className={`${colors.text} font-bold text-lg`}>{store.storeName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {store.businessSegmentName || 'Negócio'} · {store.unitType || 'unidade'}
            </p>
          </div>
        </div>
        <button className={`${colors.text} transition transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <p className="text-xs text-slate-600 dark:text-slate-400">Receita</p>
          <p className={`${colors.text} font-bold`}>
            {formatKz(store.metrics.totalRevenue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-600 dark:text-slate-400">Margem</p>
          <p className={`${colors.text} font-bold`}>{store.metrics.profitMargin.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-slate-600 dark:text-slate-400">Vendas</p>
          <p className={`${colors.text} font-bold`}>{store.metrics.transactionCount}</p>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 pt-3 border-t border-current border-opacity-20"
          >
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-slate-600 dark:text-slate-400">Lucro Total</p>
                <p className={`${colors.text} font-bold`}>
                  {formatKz(store.metrics.totalProfit)}
                </p>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400">Unidades</p>
                <p className={`${colors.text} font-bold`}>{store.metrics.totalUnits}</p>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400">Ticket Médio</p>
                <p className={`${colors.text} font-bold`}>
                  {formatKz(store.metrics.avgTransactionValue)}
                </p>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400">Produtos</p>
                <p className={`${colors.text} font-bold`}>{store.metrics.productCount}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-current border-opacity-20">
              <div>
                <p className="text-slate-600 dark:text-slate-400">Fluxo líquido</p>
                <p className={`${store.metrics.netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-700'} font-bold`}>
                  {formatKz(store.metrics.netCashFlow)}
                </p>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400">A pagar</p>
                <p className="text-red-700 font-bold">{formatKz(store.metrics.payables)}</p>
              </div>
            </div>

            {/* Trends */}
            <div className="pt-2 border-t border-current border-opacity-20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 text-sm">Crescimento Receita</span>
                <div className="flex items-center gap-1">
                  {store.trends.revenueGrowth >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={store.trends.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                    {store.trends.revenueGrowth > 0 ? '+' : ''}
                    {store.trends.revenueGrowth.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const FinancialComparison: React.FC<{ comparison: any }> = ({ comparison }) => {
  const stores = [...comparison.stores].sort((a: StorePerformance, b: StorePerformance) => b.metrics.operationalBalance - a.metrics.operationalBalance);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Financeiro por unidade</h2>
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Unidade</th>
                <th className="px-4 py-3 text-right">Entradas</th>
                <th className="px-4 py-3 text-right">Saídas</th>
                <th className="px-4 py-3 text-right">Fluxo</th>
                <th className="px-4 py-3 text-right">A receber</th>
                <th className="px-4 py-3 text-right">A pagar</th>
                <th className="px-4 py-3 text-right">Saldo operacional</th>
                <th className="px-4 py-3 text-right">Conciliação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {stores.map((store: StorePerformance) => (
                <tr key={store.storeId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900 dark:text-white">{store.storeName}</p>
                    <p className="text-xs text-slate-500">{store.businessSegmentName || 'Negócio'} · {store.unitType || 'unidade'}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-700">{formatKz(store.metrics.cashIn)}</td>
                  <td className="px-4 py-3 text-right font-mono text-red-700">{formatKz(store.metrics.cashOut)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${store.metrics.netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatKz(store.metrics.netCashFlow)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-amber-700">{formatKz(store.metrics.receivables)}</td>
                  <td className="px-4 py-3 text-right font-mono text-red-700">{formatKz(store.metrics.payables)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${store.metrics.operationalBalance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatKz(store.metrics.operationalBalance)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${store.metrics.pendingReconciliation > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {store.metrics.pendingReconciliation > 0 ? formatKz(store.metrics.pendingReconciliation) : 'Fechado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/**
 * Metrics Comparison Component
 */
const MetricsComparison: React.FC<{ comparison: any }> = ({ comparison }) => {
  const metrics = [
    {
      name: 'Receita Total',
      key: 'totalRevenue',
      consolidatedKey: 'totalRevenue',
      format: (v: number) => formatKz(v),
    },
    {
      name: 'Lucro Total',
      key: 'totalProfit',
      consolidatedKey: 'totalProfit',
      format: (v: number) => formatKz(v),
    },
    {
      name: 'Margem Média',
      key: 'avgMargin',
      consolidatedKey: 'avgMargin',
      format: (v: number) => `${v.toFixed(1)}%`,
    },
    {
      name: 'Unidades Vendidas',
      key: 'totalUnits',
      consolidatedKey: 'totalUnits',
      format: (v: number) => v.toLocaleString('pt-AO'),
    },
    {
      name: 'Transações',
      key: 'transactionCount',
      consolidatedKey: 'totalTransactions',
      format: (v: number) => v.toLocaleString('pt-AO'),
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Comparação de Métricas</h2>
      {metrics.map((metric) => {
        const stores = comparison.stores;
        const consolidated = comparison.consolidated;
        const metricValue =
          (consolidated as any)[metric.consolidatedKey] || (metric.key === 'avgMargin' ? consolidated.avgMargin : 0);

        return (
          <div key={metric.name} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">{metric.name}</p>
            <div className="space-y-2">
              {stores
                .sort((a: any, b: any) => (b.metrics as any)[metric.key] - (a.metrics as any)[metric.key])
                .map((store: StorePerformance, idx: number) => {
                  const value = (store.metrics as any)[metric.key];
                  const percentage = metricValue > 0 ? (value / metricValue) * 100 : 0;

                  return (
                    <div key={store.storeId} className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {store.storeName}
                        </p>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-1">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {metric.format(value)}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Recommendations Card Component
 */
const RecommendationsCard: React.FC<{
  store: StorePerformance;
  averageMargin: number;
}> = ({ store, averageMargin }) => {
  const recommendations = generateStoreRecommendations(store, averageMargin);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-5 h-5 text-amber-600" />
        <h3 className="font-bold text-slate-900 dark:text-white">{store.storeName}</h3>
      </div>

      {recommendations.length > 0 ? (
        <ul className="space-y-2">
          {recommendations.map((rec, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <span className="text-amber-600 font-bold mt-0.5">•</span>
              <span className="text-slate-700 dark:text-slate-300">{rec}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          ✓ Loja operando dentro dos padrões esperados
        </p>
      )}
    </motion.div>
  );
};

export default MultiStoreComparisonDashboard;
