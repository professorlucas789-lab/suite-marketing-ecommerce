/**
 * Sales Types
 * Definições de tipos para o módulo de vendas
 * NOVO (Fase 13): Rastreamento de vendas
 */

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other' | 'credit';

/**
 * Sale Record
 * Registro de uma transação de venda
 */
export interface Sale {
  id: string;
  storeId: string;
  productId: string;
  productName: string;

  // Quantidade e preço
  quantity: number;
  unitPrice: number; // Preço unitário no momento da venda
  totalPrice: number; // quantity * unitPrice

  // Custos
  unitCost: number;
  totalCost: number;

  // Margens
  profitPerUnit: number;
  totalProfit: number;
  profitMargin: number; // percentagem real

  // Data/Hora
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  timestamp: string; // ISO full timestamp

  // Utilizador
  userId: string;
  userName?: string;

  // Detalhes opcionais
  customerId?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;

  // Auditoria
  createdAt: string;
  updatedAt: string;
}

/**
 * SalesKPI
 * Indicadores chave de desempenho de vendas
 */
export interface SalesKPI {
  totalSales: number; // Número de transações
  totalRevenue: number; // Receita total
  totalUnits: number; // Unidades vendidas
  totalCost: number; // Custo total
  totalProfit: number; // Lucro total
  averageTransactionValue: number;
  averageProfitMargin: number;
  topProduct: {
    productId: string;
    productName: string;
    units: number;
    revenue: number;
  } | null;
}
