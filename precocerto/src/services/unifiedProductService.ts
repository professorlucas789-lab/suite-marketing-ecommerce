/**
 * Unified Product Service — FASE B
 *
 * Nova estrutura unificada de produtos:
 * - products/{productId}
 *   ├── nome, categoria, preço, custo (global)
 *   └── stock/{storeId}
 *       ├── quantidadeDisponível
 *       ├── lastUpdated
 *       └── movementHistory (opcional)
 *
 * Garante:
 * - Isolamento por storeId
 * - Sem fragmentação de dados
 * - Transações atómicas para vendas
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit as firebaseLimit,
  serverTimestamp,
  writeBatch,
  runTransaction,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types';
import { lerStockAtual, aplicarEscritaStock } from '../utils/unifiedStock';

export interface UnifiedProduct extends Omit<Product, 'quantidadeDisponível' | 'quantidadeDisponivel' | 'id'> {
  // Dados globais do produto (sem id, é gerado pelo Firestore)
  createdAt: string;
  updatedAt: string;
}

export interface StockEntry {
  storeId: string;
  quantidadeDisponível: number;
  quantidadeVendida?: number;
  lastUpdated?: string;
  lastMovementAt?: string;
}

/**
 * Criar novo produto na estrutura unificada
 */
export async function createUnifiedProduct(
  storeId: string,
  productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ productId: string; product: UnifiedProduct; stock: StockEntry }> {
  if (!storeId) throw new Error('Loja obrigatória');

  // Modelo: um produto pertence a UMA loja e o seu stock vive nessa loja
  // (products/{id}/stock/{storeId}, com storeId = loja proprietária). Um produto
  // cuja loja proprietária difere da do stock ficaria ilegível para a loja do stock.
  if (productData.storeId && productData.storeId !== storeId) {
    throw new Error(
      `O produto pertence à loja ${productData.storeId}, mas o stock está a ser criado na loja ${storeId}.`
    );
  }

  const docRef = doc(collection(db, 'products'));
  const productId = docRef.id;
  const now = new Date().toISOString();

  const product: UnifiedProduct = {
    ...productData,
    storeId,
    createdAt: now,
    updatedAt: now,
  };

  const stock: StockEntry = {
    storeId,
    quantidadeDisponível: Number(productData.quantidadeDisponível ?? productData.quantidade ?? 0),
    quantidadeVendida: 0,
    lastUpdated: now,
  };

  // O documento do produto espelha o stock da loja proprietária (ver utils/unifiedStock):
  // ecrãs e serviços que leem quantidadeDisponivel do documento ficam corretos
  const produtoComEspelho = {
    ...product,
    quantidadeDisponivel: stock.quantidadeDisponível,
    quantidadeVendida: 0,
  } as UnifiedProduct;

  // Usar batch para atomicidade
  const batch = writeBatch(db);
  batch.set(docRef, produtoComEspelho);
  batch.set(doc(db, 'products', productId, 'stock', storeId), stock);

  await batch.commit();

  return { productId, product: produtoComEspelho, stock };
}

/**
 * Obter produto completo com stock da loja
 */
export async function getUnifiedProduct(
  productId: string,
  storeId: string
): Promise<{ product: UnifiedProduct & { id: string }; stock: StockEntry } | null> {
  const [productSnap, stockSnap] = await Promise.all([
    getDoc(doc(db, 'products', productId)),
    getDoc(doc(db, 'products', productId, 'stock', storeId)),
  ]);

  if (!productSnap.exists()) {
    return null;
  }

  const product = { id: productSnap.id, ...productSnap.data() } as UnifiedProduct & { id: string };
  const stock = stockSnap.exists()
    ? (stockSnap.data() as StockEntry)
    : {
        storeId,
        quantidadeDisponível: 0,
        quantidadeVendida: 0,
        lastUpdated: new Date().toISOString(),
      };

  return { product, stock };
}

/**
 * Obter os produtos da loja com seus stocks
 *
 * Lista os produtos cuja loja proprietária é storeId. O filtro é obrigatório:
 * as Security Rules só permitem ler produtos da própria loja e rejeitam
 * consultas sem filtro por storeId.
 */
export async function getUnifiedProductsForStore(
  storeId: string,
  limit?: number
): Promise<Array<{ product: UnifiedProduct & { id: string }; stock: StockEntry }>> {
  const constraints: QueryConstraint[] = [where('storeId', '==', storeId)];
  if (limit) constraints.push(firebaseLimit(limit));
  const productsSnapshot = await getDocs(
    query(collection(db, 'products'), ...constraints)
  );

  const results = [];

  for (const productDoc of productsSnapshot.docs) {
    const stockSnap = await getDoc(
      doc(db, 'products', productDoc.id, 'stock', storeId)
    );

    const product = { id: productDoc.id, ...productDoc.data() } as UnifiedProduct & { id: string };
    const stock = stockSnap.exists()
      ? (stockSnap.data() as StockEntry)
      : {
          storeId,
          quantidadeDisponível: 0,
          quantidadeVendida: 0,
          lastUpdated: new Date().toISOString(),
        };

    results.push({ product, stock });
  }

  return results;
}

