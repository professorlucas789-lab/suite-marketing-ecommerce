/**
 * Sales Service
 * Gestão de transações de venda
 * Fase 6: Módulo de Vendas
 */

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  limit,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Sale,
  SalesKPIs,
  ProductSaleMetric,
  CategorySaleMetric,
  SalesReport,
  SalesTrend,
  PaymentMethod,
} from '../types/sales';
import { Product } from '../types';
import { reduceStockOnSale, validateStockAvailability } from './salesStockSyncService';

/**
 * Registar nova venda
 */
export async function recordSale(
  sale: Omit<Sale, 'id' | 'timestamp' | 'createdAt'>
): Promise<Sale> {
  try {
    // Validações
    if (sale.quantity <= 0 || sale.unitPrice <= 0) {
      throw new Error('Quantidade e preço devem ser maiores que zero');
    }

    if (!sale.storeId || !sale.productId) {
      throw new Error('StoreId e ProductId são obrigatórios');
    }

    // NOVO (Fase 7): Validar estoque disponível
    const stockValidation = await validateStockAvailability(
      sale.storeId,
      sale.productId,
      sale.quantity
    );

    if (!stockValidation.available) {
      throw new Error(stockValidation.message);
    }

    // Calcular totais
    const totalPrice = sale.quantity * sale.unitPrice;
    const costTotal = sale.quantity * sale.costUnitPrice;
    const profitTotal = totalPrice - costTotal;
    const margemReal = (profitTotal / totalPrice) * 100;

    const docRef = await addDoc(collection(db, 'sales'), {
      ...sale,
      totalPrice,
      costTotal,
      profitTotal,
      margemReal,
      timestamp: serverTimestamp(),
      date: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
    });

    console.log('✅ [salesService] Venda registada:', docRef.id);

    // NOVO (Fase 7): Sincronizar estoque automaticamente
    const recordedSale: Sale = {
      ...sale,
      id: docRef.id,
      totalPrice,
      costTotal,
      profitTotal,
      margemReal,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    try {
      await reduceStockOnSale(recordedSale);
    } catch (stockError) {
      console.error('❌ [salesService] Aviso: Erro ao sincronizar estoque:', stockError);
      // Não falhar a venda se o estoque não sincronizar (pode ser rollback necessário)
    }

    return recordedSale;
  } catch (error) {
    console.error('❌ [salesService] Erro ao registar venda:', error);
    throw error;
  }
}

/**
 * Obter histórico de vendas
 */
export async function getSalesHistory(
  storeId: string,
  filters?: {
    productId?: string;
    fromDate?: string;
    toDate?: string;
    userId?: string;
    limit?: number;
  }
): Promise<Sale[]> {
  try {
    let constraints: QueryConstraint[] = [
      where('storeId', '==', storeId),
      orderBy('timestamp', 'desc'),
    ];

    if (filters?.productId) {
      constraints.push(where('productId', '==', filters.productId));
    }

    if (filters?.userId) {
      constraints.push(where('userId', '==', filters.userId));
    }

    if (filters?.limit) {
      constraints.push(limit(filters.limit));
    }

    const q = query(collection(db, 'sales'), ...constraints);
    const snapshot = await getDocs(q);

    let sales = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as Sale[];

    // Filtrar por data (não pode ser feito em query)
    if (filters?.fromDate || filters?.toDate) {
      const from = filters.fromDate ? new Date(filters.fromDate) : new Date(0);
      const to = filters.toDate ? new Date(filters.toDate) : new Date();

      sales = sales.filter((s) => {
        const saleDate = new Date(s.timestamp);
        return saleDate >= from && saleDate <= to;
      });
    }

    return sales;
  } catch (error) {
    console.error('❌ [salesService] Erro ao obter histórico:', error);
    throw error;
  }
}

/**
 * Gerar KPIs de vendas
 */
export async function generateSalesKPIs(
  storeId: string,
  fromDate: string,
  toDate: string
): Promise<SalesKPIs> {
  try {
    const sales = await getSalesHistory(storeId, { fromDate, toDate, limit: 1000 });

    const totalRevenue = sales.reduce((sum, s) => sum + s.totalPrice, 0);
    const totalCost = sales.reduce((sum, s) => sum + s.costTotal, 0);
    const totalProfit = sales.reduce((sum, s) => sum + s.profitTotal, 0);
    const totalUnits = sales.reduce((sum, s) => sum + s.quantity, 0);
    const totalTransactions = sales.length;

    const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const avgProfitPerTransaction = totalTransactions > 0 ? totalProfit / totalTransactions : 0;

    const margins = sales.map((s) => s.margemReal).filter((m) => !isNaN(m));
    const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b) / margins.length : 0;
    const minMargin = margins.length > 0 ? Math.min(...margins) : 0;
    const maxMargin = margins.length > 0 ? Math.max(...margins) : 0;

    // Agrupar por método de pagamento
    const paymentMethods: Record<PaymentMethod, number> = {
      cash: 0,
      card: 0,
      transfer: 0,
      cheque: 0,
      other: 0,
    };

    sales.forEach((s) => {
      if (s.paymentMethod && paymentMethods[s.paymentMethod] !== undefined) {
        paymentMethods[s.paymentMethod]++;
      }
    });

    return {
      period: { from: fromDate, to: toDate },
      storeId,
      totalTransactions,
      totalUnits,
      totalRevenue,
      avgTransactionValue,
      totalCost,
      totalProfit,
      avgProfitPerTransaction,
      avgMargin,
      minMargin,
      maxMargin,
      paymentMethods,
    };
  } catch (error) {
    console.error('❌ [salesService] Erro ao gerar KPIs:', error);
    throw error;
  }
}

