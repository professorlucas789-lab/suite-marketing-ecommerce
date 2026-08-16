/**
 * Serviço de Alertas de Validade
 * Semana 1: Detecta produtos expirando e dispara notificações
 *
 * Responsabilidades:
 * - Verificar produtos com vencimento próximo
 * - Criar alertas com severidade apropriada
 * - Enviar notificações através de canais configurados
 * - Manter histórico de alertas para auditoria
 * - Permitir acknowledging/resolução de alertas
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
  ExpiryAlert,
  AlertSeverity,
  NotificationChannel,
  AlertHistory,
} from '../types/notifications';
import { Product } from '../types';
import { getNotificationOrchestrator } from '../integrations/notificationChannels';

/**
 * Determinar severidade baseado em dias para expiração
 * CRITICAL: < 7 dias (ação urgente)
 * WARNING: 7-30 dias (atenção necessária)
 * INFO: 30+ dias (informativo)
 */
function calculateSeverity(daysUntilExpiry: number): AlertSeverity {
  if (daysUntilExpiry < 0) return 'CRITICAL'; // Já expirou
  if (daysUntilExpiry < 7) return 'CRITICAL';
  if (daysUntilExpiry < 30) return 'WARNING';
  return 'INFO';
}

/**
 * Gerar mensagem de alerta baseado no contexto
 */
function generateAlertMessage(
  productName: string,
  daysUntilExpiry: number,
  severity: AlertSeverity
): { title: string; body: string } {
  const dayText = daysUntilExpiry === 1 ? 'dia' : 'dias';

  if (daysUntilExpiry < 0) {
    return {
      title: '🚨 Produto Expirado',
      body: `${productName} expirou! Remova imediatamente do stock.`,
    };
  }

  if (severity === 'CRITICAL') {
    return {
      title: '⚠️ CRÍTICO: Produto Expirando',
      body: `${productName} expira em ${daysUntilExpiry} ${dayText}. Ação urgente necessária.`,
    };
  }

  if (severity === 'WARNING') {
    return {
      title: '⏰ Aviso: Produto Expirando',
      body: `${productName} expira em ${daysUntilExpiry} ${dayText}. Prepare ações de venda ou devolução.`,
    };
  }

  return {
    title: 'ℹ️ Informação: Produto com Validade',
    body: `${productName} expira em ${daysUntilExpiry} ${dayText}. Monitorar.`,
  };
}

/**
 * Calcular dias até expiração
 */
function calculateDaysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const timeDiff = expiry.getTime() - today.getTime();
  const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  return daysUntilExpiry;
}

/**
 * Verificar se produto tem data de validade válida
 */
