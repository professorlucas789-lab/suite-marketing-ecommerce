/**
 * Multi-store executive analytics based on the current Firestore collections.
 */

import { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  MultiStoreComparison,
  StorePerformance,
  calculateStorePerformance,
  prepareMultiStoreComparison,
} from '../services/multiStoreAnalyticsService';
import type { FinancialTransaction } from '../types/finance';
import type { Sale, SalesKPIs } from '../types/sales';
import type { Store } from '../types/store';
import type { Customer } from '../types/customers';
import type { Supplier } from '../types/purchasing';
import type { Product } from '../types';
import {
  buildFinancialSummary,
  buildReconciliationSummary,
  calculateDirectionTotal,
  filterTransactionsByDate,
} from '../utils/financeUtils';
import { normalizeStoreBusinessScope } from '../utils/businessUnitMapping';

export interface UseMultiStoreAnalyticsReturn {
  comparison: MultiStoreComparison | null;
  loading: boolean;
  error: string | null;
  generateComparison: (fromDate: string, toDate: string, label: string, stores?: Store[]) => Promise<void>;
  reset: () => void;
}

const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

const emptySalesKpis = (storeId: string, fromDate: string, toDate: string): SalesKPIs => ({
  period: { from: fromDate, to: toDate },
  storeId,
  totalSales: 0,
  totalTransactions: 0,
  totalRevenue: 0,
  totalUnits: 0,
  totalCost: 0,
  totalProfit: 0,
  averageTransactionValue: 0,
  avgTransactionValue: 0,
  avgProfitPerTransaction: 0,
  averageProfitMargin: 0,
  avgMargin: 0,
  minMargin: 0,
  maxMargin: 0,
  paymentMethods: {
    cash: 0,
    card: 0,
    transfer: 0,
    multicaixa: 0,
    mobile_money: 0,
    credit: 0,
    cheque: 0,
    other: 0,
  },
  topProduct: null,
});

const isSaleInPeriod = (sale: Sale, fromDate: string, toDate: string) => {
  const saleDate = sale.date || sale.timestamp?.slice(0, 10);
  if (!saleDate) return false;
  return saleDate >= fromDate && saleDate <= toDate;
};

const buildSalesKpis = (sales: Sale[], storeId: string, fromDate: string, toDate: string): SalesKPIs => {
  const groupedReceipts = new Set<string>();
  const kpis = emptySalesKpis(storeId, fromDate, toDate);
  let marginSum = 0;
  let marginCount = 0;

  sales.forEach((sale) => {
    groupedReceipts.add(sale.receiptNumber || sale.id);
    kpis.totalRevenue += Number(sale.totalPrice || 0);
    kpis.totalCost += Number(sale.totalCost ?? sale.costTotal ?? 0);
    kpis.totalProfit += Number(sale.totalProfit ?? sale.profitTotal ?? 0);
    kpis.totalUnits += Number(sale.quantity || 0);

    const margin = Number(sale.profitMargin ?? sale.margemReal ?? 0);
    if (Number.isFinite(margin)) {
      marginSum += margin;
      marginCount += 1;
      kpis.minMargin = marginCount === 1 ? margin : Math.min(kpis.minMargin, margin);
      kpis.maxMargin = marginCount === 1 ? margin : Math.max(kpis.maxMargin, margin);
    }

    const method = sale.paymentMethod || 'other';
    if (method in kpis.paymentMethods) {
      kpis.paymentMethods[method] += 1;
    } else {
      kpis.paymentMethods.other += 1;
    }
  });

  kpis.totalTransactions = groupedReceipts.size;
  kpis.totalSales = groupedReceipts.size;
  kpis.totalRevenue = roundMoney(kpis.totalRevenue);
  kpis.totalCost = roundMoney(kpis.totalCost);
  kpis.totalProfit = roundMoney(kpis.totalProfit);
  kpis.averageTransactionValue = kpis.totalTransactions > 0 ? roundMoney(kpis.totalRevenue / kpis.totalTransactions) : 0;
  kpis.avgTransactionValue = kpis.averageTransactionValue;
  kpis.avgProfitPerTransaction = kpis.totalTransactions > 0 ? roundMoney(kpis.totalProfit / kpis.totalTransactions) : 0;
  kpis.averageProfitMargin = kpis.totalRevenue > 0 ? roundMoney((kpis.totalProfit / kpis.totalRevenue) * 100) : 0;
  kpis.avgMargin = marginCount > 0 ? roundMoney(marginSum / marginCount) : kpis.averageProfitMargin;

  return kpis;
};

