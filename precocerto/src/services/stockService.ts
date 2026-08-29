/**
 * Serviço de Gestão de Estoque
 * FASE 2: Gestão de Estoque Automática
 *
 * Responsabilidades:
 * - Registar movimentações de stock (IN/OUT/ADJUSTMENT)
 * - Validar quantidades e atualizar Firestore
 * - Detectar stock baixo e criar alertas
 * - Gerar relatórios e análises
 * - Manter histórico completo para auditoria
 */

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  QueryConstraint,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  StockMovement,
  StockMovementType,
  StockMovementReason,
  StockAlert,
  StockAlertConfig,
  StockHistory,
  StockAnalytics,
  ReorderReport,
} from '../types/inventory';
import { Product } from '../types';

/**
 * Registar uma movimentação de stock
 */
export class StockService {
  static async recordMovement(
    storeId: string,
    productId: string,
    product: Product,
    type: StockMovementType,
    quantity: number,
    reason: StockMovementReason,
    userId: string,
    options?: {
      reference?: string;
      batchNumber?: string;
      unitCost?: number;
      notes?: string;
    }
  ): Promise<StockMovement> {
    try {
      // Validar quantidade
      if (quantity <= 0) {
        throw new Error('Quantidade deve ser maior que zero');
      }

      // Obter quantidade anterior
      const currentQuantity = product.quantidadeDisponível || 0;

      // Calcular nova quantidade
      let newQuantity = currentQuantity;
      if (type === 'IN') {
        newQuantity = currentQuantity + quantity;
      } else if (type === 'OUT') {
        if (currentQuantity < quantity) {
          throw new Error(`Stock insuficiente. Disponível: ${currentQuantity}`);
        }
        newQuantity = currentQuantity - quantity;
      } else if (type === 'ADJUSTMENT') {
        newQuantity = quantity; // ADJUSTMENT é o valor final
      }

      // Criar movimento
      const movement: Omit<StockMovement, 'id'> = {
        storeId,
        productId,
        productName: product.nome,
        type,
        reason,
        quantity,
        previousQuantity: currentQuantity,
        newQuantity,
        reference: options?.reference,
        batchNumber: options?.batchNumber,
        timestamp: new Date().toISOString(),
        createdBy: userId,
        notes: options?.notes,
        unitCost: options?.unitCost,
        totalCost: options?.unitCost ? options.unitCost * quantity : undefined,
      };

      // Salvar no Firestore
      const movementsRef = collection(db, 'stores', storeId, 'stockMovements');
      const docRef = await addDoc(movementsRef, {
        ...movement,
        timestamp: serverTimestamp(),
      });

      // Atualizar produto com nova quantidade
      const productRef = doc(db, 'stores', storeId, 'products', productId);
      await updateDoc(productRef, {
        quantidadeDisponível: newQuantity,
      });

      // Registar no histórico
      await this.recordHistory(storeId, {
        movementId: docRef.id,
        productId,
        ...movement,
      });

      // Verificar alertas de stock baixo
      await this.checkAndCreateStockAlerts(storeId, productId, product, newQuantity);

      const createdMovement: StockMovement = {
        ...movement,
        id: docRef.id,
      };

      console.log(`✅ Movimento registado: ${type} de ${quantity} unidades - ${product.nome}`);

      return createdMovement;
    } catch (error) {
      console.error('Erro ao registar movimento:', error);
      throw error;
    }
  }

