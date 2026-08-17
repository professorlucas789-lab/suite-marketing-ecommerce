/**
 * StockMovementHistory Component
 * Visualizar histórico de movimentações de estoque
 * Fase 5: Gestão de Estoque
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  RotateCcw,
  Calendar,
  Filter,
  Loader2,
} from 'lucide-react';
import { StockMovement, StockMovementType } from '../types/inventory';
import { useStockMovements } from '../hooks/useStockMovements';
import { useStore } from '../contexts/StoreContext';
import { Product } from '../types';

interface StockMovementHistoryProps {
  products: Product[];
}

export const StockMovementHistory: React.FC<StockMovementHistoryProps> = ({
  products,
}) => {
  const { currentStore } = useStore();
  const storeId = currentStore?.storeId || '';

  const { movements, loading } = useStockMovements({
    storeId,
    autoFetch: true,
    limit: 50,
  });

  // Filtros
  const [typeFilter, setTypeFilter] = useState<StockMovementType | 'ALL'>('ALL');
  const [searchProduct, setSearchProduct] = useState('');

  // Filtrar movimentos
  const filtered = useMemo(() => {
    return movements.filter((m) => {
      const matchesType = typeFilter === 'ALL' || m.type === typeFilter;
      const matchesSearch =
        searchProduct === '' ||
        m.productName.toLowerCase().includes(searchProduct.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [movements, typeFilter, searchProduct]);

  // Formatar data
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Cor por tipo
  const getTypeColor = (type: StockMovementType) => {
    switch (type) {
      case 'IN':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300';
      case 'OUT':
        return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
      case 'ADJUSTMENT':
        return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300';
    }
  };

  // Ícone por tipo
  const getTypeIcon = (type: StockMovementType) => {
    switch (type) {
      case 'IN':
        return <ArrowDownCircle className="w-4 h-4" />;
      case 'OUT':
        return <ArrowUpCircle className="w-4 h-4" />;
      case 'ADJUSTMENT':
        return <RotateCcw className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: StockMovementType) => {
    switch (type) {
      case 'IN':
        return 'Entrada';
      case 'OUT':
        return 'Saída';
      case 'ADJUSTMENT':
        return 'Ajuste';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-lg dark:text-white">
            Histórico de Movimentações
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {filtered.length} registos
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Filtro por tipo */}
        <div className="flex gap-2">
          {(['ALL', 'IN', 'OUT', 'ADJUSTMENT'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                typeFilter === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t === 'ALL' ? 'Todas' : t === 'IN' ? 'Entradas' : t === 'OUT' ? 'Saídas' : 'Ajustes'}
            </button>
          ))}
        </div>

        {/* Busca */}
        <div className="flex-1 flex items-center gap-2 px-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <Filter className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={searchProduct}
            onChange={(e) => setSearchProduct(e.target.value)}
            className="flex-1 bg-transparent py-2 outline-none text-sm dark:text-white placeholder-slate-500"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            Nenhuma movimentação encontrada
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                  Data/Hora
                </th>
                <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                  Produto
                </th>
                <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                  Tipo
                </th>
                <th className="text-right py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                  Quantidade
                </th>
                <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                  Motivo
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((movement, idx) => (
                <tr
                  key={movement.id}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400">
                    {formatDate(movement.timestamp)}
                  </td>
                  <td className="py-3 px-3 font-medium dark:text-slate-300">
                    {movement.productName}
                  </td>
                  <td className="py-3 px-3">
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(
                        movement.type
                      )}`}
                    >
                      {getTypeIcon(movement.type)}
                      {getTypeLabel(movement.type)}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold dark:text-slate-300">
                    <span
                      className={
                        movement.type === 'IN'
                          ? 'text-green-600 dark:text-green-400'
                          : movement.type === 'OUT'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }
                    >
                      {movement.type === 'IN' ? '+' : movement.type === 'OUT' ? '-' : ''}
                      {movement.quantity}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                    {movement.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Sumário */}
      {filtered.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                Total Entradas
              </div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {filtered
                  .filter((m) => m.type === 'IN')
                  .reduce((sum, m) => sum + m.quantity, 0)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                Total Saídas
              </div>
              <div className="text-xl font-bold text-red-600 dark:text-red-400">
                {filtered
                  .filter((m) => m.type === 'OUT')
                  .reduce((sum, m) => sum + m.quantity, 0)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                Saldo
              </div>
              <div className="text-xl font-bold text-slate-700 dark:text-slate-300">
                {filtered
                  .filter((m) => m.type === 'IN')
                  .reduce((sum, m) => sum + m.quantity, 0) -
                  filtered
                    .filter((m) => m.type === 'OUT')
                    .reduce((sum, m) => sum + m.quantity, 0)}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StockMovementHistory;
