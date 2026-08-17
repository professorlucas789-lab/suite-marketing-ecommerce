/**
 * StockTab Component
 * Tab integrada para gestão de estoque
 * Fase 5: Gestão de Estoque
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, TrendingDown, History } from 'lucide-react';
import { Product } from '../types';
import StockMovementRecorder from './StockMovementRecorder';
import StockAnalyticsPanel from './StockAnalyticsPanel';
import StockMovementHistory from './StockMovementHistory';
import { useStore } from '../contexts/StoreContext';

interface StockTabProps {
  products: Product[];
  onNotification?: (message: string, type: 'success' | 'error') => void;
}

type StockView = 'analytics' | 'recorder' | 'history';

export const StockTab: React.FC<StockTabProps> = ({ products, onNotification }) => {
  const { currentStore } = useStore();
  const [activeView, setActiveView] = useState<StockView>('analytics');

  const views: Array<{ id: StockView; label: string; icon: React.ReactNode }> = [
    { id: 'analytics', label: '📊 Análise', icon: <TrendingDown className="w-4 h-4" /> },
    { id: 'recorder', label: '➕ Registar', icon: <Package className="w-4 h-4" /> },
    { id: 'history', label: '📋 Histórico', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-900 dark:to-blue-800 rounded-lg p-6 text-white"
      >
        <h1 className="text-2xl font-bold mb-2">📦 Gestão de Estoque</h1>
        <p className="text-blue-100">
          Controle total de movimentações e análise em tempo real
        </p>
        {currentStore && (
          <p className="text-sm text-blue-200 mt-2">Loja: {currentStore.storeName}</p>
        )}
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-2"
      >
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              activeView === view.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {view.icon}
            {view.label}
          </button>
        ))}
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeView === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <StockAnalyticsPanel products={products} />
          </motion.div>
        )}

        {activeView === 'recorder' && (
          <motion.div
            key="recorder"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <StockMovementRecorder
              products={products}
              onSuccess={(msg) => onNotification?.(msg, 'success')}
              onError={(msg) => onNotification?.(msg, 'error')}
            />
          </motion.div>
        )}

        {activeView === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <StockMovementHistory products={products} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
      >
        <p className="text-sm text-blue-900 dark:text-blue-300">
          <strong>💡 Dica:</strong> Use a aba "Registar" para adicionar entradas e saídas de estoque.
          O histórico será atualizado automaticamente e você verá as análises em tempo real.
        </p>
      </motion.div>
    </div>
  );
};

export default StockTab;
