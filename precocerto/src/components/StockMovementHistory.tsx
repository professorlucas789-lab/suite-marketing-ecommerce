/**
 * StockMovementHistory Component
 * Visualizar histórico completo de movimentações
 * NOVO (Fase 13 Phase 2): Gestão de estoque
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Filter,
  Clock,
} from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useStockMovements } from '../hooks/useStockMovements';
import { StockMovement } from '../types/inventory';

interface StockMovementHistoryProps {
  productId?: string;
  limit?: number;
}

export default function StockMovementHistory({
  productId,
  limit = 50,
}: StockMovementHistoryProps) {
  const { currentStore } = useStore();
  const [state, actions] = useStockMovements(
    currentStore?.storeId || '',
    productId
  );

  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await actions.refetch();
    setIsRefreshing(false);
  };

  const filteredMovements = (state.history?.movements || []).filter(
    (m) => typeFilter === 'ALL' || m.type === typeFilter
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'IN':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20';
      case 'OUT':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20';
      case 'ADJUSTMENT':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20';
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'IN':
        return <ArrowDownCircle size={16} />;
      case 'OUT':
        return <ArrowUpCircle size={16} />;
      default:
        return <RefreshCw size={16} />;
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      purchase: 'Compra',
      sale: 'Venda',
      return: 'Devolução',
      loss: 'Perda',
      inventory: 'Ajuste',
      transfer: 'Transferência',
      damage: 'Danificado',
      expiry: 'Vencimento',
      other: 'Outro',
    };
    return labels[reason] || reason;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock size={20} className="text-slate-600 dark:text-slate-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Histórico de Movimentações
          </h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw
            size={18}
            className={isRefreshing ? 'animate-spin' : ''}
          />
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTypeFilter('ALL')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            typeFilter === 'ALL'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          Tudo
        </button>
        <button
          onClick={() => setTypeFilter('IN')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
            typeFilter === 'IN'
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <ArrowDownCircle size={14} />
          Entrada
        </button>
        <button
          onClick={() => setTypeFilter('OUT')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
            typeFilter === 'OUT'
              ? 'bg-red-500 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <ArrowUpCircle size={14} />
          Saída
        </button>
      </div>

      {/* Loading */}
      {state.loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin">
            <RefreshCw className="text-slate-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Carregando histórico...
          </p>
        </div>
      )}

      {/* Error */}
      {state.error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 p-4 rounded-lg">
          {state.error}
        </div>
      )}

      {/* Vazio */}
      {!state.loading && filteredMovements.length === 0 && (
        <div className="text-center py-8">
          <Filter className="mx-auto text-slate-400 mb-2" size={32} />
          <p className="text-slate-600 dark:text-slate-400">
            Nenhuma movimentação registada
          </p>
        </div>
      )}

      {/* Lista de Movimentações */}
      {!state.loading && filteredMovements.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredMovements.map((movement: StockMovement) => (
            <motion.div
              key={movement.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-3 flex-1">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${getTypeColor(movement.type)}`}>
                    {getTypeIcon(movement.type)}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {movement.quantity}x
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {getReasonLabel(movement.reason)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Clock size={12} />
                      {new Date(movement.timestamp).toLocaleString('pt-PT')}
                    </div>
                    {movement.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">
                        "{movement.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Quantity After */}
                {movement.quantityAfter !== undefined && (
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {movement.quantityAfter}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      após movimento
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Summary */}
      {!state.loading && state.history && (
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Total: {state.history.totalCount} movimentação
            {state.history.totalCount !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </motion.div>
  );
}
