export type StockAdjustmentType = "in" | "out" | "correction";

export type StockMovementType =
  | "in"
  | "out"
  | "correction"
  | "transfer_out"
  | "transfer_in"
  | "sale"
  | "return";

export interface StockMovement {
  id?: string;
  movementType: StockMovementType;
  productId: string;
  productName: string;
  category?: string;
  sourceStoreId: string;
  sourceStoreName?: string;
  destinationStoreId?: string;
  destinationStoreName?: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reason: string;
  userId: string;
  userName?: string;
  relatedProductId?: string;
  relatedMovementId?: string;
  createdAt: string;
}

export interface StockAdjustmentInput {
  productId: string;
  storeId: string;
  storeName?: string;
  adjustmentType: StockAdjustmentType;
  quantity: number;
  reason: string;
  userId: string;
  userName?: string;
}

export interface StockTransferInput {
  productId: string;
  sourceStoreId: string;
  sourceStoreName?: string;
  destinationStoreId: string;
  destinationStoreName?: string;
  quantity: number;
  reason: string;
  userId: string;
  userName?: string;
}

export interface StockSummary {
  totalProducts: number;
  totalUnits: number;
  totalStockValue: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}
