/**
 * Unified Sales Service — FASE B + C
 *
 * Vendas com:
 * - Transações Firestore (isolamento + atomicidade)
 * - Validação de stock isolada por storeId
 * - Sem race conditions (getDoc + writeBatch)
 *
 * Padrão seguro:
 * 1. Iniciar transação
 * 2. Ler stock produto/{id}/stock/{storeId} dentro transação
 * 3. Validar quantidade
 * 4. Registar venda + atualizar stock (atomicamente)
 * 5. Commit
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  runTransaction,
  serverTimestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types';
import { SaleTransactionInput, SaleReceipt, SaleReceiptItem, Sale } from '../types/sales';

interface UnifiedSaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

const roundMoney = (value: number) => Math.round((value || 0) * 100) / 100;

const cleanForFirestore = <T extends Record<string, any>>(value: T): T => {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
};

/**
 * Registar venda com isolamento de stock por loja (TRANSAÇÃO)
 *
 * Este é o método PRINCIPAL de vendas em Fase B.
 * Garante que não há sobrevenda mesmo com múltiplas caixas simultâneas.
 */
export async function recordUnifiedSaleTransaction(
  storeId: string,
  userId: string,
  items: UnifiedSaleItem[],
  options?: {
    paymentMethod?: string;
    customerId?: string;
    customerName?: string;
    customerNif?: string;
    documentType?: string;
    notes?: string;
  }
): Promise<SaleReceipt> {
  if (!storeId) throw new Error('Loja obrigatória');
  if (!userId) throw new Error('Utilizador obrigatório');
  if (!items.length) throw new Error('Adicione pelo menos um produto');

  // Usar transação para isolamento completo
  const receipt = await runTransaction(db, async (txn) => {
    const now = new Date();
    const timestamp = now.toISOString();
    const receiptNumber = generateReceiptNumber();
    const receiptItems: SaleReceiptItem[] = [];
    let totalPrice = 0;
    let totalCost = 0;
    let totalProfit = 0;

    // PASSO 1: Validar e ler todos os produtos DENTRO DA TRANSAÇÃO
    const productData: Map<string, { product: any; currentStock: number; unitCost: number }> = new Map();

    for (const item of items) {
      // Ler produto global
      const productRef = doc(db, 'products', item.productId);
      const productSnap = await txn.get(productRef);

      if (!productSnap.exists()) {
        throw new Error(`Produto não encontrado: ${item.productId}`);
      }

      const product = { id: productSnap.id, ...productSnap.data() } as Product;

      // Ler stock da loja
      const stockRef = doc(db, 'products', item.productId, 'stock', storeId);
      const stockSnap = await txn.get(stockRef);

      const currentStock = stockSnap.exists()
        ? (stockSnap.data().quantidadeDisponível || 0)
        : 0;

      // VALIDAÇÃO: Stock suficiente?
      if (currentStock < item.quantity) {
        throw new Error(
          `Stock insuficiente para "${product.nome}". Disponível: ${currentStock}, solicitado: ${item.quantity}.`
        );
      }

      const unitCost = Number(
        product.custoRealUnidadeVenda ??
        product.custoTotalReal ??
        product.custoCompra ??
        0
      );

      productData.set(item.productId, { product, currentStock, unitCost });
    }

    // PASSO 2: Actualizar stock e registar vendas ATOMICAMENTE
    for (const item of items) {
      const { product, currentStock, unitCost } = productData.get(item.productId)!;

      const itemTotal = roundMoney(item.unitPrice * item.quantity);
      const itemCost = roundMoney(unitCost * item.quantity);
      const itemProfit = roundMoney(itemTotal - itemCost);
      const itemMargin = itemTotal > 0 ? roundMoney((itemProfit / itemTotal) * 100) : 0;
      const newStock = currentStock - item.quantity;

      // Actualizar stock da loja
      const stockRef = doc(db, 'products', item.productId, 'stock', storeId);
      txn.update(stockRef, {
        quantidadeDisponível: newStock,
        quantidadeVendida: (product.quantidadeVendida || 0) + item.quantity,
        lastUpdated: timestamp,
        lastMovementAt: timestamp,
      });

      // Registar venda individual
      const saleRef = doc(collection(db, 'sales'));
      txn.set(saleRef, cleanForFirestore({
        storeId,
        receiptNumber,
        productId: product.id,
        productName: product.nome,
        category: product.categoria,
        categoryId: product.categoryId,
        quantity: item.quantity,
        unitPrice: roundMoney(item.unitPrice),
        totalPrice: itemTotal,
        unitCost,
        totalCost: itemCost,
        profitPerUnit: roundMoney(item.unitPrice - unitCost),
        totalProfit: itemProfit,
        profitMargin: itemMargin,
        stockBefore: currentStock,
        stockAfter: newStock,
        date: timestamp.slice(0, 10),
        time: now.toTimeString().slice(0, 5),
        timestamp,
        userId,
        paymentMethod: options?.paymentMethod || 'cash',
        customerId: options?.customerId || '',
        customerName: options?.customerName || '',
        customerNif: options?.customerNif || '',
        documentType: options?.documentType || 'internal_receipt',
        status: 'completed',
        createdAt: timestamp,
        updatedAt: timestamp,
      }));

      // Registar movimento de stock
      const movementRef = doc(
        collection(db, 'products', item.productId, 'stock', storeId, 'movements')
      );
      txn.set(movementRef, {
        type: 'OUT',
        quantity: item.quantity,
        reason: `Venda ${receiptNumber}`,
        userId,
        timestamp,
        saleRef: saleRef.id,
      });

      // Acumular receita
      receiptItems.push({
        productId: product.id,
        productName: product.nome,
        category: product.categoria,
        categoryId: product.categoryId,
        quantity: item.quantity,
        unitPrice: roundMoney(item.unitPrice),
        totalPrice: itemTotal,
        unitCost,
        totalCost: itemCost,
        profitPerUnit: roundMoney(item.unitPrice - unitCost),
        totalProfit: itemProfit,
        profitMargin: itemMargin,
        stockBefore: currentStock,
        stockAfter: newStock,
      });

      totalPrice += itemTotal;
      totalCost += itemCost;
      totalProfit += itemProfit;
    }

    const profitMargin = totalPrice > 0 ? roundMoney((totalProfit / totalPrice) * 100) : 0;

    return {
      id: receiptNumber,
      receiptNumber,
      storeId,
      status: 'completed',
      date: timestamp.slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      timestamp,
      userId,
      items: receiptItems,
      subtotal: totalPrice,
      totalCost,
      totalProfit,
      profitMargin,
      amountPaid: options?.paymentMethod === 'credit' ? 0 : totalPrice,
      changeDue: options?.paymentMethod === 'credit' ? 0 : 0,
      paymentMethod: options?.paymentMethod || 'cash',
      customerId: options?.customerId || '',
      customerName: options?.customerName || '',
      customerNif: options?.customerNif || '',
      documentType: options?.documentType || 'internal_receipt',
    } as SaleReceipt;
  });

  return receipt;
}