  /**
   * Obter histórico de movimentações
   */
  static async getMovementHistory(
    storeId: string,
    filters?: {
      productId?: string;
      type?: StockMovementType;
      reason?: StockMovementReason;
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ): Promise<StockMovement[]> {
    try {
      const movementsRef = collection(db, 'stores', storeId, 'stockMovements');
      const constraints: QueryConstraint[] = [];

      if (filters?.productId) {
        constraints.push(where('productId', '==', filters.productId));
      }

      if (filters?.type) {
        constraints.push(where('type', '==', filters.type));
      }

      if (filters?.reason) {
        constraints.push(where('reason', '==', filters.reason));
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
          const movDate = new Date(m.timestamp).getTime();
          const startTime = filters.startDate ? new Date(filters.startDate).getTime() : 0;
          const endTime = filters.endDate ? new Date(filters.endDate).getTime() : Infinity;
          return movDate >= startTime && movDate <= endTime;
        });
      }

      // Ordenar por data descendente
      movements.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      if (filters?.limit) {
        return movements.slice(0, filters.limit);
      }

      return movements;
    } catch (error) {
      console.error('Erro ao obter histórico:', error);
      return [];
    }
  }

  /**
   * Verificar e criar alertas de stock baixo
   */
  private static async checkAndCreateStockAlerts(
    storeId: string,
    productId: string,
    product: Product,
    currentQuantity: number
  ): Promise<void> {
    try {
      // Buscar configuração de alertas
      const alertConfigRef = collection(db, 'stores', storeId, 'stockAlertConfigs');
      const q = query(
        alertConfigRef,
        where('productId', '==', productId)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return; // Sem configuração específica
      }

      const config = snapshot.docs[0].data() as StockAlertConfig;

      if (!config.enableAutoAlert) {
        return;
      }

      // Verificar se deve criar alerta
      if (currentQuantity < config.minQuantity) {
        const severity = currentQuantity < (config.minQuantity * 0.5) ? 'CRITICAL' : 'LOW';

        // Calcular dias até esgotar
        const avgDailyUsage = await this.calculateAverageDailyUsage(storeId, productId);
        const daysUntilStockout = avgDailyUsage > 0 ? Math.ceil(currentQuantity / avgDailyUsage) : undefined;

        const alert: Omit<StockAlert, 'id'> = {
          storeId,
          productId,
          productName: product.nome,
          currentQuantity,
          minQuantity: config.minQuantity,
          reorderQuantity: config.reorderQuantity,
          severity,
          createdAt: new Date().toISOString(),
          channels: config.alertChannels,
          suggestedReorderQuantity: config.reorderQuantity,
          daysUntilStockout,
        };

        const alertsRef = collection(db, 'stores', storeId, 'stockAlerts');
        await addDoc(alertsRef, {
          ...alert,
          createdAt: serverTimestamp(),
        });

        console.log(`⚠️ Alerta de stock baixo criado para ${product.nome} (${severity})`);
      }
    } catch (error) {
      console.error('Erro ao verificar alertas de stock:', error);
      // Não lançar erro - verificação de alertas não deve falhar o sistema
    }
  }

  /**
   * Calcular uso médio diário
   */
  private static async calculateAverageDailyUsage(
    storeId: string,
    productId: string,
    days: number = 30
  ): Promise<number> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const movements = await this.getMovementHistory(storeId, {
        productId,
        type: 'OUT',
        startDate: startDate.toISOString(),
      });

      if (movements.length === 0) {
        return 0;
      }

      const totalQuantity = movements.reduce((sum, m) => sum + m.quantity, 0);
      return totalQuantity / days;
    } catch (error) {
      console.error('Erro ao calcular uso médio:', error);
      return 0;
    }
  }

  /**
   * Obter alertas de stock baixo
   */
  static async getStockAlerts(
    storeId: string,
    filters?: { resolved?: boolean; severity?: 'LOW' | 'CRITICAL' }
  ): Promise<StockAlert[]> {
    try {
      const alertsRef = collection(db, 'stores', storeId, 'stockAlerts');
      const constraints: QueryConstraint[] = [];

      if (filters?.severity) {
        constraints.push(where('severity', '==', filters.severity));
      }

      const q = query(alertsRef, ...constraints);
      const snapshot = await getDocs(q);

      let alerts: StockAlert[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StockAlert[];

      // Filtrar por resolvido
      if (filters?.resolved === false) {
        alerts = alerts.filter((a) => !a.resolvedAt);
      } else if (filters?.resolved === true) {
        alerts = alerts.filter((a) => a.resolvedAt);
      }

      return alerts;
    } catch (error) {
      console.error('Erro ao obter alertas:', error);
      return [];
    }
  }

  /**
   * Reconhecer alerta de stock
   */
  static async acknowledgeStockAlert(
    storeId: string,
    alertId: string,
    userId: string
  ): Promise<void> {
    try {
      const alertRef = doc(db, 'stores', storeId, 'stockAlerts', alertId);
      await updateDoc(alertRef, {
        acknowledgedAt: serverTimestamp(),
      });

      console.log(`✅ Alerta de stock reconhecido: ${alertId}`);
    } catch (error) {
      console.error('Erro ao reconhecer alerta:', error);
      throw error;
    }
  }

  /**
   * Registar no histórico
   */
  private static async recordHistory(
    storeId: string,
    movement: StockMovement
  ): Promise<void> {
    try {
      const historyRef = collection(db, 'stores', storeId, 'stockHistory');

      const history: Omit<StockHistory, 'id'> = {
        storeId,
        productId: movement.productId,
        movementId: movement.id,
        type: movement.type,
        reason: movement.reason,
        quantity: movement.quantity,
        previousQuantity: movement.previousQuantity,
        newQuantity: movement.newQuantity,
        timestamp: movement.timestamp,
        userId: movement.createdBy,
        details: {
          reference: movement.reference,
          batchNumber: movement.batchNumber,
          unitCost: movement.unitCost,
          totalCost: movement.totalCost,
          notes: movement.notes,
        },
      };

      await addDoc(historyRef, {
        ...history,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Erro ao registar histórico:', error);
    }
  }

  /**
   * Gerar relatório de reabastecimento
   */
  static async generateReorderReport(storeId: string): Promise<ReorderReport> {
    try {
      const alertsRef = collection(db, 'stores', storeId, 'stockAlerts');
      const snapshot = await getDocs(query(alertsRef, where('resolvedAt', '==', null)));

      const itemsToReorder = (snapshot.docs.map((doc) => {
        const alert = doc.data() as StockAlert;
        return {
          productId: alert.productId,
          productName: alert.productName,
          currentQuantity: alert.currentQuantity,
          minQuantity: alert.minQuantity,
          suggestedQuantity: alert.reorderQuantity || alert.minQuantity * 2,
          estimatedCost: (alert.reorderQuantity || alert.minQuantity * 2) * 10, // Placeholder
          daysUntilStockout: alert.daysUntilStockout || 0,
          priority:
            alert.severity === 'CRITICAL'
              ? 'URGENT'
              : alert.daysUntilStockout && alert.daysUntilStockout < 7
              ? 'HIGH'
              : 'MEDIUM',
        };
      }) as any[]).sort(
        (a, b) =>
          (['URGENT', 'HIGH', 'MEDIUM', 'LOW'].indexOf(a.priority) -
            ['URGENT', 'HIGH', 'MEDIUM', 'LOW'].indexOf(b.priority)) ||
          a.daysUntilStockout - b.daysUntilStockout
      );

      const totalSuggestedCost = itemsToReorder.reduce((sum, item) => sum + item.estimatedCost, 0);

      return {
        id: `report-${Date.now()}`,
        storeId,
        generatedAt: new Date().toISOString(),
        itemsToReorder,
        totalSuggestedCost,
        totalItems: itemsToReorder.length,
      };
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      throw error;
    }
  }

  /**
   * Obter análise de stock de um produto
   */
  static async getStockAnalytics(
    storeId: string,
    productId: string,
    product: Product,
    days: number = 30
  ): Promise<StockAnalytics> {
    try {
      const movements = await this.getMovementHistory(storeId, { productId });

      // Calcular dados por dia
      const quantityByDate: Record<string, number> = {};
      let currentQty = product.quantidadeDisponível || 0;

      movements.reverse().forEach((m) => {
        const date = m.timestamp.split('T')[0];
        if (!quantityByDate[date]) {
          quantityByDate[date] = currentQty - (m.type === 'IN' ? m.quantity : -m.quantity);
        }
      });

      const quantityHistory = Object.entries(quantityByDate)
        .map(([date, qty]) => ({ date, quantity: qty }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calcular trend
      const recent = quantityHistory.slice(-7);
      const older = quantityHistory.slice(-14, -7);

      const recentAvg = recent.length > 0 ? recent.reduce((sum, h) => sum + h.quantity, 0) / recent.length : 0;
      const olderAvg = older.length > 0 ? older.reduce((sum, h) => sum + h.quantity, 0) / older.length : 0;

      const trendPercent = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
      const trend = trendPercent > 5 ? 'increasing' : trendPercent < -5 ? 'decreasing' : 'stable';

      // Calcular uso médio
      const avgDailyUsage = await this.calculateAverageDailyUsage(storeId, productId, days);
      const daysUntilStockout = avgDailyUsage > 0 ? Math.ceil((product.quantidadeDisponível || 0) / avgDailyUsage) : undefined;

      return {
        productId,
        productName: product.nome,
        storeId,
        currentQuantity: product.quantidadeDisponível || 0,
        minQuantity: product.quantidadeMinima || 5,
        quantityHistory,
        trend,
        trendPercent,
        averageDailyUsage: avgDailyUsage,
        daysUntilStockout,
        turnoverRate: avgDailyUsage * 30,
        totalValue: (product.quantidadeDisponível || 0) * (product.preco || 0),
      };
    } catch (error) {
      console.error('Erro ao calcular analytics:', error);
      throw error;
    }
  }
}
