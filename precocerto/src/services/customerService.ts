import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Customer, CustomerPaymentInput } from '../types/customers';
import type { FinancialTransaction } from '../types/finance';
import { calculateCustomerBalance, validateCustomerPayment } from '../utils/customerLedgerUtils';

const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

const cleanForFirestore = <T extends Record<string, any>>(value: T): T => {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
};

export type CustomerInput = Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'currentBalance' | 'status'> & {
  status?: Customer['status'];
  currentBalance?: number;
};

export async function createCustomer(input: CustomerInput): Promise<string> {
  if (!input.storeId) throw new Error('Loja obrigatória para cadastrar cliente.');
  if (!input.userId) throw new Error('Utilizador obrigatório para cadastrar cliente.');
  if (!input.name.trim()) throw new Error('Nome do cliente é obrigatório.');

  const timestamp = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'customers'), cleanForFirestore({
    ...input,
    name: input.name.trim(),
    nif: input.nif?.trim() || '',
    phone: input.phone?.trim() || '',
    email: input.email?.trim() || '',
    address: input.address?.trim() || '',
    notes: input.notes?.trim() || '',
    status: input.status || 'active',
    creditLimit: roundMoney(input.creditLimit || 0),
    currentBalance: roundMoney(input.currentBalance || 0),
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  return docRef.id;
}

export async function updateCustomer(customerId: string, updates: Partial<CustomerInput>): Promise<void> {
  if (!customerId) throw new Error('Cliente inválido.');

  const timestamp = new Date().toISOString();
  await updateDoc(doc(db, 'customers', customerId), cleanForFirestore({
    ...updates,
    name: updates.name?.trim(),
    nif: updates.nif?.trim(),
    phone: updates.phone?.trim(),
    email: updates.email?.trim(),
    address: updates.address?.trim(),
    notes: updates.notes?.trim(),
    creditLimit: updates.creditLimit === undefined ? undefined : roundMoney(updates.creditLimit),
    currentBalance: updates.currentBalance === undefined ? undefined : roundMoney(updates.currentBalance),
    updatedAt: timestamp,
  }));
}

export async function recordCustomerPayment(input: CustomerPaymentInput): Promise<void> {
  if (!input.customerId) throw new Error('Cliente obrigatório para registar pagamento.');
  if (!input.storeId) throw new Error('Loja obrigatória para registar pagamento.');

  const customerRef = doc(db, 'customers', input.customerId);
  const customerSnap = await getDoc(customerRef);
  if (!customerSnap.exists()) throw new Error('Cliente não encontrado.');

  const customer = { id: customerSnap.id, ...customerSnap.data() } as Customer;
  if (customer.storeId !== input.storeId) {
    throw new Error('Este cliente não pertence à loja atual.');
  }

  const amount = roundMoney(input.amount);
  const paymentError = validateCustomerPayment(customer.currentBalance || 0, amount);
  if (paymentError) throw new Error(paymentError);

  const timestamp = new Date().toISOString();
  const balanceAfter = calculateCustomerBalance(customer.currentBalance || 0, 'payment', amount);
  const batch = writeBatch(db);
  const ledgerRef = doc(collection(db, 'customerLedger'));
  const financeRef = doc(collection(db, 'financialTransactions'));

  batch.update(customerRef, {
    currentBalance: balanceAfter,
    lastTransactionAt: timestamp,
    updatedAt: timestamp,
  });

  batch.set(ledgerRef, cleanForFirestore({
    customerId: input.customerId,
    customerName: customer.name,
    storeId: input.storeId,
    storeName: input.storeName,
    userId: input.userId,
    userName: input.userName,
    type: 'payment',
    amount,
    balanceAfter,
    paymentMethod: input.paymentMethod,
    description: input.notes?.trim() || `Pagamento de cliente ${customer.name}`,
    createdAt: timestamp,
  }));

  batch.set(financeRef, cleanForFirestore({
    storeId: input.storeId,
    storeName: input.storeName,
    userId: input.userId,
    userName: input.userName,
    direction: 'in',
    type: 'customer_payment',
    amount,
    paymentMethod: input.paymentMethod,
    description: input.notes?.trim() || `Pagamento de cliente ${customer.name}`,
    sourceId: input.customerId,
    sourceType: 'customer',
    partnerId: input.customerId,
    partnerName: customer.name,
    occurredAt: timestamp,
    createdAt: timestamp,
  } satisfies FinancialTransaction));

  await batch.commit();
}
