/**
 * Sales Service
 * Internal POS records, receipts and stock synchronization.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  QueryConstraint,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types';
import {
  PaymentMethod,
  Sale,
  SaleReceipt,
  SaleReceiptItem,
  SaleTransactionInput,
  SalesKPIs,
  ProductSaleMetric,
  CategorySaleMetric,
  SalesReport,
  SalesTrend,
} from '../types/sales';
import { calculateChangeDue, saleDocumentPrefixes, validatePaymentAmount } from '../utils/salesDocumentUtils';
import type { StockMovement } from '../types/stock';
import type { Customer } from '../types/customers';
import { calculateCustomerBalance, validateCreditSale } from '../utils/customerLedgerUtils';

const roundMoney = (value: number) => Math.round((value || 0) * 100) / 100;

const getAvailableStock = (product: Product) =>
  Number(product.quantidadeDisponivel ?? product.quantidade ?? 0);

const getUnitCost = (product: Product) =>
  Number(product.custoRealUnidadeVenda ?? product.custoTotalReal ?? product.custoCompra ?? 0);

const cleanForFirestore = <T extends Record<string, any>>(value: T): T => {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
};

const createReceiptNumber = (documentType: SaleTransactionInput['documentType']) => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PC-${saleDocumentPrefixes[documentType]}-${datePart}-${timePart}-${suffix}`;
};

const normalizeSale = (sale: any): Sale => {
  const timestamp = typeof sale.timestamp === 'string'
    ? sale.timestamp
    : sale.timestamp?.toDate?.().toISOString?.() || sale.createdAt || new Date().toISOString();

  const totalCost = Number(sale.totalCost ?? sale.costTotal ?? 0);
  const totalProfit = Number(sale.totalProfit ?? sale.profitTotal ?? 0);
  const profitMargin = Number(sale.profitMargin ?? sale.margemReal ?? 0);

  return {
    ...sale,
    timestamp,
    createdAt: typeof sale.createdAt === 'string'
      ? sale.createdAt
      : sale.createdAt?.toDate?.().toISOString?.() || timestamp,
    updatedAt: typeof sale.updatedAt === 'string'
      ? sale.updatedAt
      : sale.updatedAt?.toDate?.().toISOString?.() || timestamp,
    totalCost,
    totalProfit,
    profitMargin,
    costTotal: totalCost,
    profitTotal: totalProfit,
    margemReal: profitMargin,
  } as Sale;
};

export async function recordSaleTransaction(input: SaleTransactionInput): Promise<SaleReceipt> {
  if (!input.storeId) throw new Error('Loja obrigatória para registar venda.');
  if (!input.userId) throw new Error('Utilizador obrigatório para registar venda.');
  if (!input.items.length) throw new Error('Adicione pelo menos um produto ao carrinho.');

  const now = new Date();
  const timestamp = now.toISOString();
  const date = timestamp.slice(0, 10);
  const time = now.toTimeString().slice(0, 5);
  const receiptNumber = createReceiptNumber(input.documentType);
  const batch = writeBatch(db);
  const receiptItems: SaleReceiptItem[] = [];
  const pendingSales: Array<{ ref: ReturnType<typeof doc>; data: Record<string, any> }> = [];
  const pendingStockMovements: Array<{ ref: ReturnType<typeof doc>; data: StockMovement }> = [];

  for (const item of input.items) {
    if (!item.productId) throw new Error('Produto inválido no carrinho.');
    if (item.quantity <= 0) throw new Error('A quantidade deve ser maior que zero.');
    if (item.unitPrice <= 0) throw new Error('O preço unitário deve ser maior que zero.');

    const productRef = doc(db, 'products', item.productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      throw new Error(`Produto não encontrado: ${item.productId}`);
    }

    const product = { id: productSnap.id, ...productSnap.data() } as Product;

    if (product.storeId && product.storeId !== input.storeId) {
      throw new Error(`O produto "${product.nome}" não pertence à loja atual.`);
    }

    const stockBefore = getAvailableStock(product);
    if (stockBefore < item.quantity) {
      throw new Error(`Stock insuficiente para "${product.nome}". Disponível: ${stockBefore}, solicitado: ${item.quantity}.`);
    }

    const unitCost = getUnitCost(product);
    const totalPrice = roundMoney(item.unitPrice * item.quantity);
    const totalCost = roundMoney(unitCost * item.quantity);
    const totalProfit = roundMoney(totalPrice - totalCost);
    const profitPerUnit = roundMoney(item.unitPrice - unitCost);
    const profitMargin = totalPrice > 0 ? roundMoney((totalProfit / totalPrice) * 100) : 0;
    const stockAfter = stockBefore - item.quantity;

    batch.update(productRef, {
      quantidadeDisponivel: stockAfter,
      quantidadeVendida: Number(product.quantidadeVendida || 0) + item.quantity,
      updatedAt: timestamp,
      dataAtualizacao: timestamp,
    });

    const saleRef = doc(collection(db, 'sales'));
    pendingSales.push({
      ref: saleRef,
      data: {
        storeId: input.storeId,
        storeName: input.storeName,
        receiptNumber,
        documentType: input.documentType,
        status: 'completed',
        productId: product.id,
        productName: product.nome,
        category: product.categoria,
        categoryId: product.categoryId,
        quantity: item.quantity,
        unitPrice: roundMoney(item.unitPrice),
        totalPrice,
        unitCost,
        totalCost,
        profitPerUnit,
        totalProfit,
        profitMargin,
        costUnitPrice: unitCost,
        costTotal: totalCost,
        profitTotal: totalProfit,
        margemReal: profitMargin,
        stockBefore,
        stockAfter,
        date,
        time,
        timestamp,
        userId: input.userId,
        userName: input.userName,
        customerName: input.customerName?.trim() || '',
        customerNif: input.customerNif?.trim() || '',
        customerPhone: input.customerPhone?.trim() || '',
        paymentMethod: input.paymentMethod,
        amountPaid: input.amountPaid,
        notes: input.notes?.trim() || '',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });

    const stockMovementRef = doc(collection(db, 'stockMovements'));
    pendingStockMovements.push({
      ref: stockMovementRef,
      data: {
        id: stockMovementRef.id,
        movementType: 'sale',
        productId: product.id!,
        productName: product.nome,
        category: product.categoria,
        sourceStoreId: input.storeId,
        sourceStoreName: input.storeName,
        quantity: item.quantity,
        stockBefore,
        stockAfter,
        reason: `Venda ${receiptNumber}`,
        userId: input.userId,
        userName: input.userName,
        relatedMovementId: saleRef.id,
        createdAt: timestamp,
      },
    });

    receiptItems.push({
      productId: product.id!,
      productName: product.nome,
      category: product.categoria,
      categoryId: product.categoryId,
      quantity: item.quantity,
      unitPrice: roundMoney(item.unitPrice),
      totalPrice,
      unitCost,
      totalCost,
      profitPerUnit,
      totalProfit,
      profitMargin,
      stockBefore,
      stockAfter,
    });
  }

  const subtotal = roundMoney(receiptItems.reduce((sum, item) => sum + item.totalPrice, 0));
  const totalCost = roundMoney(receiptItems.reduce((sum, item) => sum + item.totalCost, 0));
  const totalProfit = roundMoney(receiptItems.reduce((sum, item) => sum + item.totalProfit, 0));
  const profitMargin = subtotal > 0 ? roundMoney((totalProfit / subtotal) * 100) : 0;
  const paymentError = input.paymentMethod === 'credit'
    ? null
    : validatePaymentAmount(subtotal, input.amountPaid);
  if (paymentError) throw new Error(paymentError);
  const amountPaid = input.paymentMethod === 'credit'
    ? 0
    : input.amountPaid === undefined ? subtotal : roundMoney(input.amountPaid);
  const changeDue = calculateChangeDue(subtotal, amountPaid);
  let customerForCredit: Customer | null = null;
  let customerBalanceAfter: number | null = null;

  if (input.paymentMethod === 'credit') {
    if (!input.customerId) {
      throw new Error('Selecione um cliente cadastrado para vender a crédito.');
    }

    const customerRef = doc(db, 'customers', input.customerId);
    const customerSnap = await getDoc(customerRef);
    if (!customerSnap.exists()) throw new Error('Cliente não encontrado.');

    customerForCredit = { id: customerSnap.id, ...customerSnap.data() } as Customer;
    if (customerForCredit.storeId !== input.storeId) {
      throw new Error('Este cliente não pertence à loja atual.');
    }

    const creditError = validateCreditSale(customerForCredit, subtotal);
    if (creditError) throw new Error(creditError);

    customerBalanceAfter = calculateCustomerBalance(customerForCredit.currentBalance || 0, 'sale_credit', subtotal);

    batch.update(customerRef, {
      currentBalance: customerBalanceAfter,
      lastTransactionAt: timestamp,
      updatedAt: timestamp,
    });

    const ledgerRef = doc(collection(db, 'customerLedger'));
    batch.set(ledgerRef, cleanForFirestore({
      customerId: input.customerId,
      customerName: customerForCredit.name,
      storeId: input.storeId,
      storeName: input.storeName,
      userId: input.userId,
      userName: input.userName,
      type: 'sale_credit',
      amount: subtotal,
      balanceAfter: customerBalanceAfter,
      receiptNumber,
      paymentMethod: input.paymentMethod,
      description: `Venda a crédito ${receiptNumber}`,
      createdAt: timestamp,
    }));
  }

  pendingSales.forEach(({ ref, data }) => {
    batch.set(ref, cleanForFirestore({
      ...data,
      customerId: input.customerId,
      customerName: customerForCredit?.name || data.customerName,
      customerNif: customerForCredit?.nif || data.customerNif,
      customerPhone: customerForCredit?.phone || data.customerPhone,
      amountPaid,
      changeDue,
    }));
  });

  pendingStockMovements.forEach(({ ref, data }) => {
    batch.set(ref, cleanForFirestore(data));
  });

  await batch.commit();

  return {
    id: receiptNumber,
    receiptNumber,
    storeId: input.storeId,
    storeName: input.storeName,
    customerId: input.customerId,
    customerName: customerForCredit?.name || input.customerName?.trim() || '',
    customerNif: customerForCredit?.nif || input.customerNif?.trim() || '',
    customerPhone: customerForCredit?.phone || input.customerPhone?.trim() || '',
    paymentMethod: input.paymentMethod,
    documentType: input.documentType,
    status: 'completed',
    date,
    time,
    timestamp,
    userId: input.userId,
    userName: input.userName,
    notes: input.notes?.trim() || '',
    items: receiptItems,
    subtotal,
    amountPaid,
    changeDue,
    totalCost,
    totalProfit,
    profitMargin,
  };
}

/**
 * Backward-compatible single-product sale recorder.
 */