/**
 * Gerar relatório de vendas
 */
export async function generateSalesReport(
  storeId: string,
  fromDate: string,
  toDate: string,
  label: string = 'Período'
): Promise<SalesReport> {
  try {
    const kpis = await generateSalesKPIs(storeId, fromDate, toDate);
    const sales = await getSalesHistory(storeId, { fromDate, toDate, limit: 1000 });

    // Top produtos
    const productMap = new Map<string, ProductSaleMetric>();

    sales.forEach((sale) => {
      const key = sale.productId;
      if (!productMap.has(key)) {
        productMap.set(key, {
          productId: key,
          productName: sale.productName,
          category: sale.category,
          quantity: 0,
          totalRevenue: 0,
          totalProfit: 0,
          avgMargin: 0,
          avgPrice: 0,
          salesCount: 0,
        });
      }

      const metric = productMap.get(key)!;
      metric.quantity += sale.quantity;
      metric.totalRevenue += sale.totalPrice;
      metric.totalProfit += sale.profitTotal;
      metric.salesCount++;
      metric.avgPrice = metric.totalRevenue / metric.salesCount;
    });

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Calcular avgMargin para produtos
    topProducts.forEach((p) => {
      p.avgMargin = (p.totalProfit / p.totalRevenue) * 100;
    });

    // Top categorias
    const categoryMap = new Map<string, CategorySaleMetric>();

    sales.forEach((sale) => {
      const key = sale.category || 'Sem Categoria';
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          categoryId: key,
          categoryName: key,
          quantity: 0,
          totalRevenue: 0,
          totalProfit: 0,
          avgMargin: 0,
          productsCount: new Set<string>(),
          salesCount: 0,
        } as any);
      }

      const metric = categoryMap.get(key)!;
      metric.quantity += sale.quantity;
      metric.totalRevenue += sale.totalPrice;
      metric.totalProfit += sale.profitTotal;
      metric.salesCount++;
      (metric.productsCount as any).add(sale.productId);
    });

    const topCategories = Array.from(categoryMap.values())
      .map((c) => ({
        ...c,
        productsCount: (c.productsCount as any).size,
        avgMargin: c.totalRevenue > 0 ? (c.totalProfit / c.totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    // Vendas diárias
    const dailyMap = new Map<string, { quantity: number; revenue: number; profit: number; transactions: number }>();

    sales.forEach((sale) => {
      if (!dailyMap.has(sale.date)) {
        dailyMap.set(sale.date, { quantity: 0, revenue: 0, profit: 0, transactions: 0 });
      }
      const daily = dailyMap.get(sale.date)!;
      daily.quantity += sale.quantity;
      daily.revenue += sale.totalPrice;
      daily.profit += sale.profitTotal;
      daily.transactions++;
    });

    const dailySales = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({ date, ...data }));

    return {
      period: { from: fromDate, to: toDate, label },
      storeId,
      kpis,
      topProducts,
      topCategories,
      dailySales,
    };
  } catch (error) {
    console.error('❌ [salesService] Erro ao gerar relatório:', error);
    throw error;
  }
}

/**
 * Calcular tendência de vendas
 */
export async function calculateSalesTrend(
  storeId: string,
  productId: string,
  days: number = 30
): Promise<SalesTrend | null> {
  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateStr = fromDate.toISOString();

    const sales = await getSalesHistory(storeId, {
      productId,
      fromDate: fromDateStr,
      limit: 1000,
    });

    if (sales.length === 0) {
      return null;
    }

    const totalQuantity = sales.reduce((sum, s) => sum + s.quantity, 0);
    const avgDaily = totalQuantity / days;

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (avgDaily > 2) trend = 'increasing';
    if (avgDaily < 0.5) trend = 'decreasing';

    return {
      productId,
      productName: sales[0].productName,
      period: days,
      totalQuantity,
      avgDaily,
      trend,
      lastSale: sales[0],
    };
  } catch (error) {
    console.error('❌ [salesService] Erro ao calcular tendência:', error);
    throw error;
  }
}

/**
 * Obter resumo rápido de vendas (últimas 24h)
 */
export async function getDailySalesSnapshot(storeId: string): Promise<SalesKPIs> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString();

    return generateSalesKPIs(storeId, todayStr, tomorrowStr);
  } catch (error) {
    console.error('❌ [salesService] Erro ao gerar snapshot:', error);
    throw error;
  }
}