function hasValidExpiryDate(product: Product): boolean {
  if (!product.farmaciaDataValidade && !product.expiryDate) {
    return false;
  }

  try {
    const dateStr = product.farmaciaDataValidade || product.expiryDate || '';
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Obter data de validade do produto
 */
function getExpiryDate(product: Product): string {
  return (product.farmaciaDataValidade || product.expiryDate) as string;
}

export class ExpiryAlertService {
  /**
   * Verificar todos os produtos de uma loja para expiração
   * Retorna apenas produtos com expiração nos próximos 60 dias
   */
  static async checkExpiringProducts(
    storeId: string,
    daysThreshold: number = 60
  ): Promise<ExpiryAlert[]> {
    try {
      // Buscar todos os produtos da loja
      const productsRef = collection(db, 'stores', storeId, 'products');
      const snapshot = await getDocs(productsRef);

      const expiringProducts: ExpiryAlert[] = [];

      snapshot.forEach((docSnapshot) => {
        const product = { id: docSnapshot.id, ...docSnapshot.data() } as Product;

        // Verificar se produto tem data de validade
        if (!hasValidExpiryDate(product)) {
          return;
        }

        const expiryDate = getExpiryDate(product);
        const daysUntilExpiry = calculateDaysUntilExpiry(expiryDate);

        // Verificar se está dentro do threshold
        if (daysUntilExpiry <= daysThreshold) {
          const severity = calculateSeverity(daysUntilExpiry);

          expiringProducts.push({
            id: `expiry-${product.id}-${Date.now()}`,
            storeId,
            productId: product.id,
            productName: product.nome,
            expiryDate,
            daysUntilExpiry,
            severity,
            createdAt: new Date().toISOString(),
            channels: [],
            quantity: product.quantidade || product.quantidadeDisponível,
            batchNumber: (product as any).lote, // Alguns produtos têm lote
          });
        }
      });

      return expiringProducts;
    } catch (error) {
      console.error('Erro ao verificar produtos expirando:', error);
      throw new Error('Falha ao verificar produtos expirando');
    }
  }

  /**
   * Criar um novo alerta de validade
   */
  static async createAlert(
    alert: Omit<ExpiryAlert, 'id' | 'createdAt'>
  ): Promise<ExpiryAlert> {
    try {
      const now = new Date().toISOString();

      const alertData = {
        ...alert,
        createdAt: now,
        storeId: alert.storeId,
        productId: alert.productId,
      };

      // Salvar em Firestore
      const alertsRef = collection(db, 'stores', alert.storeId, 'expiryAlerts');
      const docRef = await addDoc(alertsRef, {
        ...alertData,
        createdAt: serverTimestamp(),
      });

      const createdAlert: ExpiryAlert = {
        ...alertData,
        id: docRef.id,
      };

      // Registrar no histórico
      await this.recordAlertHistory(alert.storeId, createdAlert, 'created');

      return createdAlert;
    } catch (error) {
      console.error('Erro ao criar alerta de validade:', error);
      throw new Error('Falha ao criar alerta de validade');
    }
  }

  /**
   * Enviar notificação do alerta através de canais configurados
   */
  static async sendAlertNotification(alert: ExpiryAlert): Promise<void> {
    try {
      if (!alert.channels || alert.channels.length === 0) {
        console.log('Nenhum canal configurado para alerta:', alert.id);
        return;
      }

      const orchestrator = getNotificationOrchestrator();
      const { title, body } = generateAlertMessage(
        alert.productName,
        alert.daysUntilExpiry,
        alert.severity
      );

      // Enviar através de cada canal
      const results = await Promise.all(
        alert.channels.map((channel) =>
          orchestrator.send({
            channel,
            recipient: '', // Será preenchido pelo serviço de preferências
            title,
            subject: title,
            body,
            priority: alert.severity === 'CRITICAL' ? 'high' : 'normal',
            metadata: {
              alertId: alert.id,
              productId: alert.productId,
              severity: alert.severity,
              daysUntilExpiry: alert.daysUntilExpiry,
            },
          })
        )
      );

      // Registrar sucesso/falha
      const notificationIds: Record<NotificationChannel, string> = {};
      alert.channels.forEach((channel, index) => {
        if (results[index].success && results[index].messageId) {
          notificationIds[channel] = results[index].messageId!;
        }
      });

      // Atualizar alerta com IDs de notificação
      if (Object.keys(notificationIds).length > 0) {
        const alertRef = doc(db, 'stores', alert.storeId, 'expiryAlerts', alert.id);
        await updateDoc(alertRef, {
          notificationIds,
          triggeredAt: serverTimestamp(),
        });

        // Registrar no histórico
        await this.recordAlertHistory(alert.storeId, alert, 'triggered');
      }
    } catch (error) {
      console.error('Erro ao enviar notificação de alerta:', error);
    }
  }

  /**
   * Marcar alerta como reconhecido
   */
  static async acknowledgeAlert(storeId: string, alertId: string, userId: string): Promise<void> {
    try {
      const alertRef = doc(db, 'stores', storeId, 'expiryAlerts', alertId);
      await updateDoc(alertRef, {
        acknowledgedAt: serverTimestamp(),
      });

      // Registrar no histórico
      const alert = await this.getAlert(storeId, alertId);
      if (alert) {
        await this.recordAlertHistory(storeId, alert, 'acknowledged', userId);
      }
    } catch (error) {
      console.error('Erro ao reconhecer alerta:', error);
      throw new Error('Falha ao reconhecer alerta');
    }
  }

  /**
   * Resolver alerta (produto removido, vendido, etc)
   */
  static async resolveAlert(
    storeId: string,
    alertId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    try {
      const alertRef = doc(db, 'stores', storeId, 'expiryAlerts', alertId);
      await updateDoc(alertRef, {
        resolvedAt: serverTimestamp(),
      });

      // Registrar no histórico
      const alert = await this.getAlert(storeId, alertId);
      if (alert) {
        await this.recordAlertHistory(storeId, alert, 'resolved', userId, {
          reason,
        });
      }
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
      throw new Error('Falha ao resolver alerta');
    }
  }

  /**
   * Obter um alerta específico
   */
  static async getAlert(storeId: string, alertId: string): Promise<ExpiryAlert | null> {
    try {
      const alertRef = doc(db, 'stores', storeId, 'expiryAlerts', alertId);
      const snapshot = await getDocs(collection(db, 'stores', storeId, 'expiryAlerts'));

      const alertDoc = snapshot.docs.find((doc) => doc.id === alertId);
      if (!alertDoc) return null;

      return {
        id: alertDoc.id,
        ...alertDoc.data(),
      } as ExpiryAlert;
    } catch (error) {
      console.error('Erro ao buscar alerta:', error);
      return null;
    }
  }

  /**
   * Listar todos os alertas de uma loja com filtros opcionais
   */
  static async listAlerts(
    storeId: string,
    filters?: {
      severity?: AlertSeverity;
      resolved?: boolean;
      limit?: number;
    }
  ): Promise<ExpiryAlert[]> {
    try {
      const alertsRef = collection(db, 'stores', storeId, 'expiryAlerts');
      const constraints: QueryConstraint[] = [];

      // Aplicar filtro de severidade
      if (filters?.severity) {
        constraints.push(where('severity', '==', filters.severity));
      }

      // Aplicar filtro de resolvido
      if (filters?.resolved === false) {
        constraints.push(where('resolvedAt', '==', null));
      } else if (filters?.resolved === true) {
        constraints.push(where('resolvedAt', '!=', null));
      }

      const q = query(alertsRef, ...constraints);
      const snapshot = await getDocs(q);

      const alerts: ExpiryAlert[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ExpiryAlert[];

      // Aplicar limite se especificado
      if (filters?.limit) {
        return alerts.slice(0, filters.limit);
      }

      return alerts;
    } catch (error) {
      console.error('Erro ao listar alertas:', error);
      return [];
    }
  }

  /**
   * Obter resumo de alertas por severidade
   */
  static async getAlertsSummary(storeId: string): Promise<{
    critical: number;
    warning: number;
    info: number;
    total: number;
  }> {
    try {
      const alerts = await this.listAlerts(storeId, { resolved: false });

      const summary = {
        critical: 0,
        warning: 0,
        info: 0,
        total: alerts.length,
      };

      alerts.forEach((alert) => {
        if (alert.severity === 'CRITICAL') summary.critical++;
        else if (alert.severity === 'WARNING') summary.warning++;
        else summary.info++;
      });

      return summary;
    } catch (error) {
      console.error('Erro ao obter resumo de alertas:', error);
      return { critical: 0, warning: 0, info: 0, total: 0 };
    }
  }

  /**
   * Registar ação de alerta no histórico (auditoria)
   */
  private static async recordAlertHistory(
    storeId: string,
    alert: ExpiryAlert,
    action: 'created' | 'triggered' | 'acknowledged' | 'resolved' | 'escalated',
    userId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      const historyRef = collection(db, 'stores', storeId, 'alertHistory');

      const historyEntry: AlertHistory = {
        id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        storeId,
        alertId: alert.id,
        productId: alert.productId,
        action,
        severity: alert.severity,
        timestamp: new Date().toISOString(),
        userId,
        details: {
          ...details,
          daysUntilExpiry: alert.daysUntilExpiry,
        },
      };

      await addDoc(historyRef, {
        ...historyEntry,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Erro ao registar histórico de alerta:', error);
      // Não lançar erro - logging histórico não deve falhar todo o sistema
    }
  }

  /**
   * Obter histórico de alertas com filtros
   */
  static async getAlertHistory(
    storeId: string,
    filters?: {
      productId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ): Promise<AlertHistory[]> {
    try {
      const historyRef = collection(db, 'stores', storeId, 'alertHistory');
      const constraints: QueryConstraint[] = [];

      if (filters?.productId) {
        constraints.push(where('productId', '==', filters.productId));
      }

      if (filters?.action) {
        constraints.push(where('action', '==', filters.action));
      }

      const q = query(historyRef, ...constraints);
      const snapshot = await getDocs(q);

      let history: AlertHistory[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AlertHistory[];

      // Filtrar por data se especificado
      if (filters?.startDate || filters?.endDate) {
        history = history.filter((entry) => {
          const entryDate = new Date(entry.timestamp).getTime();
          const startTime = filters.startDate ? new Date(filters.startDate).getTime() : 0;
          const endTime = filters.endDate ? new Date(filters.endDate).getTime() : Infinity;
          return entryDate >= startTime && entryDate <= endTime;
        });
      }

      // Ordenar por data descendente (mais recente primeiro)
      history.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Aplicar limite
      if (filters?.limit) {
        return history.slice(0, filters.limit);
      }

      return history;
    } catch (error) {
      console.error('Erro ao buscar histórico de alertas:', error);
      return [];
    }
  }

  /**
   * Deletar alertas resolvidos (limpeza)
   */
  static async deleteResolvedAlerts(storeId: string, daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const alerts = await this.listAlerts(storeId, { resolved: true });
      let deletedCount = 0;

      for (const alert of alerts) {
        if (alert.resolvedAt && new Date(alert.resolvedAt) < cutoffDate) {
          const alertRef = doc(db, 'stores', storeId, 'expiryAlerts', alert.id);
          // Nota: Firestore não tem delete direto, usar soft delete
          await updateDoc(alertRef, {
            deletedAt: serverTimestamp(),
          });
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Erro ao deletar alertas resolvidos:', error);
      return 0;
    }
  }
}
