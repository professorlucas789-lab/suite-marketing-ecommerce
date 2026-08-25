export type SupplierStatus = 'active' | 'inactive';
export type PurchasePaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface Supplier {
  id?: string;
  storeId: string;
  storeName?: string;
  userId: string;
  name: string;
  nif?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: SupplierStatus;
  currentPayable: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastPurchaseAt?: string;
}

export interface PurchaseLineInput {
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface PurchaseLine {
  productId: string;
  productName: string;
  category?: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
  stockBefore: number;
  stockAfter: number;
  previousUnitCost: number;
  updatedUnitCost: number;
}

export interface PurchaseReceiptInput {
  storeId: string;
  storeName?: string;
  userId: string;
  userName?: string;
  supplierId: string;
  invoiceNumber: string;
  invoiceDate: string;
  paymentStatus: PurchasePaymentStatus;
  paymentMethod?: string;
  amountPaid?: number;
  notes?: string;
  lines: PurchaseLineInput[];
}

export interface PurchaseReceipt {
  id?: string;
  receiptNumber: string;
  storeId: string;
  storeName?: string;
  userId: string;
  userName?: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  paymentStatus: PurchasePaymentStatus;
  paymentMethod?: string;
  amountPaid: number;
  balanceDue: number;
  totalAmount: number;
  notes?: string;
  lines: PurchaseLine[];
  createdAt: string;
  updatedAt: string;
}

export interface SupplierSummary {
  totalSuppliers: number;
  activeSuppliers: number;
  suppliersWithDebt: number;
  totalPayable: number;
}
