/**
 * StockService - Gestão de Estoque Completa
 * Responsabilidades:
 * - Registar movimentações de stock (entrada/saída)
 * - Rastrear quantidade disponível em tempo real
 * - Gerar alertas de stock baixo
 * - Análise de tendências e previsões
 * - Histórico completo para auditoria
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp,
  Query,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  StockMovement,
  StockAlert,
  StockAlertConfig,
  StockMovementHistory,
  StockAnalytics,
} from '../types/inventory';
import { Product } from '../types';

export class StockService {
  /**
   * Registar movimentação de stock
   */
  static async recordMovement(
    movement: Omit<StockMovement, 'id' | 'timestamp'>
  ): Promise<StockMovement> {
    try {
      const now = new Date().toISOString();

      const movementData = {
        ...movement,
        timestamp: now,
      };

      // Salvar movimento em Firestore
      const movementsRef = collection(
        db,
        'stores',
        movement.storeId,
        'stockMovements'
      );

      const docRef = await addDoc(movementsRef, {
        ...movementData,
        timestamp: serverTimestamp(),
      });

      // Atualizar quantidade disponível no produto
      await this.updateProductQuantity(
        movement.storeId,
        movement.productId,
        movement.quantity,
        movement.type
      );

      return {
        ...movementData,
        id: docRef.id,
      };
    } catch (error) {
      console.error('Erro ao registar movimento de stock:', error);
      throw new Error('Falha ao registar movimento de stock');
    }
  }

  /**
   * Atualizar quantidade disponível do produto
   */
  private static async updateProductQuantity(
    storeId: string,
    productId: string,
    quantity: number,
    type: 'IN' | 'OUT' | 'ADJUSTMENT'
  ): Promise<void> {
    try {
      const productRef = doc(db, 'stores', storeId, 'products', productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        console.warn('Produto não encontrado:', productId);
        return;
      }

      const currentQuantity = productSnap.data().quantidadeDisponível || 0;
      let newQuantity = currentQuantity;

      if (type === 'IN') {
        newQuantity = currentQuantity + quantity;
      } else if (type === 'OUT') {
        newQuantity = Math.max(0, currentQuantity - quantity);
      } else if (type === 'ADJUSTMENT') {
        newQuantity = quantity; // Ajuste direto
      }

      await updateDoc(productRef, {
        quantidadeDisponível: newQuantity,
        ultimaMovimentacao: serverTimestamp(),
      });
    } catch (error) {
      console.error('Erro ao atualizar quantidade do produto:', error);
      // Não lançar erro - movimento já foi registado
    }
  }

  /**
   * Obter histórico de movimentações com filtros
   */
  static async getMovementHistory(
    storeId: string,
    filters?: {
      productId?: string;
      type?: 'IN' | 'OUT' | 'ADJUSTMENT';
      reason?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ): Promise<StockMovementHistory> {
    try {
      const movementsRef = collection(
        db,
        'stores',
        storeId,
        'stockMovements'
      );
      const constraints: QueryConstraint[] = [orderBy('timestamp', 'desc')];

      if (filters?.productId) {
        constraints.push(where('productId', '==', filters.productId));
      }

      if (filters?.type) {
        constraints.push(where('type', '==', filters.type));
      }

      if (filters?.reason) {
        constraints.push(where('reason', '==', filters.reason));
      }

      if (filters?.limit) {
        constraints.push(limit(filters.limit));
      }

      const q = query(movementsRef, ...constraints);
      const snapshot = await getDocs(q);

      let movements: StockMovement[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StockMovement[];

      // Filtrar por data se especificado
      if (filters?.startDate || filters?.endDate) {
        movements = movements.filter((m) => {
          const movementDate = new Date(m.timestamp).getTime();
          const startTime = filters.startDate
            ? new Date(filters.startDate).getTime()
            : 0;
          const endTime = filters.endDate
            ? new Date(filters.endDate).getTime()
            : Infinity;
          return movementDate >= startTime && movementDate <= endTime;
        });
      }

      const dateRange = {
        from: movements.length > 0
          ? movements[movements.length - 1].timestamp
          : new Date().toISOString(),
        to: movements.length > 0
          ? movements[0].timestamp
          : new Date().toISOString(),
      };

      return {
        movements,
        totalCount: movements.length,
        dateRange,
      };
    } catch (error) {
      console.error('Erro ao buscar histórico de movimentações:', error);
      return {
        movements: [],
        totalCount: 0,
        dateRange: { from: '', to: '' },
      };
    }
  }

  /**
   * Verificar produtos com stock baixo
   */
  static async checkLowStockAlerts(storeId: string): Promise<StockAlert[]> {
    try {
      const productsRef = collection(db, 'stores', storeId, 'products');
      const snapshot = await getDocs(productsRef);

      const alerts: StockAlert[] = [];

      snapshot.forEach((docSnapshot) => {
        const product = docSnapshot.data() as Product;
        const quantity = product.quantidadeDisponível || 0;
        const minQuantity = 5; // Padrão
        const reorderQuantity = 10; // Padrão

        if (quantity <= minQuantity) {
          alerts.push({
            id: `stock-${product.id}-${Date.now()}`,
            storeId,
            productId: product.id,
            productName: product.nome,
            currentQuantity: quantity,
            minQuantity,
            reorderQuantity,
            severity: quantity <= 2 ? 'CRITICAL' : 'WARNING',
            type: quantity <= 2 ? 'LOW_STOCK' : 'REORDER_SUGGESTED',
            createdAt: new Date().toISOString(),
            channels: [],
          });
        }
      });

      return alerts;
    } catch (error) {
      console.error('Erro ao verificar alertas de stock:', error);
      return [];
    }
  }

  /**
   * Calcular tendências e previsões de stock
   */
  static async getStockAnalytics(
    storeId: string,
    productId: string,
    days: number = 30
  ): Promise<StockAnalytics | null> {
    try {
      // Buscar produto
      const productRef = doc(db, 'stores', storeId, 'products', productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        return null;
      }

      const product = productSnap.data() as Product;

      // Buscar movimentações dos últimos N dias
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const history = await this.getMovementHistory(storeId, {
        productId,
        startDate: startDate.toISOString(),
      });

      // Calcular estatísticas
      let totalIn = 0;
      let totalOut = 0;

      history.movements.forEach((m) => {
        if (m.type === 'IN') totalIn += m.quantity;
        else if (m.type === 'OUT') totalOut += m.quantity;
      });

      const currentQuantity = product.quantidadeDisponível || 0;
      const averageDaily = totalOut > 0 ? totalOut / days : 0;
      const daysUntilEmpty =
        averageDaily > 0
          ? Math.ceil(currentQuantity / averageDaily)
          : 999;

      // Determinar tendência
      let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      if (totalIn > totalOut * 1.2) trend = 'increasing';
      else if (totalOut > totalIn * 1.2) trend = 'decreasing';

      return {
        productId,
        productName: product.nome,
        totalIn,
        totalOut,
        currentQuantity,
        averageDaily,
        daysUntilEmpty,
        trend,
        lastMovement: history.movements[0]?.timestamp || new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erro ao calcular analytics de stock:', error);
      return null;
    }
  }

  /**
   * Sugerir quantidade de reabastecimento
   */
  static calculateReorderSuggestion(
    currentQuantity: number,
    averageDaily: number,
    leadDays: number = 7,
    targetDays: number = 30
  ): number {
    // Quantidade = (demanda média diária × dias de lead) + (demanda média diária × dias de target)
    const reorderPoint = averageDaily * leadDays;
    const targetStock = averageDaily * targetDays;
    const reorderQuantity = Math.ceil(Math.max(targetStock - currentQuantity, 0));

    return reorderQuantity;
  }

  /**
   * Criar alerta de stock customizado
   */
  static async createStockAlertConfig(
    config: Omit<StockAlertConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<StockAlertConfig> {
    try {
      const now = new Date().toISOString();

      const configData = {
        ...config,
        createdAt: now,
        updatedAt: now,
      };

      const alertsRef = collection(
        db,
        'stores',
        config.storeId,
        'stockAlertConfigs'
      );

      const docRef = await addDoc(alertsRef, {
        ...configData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        ...configData,
        id: docRef.id,
      };
    } catch (error) {
      console.error('Erro ao criar configuração de alerta:', error);
      throw new Error('Falha ao criar configuração de alerta');
    }
  }

  /**
   * Obter configurações de alertas
   */
  static async getAlertConfigs(storeId: string): Promise<StockAlertConfig[]> {
    try {
      const configsRef = collection(
        db,
        'stores',
        storeId,
        'stockAlertConfigs'
      );

      const snapshot = await getDocs(configsRef);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StockAlertConfig[];
    } catch (error) {
      console.error('Erro ao buscar configurações de alertas:', error);
      return [];
    }
  }

  /**
   * Gerar relatório de reabastecimento recomendado
   */
  static async getReorderReport(
    storeId: string
  ): Promise<
    Array<{
      productId: string;
      productName: string;
      currentQuantity: number;
      suggestedQuantity: number;
      priority: 'URGENT' | 'HIGH' | 'MEDIUM';
    }>
  > {
    try {
      const alerts = await this.checkLowStockAlerts(storeId);
      const report: any[] = [];

      for (const alert of alerts) {
        const analytics = await this.getStockAnalytics(
          storeId,
          alert.productId
        );

        if (analytics) {
          const suggestedQuantity = this.calculateReorderSuggestion(
            analytics.currentQuantity,
            analytics.averageDaily
          );

          report.push({
            productId: alert.productId,
            productName: alert.productName,
            currentQuantity: analytics.currentQuantity,
            suggestedQuantity,
            priority:
              alert.severity === 'CRITICAL'
                ? 'URGENT'
                : alert.currentQuantity === 0
                ? 'HIGH'
                : 'MEDIUM',
          });
        }
      }

      return report.sort(
        (a, b) =>
          (['URGENT', 'HIGH', 'MEDIUM'].indexOf(a.priority) -
            ['URGENT', 'HIGH', 'MEDIUM'].indexOf(b.priority))
      );
    } catch (error) {
      console.error('Erro ao gerar relatório de reabastecimento:', error);
      return [];
    }
  }
}
