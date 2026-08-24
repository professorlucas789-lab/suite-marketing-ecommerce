/**
 * StockManagementPanel Component
 * Componente wrapper que integra todo o sistema de gestão de estoque (Phase 2)
 * Combina: Registar movimentações, Histórico, e Análise de tendências
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Package,
  TrendingUp,
  Clock,
} from 'lucide-react';
import StockMovementRecorder from './StockMovementRecorder';
import StockMovementHistory from './StockMovementHistory';
import StockAnalyticsPanel from './StockAnalyticsPanel';

type TabType = 'analytics' | 'recorder' | 'history';

export default function StockManagementPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('analytics');
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();

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
            <StockAnalyticsPanel productId={selectedProductId} />
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
              productId={selectedProductId}
              onSuccess={() => {
                // Switch to history tab after successful recording
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
