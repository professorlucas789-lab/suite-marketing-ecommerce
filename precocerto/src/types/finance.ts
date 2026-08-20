export type FinancialDirection = 'in' | 'out';

export type FinancialTransactionType =
  | 'sale_income'
  | 'customer_payment'
  | 'purchase_payment'
  | 'supplier_payment'
  | 'transfer_in'
  | 'transfer_out'
  | 'expense'
  | 'adjustment';

export type FinancialAccountType =
  | 'cash'
  | 'bank'
  | 'card'
  | 'mobile_money'
  | 'clearing'
  | 'other';

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
  accountId?: string;
  accountName?: string;
  accountType?: FinancialAccountType;
  category?: ExpenseCategory | string;
  description: string;
  sourceId?: string;
  sourceType?: 'sale' | 'customer' | 'supplier' | 'purchase' | 'manual' | 'transfer';
  partnerId?: string;
  partnerName?: string;
  transferGroupId?: string;
  reconciled?: boolean;
  reconciledAt?: string;
  reconciledBy?: string;
  reconciledByName?: string;
  reconciliationNotes?: string;
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

export interface FinancialAccountDescriptor {
  accountId: string;
  accountName: string;
  accountType: FinancialAccountType;
  paymentMethods: string[];
}

export interface FinancialAccountSummary extends FinancialAccountDescriptor {
  totalIn: number;
  totalOut: number;
  balance: number;
  transactionCount: number;
  unreconciledAmount: number;
  lastMovementAt?: string;
}

export interface PaymentMethodSummary {
  paymentMethod: string;
  label: string;
  totalIn: number;
  totalOut: number;
  net: number;
  transactionCount: number;
}

export interface ReconciliationSummary {
  pendingCount: number;
  pendingIn: number;
  pendingOut: number;
  pendingNet: number;
  reconciledCount: number;
}

export interface AccountTransferInput {
  storeId: string;
  storeName?: string;
  userId: string;
  userName?: string;
  amount: number;
  fromAccountId: string;
  fromAccountName: string;
  fromAccountType: FinancialAccountType;
  toAccountId: string;
  toAccountName: string;
  toAccountType: FinancialAccountType;
  notes?: string;
}

export interface ReconcileTransactionInput {
  transactionId: string;
  userId: string;
  userName?: string;
  notes?: string;
}
