/**
 * Tipos de Vendas
 * Rastreamento de transações de venda
 * Fase 6: Módulo de Vendas
 */

/**
 * Método de pagamento
 */
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'cheque' | 'other';

/**
 * Registro de venda
 */
export interface Sale {
  id: string;
  storeId: string;
  productId: string;
  productName: string;
  category?: string;
  quantity: number; // Quantidade vendida
  unitPrice: number; // Preço unitário praticado (Kz)
  totalPrice: number; // quantity × unitPrice
  costUnitPrice: number; // Custo unitário no momento da venda
  costTotal: number; // quantity × costUnitPrice
  profitTotal: number; // totalPrice - costTotal
  margemReal: number; // (profitTotal / totalPrice) × 100
  markup?: number; // Markup aplicado

  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string (data/hora exata)
  userId: string; // Quem registou a venda
  userName?: string; // Nome do utilizador

  paymentMethod?: PaymentMethod;
  customerId?: string; // Para CRM futuro
  notes?: string;

  // Auditoria
  createdAt: string;
  updatedAt?: string;
}

/**
 * KPIs de vendas
 */
export interface SalesKPIs {
  period: {
    from: string; // ISO
    to: string; // ISO
  };
  storeId: string;

  // Volume
  totalTransactions: number; // Número de vendas
  totalUnits: number; // Total de unidades vendidas

  // Receita
  totalRevenue: number; // Receita total
  avgTransactionValue: number; // Ticket médio

  // Lucro
  totalCost: number; // Custo total
  totalProfit: number; // Lucro total
  avgProfitPerTransaction: number; // Lucro médio por venda

  // Margem
  avgMargin: number; // Margem média (%)
  minMargin: number; // Margem mínima
  maxMargin: number; // Margem máxima

  // Pagamentos
  paymentMethods?: Record<PaymentMethod, number>;
}

/**
 * Métrica de vendas por produto
 */
export interface ProductSaleMetric {
  productId: string;
  productName: string;
  category?: string;
  quantity: number; // Total vendido
  totalRevenue: number;
  totalProfit: number;
  avgMargin: number;
  avgPrice: number; // Preço médio praticado
  salesCount: number; // Número de vezes vendido
}

/**
 * Métrica de vendas por categoria
 */
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

/**
 * Relatório de vendas por período
 */
export interface SalesReport {
  period: {
    from: string; // ISO
    to: string; // ISO
    label: string; // "Hoje", "Última semana", "Agosto 2026", etc
  };
  storeId: string;

  kpis: SalesKPIs;
  topProducts: ProductSaleMetric[]; // Top 10
  topCategories: CategorySaleMetric[]; // Top 5

  dailySales?: Array<{
    date: string; // YYYY-MM-DD
    quantity: number;
    revenue: number;
    profit: number;
    transactions: number;
  }>;
}

/**
 * Trend de vendas
 */
export interface SalesTrend {
  productId: string;
  productName: string;
  period: number; // Dias analisados
  totalQuantity: number;
  avgDaily: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  lastSale?: Sale;
}

/**
 * Comparação de período
 */
export interface SalesPeriodComparison {
  current: SalesKPIs;
  previous: SalesKPIs;
  growth: {
    revenue: number; // % de crescimento
    profit: number;
    transactions: number;
    units: number;
  };
}
