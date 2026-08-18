/**
 * AlertsView Component
 * Visualização completa de alertas de validade
 * NOVO (Fase 13): Notificações inteligentes
 */

import React from "react";
import { useExpiryAlerts } from "../hooks/useExpiryAlerts";
import { useStore } from "../contexts/StoreContext";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "motion/react";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import ExpiryMonitoringDashboard from "./ExpiryMonitoringDashboard";

interface AlertsViewProps {
  onBack: () => void;
}

export default function AlertsView({ onBack }: AlertsViewProps) {
  const { currentStore } = useStore();
  const { user } = useAuth();
  const { alerts, loading, totalAlerts, resolveAlert } = useExpiryAlerts({
    storeId: currentStore?.storeId || "",
  });

  if (!currentStore) {
    return (
      <div className="p-6 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Selecione uma loja para ver alertas
        </p>
      </div>
    );
  }

  const handleResolve = async (alertId: string, motivo: string) => {
    if (!user) throw new Error("Utilizador não autenticado");
    await resolveAlert(alertId, motivo, user.uid);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <button
          type="button"
          onClick={onBack}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              📌 Alertas de Validade
            </h1>
            {totalAlerts > 0 && (
              <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-bold">
                {totalAlerts} alerta{totalAlerts !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Loja: {currentStore.nome}
          </p>
        </div>
      </motion.div>

      {/* Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs"
      >
        <ExpiryMonitoringDashboard
          alerts={alerts}
          onResolve={handleResolve}
          loading={loading}
        />
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg text-sm text-blue-700 dark:text-blue-300"
      >
        <div className="flex gap-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div className="space-y-1">
            <p className="font-semibold">
              💡 Tip: Produtos com data de validade são automaticamente monitorados
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Os alertas aparecem 60 dias antes do vencimento. Marque como "resolvido" quando o produto for vendido ou descartado.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
