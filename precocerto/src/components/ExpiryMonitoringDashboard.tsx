/**
 * Componente: ExpiryMonitoringDashboard
 * Dashboard de monitoramento de validade
 * FASE 1: Notificações Inteligentes
 *
 * Mostra:
 * - KPI cards (Críticos, Avisos, Info)
 * - Gráfico de alertas por severidade
 * - Tabela de produtos com próximos vencimentos
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, Eye, TrendingDown, Calendar } from 'lucide-react';
import { ExpiryAlert, AlertSeverity } from '../types/notifications';
import { useExpiryAlerts } from '../hooks/useExpiryAlerts';

interface ProductExpiryRow {
  id: string;
  name: string;
  daysUntilExpiry: number;
  expiryDate: string;
  quantity: number;
  severity: AlertSeverity;
}

export function ExpiryMonitoringDashboard() {
  const { alerts, alertsSummary, isLoading, refreshAlerts } = useExpiryAlerts();
  const [productRows, setProductRows] = useState<ProductExpiryRow[]>([]);
  const [sortBy, setSortBy] = useState<'daysLeft' | 'quantity'>('daysLeft');

  // Processar dados de alertas em linhas de tabela
  useEffect(() => {
    const rows: ProductExpiryRow[] = alerts.map((alert) => ({
      id: alert.id,
      name: alert.productName,
      daysUntilExpiry: alert.daysUntilExpiry,
      expiryDate: alert.expiryDate,
      quantity: alert.quantity || 0,
      severity: alert.severity,
    }));

    // Ordenar
    if (sortBy === 'daysLeft') {
      rows.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    } else {
      rows.sort((a, b) => b.quantity - a.quantity);
    }

    setProductRows(rows);
  }, [alerts, sortBy]);

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <AlertCircle className="w-3 h-3" />
            Crítico
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            Aviso
          </span>
        );
      case 'INFO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <Eye className="w-3 h-3" />
            Info
          </span>
        );
    }
  };

  const KPICard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ComponentType<any>; color: string }) => (
    <div className={`p-4 rounded-lg border ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <Icon className="w-10 h-10 opacity-50" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoramento de Validade</h1>
          <p className="text-gray-600 mt-1">Acompanhe produtos expirando</p>
        </div>
        <button
          onClick={refreshAlerts}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          label="Críticos"
          value={alertsSummary.critical}
          icon={AlertCircle}
          color="bg-red-50 border-red-200"
        />
        <KPICard
          label="Avisos"
          value={alertsSummary.warning}
          icon={Clock}
          color="bg-yellow-50 border-yellow-200"
        />
        <KPICard
          label="Informativos"
          value={alertsSummary.info}
          icon={Eye}
          color="bg-blue-50 border-blue-200"
        />
      </div>

      {/* Gráfico Simples (Pizza) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Distribuição por Severidade</h2>
        
        <div className="flex items-center justify-center gap-8 py-8">
          {/* Gráfico Pizza ASCII/SVG simples */}
          <svg width="200" height="200" viewBox="0 0 200 200">
            {/* Críticos */}
            {alertsSummary.critical > 0 && (
              <path
                d={`M 100,100 L 100,10 A 90,90 0 0,1 ${100 + 90 * Math.sin((alertsSummary.critical / alertsSummary.total) * 2 * Math.PI)},${100 - 90 * Math.cos((alertsSummary.critical / alertsSummary.total) * 2 * Math.PI)} Z`}
                fill="#dc2626"
                opacity="0.8"
              />
            )}
            {/* Avisos */}
            {alertsSummary.warning > 0 && (
              <path
                d={`M 100,100 L ${100 + 90 * Math.sin((alertsSummary.critical / alertsSummary.total) * 2 * Math.PI)},${100 - 90 * Math.cos((alertsSummary.critical / alertsSummary.total) * 2 * Math.PI)} A 90,90 0 0,1 ${100 - 90 * Math.sin(((alertsSummary.critical + alertsSummary.warning) / alertsSummary.total) * 2 * Math.PI)},${100 - 90 * Math.cos(((alertsSummary.critical + alertsSummary.warning) / alertsSummary.total) * 2 * Math.PI)} Z`}
                fill="#eab308"
                opacity="0.8"
              />
            )}
            {/* Info */}
            {alertsSummary.info > 0 && (
              <path
                d={`M 100,100 L ${100 - 90 * Math.sin(((alertsSummary.critical + alertsSummary.warning) / alertsSummary.total) * 2 * Math.PI)},${100 - 90 * Math.cos(((alertsSummary.critical + alertsSummary.warning) / alertsSummary.total) * 2 * Math.PI)} A 90,90 0 0,1 100,10 Z`}
                fill="#3b82f6"
                opacity="0.8"
              />
            )}
            <circle cx="100" cy="100" r="60" fill="white" />
          </svg>

          {/* Legenda */}
          <div className="space-y-3">
            {alertsSummary.critical > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span className="text-sm">Críticos: {alertsSummary.critical} ({Math.round((alertsSummary.critical / alertsSummary.total) * 100)}%)</span>
              </div>
            )}
            {alertsSummary.warning > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm">Avisos: {alertsSummary.warning} ({Math.round((alertsSummary.warning / alertsSummary.total) * 100)}%)</span>
              </div>
            )}
            {alertsSummary.info > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span className="text-sm">Informativos: {alertsSummary.info} ({Math.round((alertsSummary.info / alertsSummary.total) * 100)}%)</span>
              </div>
            )}
            {alertsSummary.total === 0 && (
              <div className="text-sm text-gray-500">Sem alertas</div>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Produtos com Próximo Vencimento</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('daysLeft')}
              className={`px-3 py-1 rounded text-sm ${sortBy === 'daysLeft' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Dias Restantes
            </button>
            <button
              onClick={() => setSortBy('quantity')}
              className={`px-3 py-1 rounded text-sm ${sortBy === 'quantity' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Quantidade
            </button>
          </div>
        </div>

        {productRows.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <TrendingDown className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum produto expirando</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Produto</th>
                  <th className="text-left px-4 py-3 font-semibold">Data Validade</th>
                  <th className="text-left px-4 py-3 font-semibold">Dias Restantes</th>
                  <th className="text-left px-4 py-3 font-semibold">Quantidade</th>
                  <th className="text-left px-4 py-3 font-semibold">Severidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {productRows.slice(0, 10).map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-3 text-gray-600 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(row.expiryDate).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${row.daysUntilExpiry < 7 ? 'text-red-600' : row.daysUntilExpiry < 30 ? 'text-yellow-600' : 'text-blue-600'}`}>
                        {row.daysUntilExpiry} dias
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.quantity} unidade(s)</td>
                    <td className="px-4 py-3">{getSeverityBadge(row.severity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {productRows.length > 10 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                +{productRows.length - 10} produtos não listados
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
