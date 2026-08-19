/**
 * SalesTab Component
 * Tab integrada para gestão de vendas
 * Fase 6: Módulo de Vendas
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DollarSign, Plus, History } from 'lucide-react';
import { Product } from '../types';
import SalesAnalyticsDashboard from './SalesAnalyticsDashboard';
import QuickSalesRecorder from './QuickSalesRecorder';
import SalesHistory from './SalesHistory';
import { useStore } from '../contexts/StoreContext';

interface SalesTabProps {
  products: Product[];
  onNotification?: (message: string, type: 'success' | 'error') => void;
}

type SalesView = 'analytics' | 'recorder' | 'history';

export const SalesTab: React.FC<SalesTabProps> = ({ products, onNotification }) => {
  const { currentStore } = useStore();
  const [activeView, setActiveView] = useState<SalesView>('recorder');

  const views: Array<{ id: SalesView; label: string; icon: React.ReactNode }> = [
    { id: 'recorder', label: 'POS / Nova Venda', icon: <Plus className="w-4 h-4" /> },
    { id: 'analytics', label: 'Análise', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'history', label: 'Histórico', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-900 dark:to-green-800 rounded-lg p-6 text-white"
      >
        <h1 className="text-2xl font-bold mb-2">Módulo de Vendas</h1>
        <p className="text-green-100">
          POS interno para venda, recibo, baixa de estoque e análise comercial
        </p>
        {currentStore && (
          <p className="text-sm text-green-200 mt-2">Loja: {currentStore.storeName}</p>
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
                ? 'bg-green-600 text-white'
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
            <SalesAnalyticsDashboard products={products} />
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
            <QuickSalesRecorder
              products={products}
              onSuccess={(receipt) =>
                onNotification?.(
                  `Venda finalizada: ${receipt.receiptNumber} (${(receipt.subtotal || 0).toFixed(2)} Kz)`,
                  'success'
                )
              }
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
            <SalesHistory />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
      >
        <p className="text-sm text-green-900 dark:text-green-300">
          <strong>Nota fiscal:</strong> os documentos emitidos aqui são internos para controlo comercial e estoque.
          Para documento fiscal oficial, valide a emissão no sistema/portal autorizado da AGT.
        </p>
      </motion.div>
    </div>
  );
};

export default SalesTab;