/**
 * Actualizar dados globais do produto (preço, nome, categoria, etc)
 */
export async function updateUnifiedProductData(
  productId: string,
  updates: Partial<UnifiedProduct>
): Promise<void> {
  await updateDoc(doc(db, 'products', productId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Actualizar estoque de um produto numa loja (atomicamente)
 */
export async function updateUnifiedProductStock(
  productId: string,
  storeId: string,
  quantidadeDisponível: number,
  options?: {
    quantidadeVendida?: number;
    notes?: string;
  }
): Promise<void> {
  if (!Number.isFinite(quantidadeDisponível) || quantidadeDisponível < 0) {
    throw new Error('O stock não pode ser negativo.');
  }

  await runTransaction(db, async (txn) => {
    const productRef = doc(db, 'products', productId);
    const stockRef = doc(db, 'products', productId, 'stock', storeId);

    const productSnap = await txn.get(productRef);
    const stockSnap = await txn.get(stockRef);

    if (!productSnap.exists() && !stockSnap.exists()) {
      throw new Error(`Produto não encontrado: ${productId}`);
    }

    const atual = lerStockAtual(productSnap.data(), stockSnap.exists() ? stockSnap.data() : null);

    aplicarEscritaStock(txn, {
      productRef,
      stockRef,
      produto: productSnap.exists() ? productSnap.data() : undefined,
      storeId,
      existiaStock: atual.existe,
      disponivel: quantidadeDisponível,
      vendida: options?.quantidadeVendida ?? atual.vendida,
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Registar movimento de stock (entrada/saída)
 * Cria entrada em histórico de movimentos
 */
export async function recordStockMovement(
  productId: string,
  storeId: string,
  movement: {
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    quantity: number;
    reason: string;
    userId: string;
    reference?: string;
  }
): Promise<void> {
  const movementRef = doc(
    collection(db, 'products', productId, 'stock', storeId, 'movements')
  );

  await setDoc(movementRef, {
    ...movement,
    timestamp: serverTimestamp(),
  });
}

/**
 * Obter histórico de movimentos de um produto
 */
export async function getStockMovementHistory(
  productId: string,
  storeId: string,
  limit: number = 50
): Promise<any[]> {
  const movementsSnapshot = await getDocs(
    query(
      collection(db, 'products', productId, 'stock', storeId, 'movements'),
      ...(limit ? [] : []) // TODO: implementar limite
    )
  );

  return movementsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Validar se há stock suficiente numa loja
 */
export async function validateStockAvailability(
  productId: string,
  storeId: string,
  requiredQuantity: number
): Promise<{ available: boolean; currentStock: number; message?: string }> {
  const stockSnap = await getDoc(
    doc(db, 'products', productId, 'stock', storeId)
  );

  const currentStock = stockSnap.exists()
    ? (stockSnap.data() as StockEntry).quantidadeDisponível
    : 0;

  return {
    available: currentStock >= requiredQuantity,
    currentStock,
    message: currentStock < requiredQuantity
      ? `Stock insuficiente. Disponível: ${currentStock}, solicitado: ${requiredQuantity}`
      : undefined,
  };
}

/**
 * Obter stock actual de um produto numa loja
 */
export async function getProductStock(
  productId: string,
  storeId: string
): Promise<number> {
  const stockSnap = await getDoc(
    doc(db, 'products', productId, 'stock', storeId)
  );

  return stockSnap.exists()
    ? (stockSnap.data() as StockEntry).quantidadeDisponível
    : 0;
}

/**
 * Deletar produto (soft delete — mantém histórico)
 */
export async function softDeleteProduct(productId: string): Promise<void> {
  await updateDoc(doc(db, 'products', productId), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
  });
}

/**
 * Deletar stock de um produto numa loja (arquivo)
 */
export async function archiveProductStock(
  productId: string,
  storeId: string
): Promise<void> {
  await runTransaction(db, async (txn) => {
    const productRef = doc(db, 'products', productId);
    const stockRef = doc(db, 'products', productId, 'stock', storeId);

    const productSnap = await txn.get(productRef);
    const stockSnap = await txn.get(stockRef);

    // Mover para arquivo antes de apagar
    if (stockSnap.exists()) {
      const archiveRef = doc(collection(db, 'products', productId, 'stock_archive'));
      txn.set(archiveRef, {
        ...stockSnap.data(),
        archivedAt: serverTimestamp(),
      });
    }

    txn.delete(stockRef);

    // O espelho no documento do produto passa a 0, para não "ressuscitar" stock
    const dadosProduto = productSnap.exists() ? productSnap.data() : undefined;
    if (dadosProduto && (!dadosProduto.storeId || dadosProduto.storeId === storeId)) {
      const agora = new Date().toISOString();
      txn.update(productRef, {
        quantidadeDisponivel: 0,
        updatedAt: agora,
        dataAtualizacao: agora,
      });
    }
  });
}
