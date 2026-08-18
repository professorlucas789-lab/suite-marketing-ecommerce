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
    <div className="space-y-3">
      {/* Summary Bar */}
      <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
        <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            {totalIssues} questão{totalIssues !== 1 ? "s" : ""} ativa{totalIssues !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {expiryAlerts.length} expirando · {lowStockItems.length} stock baixo
          </p>
        </div>
      </div>

      {/* Expiry Section */}
      {expiryAlerts.length > 0 && (
        <motion.div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <button
            onClick={() =>
              setExpandedSection(expandedSection === "expiry" ? null : "expiry")
            }
            className="w-full p-3 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-red-600 dark:text-red-400" />
              <span className="text-sm font-semibold text-red-900 dark:text-red-100">
                Validade ({expiryAlerts.length})
              </span>
            </div>
            <ChevronDown
              size={16}
              className={`text-red-600 dark:text-red-400 transition-transform ${
                expandedSection === "expiry" ? "rotate-180" : ""
              }`}
            />
          </button>

          {expandedSection === "expiry" && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-700">
              <ExpiryAlertPanel
                alerts={expiryAlerts}
                onResolve={onResolveAlert}
                loading={false}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Stock Section */}
      {lowStockItems.length > 0 && (
        <motion.div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <button
            onClick={() =>
              setExpandedSection(expandedSection === "stock" ? null : "stock")
            }
            className="w-full p-3 bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                Stock Baixo ({lowStockItems.length})
              </span>
            </div>
            <ChevronDown
              size={16}
              className={`text-orange-600 dark:text-orange-400 transition-transform ${
                expandedSection === "stock" ? "rotate-180" : ""
              }`}
            />
          </button>

          {expandedSection === "stock" && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-700">
              <LowStockPanel
                lowStockItems={lowStockItems}
                onNavigateToProduct={onNavigateToProduct}
              />
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
