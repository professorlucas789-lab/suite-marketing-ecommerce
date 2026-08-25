import {
  collection,
  doc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Product } from "../types";
import type { StockAdjustmentInput, StockMovement, StockTransferInput } from "../types/stock";
import { calculateAdjustedStock, getProductAvailableStock } from "../utils/stockUtils";

const cleanForFirestore = <T extends Record<string, any>>(value: T): T => {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
};

function assertPositiveQuantity(quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("A quantidade deve ser maior que zero.");
  }
}

export async function adjustProductStock(input: StockAdjustmentInput): Promise<StockMovement> {
  if (input.adjustmentType === "correction") {
    if (!Number.isFinite(input.quantity) || input.quantity < 0) {
      throw new Error("O stock corrigido não pode ser negativo.");
    }
  } else {
    assertPositiveQuantity(input.quantity);
  }

  if (!input.reason.trim()) {
    throw new Error("Informe o motivo do movimento de stock.");
  }

  const timestamp = new Date().toISOString();
  const productRef = doc(db, "products", input.productId);
  const productSnap = await getDoc(productRef);

  if (!productSnap.exists()) {
    throw new Error("Produto não encontrado.");
  }

  const product = { id: productSnap.id, ...productSnap.data() } as Product;
  if (product.storeId && product.storeId !== input.storeId) {
    throw new Error("Produto não pertence à unidade atual.");
  }

  const stockBefore = getProductAvailableStock(product);
  const stockAfter = calculateAdjustedStock(stockBefore, input.quantity, input.adjustmentType);
  const movementRef = doc(collection(db, "stockMovements"));

  const movement: StockMovement = {
    id: movementRef.id,
    movementType: input.adjustmentType,
    productId: product.id!,
    productName: product.nome,
    category: product.categoria,
    sourceStoreId: input.storeId,
    sourceStoreName: input.storeName,
    quantity: input.quantity,
    stockBefore,
    stockAfter,
    reason: input.reason.trim(),
    userId: input.userId,
    userName: input.userName,
    createdAt: timestamp,
  };

  const batch = writeBatch(db);
  batch.update(productRef, {
    quantidadeDisponivel: stockAfter,
    updatedAt: timestamp,
    dataAtualizacao: timestamp,
  });
  batch.set(movementRef, cleanForFirestore(movement));
  await batch.commit();

  return movement;
}

export async function transferProductStock(input: StockTransferInput): Promise<{
  sourceMovement: StockMovement;
  destinationMovement: StockMovement;
  destinationProductId: string;
}> {
  assertPositiveQuantity(input.quantity);

  if (!input.reason.trim()) {
    throw new Error("Informe o motivo da transferência.");
  }

  if (input.sourceStoreId === input.destinationStoreId) {
    throw new Error("A unidade de destino deve ser diferente da origem.");
  }

  const timestamp = new Date().toISOString();
  const sourceProductRef = doc(db, "products", input.productId);
  const sourceProductSnap = await getDoc(sourceProductRef);

  if (!sourceProductSnap.exists()) {
    throw new Error("Produto de origem não encontrado.");
  }

  const sourceProduct = { id: sourceProductSnap.id, ...sourceProductSnap.data() } as Product;
  if (sourceProduct.storeId && sourceProduct.storeId !== input.sourceStoreId) {
    throw new Error("Produto não pertence à unidade de origem.");
  }

  const sourceStockBefore = getProductAvailableStock(sourceProduct);
  if (sourceStockBefore < input.quantity) {
    throw new Error(`Stock insuficiente. Disponível: ${sourceStockBefore}, solicitado: ${input.quantity}.`);
  }

  const sourceStockAfter = sourceStockBefore - input.quantity;
  const destinationProductRef = doc(collection(db, "products"));
  const sourceMovementRef = doc(collection(db, "stockMovements"));
  const destinationMovementRef = doc(collection(db, "stockMovements"));
  const batch = writeBatch(db);

  const sourceMovement: StockMovement = {
    id: sourceMovementRef.id,
    movementType: "transfer_out",
    productId: sourceProduct.id!,
    productName: sourceProduct.nome,
    category: sourceProduct.categoria,
    sourceStoreId: input.sourceStoreId,
    sourceStoreName: input.sourceStoreName,
    destinationStoreId: input.destinationStoreId,
    destinationStoreName: input.destinationStoreName,
    quantity: input.quantity,
    stockBefore: sourceStockBefore,
    stockAfter: sourceStockAfter,
    reason: input.reason.trim(),
    userId: input.userId,
    userName: input.userName,
    relatedProductId: destinationProductRef.id,
    relatedMovementId: destinationMovementRef.id,
    createdAt: timestamp,
  };

  const destinationMovement: StockMovement = {
    id: destinationMovementRef.id,
    movementType: "transfer_in",
    productId: destinationProductRef.id,
    productName: sourceProduct.nome,
    category: sourceProduct.categoria,
    sourceStoreId: input.sourceStoreId,
    sourceStoreName: input.sourceStoreName,
    destinationStoreId: input.destinationStoreId,
    destinationStoreName: input.destinationStoreName,
    quantity: input.quantity,
    stockBefore: 0,
    stockAfter: input.quantity,
    reason: input.reason.trim(),
    userId: input.userId,
    userName: input.userName,
    relatedProductId: sourceProduct.id,
    relatedMovementId: sourceMovementRef.id,
    createdAt: timestamp,
  };

  const destinationProduct = cleanForFirestore({
    ...sourceProductSnap.data(),
    storeId: input.destinationStoreId,
    storeName: input.destinationStoreName,
    quantidade: input.quantity,
    quantidadeDisponivel: input.quantity,
    quantidadeVendida: 0,
    transferSourceProductId: sourceProduct.id,
    transferSourceStoreId: input.sourceStoreId,
    transferSourceStoreName: input.sourceStoreName,
    transferReason: input.reason.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
    dataAtualizacao: timestamp,
  });

  batch.update(sourceProductRef, {
    quantidadeDisponivel: sourceStockAfter,
    updatedAt: timestamp,
    dataAtualizacao: timestamp,
  });
  batch.set(destinationProductRef, destinationProduct);
  batch.set(sourceMovementRef, cleanForFirestore(sourceMovement));
  batch.set(destinationMovementRef, cleanForFirestore(destinationMovement));
  await batch.commit();

  return {
    sourceMovement,
    destinationMovement,
    destinationProductId: destinationProductRef.id,
  };
}
