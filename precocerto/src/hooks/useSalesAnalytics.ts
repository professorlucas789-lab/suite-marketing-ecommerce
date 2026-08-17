/**
 * useSalesAnalytics Hook
 * Hook para obter análises e relatórios de vendas
 * Fase 6: Módulo de Vendas
 */

import { useEffect, useState } from 'react';
import { SalesReport, SalesKPIs, SalesTrend, Sale } from '../types/sales';
import {
  getSalesHistory,
  generateSalesReport,
  generateSalesKPIs,
  calculateSalesTrend,
} from '../services/salesService';

export interface UseSalesAnalyticsReturn {
  report: SalesReport | null;
  kpis: SalesKPIs | null;
  salesHistory: Sale[];
  trend: SalesTrend | null;
  loading: boolean;
  error: string | null;
  generateReport: (
    storeId: string,
    fromDate: string,
    toDate: string,
    label?: string
  ) => Promise<void>;
  fetchHistory: (storeId: string, filters?: any) => Promise<void>;
  calculateTrend: (storeId: string, productId: string, days?: number) => Promise<void>;
  reset: () => void;
}

export function useSalesAnalytics(): UseSalesAnalyticsReturn {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [kpis, setKpis] = useState<SalesKPIs | null>(null);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [trend, setTrend] = useState<SalesTrend | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async (
    storeId: string,
    fromDate: string,
    toDate: string,
    label?: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      const result = await generateSalesReport(storeId, fromDate, toDate, label);
      setReport(result);
      setKpis(result.kpis);
      console.log('✅ [useSalesAnalytics] Relatório gerado com sucesso');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar relatório';
      setError(errorMessage);
      console.error('❌ [useSalesAnalytics] Erro ao gerar relatório:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchHistory = async (storeId: string, filters?: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await getSalesHistory(storeId, filters);
      setSalesHistory(result);
      console.log('✅ [useSalesAnalytics] Histórico carregado:', result.length, 'vendas');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar histórico';
      setError(errorMessage);
      console.error('❌ [useSalesAnalytics] Erro ao buscar histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateTrend = async (storeId: string, productId: string, days = 30) => {
    try {
      setLoading(true);
      setError(null);
      const result = await calculateSalesTrend(storeId, productId, days);
      setTrend(result);
      if (result) {
        console.log('✅ [useSalesAnalytics] Tendência calculada:', result.trend);
      } else {
        console.log('ℹ️ [useSalesAnalytics] Sem dados de venda para este produto');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao calcular tendência';
      setError(errorMessage);
      console.error('❌ [useSalesAnalytics] Erro ao calcular tendência:', err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setReport(null);
    setKpis(null);
    setSalesHistory([]);
    setTrend(null);
    setError(null);
  };

  return {
    report,
    kpis,
    salesHistory,
    trend,
    loading,
    error,
    generateReport: handleGenerateReport,
    fetchHistory: handleFetchHistory,
    calculateTrend: handleCalculateTrend,
    reset,
  };
}
