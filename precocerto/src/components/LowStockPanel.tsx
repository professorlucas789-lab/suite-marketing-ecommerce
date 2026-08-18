/**
 * LowStockPanel Component
 * Painel de produtos com stock baixo
 * NOVO (Fase 13): Gestão automática de stock
 */

import React from "react";
import { Product } from "../types";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  ShoppingCart,
  TrendingDown,
  CheckCircle,
  Package,
} from "lucide-react";

interface LowStockPanelProps {
  lowStockItems: Array<{
    product: Product;
    quantidadeDisponivel: number;
    minQuantidade: number;
    isLow: boolean;
    isCritical: boolean;
    daysUntilEmpty: number;
    percentageRemaining: number;
  }>;
  onNavigateToProduct?: (productId: string) => void;
}

export default function LowStockPanel({
  lowStockItems,
  onNavigateToProduct,
}: LowStockPanelProps) {
  if (lowStockItems.length === 0) {
    return (
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg text-center">
        <div className="flex justify-center mb-2">
          <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={28} />
        </div>
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          ✅ Stock OK
        </p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
          Todos os produtos têm stock adequado
        </p>
      </div>
    );
  }

  const criticalItems = lowStockItems.filter((item) => item.isCritical);
  const warningItems = lowStockItems.filter((item) => !item.isCritical);

  return (
    <div className="space-y-3">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg text-center">
          <div className="text-lg font-bold text-red-600 dark:text-red-400">
            {criticalItems.length}
          </div>
          <div className="text-xs text-red-700 dark:text-red-300 font-semibold">
            Crítico
          </div>
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg text-center">
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {warningItems.length}
          </div>
          <div className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
            Aviso
          </div>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg text-center">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {lowStockItems.length}
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-300 font-semibold">
            Total
          </div>
        </div>
      </div>

      {/* Critical Items */}
      {criticalItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          <h4 className="text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertTriangle size={14} />
            CRÍTICO - Reabastecer Imediatamente
          </h4>
          <AnimatePresence>
            {criticalItems.map((item) => (
              <motion.button
                key={item.product.id}
                type="button"
                onClick={() =>
                  onNavigateToProduct?.(item.product.id!)
                }
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="w-full p-3 bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900 rounded-lg text-left hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-800 dark:text-red-200">
                      {item.product.nome}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      <span className="font-mono font-bold">
                        {item.quantidadeDisponivel}
                      </span>{" "}
                      un (mín: {item.minQuantidade})
                    </p>
                  </div>
                  <div className="h-12 w-12 flex items-center justify-center bg-red-200 dark:bg-red-900/40 rounded-lg">
                    <ShoppingCart
                      size={20}
                      className="text-red-600 dark:text-red-400"
                    />
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Warning Items */}
      {warningItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <TrendingDown size={14} />
            AVISO - Considerar Reabastecimento
          </h4>
          <AnimatePresence>
            {warningItems.map((item) => (
              <motion.button
                key={item.product.id}
                type="button"
                onClick={() =>
                  onNavigateToProduct?.(item.product.id!)
                }
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="w-full p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg text-left hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      {item.product.nome}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-amber-200 dark:bg-amber-900/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 dark:bg-amber-400 transition-all"
                          style={{
                            width: `${item.percentageRemaining}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono text-amber-700 dark:text-amber-300">
                        {item.quantidadeDisponivel}
                      </span>
                    </div>
                  </div>
                  <div className="h-10 w-10 flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Package
                      size={18}
                      className="text-amber-600 dark:text-amber-400"
                    />
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
