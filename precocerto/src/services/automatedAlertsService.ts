/**
 * Automated Alerts Service
 * Monitora eventos e dispara alertas automáticos
 * Fase: Integrações Avançadas
 */

import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { NotificationService, Notification } from './notificationService';
import { Product } from '../types';

export type AlertEvent =
  | 'stock_critical'
  | 'stock_low'
  | 'expiry_soon'
  | 'expiry_today'
  | 'sale_completed'
  | 'negative_margin'
  | 'reorder_needed';

export interface AlertRule {
  event: AlertEvent;
  enabled: boolean;
  channels: ('in-app' | 'email' | 'whatsapp')[];
  threshold?: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

class AutomatedAlertsServiceImpl {
  /**
   * Verificar stock crítico (implementado via Phase 2)
   */
  async checkStockCritical(storeId: string, product: Product): Promise<void> {
    if (!product.quantidadeDisponível || product.quantidadeDisponível <= 2) {
      await this.dispatchAlert({
        storeId,
        type: 'stock_critical',
        title: `⚠️ STOCK CRÍTICO: ${product.nome}`,
        message: `Produto "${product.nome}" está com stock crítico (${product.quantidadeDisponível || 0} unidades).`,
        priority: 'critical',
        data: {
          productId: product.id,
          productName: product.nome,
          currentStock: product.quantidadeDisponível,
        },
        channels: ['in-app', 'whatsapp'],
      });
    }
  }

  /**
   * Verificar stock baixo
   */
  async checkStockLow(storeId: string, product: Product): Promise<void> {
    if (product.quantidadeDisponível && product.quantidadeDisponível > 2 && product.quantidadeDisponível <= 5) {
      await this.dispatchAlert({
        storeId,
        type: 'stock_low',
        title: `📦 Stock Baixo: ${product.nome}`,
        message: `Produto "${product.nome}" está com stock baixo (${product.quantidadeDisponível} unidades).`,
        priority: 'high',
        data: {
          productId: product.id,
          productName: product.nome,
          currentStock: product.quantidadeDisponível,
        },
        channels: ['in-app', 'email'],
      });
    }
  }

  /**
   * Verificar data de validade (implementado via Phase 13)
   */
  async checkExpirySoon(storeId: string, product: Product): Promise<void> {
    if (!product.farmaciaDataValidade) return;

    const expiryDate = new Date(product.farmaciaDataValidade);
    const today = new Date();
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry > 0 && daysUntilExpiry <= 7) {
      await this.dispatchAlert({
        storeId,
        type: 'expiry_soon',
        title: `⏰ Vencimento Próximo: ${product.nome}`,
        message: `Produto "${product.nome}" vence em ${daysUntilExpiry} dias (${expiryDate.toLocaleDateString('pt-PT')}).`,
        priority: daysUntilExpiry <= 3 ? 'critical' : 'high',
        data: {
          productId: product.id,
          productName: product.nome,
          expiryDate: product.farmaciaDataValidade,
          daysUntilExpiry,
        },
        channels: ['in-app', 'whatsapp', 'email'],
      });
    }
  }

  /**
   * Verificar produtos vencidos
   */
  async checkExpiryToday(storeId: string, product: Product): Promise<void> {
    if (!product.farmaciaDataValidade) return;

    const expiryDate = new Date(product.farmaciaDataValidade);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    if (expiryDate.getTime() === today.getTime()) {
      await this.dispatchAlert({
        storeId,
        type: 'expiry_today',
        title: `🚨 VENCE HOJE: ${product.nome}`,
        message: `Produto "${product.nome}" vence hoje! Remover do stock imediatamente.`,
        priority: 'critical',
        data: {
          productId: product.id,
          productName: product.nome,
          expiryDate: product.farmaciaDataValidade,
        },
        channels: ['in-app', 'whatsapp'],
      });
    }
  }

