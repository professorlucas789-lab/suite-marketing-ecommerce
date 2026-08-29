/**
 * Tipos para Gestão de Estoque
 * FASE 2: Gestão de Estoque Automática
 *
 * Define interfaces para:
 * - Movimentações de stock (entrada/saída/ajuste)
 * - Configuração de alertas de stock
 * - Alertas de stock baixo
 * - Histórico e auditoria
 */

export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';
export type StockMovementReason =
  | 'purchase'           // Compra ao fornecedor
  | 'sale'               // Venda ao cliente
  | 'return'             // Devolução do cliente
  | 'damage'             // Produto danificado
  | 'expiry'             // Produto expirado
  | 'inventory_count'    // Contagem física
  | 'transfer'           // Transferência entre armazéns
  | 'loss'               // Perda não identificada
  | 'adjustment'         // Ajuste manual
  | 'other';             // Outro

/**
 * Movimentação de Stock
 * Regista cada entrada/saída de produto
 */
export interface StockMovement {
  id: string;
  storeId: string;
  productId: string;
  productName: string;

  // Tipo de movimento
  type: StockMovementType;        // IN, OUT, ADJUSTMENT
  reason: StockMovementReason;    // Motivo específico

  // Quantidades
  quantity: number;               // Quantidade movida
  previousQuantity: number;       // Quantidade antes
  newQuantity: number;            // Quantidade depois

  // Referências
  reference?: string;             // ID de venda, compra, etc
  batchNumber?: string;           // Lote de produto

  // Auditoria
  timestamp: string;              // ISO 8601
  createdBy: string;              // ID do utilizador
  notes?: string;

  // Metadados
  unitCost?: number;              // Custo unitário (para cálculo de perda)
  totalCost?: number;             // Custo total da movimentação
}

/**
 * Configuração de Alertas de Stock
 * Define limites por produto/categoria
 */
export interface StockAlertConfig {
  id: string;
  storeId: string;

  // Escopo
  productId?: string;             // Por produto OU
  categoryId?: string;            // Por categoria

  // Limiares
  minQuantity: number;            // Quantidade mínima (alerta)
  reorderQuantity?: number;       // Quantidade sugerida para reabastecer
  maxQuantity?: number;           // Quantidade máxima (opcional)

  // Comportamento
  enableAutoAlert: boolean;
  alertChannels: ('in-app' | 'email' | 'whatsapp')[];
  notifyOnReorder?: boolean;      // Avisar quando sugerir reabastecimento

  // Configuração
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Alerta de Stock Baixo
 * Criado quando stock < minQuantity
 */
export interface StockAlert {
  id: string;
  storeId: string;
  productId: string;
  productName: string;

  // Status
  currentQuantity: number;
  minQuantity: number;
  reorderQuantity?: number;
  severity: 'LOW' | 'CRITICAL';   // LOW: alert, CRITICAL: urgent action

  // Auditoria
  createdAt: string;
  triggeredAt?: string;           // Quando foi enviada notificação
  acknowledgedAt?: string;
  resolvedAt?: string;            // Quando stock voltou ao normal

  // Canais
  channels: ('in-app' | 'email' | 'whatsapp')[];
  notificationIds?: Record<string, string>;

  // Sugestão
  suggestedReorderQuantity?: number;
  daysUntilStockout?: number;     // Previsão de dias até esgotar
}

/**
 * Histórico de Stock
 * Para auditoria e análise
 */
export interface StockHistory {
  id: string;
  storeId: string;
  productId: string;

  movementId: string;
  type: StockMovementType;
  reason: StockMovementReason;

  quantity: number;
  previousQuantity: number;
  newQuantity: number;

  timestamp: string;
  userId?: string;

  details?: {
    reference?: string;
    batchNumber?: string;
    unitCost?: number;
    totalCost?: number;
    notes?: string;
  };
}

/**
 * Análise de Stock
 * Para gráficos e relatórios
 */
export interface StockAnalytics {
  productId: string;
  productName: string;
  storeId: string;

  // Dados atuais
  currentQuantity: number;
  minQuantity: number;
  maxQuantity?: number;

  // Histórico
  quantityHistory: Array<{
    date: string;       // YYYY-MM-DD
    quantity: number;
  }>;

  // Análise
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercent: number;           // % de mudança
  averageDailyUsage: number;
  daysUntilStockout?: number;     // Previsão se trend continuar
  turnoverRate?: number;          // Vezes por mês

  // Custo
  totalValue: number;             // currentQuantity * unitCost
  costOfGoods?: number;           // Custo total de produtos em stock

  // Sazonalidade
  seasonalFactor?: number;        // Multiplier para picos sazonais
}

/**
 * Relatório de Reabastecimento Sugerido
 */
export interface ReorderReport {
  id: string;
  storeId: string;
  generatedAt: string;

  itemsToReorder: Array<{
    productId: string;
    productName: string;
    currentQuantity: number;
    minQuantity: number;
    suggestedQuantity: number;
    estimatedCost: number;
    daysUntilStockout: number;
    priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  }>;

  totalSuggestedCost: number;
  totalItems: number;
}

/**
 * Auditoria de Stock
 * Contagem física vs sistema
 */
export interface StockAudit {
  id: string;
  storeId: string;
  auditDate: string;

  items: Array<{
    productId: string;
    productName: string;
    systemQuantity: number;
    physicalQuantity: number;
    difference: number;
    discrepancyPercent: number;
    status: 'MATCH' | 'DISCREPANCY';
    notes?: string;
  }>;

  totalSystemQuantity: number;
  totalPhysicalQuantity: number;
  totalDiscrepancy: number;
  accuracy: number;               // % de correspondência

  performedBy: string;
  createdAt: string;
}
