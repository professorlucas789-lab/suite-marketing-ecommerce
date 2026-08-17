/**
 * Tipos de Inventário/Estoque
 * Gestão de movimentações de stock
 * Fase 5: Gestão de Estoque
 */

/**
 * Tipo de movimentação de stock
 */
export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

/**
 * Razão da movimentação
 */
export type MovementReason =
  | 'Compra'
  | 'Venda'
  | 'Devolução'
  | 'Perda'
  | 'Ajuste'
  | 'Reabastecimento'
  | 'Inventário'
  | 'Outro';

/**
 * Registro de movimentação de stock
 */
export interface StockMovement {
  id: string;
  storeId: string;
  productId: string;
  productName: string;
  type: StockMovementType; // IN, OUT, ADJUSTMENT
  quantity: number; // Quantidade movimentada (sempre positiva)
  reason: MovementReason;
  reference?: string; // ID da venda, compra, etc
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  userId: string; // Quem registou
  userName?: string; // Nome do utilizador
  notes?: string; // Notas adicionais
  costUnitPrice?: number; // Custo unitário (para compras)
  stockBefore?: number; // Stock antes da movimentação
  stockAfter?: number; // Stock após movimentação
}

/**
 * Configuração de alertas de stock
 */
export interface StockAlertConfig {
  id: string;
  storeId: string;
  productId: string;
  productName: string;
  minQuantity: number; // Quantidade mínima de alerta
  reorderQuantity: number; // Sugerir reabastecimento quando < min
  enableAutoAlert: boolean; // Ativar alertas automáticos
  alertChannels: Array<'in-app' | 'email' | 'whatsapp'>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Alerta de stock baixo
 */
export interface StockAlert {
  id: string;
  storeId: string;
  productId: string;
  productName: string;
  currentQuantity: number;
  minQuantity: number;
  daysUntilStockout?: number; // Previsão
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

/**
 * Sumário de estoque
 */
export interface StockSummary {
  totalProducts: number;
  productsInStock: number; // Quantidade > 0
  productsOutOfStock: number; // Quantidade = 0
  productsLowStock: number; // Quantidade < min
  totalQuantity: number; // Soma de todas as quantidades
  totalValue: number; // Soma de (quantidade × custo médio)
  criticalAlerts: number;
  warningAlerts: number;
}

/**
 * Relatório de movimentação por período
 */
export interface StockMovementReport {
  period: {
    from: string; // ISO
    to: string; // ISO
  };
  storeId: string;
  totalMovements: number;
  inMovements: number;
  outMovements: number;
  adjustmentMovements: number;
  totalInQuantity: number;
  totalOutQuantity: number;
  topInProducts: Array<{ productId: string; productName: string; quantity: number }>;
  topOutProducts: Array<{ productId: string; productName: string; quantity: number }>;
  byReason: Record<MovementReason, number>;
}

/**
 * Tendência de stock
 */
export interface StockTrend {
  productId: string;
  productName: string;
  currentQuantity: number;
  avgDailyUsage: number;
  daysUntilStockout: number; // Previsão
  trend: 'increasing' | 'stable' | 'decreasing';
  lastMovement: StockMovement | null;
}

/**
 * Configuração padrão para alertas
 */
export const DEFAULT_STOCK_ALERT_CONFIG: Partial<StockAlertConfig> = {
  minQuantity: 10,
  reorderQuantity: 50,
  enableAutoAlert: true,
  alertChannels: ['in-app'],
};
