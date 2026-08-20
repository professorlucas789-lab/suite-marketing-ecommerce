export type FinancialDirection = 'in' | 'out';

export type FinancialTransactionType =
  | 'sale_income'
  | 'customer_payment'
  | 'purchase_payment'
  | 'supplier_payment'
  | 'expense'
  | 'adjustment';

export type ExpenseCategory =
  | 'rent'
  | 'salary'
  | 'utilities'
  | 'transport'
  | 'tax'
  | 'marketing'
  | 'maintenance'
  | 'bank_fee'
  | 'other';

export interface FinancialTransaction {
  id?: string;
  storeId: string;
  storeName?: string;
  userId: string;
  userName?: string;
  direction: FinancialDirection;
  type: FinancialTransactionType;
  amount: number;
  paymentMethod: string;
  category?: ExpenseCategory | string;
  description: string;
  sourceId?: string;
  sourceType?: 'sale' | 'customer' | 'supplier' | 'purchase' | 'manual';
  partnerId?: string;
  partnerName?: string;
  occurredAt: string;
  createdAt: string;
}

export interface FinancialSummary {
  totalIn: number;
  totalOut: number;
  netCashFlow: number;
  receivables: number;
  payables: number;
  operationalBalance: number;
  transactionCount: number;
}

export interface ExpenseInput {
  storeId: string;
  storeName?: string;
  userId: string;
  userName?: string;
  amount: number;
  paymentMethod: string;
  category: ExpenseCategory;
  description: string;
  occurredAt: string;
}

export interface SupplierPaymentInput {
  supplierId: string;
  storeId: string;
  storeName?: string;
  userId: string;
  userName?: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
}
