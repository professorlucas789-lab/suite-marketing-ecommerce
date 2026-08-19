/**
 * SalesHistory Component
 * Histórico de vendas com filtros e análises
 * Fase 6: Módulo de Vendas
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, Calendar } from 'lucide-react';
import { Sale } from '../types/sales';
import { useSalesAnalytics } from '../hooks/useSalesAnalytics';
import { useStore } from '../contexts/StoreContext';

interface SalesHistoryProps {
  products?: any[];
}

export const SalesHistory: React.FC<SalesHistoryProps> = () => {
  const { currentStore } = useStore();
  const { salesHistory, loading, fetchHistory } = useSalesAnalytics();

  const [filters, setFilters] = useState({
    searchText: '',
    fromDate: '',
    toDate: '',
    paymentMethod: '',
  });

  React.useEffect(() => {
    if (currentStore) {
      fetchHistory(currentStore.storeId, { limit: 500 });
    }
  }, [currentStore?.storeId]);

  // Filtrar vendas
  const filteredSales = useMemo(() => {
    return salesHistory.filter((sale) => {
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        if (
          !sale.productName.toLowerCase().includes(searchLower) &&
          !sale.id.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      if (filters.fromDate) {
        if (new Date(sale.timestamp) < new Date(filters.fromDate)) {
          return false;
        }
      }

      if (filters.toDate) {
        if (new Date(sale.timestamp) > new Date(filters.toDate)) {
          return false;
        }
      }

      if (filters.paymentMethod && sale.paymentMethod !== filters.paymentMethod) {
        return false;
      }

      return true;
    });
  }, [salesHistory, filters]);

  // Cálculos de resumo
  const summary = useMemo(() => {
    return {
      totalSales: filteredSales.length,
      totalRevenue: filteredSales.reduce((sum, s) => sum + (s.totalPrice || 0), 0),
      totalProfit: filteredSales.reduce((sum, s) => sum + (s.totalProfit || s.profitTotal || 0), 0),
      totalUnits: filteredSales.reduce((sum, s) => sum + s.quantity, 0),
      avgMargin: filteredSales.length > 0
        ? filteredSales.reduce((sum, s) => sum + (s.profitMargin || s.margemReal || 0), 0) / filteredSales.length
        : 0,
    };
  }, [filteredSales]);

  const getPaymentMethodLabel = (method?: string) => {
    const labels: Record<string, string> = {
      cash: '💵 Dinheiro',
      card: '💳 Cartão',
      transfer: '🏦 Transferência',
      multicaixa: '💳 Multicaixa',
      mobile_money: '📱 Carteira móvel',
      credit: '🧾 Crédito',
      cheque: '✓ Cheque',
      other: '❓ Outro',
    };
    return labels[method || 'other'] || 'Outro';
  };

  const getSeverityColor = (margin: number) => {
    if (margin < 10) return 'text-red-600 dark:text-red-400';
    if (margin < 20) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={filters.searchText}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchText: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Data Inicial */}
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Data Final */}
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Método de Pagamento */}
          <select
            value={filters.paymentMethod}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, paymentMethod: e.target.value }))
            }
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os métodos</option>
            <option value="cash">Dinheiro</option>
            <option value="card">Cartão</option>
            <option value="transfer">Transferência</option>
            <option value="multicaixa">Multicaixa</option>
            <option value="mobile_money">Carteira móvel</option>
            <option value="credit">Crédito</option>
            <option value="cheque">Cheque</option>
            <option value="other">Outro</option>
          </select>
        </div>
      </div>

      {/* Resumo */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-3"
      >
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">VENDAS</p>
          <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{summary.totalSales}</p>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">RECEITA</p>
          <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
            {summary.totalRevenue.toFixed(0)} Kz
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">LUCRO</p>
          <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
            {summary.totalProfit.toFixed(0)} Kz
          </p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">UNIDADES</p>
          <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
            {summary.totalUnits}
          </p>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">MARGEM MÉD.</p>
          <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
            {summary.avgMargin.toFixed(1)}%
          </p>
        </div>
      </motion.div>

      {/* Tabela */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-slate-500 dark:text-slate-400">Carregando histórico...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
            <p>Nenhuma venda encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white">
                    Data/Hora
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white">
                    Produto
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                    Preço Unit.
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                    Margem
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">
                    Pagamento
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale, idx) => (
                  <motion.tr
                    key={sale.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.01 }}
                    className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <td className="px-4 py-3 text-slate-900 dark:text-white text-xs">
                      {new Date(sale.timestamp).toLocaleDateString('pt-PT')}{' '}
                      {new Date(sale.timestamp).toLocaleTimeString('pt-PT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">
                      {sale.productName}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-900 dark:text-white">
                      {sale.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900 dark:text-white">
                      {(sale.unitPrice || 0).toFixed(2)} Kz
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900 dark:text-white font-semibold">
                      {(sale.totalPrice || 0).toFixed(2)} Kz
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${getSeverityColor(sale.profitMargin || sale.margemReal || 0)}`}>
                      {(sale.profitMargin || sale.margemReal || 0).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400 text-xs">
                      {getPaymentMethodLabel(sale.paymentMethod)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SalesHistory;
