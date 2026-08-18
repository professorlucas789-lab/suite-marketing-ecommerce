/**
 * HealthCheckPanel Component
 * Painel rápido de saúde da loja (alertas + stock)
 * NOVO (Fase 13): Monitorização rápida
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ChevronDown,
  Activity,
  ShoppingCart,
  Calendar,
} from "lucide-react";
import LowStockPanel from "./LowStockPanel";
import ExpiryAlertPanel from "./ExpiryAlertPanel";
import { ExpiryAlert } from "../types/alerts";
import { Product } from "../types";

interface HealthCheckPanelProps {
  expiryAlerts: ExpiryAlert[];
  products: Product[];
  onResolveAlert?: (alertId: string, motivo: string) => Promise<void>;
  onNavigateToProduct?: (productId: string) => void;
}

export default function HealthCheckPanel({
  expiryAlerts,
  products,
  onResolveAlert,
  onNavigateToProduct,
}: HealthCheckPanelProps) {
  const [expandedSection, setExpandedSection] = useState<
    "expiry" | "stock" | null
  >(expiryAlerts.length > 0 ? "expiry" : "stock");

  const lowStockItems = products
    .map((product) => {
      const quantidadeDisponivel = product.quantidadeDisponivel || 0;
      const minQuantidade = 5; // Default minimum

      return {
        product,
        quantidadeDisponivel,
        minQuantidade,
        isLow: quantidadeDisponivel <= minQuantidade,
        isCritical: quantidadeDisponivel <= 2,
        percentageRemaining: Math.min(
          (quantidadeDisponivel / (minQuantidade * 2)) * 100,
          100
        ),
        daysUntilEmpty: quantidadeDisponivel > 0
          ? Math.ceil(30 / (quantidadeDisponivel + 1))
          : 0,
      };
    })
    .filter((item) => item.isLow);

  const totalIssues = expiryAlerts.length + lowStockItems.length;

  if (totalIssues === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg text-center"
      >
        <div className="flex justify-center mb-2">
          <Activity className="text-emerald-600 dark:text-emerald-400" size={24} />
        </div>
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          ✅ Loja em Bom Estado
        </p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
          Sem alertas de validade ou stock baixo
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Summary Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-600 dark:text-red-400" size={18} />
            <span className="text-sm font-bold text-red-700 dark:text-red-300">
              {totalIssues} problema{totalIssues !== 1 ? "s" : ""} detectado{
                totalIssues !== 1 ? "s" : ""
              }
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
            {expiryAlerts.length > 0 && (
              <span className="flex items-center gap-1">
                <Calendar size={14} /> {expiryAlerts.length}
              </span>
            )}
            {lowStockItems.length > 0 && (
              <span className="flex items-center gap-1">
                <ShoppingCart size={14} /> {lowStockItems.length}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Sections */}
      <div className="space-y-2">
        {/* Expiry Section */}
        {expiryAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
          >
            <button
              type="button"
              onClick={() =>
                setExpandedSection(
                  expandedSection === "expiry" ? null : "expiry"
                )
              }
              className="w-full p-3 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-300 text-sm">
                <Calendar size={16} />
                Validade ({expiryAlerts.length})
              </span>
              <ChevronDown
                size={18}
                className={`transition-transform ${
                  expandedSection === "expiry" ? "rotate-180" : ""
                }`}
              />
            </button>
            {expandedSection === "expiry" && (
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                <ExpiryAlertPanel
                  alerts={expiryAlerts}
                  onResolve={onResolveAlert || (async () => {})}
                />
              </div>
            )}
          </motion.div>
        )}

        {/* Stock Section */}
        {lowStockItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
          >
            <button
              type="button"
              onClick={() =>
                setExpandedSection(expandedSection === "stock" ? null : "stock")
              }
              className="w-full p-3 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30 flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-300 text-sm">
                <ShoppingCart size={16} />
                Stock Baixo ({lowStockItems.length})
              </span>
              <ChevronDown
                size={18}
                className={`transition-transform ${
                  expandedSection === "stock" ? "rotate-180" : ""
                }`}
              />
            </button>
            {expandedSection === "stock" && (
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                <LowStockPanel
                  lowStockItems={lowStockItems}
                  onNavigateToProduct={onNavigateToProduct}
                />
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
