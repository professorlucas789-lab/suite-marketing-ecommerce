/**
 * HealthCheckPanel Component
 * Painel rápido de saúde da loja (alertas + stock)
 * NOVO (Fase 13): Monitorização rápida - VERSÃO FUNCIONAL
 */

import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ChevronDown,
  Activity,
  ShoppingCart,
} from "lucide-react";
import { Product } from "../types";

interface HealthCheckPanelProps {
  expiryAlerts: any[];
  products: Product[];
  onResolveAlert?: (alertId: string, motivo: string) => Promise<void>;
  onNavigateToProduct?: (productId: string) => void;
}

export default function HealthCheckPanel({
  expiryAlerts = [],
  products = [],
  onResolveAlert,
  onNavigateToProduct,
}: HealthCheckPanelProps) {
  const [expandedSection, setExpandedSection] = useState<"expiry" | "stock" | null>(
    expiryAlerts.length > 0 ? "expiry" : "stock"
  );

  // Calcular produtos com stock baixo
  const lowStockItems = useMemo(() => {
    return products
      .filter((p) => p.quantidadeDisponível !== undefined && p.quantidadeDisponível <= 5)
      .map((product) => ({
        product,
        quantidadeDisponivel: product.quantidadeDisponível || 0,
        minQuantidade: 5,
        isLow: true,
        isCritical: (product.quantidadeDisponível || 0) <= 2,
        percentageRemaining: Math.min(
          ((product.quantidadeDisponível || 0) / 10) * 100,
          100
        ),
      }))
      .sort((a, b) => {
        if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1;
        return a.quantidadeDisponivel - b.quantidadeDisponivel;
      });
  }, [products]);

  const totalIssues = (expiryAlerts?.length || 0) + lowStockItems.length;

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
            {expiryAlerts?.length || 0} expirando · {lowStockItems.length} stock baixo
          </p>
        </div>
      </div>

      {/* Expiry Section */}
      {(expiryAlerts?.length || 0) > 0 && (
        <motion.div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <button
            onClick={() =>
              setExpandedSection(expandedSection === "expiry" ? null : "expiry")
            }
            className="w-full p-3 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
              <span className="text-sm font-semibold text-red-900 dark:text-red-100">
                Validade ({expiryAlerts?.length || 0})
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
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {expiryAlerts?.map((alert: any) => (
                  <div
                    key={alert.id}
                    className="p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-red-900 dark:text-red-100">
                          {alert.productName}
                        </p>
                        <p className="text-red-700 dark:text-red-300 mt-0.5">
                          Vence em {alert.daysUntilExpiry || 0} dias
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-red-600 text-white'
                          : 'bg-orange-600 text-white'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {lowStockItems.map((item) => (
                  <div
                    key={item.product.id}
                    onClick={() => onNavigateToProduct?.(item.product.id)}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      item.isCritical
                        ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-950/30"
                        : "bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 hover:bg-orange-100 dark:hover:bg-orange-950/30"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <p className={`font-bold text-xs ${
                          item.isCritical
                            ? "text-red-900 dark:text-red-100"
                            : "text-orange-900 dark:text-orange-100"
                        }`}>
                          {item.product.nome}
                        </p>
                        <p className={`text-[10px] mt-0.5 ${
                          item.isCritical
                            ? "text-red-700 dark:text-red-300"
                            : "text-orange-700 dark:text-orange-300"
                        }`}>
                          {item.quantidadeDisponivel} / {item.minQuantidade}
                        </p>
                      </div>
                      <span className={`font-bold text-xs ${
                        item.isCritical
                          ? "text-red-600 dark:text-red-400"
                          : "text-orange-600 dark:text-orange-400"
                      }`}>
                        {item.quantidadeDisponivel}
                      </span>
                    </div>
                    <div className={`w-full h-1 rounded-full ${
                      item.isCritical
                        ? "bg-red-200 dark:bg-red-950"
                        : "bg-orange-200 dark:bg-orange-950"
                    }`}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentageRemaining}%` }}
                        transition={{ delay: 0.1 }}
                        className={item.isCritical ? "h-full bg-red-600" : "h-full bg-orange-500"}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
