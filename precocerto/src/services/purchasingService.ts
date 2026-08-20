import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Product } from '../types';
import type { StockMovement } from '../types/stock';
import type { FinancialTransaction } from '../types/finance';
import type { PurchaseLine, PurchaseReceipt, PurchaseReceiptInput, Supplier } from '../types/purchasing';
import {
  calculatePurchaseLineTotal,
  calculatePurchaseTotal,
  calculateWeightedAverageCost,
  normalizePurchasePayment,
} from '../utils/purchasingUtils';
import { getProductAvailableStock } from '../utils/stockUtils';

const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

const cleanForFirestore = <T extends Record<string, any>>(value: T): T => {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
};

const getUnitCost = (product: Product) =>
  Number(product.custoRealUnidadeVenda ?? product.custoTotalReal ?? product.custoCompra ?? 0);

const createPurchaseNumber = () => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PC-CMP-${datePart}-${timePart}-${suffix}`;
};

export type SupplierInput = Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'currentPayable' | 'status'> & {
  status?: Supplier['status'];
  currentPayable?: number;
};

export async function createSupplier(input: SupplierInput): Promise<string> {
  if (!input.storeId) throw new Error('Loja obrigatória para cadastrar fornecedor.');
  if (!input.userId) throw new Error('Utilizador obrigatório para cadastrar fornecedor.');
  if (!input.name.trim()) throw new Error('Nome do fornecedor é obrigatório.');

  const timestamp = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'suppliers'), cleanForFirestore({
    ...input,
    name: input.name.trim(),
    nif: input.nif?.trim() || '',
    phone: input.phone?.trim() || '',
    email: input.email?.trim() || '',
    address: input.address?.trim() || '',
    notes: input.notes?.trim() || '',
    status: input.status || 'active',
    currentPayable: roundMoney(input.currentPayable || 0),
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  return docRef.id;
}

export async function updateSupplier(supplierId: string, updates: Partial<SupplierInput>): Promise<void> {
  if (!supplierId) throw new Error('Fornecedor inválido.');

  const timestamp = new Date().toISOString();
  await updateDoc(doc(db, 'suppliers', supplierId), cleanForFirestore({
    ...updates,
    name: updates.name?.trim(),
    nif: updates.nif?.trim(),
    phone: updates.phone?.trim(),
    email: updates.email?.trim(),
    address: updates.address?.trim(),
    notes: updates.notes?.trim(),
    currentPayable: updates.currentPayable === undefined ? undefined : roundMoney(updates.currentPayable),
    updatedAt: timestamp,
  }));
}

export async function recordPurchaseReceipt(input: PurchaseReceiptInput): Promise<PurchaseReceipt> {
  if (!input.storeId) throw new Error('Loja obrigatória para registar compra.');
  if (!input.userId) throw new Error('Utilizador obrigatório para registar compra.');
  if (!input.supplierId) throw new Error('Selecione um fornecedor.');
  if (!input.invoiceNumber.trim()) throw new Error('Informe o número da fatura.');
  if (!input.invoiceDate) throw new Error('Informe a data da fatura.');
  if (!input.lines.length) throw new Error('Adicione pelo menos um produto à compra.');

  const timestamp = new Date().toISOString();
  const receiptNumber = createPurchaseNumber();
  const supplierRef = doc(db, 'suppliers', input.supplierId);
  const supplierSnap = await getDoc(supplierRef);
  if (!supplierSnap.exists()) throw new Error('Fornecedor não encontrado.');

  const supplier = { id: supplierSnap.id, ...supplierSnap.data() } as Supplier;
  if (supplier.storeId !== input.storeId) {
    throw new Error('Este fornecedor não pertence à loja atual.');
  }

  if (supplier.status !== 'active') {
    throw new Error('Fornecedor inativo. Ative o fornecedor antes de registar compras.');
  }

  const totalAmount = calculatePurchaseTotal(input.lines);
  const payment = normalizePurchasePayment(totalAmount, input.amountPaid, input.paymentStatus);
  const batch = writeBatch(db);
  const purchaseRef = doc(collection(db, 'purchases'));
  const purchaseLines: PurchaseLine[] = [];

  for (const line of input.lines) {
    if (!line.productId) throw new Error('Produto inválido na compra.');
    const productRef = doc(db, 'products', line.productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) throw new Error(`Produto não encontrado: ${line.productId}`);

    const product = { id: productSnap.id, ...productSnap.data() } as Product;
    if (product.storeId && product.storeId !== input.storeId) {
      throw new Error(`O produto "${product.nome}" não pertence à loja atual.`);
    }

    const stockBefore = getProductAvailableStock(product);
    const stockAfter = stockBefore + line.quantity;
    const previousUnitCost = getUnitCost(product);
    const updatedUnitCost = calculateWeightedAverageCost(stockBefore, previousUnitCost, line.quantity, line.unitCost);
    const lineTotal = calculatePurchaseLineTotal(line.quantity, line.unitCost);
    const movementRef = doc(collection(db, 'stockMovements'));

    batch.update(productRef, {
      fornecedor: supplier.name,
      quantidade: Number(product.quantidade || stockBefore) + line.quantity,
      quantidadeDisponivel: stockAfter,
      custoCompra: updatedUnitCost,
      custoTotalReal: updatedUnitCost,
      custoRealUnidadeVenda: updatedUnitCost,
      numeroFatura: input.invoiceNumber.trim(),
      dataEmissaoFatura: input.invoiceDate,
      updatedAt: timestamp,
      dataAtualizacao: timestamp,
    });

    const movement: StockMovement = {
      id: movementRef.id,
      movementType: 'purchase_in',
      productId: product.id!,
      productName: product.nome,
      category: product.categoria,
      sourceStoreId: input.storeId,
      sourceStoreName: input.storeName,
      quantity: line.quantity,
      stockBefore,
      stockAfter,
      reason: `Compra ${receiptNumber} · Fatura ${input.invoiceNumber.trim()}`,
      userId: input.userId,
      userName: input.userName,
      relatedMovementId: purchaseRef.id,
      supplierId: supplier.id,
      supplierName: supplier.name,
      invoiceNumber: input.invoiceNumber.trim(),
      createdAt: timestamp,
    };

    batch.set(movementRef, cleanForFirestore(movement));

    purchaseLines.push({
      productId: product.id!,
      productName: product.nome,
      category: product.categoria,
      quantity: line.quantity,
      unitCost: roundMoney(line.unitCost),
      lineTotal,
      stockBefore,
      stockAfter,
      previousUnitCost,
      updatedUnitCost,
    });
  }

  const purchase: PurchaseReceipt = {
    id: purchaseRef.id,
    receiptNumber,
    storeId: input.storeId,
    storeName: input.storeName,
    userId: input.userId,
    userName: input.userName,
    supplierId: supplier.id!,
    supplierName: supplier.name,
    invoiceNumber: input.invoiceNumber.trim(),
    invoiceDate: input.invoiceDate,
    paymentStatus: input.paymentStatus,
    paymentMethod: input.paymentMethod,
    amountPaid: payment.amountPaid,
    balanceDue: payment.balanceDue,
    totalAmount,
    notes: input.notes?.trim() || '',
    lines: purchaseLines,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  batch.set(purchaseRef, cleanForFirestore(purchase));
  if (payment.amountPaid > 0) {
    const financeRef = doc(collection(db, 'financialTransactions'));
    batch.set(financeRef, cleanForFirestore({
      storeId: input.storeId,
      storeName: input.storeName,
      userId: input.userId,
      userName: input.userName,
      direction: 'out',
      type: 'purchase_payment',
      amount: payment.amountPaid,
      paymentMethod: input.paymentMethod || (input.paymentStatus === 'paid' ? 'compra_paga' : 'pagamento_parcial'),
      description: `Pagamento da compra ${receiptNumber}`,
      sourceId: purchaseRef.id,
      sourceType: 'purchase',
      partnerId: supplier.id,
      partnerName: supplier.name,
      occurredAt: timestamp,
      createdAt: timestamp,
    } satisfies FinancialTransaction));
  }
  batch.update(supplierRef, {
    currentPayable: roundMoney((supplier.currentPayable || 0) + payment.balanceDue),
    lastPurchaseAt: timestamp,
    updatedAt: timestamp,
  });

  await batch.commit();
  return purchase;
}
