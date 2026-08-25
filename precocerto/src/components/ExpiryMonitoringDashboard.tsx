/**
 * ExpiryMonitoringDashboard Component
 * Dashboard com KPIs e analytics de produtos vencendo
 * NOVO (Fase 13): Notificações inteligentes
 */

import React from "react";
import { ExpiryAlert } from "../types/alerts";
import { motion } from "motion/react";
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  TrendingDown,
  Calendar,
} from "lucide-react";
import ExpiryAlertPanel from "./ExpiryAlertPanel";

interface ExpiryMonitoringDashboardProps {
  alerts: ExpiryAlert[];
  onResolve: (alertId: string, motivo: string) => Promise<void>;
  loading?: boolean;
}

export default function ExpiryMonitoringDashboard({
  alerts,
  onResolve,
  loading = false,
}: ExpiryMonitoringDashboardProps) {
  const criticalAlerts = alerts.filter((a) => a.severity === "CRITICAL");
  const warningAlerts = alerts.filter((a) => a.severity === "WARNING");
  const infoAlerts = alerts.filter((a) => a.severity === "INFO");

  // Calcular produto que vence mais em breve
  const soonestExpiry =
    alerts.length > 0
      ? alerts.reduce((prev, current) =>
          current.daysUntilExpiry < prev.daysUntilExpiry ? current : prev
        )
      : null;

  // Agrupar por período
  const expireToday = alerts.filter((a) => a.daysUntilExpiry <= 0).length;
  const expireThisWeek = alerts.filter(
    (a) => a.daysUntilExpiry > 0 && a.daysUntilExpiry <= 7
  ).length;
  const expireThisMonth = alerts.filter(
    (a) => a.daysUntilExpiry > 7 && a.daysUntilExpiry <= 30
  ).length;

  const KPICard = ({
    icon: Icon,
    label,
    value,
    color,
    trend,
  }: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    color: string;
    trend?: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border-2 ${color}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {value}
          </p>
          {trend && (
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              {trend}
            </p>
          )}
        </div>
        <div className="p-2 rounded-lg bg-opacity-20">{Icon}</div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<AlertTriangle className="text-red-600 dark:text-red-400" size={20} />}
          label="Críticos (0-7 dias)"
          value={criticalAlerts.length}
          color="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
          trend={criticalAlerts.length > 0 ? "⚠️ Ação urgente!" : "✅ Nenhum"}
        />

        <KPICard
          icon={<AlertCircle className="text-amber-600 dark:text-amber-400" size={20} />}
          label="Avisos (8-30 dias)"
          value={warningAlerts.length}
          color="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
          trend={warningAlerts.length > 0 ? "Monitorar" : "OK"}
        />

        <KPICard
          icon={<Clock className="text-blue-600 dark:text-blue-400" size={20} />}
          label="Info (31-60 dias)"
          value={infoAlerts.length}
          color="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
          trend="Planear"
        />

        <KPICard
          icon={<TrendingDown className="text-slate-600 dark:text-slate-400" size={20} />}
          label="Total em Risco"
          value={alerts.length}
          color="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
          trend={`${alerts.length} produtos`}
        />
      </div>

      {/* Timeline por período */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-white dark:bg-slate-900 rounded-lg border-2 border-slate-200 dark:border-slate-700 space-y-3"
        >
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar size={16} />
            Distribuição Temporal
          </h3>
          <div className="space-y-2">
            {expireToday > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-600 dark:text-red-400 font-semibold">
                  Hoje (0 dias)
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 bg-red-200 dark:bg-red-900 rounded-full">
                    <div
                      className="h-full bg-red-600 dark:bg-red-500 rounded-full"
                      style={{ width: `${(expireToday / alerts.length) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono font-bold">{expireToday}</span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                Esta semana (1-7 dias)
              </span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 bg-amber-200 dark:bg-amber-900 rounded-full">
                  <div
                    className="h-full bg-amber-600 dark:bg-amber-500 rounded-full"
                    style={{ width: `${(expireThisWeek / Math.max(alerts.length, 1)) * 100}%` }}
                  />
                </div>
                <span className="font-mono font-bold">{expireThisWeek}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                Este mês (8-30 dias)
              </span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 bg-blue-200 dark:bg-blue-900 rounded-full">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                    style={{ width: `${(expireThisMonth / Math.max(alerts.length, 1)) * 100}%` }}
                  />
                </div>
                <span className="font-mono font-bold">{expireThisMonth}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Alerta mais urgente */}
      {soonestExpiry && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900 rounded-lg"
        >
          <h3 className="font-bold text-sm text-red-800 dark:text-red-300 flex items-center gap-2 mb-2">
            <AlertTriangle size={16} />
            Próximo a Vencer
          </h3>
          <p className="text-sm text-red-700 dark:text-red-400">
            <span className="font-bold">{soonestExpiry.productName}</span> vence em{" "}
            <span className="font-bold">{soonestExpiry.daysUntilExpiry}</span> dias (
            {soonestExpiry.dataValidade})
          </p>
        </motion.div>
      )}

      {/* Alert Panel */}
      <div>
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-3">
          Alertas Detalhados
        </h3>
        <ExpiryAlertPanel
          alerts={alerts}
          onResolve={onResolve}
          loading={loading}
        />
      </div>
    </div>
  );
}
