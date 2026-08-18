/**
 * LowStockPanel Component
 * Painel de produtos com stock baixo
 * NOVO (Fase 13): Gestão de estoque
 */

import React from "react";
import { motion } from "motion/react";
import {
  TrendingDown,
  AlertCircle,
  Package,
} from "lucide-react";
import { Product } from "../types";

interface LowStockItem {
  product: Product;
  quantidadeDisponivel: number;
  minQuantidade: number;
  isLow: boolean;
  isCritical: boolean;
  percentageRemaining: number;
  daysUntilEmpty: number;
}

interface LowStockPanelProps {
  lowStockItems: LowStockItem[];
  onNavigateToProduct?: (productId: string) => void;
}

export default function LowStockPanel({
  lowStockItems,
  onNavigateToProduct,
}: LowStockPanelProps) {
  if (lowStockItems.length === 0) {
    return (
      <div className="text-center py-6">
        <Package className="mx-auto text-emerald-600 dark:text-emerald-400 mb-2" size={24} />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Sem produtos com stock baixo
        </p>
      </div>
    );
  }

  const criticalItems = lowStockItems.filter((item) => item.isCritical);
  const warningItems = lowStockItems.filter((item) => !item.isCritical);

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
          <p className="font-bold text-red-600 dark:text-red-400">
            {criticalItems.length}
          </p>
          <p className="text-[10px] text-red-700 dark:text-red-300">Crítico</p>
        </div>
        <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
          <p className="font-bold text-orange-600 dark:text-orange-400">
            {warningItems.length}
          </p>
          <p className="text-[10px] text-orange-700 dark:text-orange-300">Aviso</p>
        </div>
        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <p className="font-bold text-slate-600 dark:text-slate-300">
            {lowStockItems.reduce((sum, item) => sum + item.quantidadeDisponivel, 0)}
          </p>
          <p className="text-[10px] text-slate-600 dark:text-slate-400">Total</p>
        </div>
      </div>

      {/* Critical Items */}
      {criticalItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-red-700 dark:text-red-300 px-2">
            ⚠️ CRÍTICO - Ação Imediata Necessária
          </p>
          <div className="space-y-2">
            {criticalItems.map((item) => (
              <motion.div
                key={item.product.id}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => onNavigateToProduct?.(item.product.id)}
                className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-red-900 dark:text-red-100 truncate">
                      {item.product.nome}
                    </p>
                    <p className="text-[10px] text-red-700 dark:text-red-300 mt-0.5">
                      Disponível: {item.quantidadeDisponivel} / Mínimo: {item.minQuantidade}
                    </p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-xs font-black text-red-600 dark:text-red-400">
                      {item.quantidadeDisponivel}
                    </p>
                    <p className="text-[10px] text-red-600 dark:text-red-400">
                      {item.daysUntilEmpty}d
                    </p>
                  </div>
                </div>
                <div className="w-full bg-red-200 dark:bg-red-950 h-1.5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentageRemaining}%` }}
                    transition={{ delay: 0.1 }}
                    className="h-full bg-red-600"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Warning Items */}
      {warningItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-orange-700 dark:text-orange-300 px-2">
            📊 AVISO - Reabastecimento Sugerido
          </p>
          <div className="space-y-2">
            {warningItems.map((item) => (
              <motion.div
                key={item.product.id}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => onNavigateToProduct?.(item.product.id)}
                className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-950/30 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-orange-900 dark:text-orange-100 truncate">
                      {item.product.nome}
                    </p>
                    <p className="text-[10px] text-orange-700 dark:text-orange-300 mt-0.5">
                      Disponível: {item.quantidadeDisponivel} / Mínimo: {item.minQuantidade}
                    </p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-xs font-bold text-orange-600 dark:text-orange-400">
                      {item.quantidadeDisponivel}
                    </p>
                    <p className="text-[10px] text-orange-600 dark:text-orange-400">
                      {item.daysUntilEmpty}d
                    </p>
                  </div>
                </div>
                <div className="w-full bg-orange-200 dark:bg-orange-950 h-1.5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentageRemaining}%` }}
                    transition={{ delay: 0.1 }}
                    className="h-full bg-orange-500"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