export async function recordSale(
  sale: Omit<Sale, 'id' | 'timestamp' | 'createdAt'>
): Promise<Sale> {
  const receipt = await recordSaleTransaction({
    storeId: sale.storeId,
    storeName: sale.storeName,
    userId: sale.userId,
    userName: sale.userName,
    customerName: sale.customerName,
    customerNif: sale.customerNif,
    customerPhone: sale.customerPhone,
    customerId: sale.customerId,
    paymentMethod: sale.paymentMethod || 'cash',
    documentType: sale.documentType || 'internal_receipt',
    amountPaid: sale.amountPaid,
    notes: sale.notes,
    items: [
      {
        productId: sale.productId,
        quantity: sale.quantity,
        unitPrice: sale.unitPrice,
      },
    ],
  });

  const item = receipt.items[0];
  return {
    ...sale,
    id: receipt.receiptNumber,
    receiptNumber: receipt.receiptNumber,
    status: 'completed',
    customerId: receipt.customerId,
    customerPhone: receipt.customerPhone,
    amountPaid: receipt.amountPaid,
    changeDue: receipt.changeDue,
    timestamp: receipt.timestamp,
    createdAt: receipt.timestamp,
    updatedAt: receipt.timestamp,
    category: item.category,
    categoryId: item.categoryId,
    totalPrice: item.totalPrice,
    unitCost: item.unitCost,
    totalCost: item.totalCost,
    profitPerUnit: item.profitPerUnit,
    totalProfit: item.totalProfit,
    profitMargin: item.profitMargin,
    costUnitPrice: item.unitCost,
    costTotal: item.totalCost,
    profitTotal: item.totalProfit,
    margemReal: item.profitMargin,
    stockBefore: item.stockBefore,
    stockAfter: item.stockAfter,
  };
}

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
  const constraints: QueryConstraint[] = [
    where('storeId', '==', storeId),
    orderBy('timestamp', 'desc'),
  ];

  if (filters?.productId) constraints.push(where('productId', '==', filters.productId));
  if (filters?.userId) constraints.push(where('userId', '==', filters.userId));
  if (filters?.limit) constraints.push(limit(filters.limit));

  const q = query(collection(db, 'sales'), ...constraints);
  const snapshot = await getDocs(q);
  let sales = snapshot.docs.map((snap) => normalizeSale({ ...snap.data(), id: snap.id }));

  if (filters?.fromDate || filters?.toDate) {
    const from = filters.fromDate ? new Date(filters.fromDate) : new Date(0);
    const to = filters.toDate ? new Date(`${filters.toDate}T23:59:59`) : new Date();

    sales = sales.filter((sale) => {
      const saleDate = new Date(sale.timestamp);
      return saleDate >= from && saleDate <= to;
    });
  }

  return sales;
}

