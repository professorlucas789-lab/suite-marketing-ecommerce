export type CustomerStatus = 'active' | 'inactive';
export type CustomerLedgerEntryType = 'sale_credit' | 'payment' | 'adjustment';

export interface Customer {
  id?: string;
  storeId: string;
  storeName?: string;
  userId: string;
  name: string;
  nif?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: CustomerStatus;
  creditLimit: number;
  currentBalance: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastTransactionAt?: string;
}

export interface CustomerLedgerEntry {
  id?: string;
  customerId: string;
  customerName: string;
  storeId: string;
  storeName?: string;
  userId: string;
  userName?: string;
  type: CustomerLedgerEntryType;
  amount: number;
  balanceAfter: number;
  receiptNumber?: string;
  paymentMethod?: string;
  description: string;
  createdAt: string;
}

export interface CustomerSummary {
  totalCustomers: number;
  activeCustomers: number;
  customersWithDebt: number;
  totalBalance: number;
  totalCreditLimit: number;
  availableCredit: number;
}

export interface CustomerPaymentInput {
  customerId: string;
  storeId: string;
  storeName?: string;
  userId: string;
  userName?: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
}
