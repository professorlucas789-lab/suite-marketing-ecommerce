/**
 * ExpiryAlertPanel Component
 * Painel de alertas de validade de produtos
 * NOVO (Fase 13): Notificações inteligentes
 */

import React, { useState } from "react";
import { ExpiryAlert } from "../types/alerts";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  X,
  Calendar,
  Package,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface ExpiryAlertPanelProps {
  alerts: ExpiryAlert[];
  onResolve: (alertId: string, motivo: string) => Promise<void>;
  loading?: boolean;
}

export default function ExpiryAlertPanel({
  alerts,
  onResolve,
  loading = false,
}: ExpiryAlertPanelProps) {
  const { user } = useAuth();
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [resolveMotivo, setResolveMotivo] = useState("");
  const [resolving, setResolving] = useState<string | null>(null);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900";
      case "WARNING":
        return "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900";
      case "INFO":
        return "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900";
      default:
        return "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />;
      case "WARNING":
        return <AlertCircle className="text-amber-600 dark:text-amber-400" size={20} />;
      case "INFO":
        return <Clock className="text-blue-600 dark:text-blue-400" size={20} />;
      default:
        return <Clock size={20} />;
    }
  };

  const handleResolve = async (alertId: string) => {
    if (!resolveMotivo.trim()) {
      alert("Por favor, indique o motivo da resolução");
      return;
    }

    try {
      setResolving(alertId);
      await onResolve(alertId, resolveMotivo);
      setSelectedAlert(null);
      setResolveMotivo("");
    } catch (error) {
      console.error("Erro ao resolver alerta:", error);
      alert("Erro ao resolver alerta");
    } finally {
      setResolving(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg text-center">
        <div className="flex justify-center mb-3">
          <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={32} />
        </div>
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          Nenhum alerta de validade
        </p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
          Todos os produtos estão dentro do prazo
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-lg border-2 ${getSeverityColor(
              alert.severity
            )} cursor-pointer transition-colors hover:shadow-md`}
            onClick={() =>
              alert.severity === "CRITICAL" &&
              setSelectedAlert(alert.id)
            }
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {getSeverityIcon(alert.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                      {alert.productName}
                    </h4>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      alert.severity === "CRITICAL"
                        ? "bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-100"
                        : alert.severity === "WARNING"
                        ? "bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-100"
                        : "bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-100"
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      {alert.dataValidade}
                    </div>
                    <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                      <Clock size={14} />
                      {alert.daysUntilExpiry} dias
                    </div>
                  </div>
                </div>
              </div>
              {alert.severity === "CRITICAL" && (
                <button
                  type="button"
                  className="ml-2 p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Resolver alerta"
                >
                  <X size={16} className="text-red-600 dark:text-red-400" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Modal de resolução */}
      {selectedAlert && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAlert(null)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4"
          >
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
              <AlertTriangle className="text-red-600" size={24} />
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                Resolver Alerta
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Motivo da Resolução
                </label>
                <select
                  value={resolveMotivo}
                  onChange={(e) => setResolveMotivo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Selecione um motivo...</option>
                  <option value="Produto descartado">Produto descartado</option>
                  <option value="Produto vendido">Produto vendido</option>
                  <option value="Devolvido ao fornecedor">
                    Devolvido ao fornecedor
                  </option>
                  <option value="Data atualizada">Data atualizada</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleResolve(selectedAlert)}
                disabled={resolving === selectedAlert || !resolveMotivo.trim()}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {resolving === selectedAlert ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Resolvendo...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Resolver
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
