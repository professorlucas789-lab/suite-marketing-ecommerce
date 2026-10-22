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
  DocumentReference,
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

    // PASSO 0: Validar quantidades (uma quantidade negativa aumentaria o stock)
    for (const item of items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        throw new Error(`Quantidade inválida para o produto ${item.productId}: ${item.quantity}`);
      }
    }

    // PASSO 1: Ler cada produto e o seu stock UMA vez, DENTRO DA TRANSAÇÃO
    // (o mesmo produto pode aparecer em várias linhas; todas as leituras têm de
    // ficar antes de qualquer escrita)
    const estado: Map<string, {
      product: Product;
      saldo: number;      // stock disponível, atualizado linha a linha
      vendida: number;    // quantidadeVendida da loja, atualizada linha a linha
      unitCost: number;
    }> = new Map();

    for (const item of items) {
      if (estado.has(item.productId)) continue;

      // Ler produto global
      const productSnap = await txn.get(doc(db, 'products', item.productId));

      if (!productSnap.exists()) {
        throw new Error(`Produto não encontrado: ${item.productId}`);
      }

      const product = { id: productSnap.id, ...productSnap.data() } as Product;

      // Ler stock da loja
      const stockSnap = await txn.get(doc(db, 'products', item.productId, 'stock', storeId));
      const stockAtual = stockSnap.exists() ? stockSnap.data() : {};

      const unitCost = Number(
        product.custoRealUnidadeVenda ??
        product.custoTotalReal ??
        product.custoCompra ??
        0
      );

      estado.set(item.productId, {
        product,
        saldo: stockAtual.quantidadeDisponível || 0,
        vendida: stockAtual.quantidadeVendida || 0,
        unitCost,
      });
    }

    // VALIDAÇÃO: stock suficiente para a SOMA das linhas de cada produto?
    const pedido = new Map<string, number>();
    for (const item of items) {
      pedido.set(item.productId, (pedido.get(item.productId) || 0) + item.quantity);
    }
    for (const [productId, quantidadePedida] of pedido) {
      const { product, saldo } = estado.get(productId)!;
      if (saldo < quantidadePedida) {
        throw new Error(
          `Stock insuficiente para "${product.nome}". Disponível: ${saldo}, solicitado: ${quantidadePedida}.`
        );
      }
    }

    // PASSO 2: Registar vendas e movimentos linha a linha, com saldos encadeados
    for (const item of items) {
      const linha = estado.get(item.productId)!;
      const { product, unitCost } = linha;
      const currentStock = linha.saldo;

      const itemTotal = roundMoney(item.unitPrice * item.quantity);
      const itemCost = roundMoney(unitCost * item.quantity);
      const itemProfit = roundMoney(itemTotal - itemCost);
      const itemMargin = itemTotal > 0 ? roundMoney((itemProfit / itemTotal) * 100) : 0;
      const newStock = currentStock - item.quantity;

      // Saldos desta linha (a próxima linha do mesmo produto parte daqui)
      linha.saldo = newStock;
      linha.vendida += item.quantity;

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

    // PASSO 3: Um único update de stock por produto, com o saldo final
    for (const [productId, { saldo, vendida }] of estado) {
      txn.update(doc(db, 'products', productId, 'stock', storeId), {
        quantidadeDisponível: saldo,
        quantidadeVendida: vendida,
        lastUpdated: timestamp,
        lastMovementAt: timestamp,
      });
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
 *
 * A consulta TEM de filtrar por storeId: as Security Rules só permitem ler
 * vendas da própria loja e rejeitam consultas que não o provem.
 */
export async function cancelUnifiedSale(
  storeId: string,
  receiptNumber: string,
  cancelledBy: string
): Promise<void> {
  if (!storeId) throw new Error('Loja obrigatória');

  // Buscar todas as linhas da venda (as consultas não correm dentro da transação)
  const q = query(
    collection(db, 'sales'),
    where('storeId', '==', storeId),
    where('receiptNumber', '==', receiptNumber)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('Recibo não encontrado');
  }

  await runTransaction(db, async (txn) => {
    // PASSO 1: LEITURAS. O Firestore exige todas as leituras antes de qualquer
    // escrita. O estado das vendas é relido dentro da transação para que duas
    // anulações simultâneas não revertam o stock duas vezes.
    const porAnular: Array<{ ref: DocumentReference; productId: string; quantity: number }> = [];

    for (const saleDoc of snapshot.docs) {
      const atual = await txn.get(saleDoc.ref);
      if (!atual.exists()) continue;

      const sale = atual.data() as any;
      if (sale.status === 'cancelled') continue;

      porAnular.push({ ref: saleDoc.ref, productId: sale.productId, quantity: Number(sale.quantity) || 0 });
    }

    if (porAnular.length === 0) {
      throw new Error('Este recibo já foi anulado');
    }

    // Quantidade a repor por produto (o mesmo produto pode ter várias linhas)
    const aRepor = new Map<string, number>();
    for (const { productId, quantity } of porAnular) {
      aRepor.set(productId, (aRepor.get(productId) || 0) + quantity);
    }

    const stocks: Array<{ ref: DocumentReference; atual: Record<string, any>; quantity: number }> = [];
    for (const [productId, quantity] of aRepor) {
      const stockRef = doc(db, 'products', productId, 'stock', storeId);
      const stockSnap = await txn.get(stockRef);
      if (stockSnap.exists()) {
        stocks.push({ ref: stockRef, atual: stockSnap.data(), quantity });
      }
    }

    // PASSO 2: ESCRITAS
    const timestamp = new Date().toISOString();

    for (const { ref, atual, quantity } of stocks) {
      txn.update(ref, {
        quantidadeDisponível: (atual.quantidadeDisponível || 0) + quantity,
        quantidadeVendida: Math.max(0, (atual.quantidadeVendida || 0) - quantity),
        lastUpdated: timestamp,
      });
    }

    for (const { ref } of porAnular) {
      txn.update(ref, {
        status: 'cancelled',
        cancelledAt: timestamp,
        cancelledBy,
        updatedAt: timestamp,
      });
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