const getInventoryValue = (products: Product[]) => roundMoney(products.reduce((sum, product) => {
  const quantity = Number(product.quantidadeDisponivel ?? product.quantidade ?? 0);
  const unitCost = Number(product.custoRealUnidadeVenda ?? product.custoTotalReal ?? product.custoCompra ?? 0);
  return sum + quantity * unitCost;
}, 0));

const fetchStoreScopedDocs = async <T,>(collectionName: string, storeId: string): Promise<T[]> => {
  const snapshot = await getDocs(query(collection(db, collectionName), where('storeId', '==', storeId)));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as T));
};

async function loadStores(fallbackStores?: Store[]): Promise<Store[]> {
  if (fallbackStores?.length) {
    return fallbackStores.map((store) => normalizeStoreBusinessScope(store));
  }

  const snapshot = await getDocs(collection(db, 'stores'));
  return snapshot.docs
    .map((docSnap) => normalizeStoreBusinessScope({ id: docSnap.id, ...docSnap.data() } as Store))
    .filter((store) => store.ativo !== false);
}

export function useMultiStoreAnalytics(): UseMultiStoreAnalyticsReturn {
  const [comparison, setComparison] = useState<MultiStoreComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateComparison = async (fromDate: string, toDate: string, label: string, stores?: Store[]) => {
    try {
      setLoading(true);
      setError(null);

      const availableStores = await loadStores(stores);
      if (availableStores.length === 0) {
        setComparison(null);
        setError('Nenhuma unidade encontrada para análise consolidada.');
        return;
      }

      const fromTime = new Date(`${fromDate}T00:00:00`).getTime();
      const periodLength = Math.max(1, new Date(`${toDate}T23:59:59`).getTime() - fromTime);
      const previousTo = new Date(fromTime - 1).toISOString().slice(0, 10);
      const previousFrom = new Date(fromTime - periodLength).toISOString().slice(0, 10);
      const storePerformances: StorePerformance[] = [];

      for (const store of availableStores) {
        try {
          const [sales, products, financialTransactions, customers, suppliers] = await Promise.all([
            fetchStoreScopedDocs<Sale>('sales', store.id),
            fetchStoreScopedDocs<Product>('products', store.id),
            fetchStoreScopedDocs<FinancialTransaction>('financialTransactions', store.id),
            fetchStoreScopedDocs<Customer>('customers', store.id),
            fetchStoreScopedDocs<Supplier>('suppliers', store.id),
          ]);

          const currentSales = sales.filter((sale) => isSaleInPeriod(sale, fromDate, toDate));
          const previousSales = sales.filter((sale) => isSaleInPeriod(sale, previousFrom, previousTo));
          const currentTransactions = filterTransactionsByDate(financialTransactions, fromDate, toDate);
          const receivables = customers.reduce((sum, customer) => sum + Number(customer.currentBalance || 0), 0);
          const payables = suppliers.reduce((sum, supplier) => sum + Number(supplier.currentPayable || 0), 0);
          const financeSummary = buildFinancialSummary(currentTransactions, receivables, payables);
          const reconciliationSummary = buildReconciliationSummary(currentTransactions);

          const kpis = buildSalesKpis(currentSales, store.id, fromDate, toDate);
          const previousKpis = buildSalesKpis(previousSales, store.id, previousFrom, previousTo);
          const performance = calculateStorePerformance(
            store.id,
            store.nome,
            kpis,
            products.length,
            getInventoryValue(products),
            previousKpis,
            {
              cashIn: calculateDirectionTotal(currentTransactions, 'in'),
              cashOut: calculateDirectionTotal(currentTransactions, 'out'),
              netCashFlow: financeSummary.netCashFlow,
              receivables: financeSummary.receivables,
              payables: financeSummary.payables,
              operationalBalance: financeSummary.operationalBalance,
              pendingReconciliation: Math.abs(reconciliationSummary.pendingNet),
            },
            {
              businessSegmentName: store.businessSegmentName,
              unitType: store.unitType,
            }
          );

          storePerformances.push(performance);
        } catch (err) {
          console.error(`Erro ao calcular performance para unidade ${store.id}:`, err);
        }
      }

      if (storePerformances.length === 0) {
        setComparison(null);
        setError('Não foi possível carregar dados das unidades.');
        return;
      }

      setComparison(prepareMultiStoreComparison(storePerformances, {
        from: fromDate,
        to: toDate,
        label,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar comparação consolidada.';
      setError(errorMessage);
      console.error('Erro ao gerar comparação multi-loja:', err);
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