export async function generateSalesKPIs(
  storeId: string,
  fromDate: string,
  toDate: string
): Promise<SalesKPIs> {
  const sales = await getSalesHistory(storeId, { fromDate, toDate, limit: 1000 });

  const totalRevenue = roundMoney(sales.reduce((sum, sale) => sum + (sale.totalPrice || 0), 0));
  const totalCost = roundMoney(sales.reduce((sum, sale) => sum + (sale.totalCost || sale.costTotal || 0), 0));
  const totalProfit = roundMoney(sales.reduce((sum, sale) => sum + (sale.totalProfit || sale.profitTotal || 0), 0));
  const totalUnits = sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
  const totalTransactions = new Set(sales.map((sale) => sale.receiptNumber || sale.id)).size;
  const avgTransactionValue = totalTransactions > 0 ? roundMoney(totalRevenue / totalTransactions) : 0;
  const avgProfitPerTransaction = totalTransactions > 0 ? roundMoney(totalProfit / totalTransactions) : 0;
  const margins = sales
    .map((sale) => Number(sale.profitMargin ?? sale.margemReal ?? 0))
    .filter((margin) => Number.isFinite(margin));
  const avgMargin = margins.length > 0 ? roundMoney(margins.reduce((a, b) => a + b, 0) / margins.length) : 0;

  const paymentMethods = {
    cash: 0,
    card: 0,
    transfer: 0,
    multicaixa: 0,
    mobile_money: 0,
    credit: 0,
    cheque: 0,
    other: 0,
  } as Record<PaymentMethod, number>;

  sales.forEach((sale) => {
    paymentMethods[sale.paymentMethod || 'other'] += 1;
  });

  const productMap = new Map<string, { productName: string; units: number; revenue: number }>();
  sales.forEach((sale) => {
    const existing = productMap.get(sale.productId) || {
      productName: sale.productName,
      units: 0,
      revenue: 0,
    };
    existing.units += sale.quantity;
    existing.revenue += sale.totalPrice;
    productMap.set(sale.productId, existing);
  });

  const topProductEntry = Array.from(productMap.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)[0];

  return {
    period: { from: fromDate, to: toDate },
    storeId,
    totalSales: totalTransactions,
    totalTransactions,
    totalRevenue,
    totalUnits,
    totalCost,
    totalProfit,
    averageTransactionValue: avgTransactionValue,
    avgTransactionValue,
    avgProfitPerTransaction,
    averageProfitMargin: avgMargin,
    avgMargin,
    minMargin: margins.length > 0 ? Math.min(...margins) : 0,
    maxMargin: margins.length > 0 ? Math.max(...margins) : 0,
    paymentMethods,
    topProduct: topProductEntry
      ? {
          productId: topProductEntry[0],
          productName: topProductEntry[1].productName,
          units: topProductEntry[1].units,
          revenue: roundMoney(topProductEntry[1].revenue),
        }
      : null,
  };
}

