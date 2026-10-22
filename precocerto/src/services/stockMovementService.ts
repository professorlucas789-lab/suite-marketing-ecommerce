import {
  collection,
  doc,
  runTransaction,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Product } from "../types";
import type { StockAdjustmentInput, StockMovement, StockTransferInput } from "../types/stock";
import { calculateAdjustedStock } from "../utils/stockUtils";
import { lerStockAtual, aplicarEscritaStock } from "../utils/unifiedStock";

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

  // O stock da loja (products/{id}/stock/{storeId}) é a fonte de verdade; o documento
  // do produto é atualizado como espelho na mesma transação (ver utils/unifiedStock)
  return runTransaction(db, async (txn) => {
    const timestamp = new Date().toISOString();
    const productRef = doc(db, "products", input.productId);
    const stockRef = doc(db, "products", input.productId, "stock", input.storeId);

    const productSnap = await txn.get(productRef);
    if (!productSnap.exists()) {
      throw new Error("Produto não encontrado.");
    }

    const product = { id: productSnap.id, ...productSnap.data() } as Product;
    if (product.storeId && product.storeId !== input.storeId) {
      throw new Error("Produto não pertence à unidade atual.");
    }

    const stockSnap = await txn.get(stockRef);
    const atual = lerStockAtual(productSnap.data(), stockSnap.exists() ? stockSnap.data() : null);

    const stockBefore = atual.disponivel;
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

    aplicarEscritaStock(txn, {
      productRef,
      stockRef,
      produto: productSnap.data(),
      storeId: input.storeId,
      existiaStock: atual.existe,
      disponivel: stockAfter,
      vendida: atual.vendida,
      timestamp,
      extraStock: { lastMovementAt: timestamp },
    });
    txn.set(movementRef, cleanForFirestore(movement));

    return movement;
  });
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

  // Um produto pertence a uma só loja: a transferência cria um produto NOVO na loja
  // de destino, com o seu próprio stock. Tudo numa transação (origem, destino e
  // movimentos), com o stock da loja como fonte de verdade e o espelho no produto.
  return runTransaction(db, async (txn) => {
    const timestamp = new Date().toISOString();
    const sourceProductRef = doc(db, "products", input.productId);
    const sourceStockRef = doc(db, "products", input.productId, "stock", input.sourceStoreId);

    const sourceProductSnap = await txn.get(sourceProductRef);
    if (!sourceProductSnap.exists()) {
      throw new Error("Produto de origem não encontrado.");
    }

    const sourceProduct = { id: sourceProductSnap.id, ...sourceProductSnap.data() } as Product;
    if (sourceProduct.storeId && sourceProduct.storeId !== input.sourceStoreId) {
      throw new Error("Produto não pertence à unidade de origem.");
    }

    const sourceStockSnap = await txn.get(sourceStockRef);
    const atual = lerStockAtual(sourceProductSnap.data(), sourceStockSnap.exists() ? sourceStockSnap.data() : null);

    const sourceStockBefore = atual.disponivel;
    if (sourceStockBefore < input.quantity) {
      throw new Error(`Stock insuficiente. Disponível: ${sourceStockBefore}, solicitado: ${input.quantity}.`);
    }

    const sourceStockAfter = sourceStockBefore - input.quantity;
    const destinationProductRef = doc(collection(db, "products"));
    const destinationStockRef = doc(db, "products", destinationProductRef.id, "stock", input.destinationStoreId);
    const sourceMovementRef = doc(collection(db, "stockMovements"));
    const destinationMovementRef = doc(collection(db, "stockMovements"));

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

    // Produto de destino: cópia do de origem, da loja de destino, criada por quem
    // transfere (as regras exigem userId = utilizador autenticado)
    const destinationProduct = cleanForFirestore({
      ...sourceProductSnap.data(),
      storeId: input.destinationStoreId,
      storeName: input.destinationStoreName,
      userId: input.userId,
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

    aplicarEscritaStock(txn, {
      productRef: sourceProductRef,
      stockRef: sourceStockRef,
      produto: sourceProductSnap.data(),
      storeId: input.sourceStoreId,
      existiaStock: atual.existe,
      disponivel: sourceStockAfter,
      vendida: atual.vendida,
      timestamp,
      extraStock: { lastMovementAt: timestamp },
    });
    txn.set(destinationProductRef, destinationProduct);
    txn.set(destinationStockRef, {
      storeId: input.destinationStoreId,
      quantidadeDisponível: input.quantity,
      quantidadeVendida: 0,
      lastUpdated: timestamp,
      lastMovementAt: timestamp,
    });
    txn.set(sourceMovementRef, cleanForFirestore(sourceMovement));
    txn.set(destinationMovementRef, cleanForFirestore(destinationMovement));

    return {
      sourceMovement,
      destinationMovement,
      destinationProductId: destinationProductRef.id,
    };
  });
}
