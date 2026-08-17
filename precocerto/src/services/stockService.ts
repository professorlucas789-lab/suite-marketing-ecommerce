/**
 * Stock/Inventory Service
 * Gestão de movimentações de stock e alertas
 * Fase 5: Gestão de Estoque
 */

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  limit,
  startAfter,
  QueryConstraint,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  StockMovement,
  StockAlert,
  StockAlertConfig,
  StockSummary,
  StockMovementReport,
  StockTrend,
  DEFAULT_STOCK_ALERT_CONFIG,
} from '../types/inventory';
import { Product } from '../types';

/**
 * Registar nova movimentação de stock
 */
export async function recordStockMovement(
  movement: Omit<StockMovement, 'id' | 'timestamp'>
): Promise<StockMovement> {
  try {
    // Validações
    if (movement.quantity <= 0) {
      throw new Error('Quantidade deve ser maior que zero');
    }

    if (!movement.storeId || !movement.productId) {
      throw new Error('StoreId e ProductId são obrigatórios');
    }

    const docRef = await addDoc(collection(db, 'stockMovements'), {
      ...movement,
      timestamp: serverTimestamp(),
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    });

    console.log('✅ [stockService] Movimento registado:', docRef.id);

    return {
      ...movement,
      id: docRef.id,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ [stockService] Erro ao registar movimento:', error);
    throw error;
  }
}

/**
 * Obter histórico de movimentações
 */
export async function getStockHistory(
  storeId: string,
  filters?: {
    productId?: string;
    type?: 'IN' | 'OUT' | 'ADJUSTMENT';
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }
): Promise<StockMovement[]> {
  try {
    let constraints: QueryConstraint[] = [
      where('storeId', '==', storeId),
      orderBy('timestamp', 'desc'),
    ];

    if (filters?.productId) {
      constraints.push(where('productId', '==', filters.productId));
    }

    if (filters?.type) {
      constraints.push(where('type', '==', filters.type));
    }

    if (filters?.limit) {
      constraints.push(limit(filters.limit));
    }

    const q = query(collection(db, 'stockMovements'), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as StockMovement[];
  } catch (error) {
    console.error('❌ [stockService] Erro ao obter histórico:', error);
    throw error;
  }
}

/**
 * Verificar alertas de stock baixo
 */
export async function checkLowStockAlerts(storeId: string): Promise<StockAlert[]> {
  try {
    const alerts: StockAlert[] = [];

    // Obter todas as configurações de alerta
    const configQuery = query(
      collection(db, 'stockAlertConfigs'),
      where('storeId', '==', storeId),
      where('enableAutoAlert', '==', true)
    );

    const configDocs = await getDocs(configQuery);

    for (const configDoc of configDocs.docs) {
      const config = configDoc.data() as StockAlertConfig;

      // Obter produto atual
      const productQuery = query(
        collection(db, 'products'),
        where('storeId', '==', storeId),
        where('id', '==', config.productId)
      );

      const productDocs = await getDocs(productQuery);

      if (productDocs.empty) continue;

      const product = productDocs.docs[0].data() as Product;
      const currentQuantity = product.quantidade || 0;

      // Determinar severidade
      let severity: 'CRITICAL' | 'WARNING' | 'INFO' = 'INFO';
      if (currentQuantity === 0) {
        severity = 'CRITICAL'; // Fora de stock
      } else if (currentQuantity < config.minQuantity * 0.5) {
        severity = 'CRITICAL'; // Muito baixo
      } else if (currentQuantity < config.minQuantity) {
        severity = 'WARNING'; // Abaixo do mínimo
      }

      // Calcular previsão
      const movements = await getStockHistory(storeId, {
        productId: config.productId,
        type: 'OUT',
        limit: 30,
      });

      let daysUntilStockout: number | undefined;
      if (movements.length > 0) {
        const totalOut = movements.reduce((sum, m) => sum + m.quantity, 0);
        const avgDailyUsage = totalOut / 30;
        if (avgDailyUsage > 0) {
          daysUntilStockout = Math.ceil(currentQuantity / avgDailyUsage);
        }
      }

      // Criar alerta se necessário
      if (severity !== 'INFO') {
        alerts.push({
          id: `alert-${config.productId}-${Date.now()}`,
          storeId,
          productId: config.productId,
          productName: config.productName,
          currentQuantity,
          minQuantity: config.minQuantity,
          daysUntilStockout,
          severity,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('❌ [stockService] Erro ao verificar alertas:', error);
    throw error;
  }
}

/**
 * Calcular tendência de stock
 */
export async function calculateStockTrend(
  storeId: string,
  productId: string,
  days: number = 30
): Promise<StockTrend | null> {
  try {
    // Obter produto
    const productQuery = query(
      collection(db, 'products'),
      where('storeId', '==', storeId),
      where('id', '==', productId)
    );

    const productDocs = await getDocs(productQuery);
    if (productDocs.empty) return null;

    const product = productDocs.docs[0].data() as Product;
    const currentQuantity = product.quantidade || 0;

    // Obter movimentações OUT (vendas/saídas)
    const movements = await getStockHistory(storeId, {
      productId,
      type: 'OUT',
      limit: days,
    });

    const totalOut = movements.reduce((sum, m) => sum + m.quantity, 0);
    const avgDailyUsage = movements.length > 0 ? totalOut / days : 0;

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (avgDailyUsage > 1) {
      trend = 'decreasing';
    } else if (avgDailyUsage < 0.5) {
      trend = 'increasing';
    }

    const daysUntilStockout = avgDailyUsage > 0
      ? Math.ceil(currentQuantity / avgDailyUsage)
      : 999;

    return {
      productId,
      productName: product.nome || 'Produto desconhecido',
      currentQuantity,
      avgDailyUsage,
      daysUntilStockout,
      trend,
      lastMovement: movements[0] || null,
    };
  } catch (error) {
    console.error('❌ [stockService] Erro ao calcular tendência:', error);
    throw error;
  }
}

/**
 * Gerar relatório de movimentações
 */
export async function generateStockReport(
  storeId: string,
  fromDate: string, // ISO date
  toDate: string // ISO date
): Promise<StockMovementReport> {
  try {
    const movements = await getStockHistory(storeId);

    // Filtrar por data
    const filtered = movements.filter((m) => {
      const date = new Date(m.timestamp);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      return date >= from && date <= to;
    });

    const inMovements = filtered.filter((m) => m.type === 'IN');
    const outMovements = filtered.filter((m) => m.type === 'OUT');
    const adjustmentMovements = filtered.filter((m) => m.type === 'ADJUSTMENT');

    // Top produtos entrada
    const inMap = new Map<string, { name: string; qty: number }>();
    inMovements.forEach((m) => {
      const key = m.productId;
      if (!inMap.has(key)) {
        inMap.set(key, { name: m.productName, qty: 0 });
      }
      inMap.get(key)!.qty += m.quantity;
    });

    const topInProducts = Array.from(inMap.entries())
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 10)
      .map(([id, data]) => ({ productId: id, productName: data.name, quantity: data.qty }));

    // Top produtos saída
    const outMap = new Map<string, { name: string; qty: number }>();
    outMovements.forEach((m) => {
      const key = m.productId;
      if (!outMap.has(key)) {
        outMap.set(key, { name: m.productName, qty: 0 });
      }
      outMap.get(key)!.qty += m.quantity;
    });

    const topOutProducts = Array.from(outMap.entries())
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 10)
      .map(([id, data]) => ({ productId: id, productName: data.name, quantity: data.qty }));

    // Por razão
    const byReason: Record<string, number> = {};
    filtered.forEach((m) => {
      byReason[m.reason] = (byReason[m.reason] || 0) + m.quantity;
    });

    return {
      period: { from: fromDate, to: toDate },
      storeId,
      totalMovements: filtered.length,
      inMovements: inMovements.length,
      outMovements: outMovements.length,
      adjustmentMovements: adjustmentMovements.length,
      totalInQuantity: inMovements.reduce((sum, m) => sum + m.quantity, 0),
      totalOutQuantity: outMovements.reduce((sum, m) => sum + m.quantity, 0),
      topInProducts,
      topOutProducts,
      byReason,
    };
  } catch (error) {
    console.error('❌ [stockService] Erro ao gerar relatório:', error);
    throw error;
  }
}

/**
 * Criar ou atualizar configuração de alerta
 */
export async function upsertStockAlertConfig(
  config: Omit<StockAlertConfig, 'id' | 'createdAt' | 'updatedAt'>
): Promise<StockAlertConfig> {
  try {
    // Verificar se já existe
    const existing = query(
      collection(db, 'stockAlertConfigs'),
      where('storeId', '==', config.storeId),
      where('productId', '==', config.productId)
    );

    const docs = await getDocs(existing);

    const now = new Date().toISOString();
    const configData = {
      ...config,
      updatedAt: now,
    };

    if (docs.empty) {
      // Criar novo
      const docRef = await addDoc(collection(db, 'stockAlertConfigs'), {
        ...configData,
        createdAt: now,
      });

      console.log('✅ [stockService] Configuração de alerta criada:', docRef.id);

      return {
        ...configData,
        id: docRef.id,
        createdAt: now,
      };
    } else {
      // Atualizar existente
      const existingDoc = docs.docs[0];
      await updateDoc(existingDoc.ref, configData);

      console.log('✅ [stockService] Configuração de alerta atualizada:', existingDoc.id);

      return {
        ...configData,
        id: existingDoc.id,
        createdAt: existingDoc.data().createdAt,
      };
    }
  } catch (error) {
    console.error('❌ [stockService] Erro ao salvar configuração:', error);
    throw error;
  }
}
