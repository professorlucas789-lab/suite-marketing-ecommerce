/**
 * StockManagementPanel Component
 * Componente wrapper que integra todo o sistema de gestão de estoque (Phase 2)
 * Combina: Registar movimentações, Histórico, e Análise de tendências
 */

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Package,
  TrendingUp,
  Clock,
} from 'lucide-react';
import type { Product } from '../types';
import { StockMovementRecorder } from './StockMovementRecorder';
import { StockMovementHistory } from './StockMovementHistory';
import { StockAnalyticsPanel } from './StockAnalyticsPanel';

type TabType = 'analytics' | 'recorder' | 'history';

interface StockManagementPanelProps {
  products?: Product[];
}

export default function StockManagementPanel({ products }: StockManagementPanelProps) {
  // Garantir que products é sempre um array válido
  const validProducts = Array.isArray(products) ? products : [];

  const [activeTab, setActiveTab] = useState<TabType>('analytics');
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);

  // Atualizar produto selecionado quando produtos mudam
  useEffect(() => {
    if (validProducts && validProducts.length > 0 && !selectedProductId) {
      setSelectedProductId(validProducts[0].id);
    }
  }, [validProducts, selectedProductId]);

  // Procurar o produto selecionado com segurança
  const selectedProduct = useMemo(
    () => validProducts?.find((p) => p?.id === selectedProductId),
    [validProducts, selectedProductId]
  );

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    {
      id: 'analytics',
      label: 'Análise',
      icon: <TrendingUp size={18} />,
    },
    {
      id: 'recorder',
      label: 'Registar Movimentação',
      icon: <Package size={18} />,
    },
    {
      id: 'history',
      label: 'Histórico',
      icon: <Clock size={18} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 mb-2">
          <Package className="text-emerald-600" size={32} />
          Gestão de Estoque
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Rastreie movimentações, monitore stock baixo e obtenha recomendações de reabastecimento
        </p>
      </motion.div>

      {/* Seletor de Produto */}
      {validProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
        >
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Selecione um Produto
          </label>
          <select
            value={selectedProductId || ''}
            onChange={(e) => setSelectedProductId(e.target.value || undefined)}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">-- Selecione um produto --</option>
            {validProducts.map((product) => (
              <option key={product.id} value={product.id || ''}>
                {product.nome} (Stock: {product.quantidadeDisponível || 0})
              </option>
            ))}
          </select>
        </motion.div>
      )}

      {validProducts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900 p-4 text-center"
        >
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Nenhum produto disponível. Crie produtos antes de gerir estoque.
          </p>
        </motion.div>
      )}

      {/* Tabs Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
      >
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2
                ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab Content */}
      <div>
        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <motion.div
            key="analytics-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <StockAnalyticsPanel product={selectedProduct} />
          </motion.div>
        )}

        {/* Recorder Tab */}
        {activeTab === 'recorder' && (
          <motion.div
            key="recorder-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <StockMovementRecorder
              product={selectedProduct}
              onSuccess={() => {
                // Mudar para aba de histórico após registar movimento
                setActiveTab('history');
              }}
            />
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div
            key="history-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <StockMovementHistory productId={selectedProductId} limit={50} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