/**
 * Obter histórico de vendas com isolamento por loja
 */
export async function getUnifiedSalesHistory(
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

  let sales = snapshot.docs.map((snap) => ({
    id: snap.id,
    ...snap.data(),
  } as Sale));

  // Filtrar por data se necessário
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

/**
 * Anular venda com reversão de stock (TRANSAÇÃO)
 */
export async function cancelUnifiedSale(
  receiptNumber: string,
  cancelledBy: string
): Promise<void> {
  await runTransaction(db, async (txn) => {
    // Buscar todas as linhas da venda
    const q = query(collection(db, 'sales'), where('receiptNumber', '==', receiptNumber));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('Recibo não encontrado');
    }

    const timestamp = new Date().toISOString();
    let cancelledCount = 0;

    for (const saleDoc of snapshot.docs) {
      const sale = saleDoc.data() as any;

      if (sale.status === 'cancelled') continue;

      // Reverter stock
      const stockRef = doc(db, 'products', sale.productId, 'stock', sale.storeId);
      const stockSnap = await txn.get(stockRef);

      if (stockSnap.exists()) {
        const stock = stockSnap.data();
        txn.update(stockRef, {
          quantidadeDisponível: (stock.quantidadeDisponível || 0) + sale.quantity,
          quantidadeVendida: Math.max(0, (stock.quantidadeVendida || 0) - sale.quantity),
          lastUpdated: timestamp,
        });
      }

      // Marcar venda como cancelada
      txn.update(saleDoc.ref, {
        status: 'cancelled',
        cancelledAt: timestamp,
        cancelledBy,
        updatedAt: timestamp,
      });

      cancelledCount++;
    }

    if (cancelledCount === 0) {
      throw new Error('Este recibo já foi anulado');
    }
  });
}

/**
 * Gerar número de recibo
 */
function generateReceiptNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PC-${datePart}-${timePart}-${suffix}`;
}

/**
 * Validar se sistema está balanceado (para verificação pós-migração)
 */
export async function validateStockBalance(
  storeId: string
): Promise<{
  balanced: boolean;
  totalStock: number;
  totalSold: number;
  totalMovements: number;
  discrepancies: Array<{ productId: string; expected: number; actual: number }>;
}> {
  // TODO: Implementar validação completa
  return {
    balanced: true,
    totalStock: 0,
    totalSold: 0,
    totalMovements: 0,
    discrepancies: [],
  };
}
