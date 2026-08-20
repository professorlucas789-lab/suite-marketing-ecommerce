import {
  addDoc,
  collection,
  doc,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { ExpenseInput, FinancialTransaction, SupplierPaymentInput } from '../types/finance';
import type { Supplier } from '../types/purchasing';
import { assertPositiveAmount } from '../utils/financeUtils';

const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

const cleanForFirestore = <T extends Record<string, any>>(value: T): T => {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
};

export async function recordExpense(input: ExpenseInput): Promise<string> {
  assertPositiveAmount(input.amount);
  if (!input.storeId) throw new Error('Loja obrigatória para registar despesa.');
  if (!input.userId) throw new Error('Utilizador obrigatório para registar despesa.');
  if (!input.description.trim()) throw new Error('Informe a descrição da despesa.');

  const timestamp = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'financialTransactions'), cleanForFirestore({
    storeId: input.storeId,
    storeName: input.storeName,
    userId: input.userId,
    userName: input.userName,
    direction: 'out',
    type: 'expense',
    amount: roundMoney(input.amount),
    paymentMethod: input.paymentMethod,
    category: input.category,
    description: input.description.trim(),
    sourceType: 'manual',
    occurredAt: input.occurredAt || timestamp,
    createdAt: timestamp,
  } satisfies FinancialTransaction));

  return docRef.id;
}

export async function recordSupplierPayment(input: SupplierPaymentInput): Promise<void> {
  assertPositiveAmount(input.amount);
  if (!input.supplierId) throw new Error('Fornecedor obrigatório para registar pagamento.');
  if (!input.storeId) throw new Error('Loja obrigatória para registar pagamento.');

  const supplierRef = doc(db, 'suppliers', input.supplierId);
  const supplierSnap = await getDoc(supplierRef);
  if (!supplierSnap.exists()) throw new Error('Fornecedor não encontrado.');

  const supplier = { id: supplierSnap.id, ...supplierSnap.data() } as Supplier;
  if (supplier.storeId !== input.storeId) {
    throw new Error('Este fornecedor não pertence à loja atual.');
  }

  const amount = roundMoney(input.amount);
  const currentPayable = roundMoney(supplier.currentPayable || 0);
  if (currentPayable <= 0) throw new Error('Este fornecedor não tem saldo em aberto.');
  if (amount > currentPayable) throw new Error('O pagamento não pode ser maior que o saldo em aberto.');

  const timestamp = new Date().toISOString();
  const balanceAfter = roundMoney(currentPayable - amount);
  const batch = writeBatch(db);
  const ledgerRef = doc(collection(db, 'supplierLedger'));
  const financeRef = doc(collection(db, 'financialTransactions'));

  batch.update(supplierRef, {
    currentPayable: balanceAfter,
    updatedAt: timestamp,
  });

  batch.set(ledgerRef, cleanForFirestore({
    supplierId: input.supplierId,
    supplierName: supplier.name,
    storeId: input.storeId,
    storeName: input.storeName,
    userId: input.userId,
    userName: input.userName,
    type: 'payment',
    amount,
    balanceAfter,
    paymentMethod: input.paymentMethod,
    description: input.notes?.trim() || `Pagamento ao fornecedor ${supplier.name}`,
    createdAt: timestamp,
  }));

  batch.set(financeRef, cleanForFirestore({
    storeId: input.storeId,
    storeName: input.storeName,
    userId: input.userId,
    userName: input.userName,
    direction: 'out',
    type: 'supplier_payment',
    amount,
    paymentMethod: input.paymentMethod,
    description: input.notes?.trim() || `Pagamento ao fornecedor ${supplier.name}`,
    sourceId: input.supplierId,
    sourceType: 'supplier',
    partnerId: input.supplierId,
    partnerName: supplier.name,
    occurredAt: timestamp,
    createdAt: timestamp,
  } satisfies FinancialTransaction));

  await batch.commit();
}