export async function generateSalesReport(
  storeId: string,
  fromDate: string,
  toDate: string,
  label: string = 'Período'
): Promise<SalesReport> {
  const kpis = await generateSalesKPIs(storeId, fromDate, toDate);
  const sales = await getSalesHistory(storeId, { fromDate, toDate, limit: 1000 });

  const productMap = new Map<string, ProductSaleMetric>();
  sales.forEach((sale) => {
    const metric = productMap.get(sale.productId) || {
      productId: sale.productId,
      productName: sale.productName,
      category: sale.category,
      quantity: 0,
      totalRevenue: 0,
      totalProfit: 0,
      avgMargin: 0,
      avgPrice: 0,
      salesCount: 0,
    };
    metric.quantity += sale.quantity;
    metric.totalRevenue += sale.totalPrice;
    metric.totalProfit += sale.totalProfit || sale.profitTotal || 0;
    metric.salesCount += 1;
    metric.avgPrice = metric.quantity > 0 ? metric.totalRevenue / metric.quantity : 0;
    metric.avgMargin = metric.totalRevenue > 0 ? (metric.totalProfit / metric.totalRevenue) * 100 : 0;
    productMap.set(sale.productId, metric);
  });

  const categoryMap = new Map<string, CategorySaleMetric & { productIds: Set<string> }>();
  sales.forEach((sale) => {
    const key = sale.categoryId || sale.category || 'sem-categoria';
    const metric = categoryMap.get(key) || {
      categoryId: key,
      categoryName: sale.category || 'Sem Categoria',
      quantity: 0,
      totalRevenue: 0,
      totalProfit: 0,
      avgMargin: 0,
      productsCount: 0,
      salesCount: 0,
      productIds: new Set<string>(),
    };
    metric.quantity += sale.quantity;
    metric.totalRevenue += sale.totalPrice;
    metric.totalProfit += sale.totalProfit || sale.profitTotal || 0;
    metric.salesCount += 1;
    metric.productIds.add(sale.productId);
    metric.productsCount = metric.productIds.size;
    metric.avgMargin = metric.totalRevenue > 0 ? (metric.totalProfit / metric.totalRevenue) * 100 : 0;
    categoryMap.set(key, metric);
  });

  const dailyMap = new Map<string, { quantity: number; revenue: number; profit: number; transactions: Set<string> }>();
  sales.forEach((sale) => {
    const daily = dailyMap.get(sale.date) || {
      quantity: 0,
      revenue: 0,
      profit: 0,
      transactions: new Set<string>(),
    };
    daily.quantity += sale.quantity;
    daily.revenue += sale.totalPrice;
    daily.profit += sale.totalProfit || sale.profitTotal || 0;
    daily.transactions.add(sale.receiptNumber || sale.id);
    dailyMap.set(sale.date, daily);
  });

  return {
    period: { from: fromDate, to: toDate, label },
    storeId,
    kpis,
    topProducts: Array.from(productMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10)
      .map((item) => ({
        ...item,
        totalRevenue: roundMoney(item.totalRevenue),
        totalProfit: roundMoney(item.totalProfit),
        avgMargin: roundMoney(item.avgMargin),
        avgPrice: roundMoney(item.avgPrice),
      })),
    topCategories: Array.from(categoryMap.values())
      .map(({ productIds, ...item }) => ({
        ...item,
        totalRevenue: roundMoney(item.totalRevenue),
        totalProfit: roundMoney(item.totalProfit),
        avgMargin: roundMoney(item.avgMargin),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5),
    dailySales: Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date,
        quantity: data.quantity,
        revenue: roundMoney(data.revenue),
        profit: roundMoney(data.profit),
        transactions: data.transactions.size,
      })),
  };
}

