/**
 * Tipos para Gestão de Estoque (Fase 13 Phase 2)
 * Define estruturas para movimentações e alertas de stock
 */

export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';
export type StockMovementReason =
  | 'purchase'        // Compra/entrada
  | 'sale'            // Venda
  | 'return'          // Devolução
  | 'loss'            // Perda/quebra
  | 'inventory'       // Ajuste de inventário
  | 'transfer'        // Transferência entre lojas
  | 'damage'          // Danificado
  | 'expiry'          // Vencimento
  | 'other';

export interface StockMovement {
  id: string;
  storeId: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  reason: StockMovementReason;
  reference?: string; // ID da venda, compra, etc
  timestamp: string; // ISO date string
  userId: string; // Quem registrou
  notes?: string;
  quantityAfter?: number; // Quantidade disponível após movimento
}

export interface StockAlertConfig {
  id: string;
  storeId: string;
  productId?: string;
  minQuantity: number;
  reorderQuantity: number;
  enableAutoAlert: boolean;
  alertChannels: ('in-app' | 'email' | 'whatsapp')[];
  createdAt: string;
  updatedAt: string;
}

export interface StockAlert {
  id: string;
  storeId: string;
  productId: string;
  productName: string;
  currentQuantity: number;
  minQuantity: number;
  reorderQuantity: number;
  severity: 'CRITICAL' | 'WARNING'; // CRITICAL: ≤2, WARNING: ≤5
  type: 'LOW_STOCK' | 'REORDER_SUGGESTED';
  createdAt: string;
  resolvedAt?: string;
  channels: ('in-app' | 'email' | 'whatsapp')[];
}

export interface StockAnalytics {
  productId: string;
  productName: string;
  totalIn: number;
  totalOut: number;
  currentQuantity: number;
  averageDaily: number;
  daysUntilEmpty: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  lastMovement: string; // ISO date
}

export interface StockMovementHistory {
  movements: StockMovement[];
  totalCount: number;
  dateRange: {
    from: string;
    to: string;
  };
}
