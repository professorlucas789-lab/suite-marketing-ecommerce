/**
 * AlertsView Component
 * Painel completo de monitorização de alertas
 * NOVO (Fase 13): Sistema de alertas inteligente - VERSÃO FUNCIONAL
 */

import React from "react";
import { motion } from "motion/react";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Package,
} from "lucide-react";
import HealthCheckPanel from "./HealthCheckPanel";
import { useStore } from "../contexts/StoreContext";
import { useCriticalExpiryAlerts } from "../hooks/useExpiryAlerts";
import { useLowStockAlerts } from "../hooks/useLowStockAlerts";

export default function AlertsView() {
  const { products, currentStore } = useStore();
  const storeId = currentStore?.storeId || "default";
  const { criticalAlerts, warningAlerts } = useCriticalExpiryAlerts(storeId);
  const { lowStockProducts } = useLowStockAlerts({ products, defaultMinQuantity: 5 });

  const expiryAlerts = [...criticalAlerts, ...warningAlerts];
  const totalIssues = expiryAlerts.length + lowStockProducts.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-900 dark:to-orange-900 rounded-xl p-6 text-white shadow-lg"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bell size={24} className="stroke-[2]" />
              <h1 className="text-2xl font-bold">Central de Alertas</h1>
            </div>
            <p className="text-amber-100 text-sm">
              Monitorização em tempo real de produtos expirando e stock baixo
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-amber-50">
              {totalIssues}
            </div>
            <p className="text-xs text-amber-200 mt-1">
              {totalIssues === 0 ? "sem problemas" : "questões ativas"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Critical Alert Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-lg border border-red-200 dark:border-red-900/30 p-4 shadow-xs"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-950/30 rounded-lg">
              <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />
            </div>
            <span className="text-2xl font-black text-red-600 dark:text-red-400">
              {criticalAlerts.length}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Críticos
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-1">
            Ação imediata necessária
          </p>
        </motion.div>

        {/* Warning Alert Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-900/30 p-4 shadow-xs"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/30 rounded-lg">
              <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {warningAlerts.length}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Avisos
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-1">
            Requer atenção em breve
          </p>
        </motion.div>

        {/* Stock Alert Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-lg border border-orange-200 dark:border-orange-900/30 p-4 shadow-xs"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-950/30 rounded-lg">
              <Package size={18} className="text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-2xl font-black text-orange-600 dark:text-orange-400">
              {lowStockProducts.length}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Stock Baixo
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-1">
            Requere reabastecimento
          </p>
        </motion.div>
      </div>

      {/* Main Content */}
      {totalIssues === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg p-8 text-center"
        >
          <div className="flex justify-center mb-4">
            <CheckCircle2 size={48} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mb-2">
            Tudo em Bom Estado! ✅
          </h2>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-4">
            Nenhum produto expirando ou com stock baixo. Continua assim!
          </p>
        </motion.div>
      ) : (
        <>
          {/* Health Check Panel */}
          <div>
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} />
              Resumo Consolidado
            </h2>
            <HealthCheckPanel
              expiryAlerts={expiryAlerts}
              products={products}
              onNavigateToProduct={(productId) => {
                console.log("Navigate to product:", productId);
              }}
            />
          </div>
        </>
      )}

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2"
      >
        <p className="text-xs font-bold text-blue-900 dark:text-blue-100">
          💡 Dicas Importantes:
        </p>
        <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Alertas críticos (vermelhos) requerem ação imediata</li>
          <li>Avisos (amarelos) devem ser abordados em breve</li>
          <li>Stock baixo (laranja) indica necessidade de reabastecimento</li>
          <li>Verifique regularmente para evitar perdas de produtos</li>
        </ul>
      </motion.div>
    </div>
  );
}
