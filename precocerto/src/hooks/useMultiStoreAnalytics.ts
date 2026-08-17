/**
 * useMultiStoreAnalytics Hook
 * Hook para análise comparativa entre múltiplas lojas
 * Fase 9: Dashboard Multi-Loja
 */

import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  MultiStoreComparison,
  StorePerformance,
  calculateStorePerformance,
  prepareMultiStoreComparison,
} from '../services/multiStoreAnalyticsService';
import { SalesKPIs } from '../types/sales';

export interface UseMultiStoreAnalyticsReturn {
  comparison: MultiStoreComparison | null;
  loading: boolean;
  error: string | null;
  generateComparison: (fromDate: string, toDate: string, label: string) => Promise<void>;
  reset: () => void;
}

export function useMultiStoreAnalytics(): UseMultiStoreAnalyticsReturn {
  const [comparison, setComparison] = useState<MultiStoreComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateComparison = async (fromDate: string, toDate: string, label: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all stores
      const lojaSnapshot = await getDocs(collection(db, 'lojas'));
      const stores = lojaSnapshot.docs.map((doc) => ({
        storeId: doc.id,
        ...doc.data(),
      }));

      if (stores.length === 0) {
        setError('Nenhuma loja encontrada');
        setLoading(false);
        return;
      }

      // Calculate performance for each store
      const storePerformances: StorePerformance[] = [];

      for (const store of stores) {
        try {
          // Fetch sales KPIs for this store
          const salesSnapshot = await getDocs(
            query(
              collection(db, `lojas/${store.storeId}/vendas`),
              where('date', '>=', fromDate),
              where('date', '<=', toDate)
            )
          );

          // Calculate KPIs
          let totalRevenue = 0;
          let totalProfit = 0;
          let totalUnits = 0;
          let totalTransactions = salesSnapshot.size;
          let totalCost = 0;
          let marginSum = 0;

          salesSnapshot.docs.forEach((doc) => {
            const sale = doc.data();
            totalRevenue += sale.totalPrice || 0;
            totalProfit += sale.profitTotal || 0;
            totalCost += sale.costTotal || 0;
            totalUnits += sale.quantity || 0;
            marginSum += sale.margemReal || 0;
          });

          const avgMargin = totalTransactions > 0 ? marginSum / totalTransactions : 0;

          const kpis: SalesKPIs = {
            totalRevenue,
            totalProfit,
            totalCost,
            totalUnits,
            totalTransactions,
            avgTransactionValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
            avgMargin,
          };

          // Fetch products for this store
          const productsSnapshot = await getDocs(collection(db, `lojas/${store.storeId}/produtos`));
          const productCount = productsSnapshot.size;

          // Calculate inventory value
          let inventoryValue = 0;
          productsSnapshot.docs.forEach((doc) => {
            const product = doc.data();
            const unitPrice = product.precoVenda || 0;
            const quantity = product.quantidadeDisponível || 0;
            inventoryValue += unitPrice * quantity;
          });

          // Fetch previous period KPIs for comparison (last 30 days before period)
          const prevFromDate = new Date(new Date(fromDate).getTime() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
          const prevToDate = new Date(new Date(fromDate).getTime() - 1 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

          const prevSalesSnapshot = await getDocs(
            query(
              collection(db, `lojas/${store.storeId}/vendas`),
              where('date', '>=', prevFromDate),
              where('date', '<=', prevToDate)
            )
          );

          let prevTotalRevenue = 0;
          let prevTotalProfit = 0;

          prevSalesSnapshot.docs.forEach((doc) => {
            const sale = doc.data();
            prevTotalRevenue += sale.totalPrice || 0;
            prevTotalProfit += sale.profitTotal || 0;
          });

          const previousKpis: SalesKPIs = {
            totalRevenue: prevTotalRevenue,
            totalProfit: prevTotalProfit,
          };

          const performance = calculateStorePerformance(
            store.storeId,
            store.storeName || `Loja ${store.storeId}`,
            kpis,
            productCount,
            inventoryValue,
            previousKpis
          );

          storePerformances.push(performance);
        } catch (err) {
          console.error(`Erro ao calcular performance para loja ${store.storeId}:`, err);
          // Continue with other stores
        }
      }

      if (storePerformances.length === 0) {
        setError('Erro ao carregar dados das lojas');
        setLoading(false);
        return;
      }

      // Prepare multi-store comparison
      const multiComparison = prepareMultiStoreComparison(storePerformances, {
        from: fromDate,
        to: toDate,
        label,
      });

      setComparison(multiComparison);
      console.log('✅ [useMultiStoreAnalytics] Comparação multi-loja gerada com sucesso');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar comparação';
      setError(errorMessage);
      console.error('❌ [useMultiStoreAnalytics] Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setComparison(null);
    setError(null);
  };

  return {
    comparison,
    loading,
    error,
    generateComparison,
    reset,
  };
}
