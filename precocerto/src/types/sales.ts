/**
 * Sales domain types
 * Internal POS, receipt and stock-control records.
 */

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'transfer'
  | 'multicaixa'
  | 'mobile_money'
  | 'credit'
  | 'cheque'
  | 'other';

export type SaleDocumentType = 'internal_receipt' | 'internal_invoice_receipt';
export type SaleStatus = 'completed' | 'cancelled';

export interface SaleItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface SaleTransactionInput {
  storeId: string;
  storeName?: string;
  userId: string;
  userName?: string;
  customerName?: string;
  customerNif?: string;
  paymentMethod: PaymentMethod;
  documentType: SaleDocumentType;
  notes?: string;
  items: SaleItemInput[];
}

export interface SaleReceiptItem {
  productId: string;
  productName: string;
  category?: string;
  categoryId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unitCost: number;
  totalCost: number;
  profitPerUnit: number;
  totalProfit: number;
  profitMargin: number;
  stockBefore: number;
  stockAfter: number;
}

export interface SaleReceipt {
  id: string;
  receiptNumber: string;
  storeId: string;
  storeName?: string;
  customerName?: string;
  customerNif?: string;
  paymentMethod: PaymentMethod;
  documentType: SaleDocumentType;
  status: SaleStatus;
  date: string;
  time: string;
  timestamp: string;
  userId: string;
  userName?: string;
  notes?: string;
  items: SaleReceiptItem[];
  subtotal: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
}

/**
 * Sale line stored in Firestore.
 * A multi-item sale is stored as one line per product with the same receiptNumber.
 */
export interface Sale {
  id: string;
  storeId: string;
  storeName?: string;
  receiptNumber?: string;
  documentType?: SaleDocumentType;
  status?: SaleStatus;

  productId: string;
  productName: string;
  category?: string;
  categoryId?: string;

  quantity: number;
  unitPrice: number;
  totalPrice: number;

  unitCost: number;
  totalCost: number;
  profitPerUnit: number;
  totalProfit: number;
  profitMargin: number;

  // Backward-compatible aliases used by older components/services.
  costUnitPrice?: number;
  costTotal?: number;
  profitTotal?: number;
  margemReal?: number;

  stockBefore?: number;
  stockAfter?: number;

  date: string;
  time: string;
  timestamp: string;

  userId: string;
  userName?: string;
  customerId?: string;
  customerName?: string;
  customerNif?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;

  createdAt: string;
  updatedAt?: string;
}

export interface SalesKPIs {
  period?: { from: string; to: string };
  storeId?: string;
  totalSales: number;
  totalTransactions: number;
  totalRevenue: number;
  totalUnits: number;
  totalCost: number;
  totalProfit: number;
  averageTransactionValue: number;
  avgTransactionValue: number;
  avgProfitPerTransaction: number;
  averageProfitMargin: number;
  avgMargin: number;
  minMargin: number;
  maxMargin: number;
  paymentMethods: Record<PaymentMethod, number>;
  topProduct: {
    productId: string;
    productName: string;
    units: number;
    revenue: number;
  } | null;
}

export interface ProductSaleMetric {
  productId: string;
  productName: string;
  category?: string;
  quantity: number;
  totalRevenue: number;
  totalProfit: number;
  avgMargin: number;
  avgPrice: number;
  salesCount: number;
}

export interface CategorySaleMetric {
  categoryId: string;
  categoryName: string;
  quantity: number;
  totalRevenue: number;
  totalProfit: number;
  avgMargin: number;
  productsCount: number;
  salesCount: number;
}

export interface DailySalesMetric {
  date: string;
  quantity: number;
  revenue: number;
  profit: number;
  transactions: number;
}

export interface SalesReport {
  period: { from: string; to: string; label?: string };
  storeId: string;
  kpis: SalesKPIs;
  topProducts: ProductSaleMetric[];
  topCategories: CategorySaleMetric[];
  dailySales: DailySalesMetric[];
}

export interface SalesTrend {
  productId: string;
  productName: string;
  period: number;
  totalQuantity: number;
  avgDaily: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  lastSale: Sale;
}