  /**
   * Alerta de margem negativa em venda
   */
  async checkNegativeMargin(
    storeId: string,
    productName: string,
    margin: number
  ): Promise<void> {
    if (margin < 0) {
      await this.dispatchAlert({
        storeId,
        type: 'negative_margin',
        title: `⚠️ VENDA COM PERDA: ${productName}`,
        message: `Produto "${productName}" foi vendido com margem negativa (${margin.toFixed(2)}%).`,
        priority: 'high',
        data: {
          productName,
          margin,
        },
        channels: ['in-app', 'email'],
      });
    }
  }

  /**
   * Alertar necessidade de reabastecimento
   */
  async checkReorderNeeded(
    storeId: string,
    productName: string,
    currentStock: number,
    minStock: number,
    suggestedQuantity: number
  ): Promise<void> {
    if (currentStock <= minStock) {
      await this.dispatchAlert({
        storeId,
        type: 'reorder_needed',
        title: `🛒 Reabastecimento Sugerido: ${productName}`,
        message: `Produto "${productName}" necessita reabastecimento.\nStock atual: ${currentStock}\nSugestão: ${suggestedQuantity} unidades`,
        priority: 'normal',
        data: {
          productName,
          currentStock,
          minStock,
          suggestedQuantity,
        },
        channels: ['in-app', 'email'],
      });
    }
  }

  /**
   * Disparar alerta genérico
   */
  private async dispatchAlert(
    alert: Omit<Notification, 'id' | 'userId' | 'status' | 'createdAt' | 'channels'> & {
      channels: ('in-app' | 'email' | 'whatsapp')[];
    }
  ): Promise<void> {
    try {
      // Obter managers da loja para notificar
      const managersSnapshot = await getDocs(
        query(
          collection(db, `stores/${alert.storeId}/users`),
          where('role', '==', 'loja-manager')
        )
      );

      if (managersSnapshot.docs.length === 0) {
        console.warn(`Nenhum manager encontrado para loja ${alert.storeId}`);
        return;
      }

      // Enviar alerta para cada manager
      for (const managerDoc of managersSnapshot.docs) {
        const managerId = managerDoc.id;

        await NotificationService.sendNotification({
          storeId: alert.storeId,
          userId: managerId,
          type: alert.type as any,
          title: alert.title,
          message: alert.message,
          priority: alert.priority,
          channels: alert.channels,
          data: alert.data,
        });
      }
    } catch (error) {
      console.error('Erro ao disparar alerta:', error);
    }
  }

  /**
   * Executar verificação completa de alertas
   */
  async runFullAlertCheck(storeId: string): Promise<{
    checksRun: number;
    alertsTriggered: number;
  }> {
    try {
      const snapshot = await getDocs(
        query(collection(db, 'products'), where('storeId', '==', storeId))
      );

      let checksRun = 0;
      let alertsTriggered = 0;

      for (const productDoc of snapshot.docs) {
        const product = {
          id: productDoc.id,
          ...productDoc.data(),
        } as Product;

        checksRun++;

        // Executar verificações
        await this.checkStockCritical(storeId, product);
        await this.checkStockLow(storeId, product);
        await this.checkExpirySoon(storeId, product);
        await this.checkExpiryToday(storeId, product);

        alertsTriggered++;
      }

      return {
        checksRun,
        alertsTriggered,
      };
    } catch (error) {
      console.error('Erro ao executar verificação completa:', error);
      return {
        checksRun: 0,
        alertsTriggered: 0,
      };
    }
  }

  /**
   * Obter histórico de alertas
   */
  async getAlertHistory(storeId: string, limit = 100): Promise<Notification[]> {
    try {
      const q = query(
        collection(db, `stores/${storeId}/notifications`),
        where('type', 'in', [
          'stock_critical',
          'stock_low',
          'expiry_soon',
          'expiry_today',
          'negative_margin',
          'reorder_needed',
        ])
      );

      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Notification))
        .sort((a, b) => {
          const timeA = new Date(a.createdAt || '').getTime();
          const timeB = new Date(b.createdAt || '').getTime();
          return timeB - timeA;
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Erro ao obter histórico de alertas:', error);
      return [];
    }
  }
}

export const AutomatedAlertsService = new AutomatedAlertsServiceImpl();