export async function calculateSalesTrend(
  storeId: string,
  productId: string,
  days: number = 30
): Promise<SalesTrend | null> {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const sales = await getSalesHistory(storeId, {
    productId,
    fromDate: fromDate.toISOString(),
    limit: 1000,
  });

  if (sales.length === 0) return null;

  const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const avgDaily = totalQuantity / days;
  let trend: SalesTrend['trend'] = 'stable';
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
}

export async function getDailySalesSnapshot(storeId: string): Promise<SalesKPIs> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return generateSalesKPIs(storeId, today.toISOString(), tomorrow.toISOString());
}

export async function cancelSaleByReceipt(
  receiptNumber: string,
  options?: {
    cancelledBy?: string;
    cancelledByName?: string;
    reason?: string;
  }
): Promise<void> {
  const q = query(collection(db, 'sales'), where('receiptNumber', '==', receiptNumber));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('Recibo não encontrado.');
  }

  const batch = writeBatch(db);
  const timestamp = new Date().toISOString();
  let activeLines = 0;

  for (const saleDoc of snapshot.docs) {
    const sale = normalizeSale({ ...saleDoc.data(), id: saleDoc.id });
    if (sale.status === 'cancelled') continue;
    activeLines += 1;

    const productRef = doc(db, 'products', sale.productId);
    const productSnap = await getDoc(productRef);
    if (productSnap.exists()) {
      const product = productSnap.data() as Product;
      batch.update(productRef, {
        quantidadeDisponivel: getAvailableStock(product) + sale.quantity,
        quantidadeVendida: Math.max(0, Number(product.quantidadeVendida || 0) - sale.quantity),
        updatedAt: timestamp,
        dataAtualizacao: timestamp,
      });
    }

    batch.update(saleDoc.ref, {
      status: 'cancelled',
      cancelledAt: timestamp,
      cancelledBy: options?.cancelledBy || '',
      cancelledByName: options?.cancelledByName || '',
      cancellationReason: options?.reason?.trim() || '',
      updatedAt: timestamp,
    });
  }

  if (activeLines === 0) {
    throw new Error('Este recibo já foi anulado.');
  }

  await batch.commit();
}
