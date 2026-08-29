/**
 * Serviço de Automação de Alertas com Cloud Scheduler
 * FASE 4: Otimizações e Automação
 *
 * Responsabilidades:
 * - Agendar verificações diárias de vencimento
 * - Agendar verificações de stock baixo
 * - Retry automático de notificações falhadas
 * - Agregação e escalação de alertas
 * - Limpeza de alertas antigos
 */

import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ExpiryAlert, AlertSeverity } from '../types/notifications';
import { ExpiryAlertService } from './expiryAlertService';
import { StockService } from './stockService';
import { getNotificationOrchestrator } from '../integrations/notificationChannels';

export interface ScheduledJob {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  schedule: string; // Cron expression or ISO time (HH:mm)
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertAggregation {
  storeId: string;
  period: 'daily' | 'weekly';
  alertsCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  affectedProducts: number;
  createdAt: string;
  sentAt?: string;
}

/**
 * Classe para orquestrar automação de alertas
 */
export class AlertAutomationScheduler {
  private static EXPIRY_CHECK_HOUR = 7; // 7h da manhã
  private static STOCK_CHECK_HOUR = 12; // 12h do meio-dia
  private static RETRY_INTERVAL_HOURS = 3; // Retry a cada 3 horas
  private static ALERT_RETENTION_DAYS = 90; // Guardar alertas 90 dias

  /**
   * ========================================
   * CRON JOBS - Verificações Automáticas
   * ========================================
   */

  /**
   * Job diário: Verificar produtos vencendo
   * Executado diariamente às 7h da manhã
   *
   * Cron: 0 7 * * *
   */
  static async dailyExpiryCheck() {
    console.log('🕐 [AlertAutomation] Iniciando verificação diária de validade...');

    try {
      // Obter todas as lojas ativas
      const storesRef = collection(db, 'stores');
      const storesSnapshot = await getDocs(storesRef);

      const results = {
        checked: 0,
        alerts: 0,
        errors: 0,
      };

      // Verificar cada loja
      for (const storeDoc of storesSnapshot.docs) {
        const storeId = storeDoc.id;

        try {
          // Verificar produtos vencendo
          const expiringProducts = await ExpiryAlertService.checkExpiringProducts(
            storeId,
            60 // Threshold: 60 dias
          );

          results.checked += 1;
          results.alerts += expiringProducts.length;

          // Criar alertas para cada produto vencendo
          for (const product of expiringProducts) {
            try {
              // Verificar se alerta já existe para este produto
              const existingAlert = await this.checkExistingAlert(
                storeId,
                product.productId
              );

              if (!existingAlert) {
                // Criar novo alerta
                const alert = await ExpiryAlertService.createAlert({
                  storeId,
                  productId: product.productId,
                  productName: product.productName,
                  expiryDate: product.expiryDate,
                  daysUntilExpiry: product.daysUntilExpiry,
                  severity: product.severity as AlertSeverity,
                  channels: this.getDefaultChannels(product.severity as AlertSeverity),
                  status: 'active',
                });

                // Enviar notificações
                await ExpiryAlertService.sendAlertNotification(alert);

                console.log(`✅ Alerta criado: ${product.productName} em ${storeId}`);
              }
            } catch (error) {
              console.error(`❌ Erro ao criar alerta para ${product.productName}:`, error);
              results.errors += 1;
            }
          }
        } catch (error) {
          console.error(`❌ Erro ao verificar loja ${storeId}:`, error);
          results.errors += 1;
        }
      }

      console.log('✅ Verificação diária concluída:', results);
      return results;
    } catch (error) {
      console.error('❌ Erro na verificação diária de validade:', error);
      throw error;
    }
  }

  /**
   * Job diário: Verificar stock baixo
   * Executado diariamente ao meio-dia
   *
   * Cron: 0 12 * * *
   */
  static async dailyLowStockCheck() {
    console.log('🕐 [AlertAutomation] Iniciando verificação diária de stock...');

    try {
      // Obter todas as lojas
      const storesRef = collection(db, 'stores');
      const storesSnapshot = await getDocs(storesRef);

      const results = {
        checked: 0,
        alerts: 0,
        errors: 0,
      };

      // Verificar stock baixo em cada loja
      for (const storeDoc of storesSnapshot.docs) {
        const storeId = storeDoc.id;

        try {
          // Verificar alertas de stock
          const lowStockAlerts = await StockService.checkLowStockAlerts(storeId);

          results.checked += 1;
          results.alerts += lowStockAlerts.length;

          console.log(
            `📦 Stock baixo em ${storeId}: ${lowStockAlerts.length} produtos`
          );
        } catch (error) {
          console.error(`❌ Erro ao verificar stock em ${storeId}:`, error);
          results.errors += 1;
        }
      }

      console.log('✅ Verificação de stock concluída:', results);
      return results;
    } catch (error) {
      console.error('❌ Erro na verificação diária de stock:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * RETRY E REPLICAÇÃO
   * ========================================
   */

  /**
   * Retry automático: Reenviar notificações falhadas
   * Executado a cada 3 horas
   *
   * Cron: 0 every-3-hours
   */
  static async retryFailedNotifications() {
    console.log('🔄 [AlertAutomation] Iniciando retry de notificações falhadas...');

    try {
      // Buscar todas as notificações com status 'failed' das últimas 24h
      const notificationsRef = collection(db, 'notifications');
      const failedQuery = query(
        notificationsRef,
        where('status', '==', 'failed'),
        where('createdAt', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
      );

      const failedSnapshot = await getDocs(failedQuery);

      const results = {
        retried: 0,
        succeeded: 0,
        failed: 0,
      };

      const orchestrator = getNotificationOrchestrator();

      // Retry cada notificação
      for (const notifDoc of failedSnapshot.docs) {
        const notification = notifDoc.data();

        try {
          // Tentar reenviar
          const success = await orchestrator.send({
            channel: notification.channel,
            recipient: notification.recipient,
            title: notification.title,
            subject: notification.subject,
            body: notification.body,
            priority: notification.priority || 'normal',
          });

          if (success) {
            // Atualizar status para 'sent'
            await updateDoc(doc(db, 'notifications', notifDoc.id), {
              status: 'sent',
              sentAt: serverTimestamp(),
              retryCount: (notification.retryCount || 0) + 1,
            });

            results.succeeded += 1;
            results.retried += 1;
          } else {
            results.failed += 1;
            results.retried += 1;

            // Incrementar contador de retry
            await updateDoc(doc(db, 'notifications', notifDoc.id), {
              retryCount: (notification.retryCount || 0) + 1,
            });
          }
        } catch (error) {
          console.error(`❌ Erro no retry de notificação:`, error);
          results.failed += 1;
        }
      }

      console.log('✅ Retry concluído:', results);
      return results;
    } catch (error) {
      console.error('❌ Erro no retry de notificações:', error);
      throw error;
    }
  }

  /**
   * Replicação de alertas: Resend diário de alertas críticos
   * Executado diariamente às 6h (1h antes do check principal)
   *
   * Cron: 0 6 * * *
   */
  static async dailyAlertReplication() {
    console.log('📢 [AlertAutomation] Iniciando replicação de alertas críticos...');

    try {
      // Buscar alertas CRÍTICOS ainda ativos de todas as lojas
      const alertsRef = collection(db, 'expiryAlerts');
      const criticalQuery = query(
        alertsRef,
        where('severity', '==', 'CRITICAL'),
        where('status', '==', 'active')
      );

      const criticalSnapshot = await getDocs(criticalQuery);

      const results = {
        replicated: 0,
        failed: 0,
      };

      // Reenviar cada alerta crítico
      for (const alertDoc of criticalSnapshot.docs) {
        const alert = alertDoc.data() as ExpiryAlert;

        try {
          // Reenviar notificação
          await ExpiryAlertService.sendAlertNotification(alert);

          // Registar replicação
          await updateDoc(doc(db, 'expiryAlerts', alertDoc.id), {
            lastNotificationAt: serverTimestamp(),
            notificationsSent: (alert.notificationsSent || 0) + 1,
          });

          results.replicated += 1;
        } catch (error) {
          console.error(`❌ Erro ao replicar alerta ${alert.id}:`, error);
          results.failed += 1;
        }
      }

      console.log('✅ Replicação concluída:', results);
      return results;
    } catch (error) {
      console.error('❌ Erro na replicação de alertas:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * AGREGAÇÃO E ESCALAÇÃO
   * ========================================
   */

  /**
   * Agregação diária: Criar sumário de alertas
   * Executado diariamente às 18h (antes do resumo do dia)
   *
   * Cron: 0 18 * * *
   */
  static async dailyAlertAggregation() {
    console.log('📊 [AlertAutomation] Gerando agregação diária de alertas...');

    try {
      // Obter todas as lojas
      const storesRef = collection(db, 'stores');
      const storesSnapshot = await getDocs(storesRef);

      const aggregations: AlertAggregation[] = [];

      // Agregar alertas por loja
      for (const storeDoc of storesSnapshot.docs) {
        const storeId = storeDoc.id;

        try {
          // Buscar alertas criados hoje
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const alertsRef = collection(db, 'stores', storeId, 'expiryAlerts');
          const todayQuery = query(
            alertsRef,
            where('createdAt', '>=', Timestamp.fromDate(today))
          );

          const todaySnapshot = await getDocs(todayQuery);

          if (todaySnapshot.size > 0) {
            const alerts = todaySnapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() } as ExpiryAlert)
            );

            const aggregation: AlertAggregation = {
              storeId,
              period: 'daily',
              alertsCount: alerts.length,
              criticalCount: alerts.filter((a) => a.severity === 'CRITICAL').length,
              warningCount: alerts.filter((a) => a.severity === 'WARNING').length,
              infoCount: alerts.filter((a) => a.severity === 'INFO').length,
              affectedProducts: new Set(alerts.map((a) => a.productId)).size,
              createdAt: new Date().toISOString(),
            };

            aggregations.push(aggregation);

            // Salvar agregação
            const aggregationsRef = collection(
              db,
              'stores',
              storeId,
              'alertAggregations'
            );
            await (aggregationsRef as any).add(aggregation);
          }
        } catch (error) {
          console.error(`❌ Erro ao agregar alertas de ${storeId}:`, error);
        }
      }

      console.log(`✅ Agregação concluída: ${aggregations.length} lojas`);
      return aggregations;
    } catch (error) {
      console.error('❌ Erro na agregação de alertas:', error);
      throw error;
    }
  }

  /**
   * Escalação: Promover alertas antigos
   * Executado a cada 6 horas
   *
   * Cron: 0 every-6-hours
   */
  static async escalateAlertsAutomatically() {
    console.log('⬆️ [AlertAutomation] Iniciando escalação de alertas...');

    try {
      // Buscar alertas INFO que estão há > 14 dias
      const alertsRef = collection(db, 'expiryAlerts');
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      const escQuery = query(
        alertsRef,
        where('severity', '==', 'INFO'),
        where('createdAt', '<', Timestamp.fromDate(twoWeeksAgo)),
        where('status', '==', 'active')
      );

      const escSnapshot = await getDocs(escQuery);

      const results = {
        escalated: 0,
        failed: 0,
      };

      // Escalar cada alerta
      for (const alertDoc of escSnapshot.docs) {
        const alert = alertDoc.data() as ExpiryAlert;

        try {
          // Promover severidade
          const newSeverity = alert.daysUntilExpiry < 30 ? 'WARNING' : 'INFO';

          await updateDoc(doc(db, 'expiryAlerts', alertDoc.id), {
            severity: newSeverity,
            channels: this.getDefaultChannels(newSeverity as AlertSeverity),
            updatedAt: serverTimestamp(),
          });

          results.escalated += 1;
        } catch (error) {
          console.error(`❌ Erro ao escalar alerta ${alert.id}:`, error);
          results.failed += 1;
        }
      }

      console.log('✅ Escalação concluída:', results);
      return results;
    } catch (error) {
      console.error('❌ Erro na escalação de alertas:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * LIMPEZA E MANUTENÇÃO
   * ========================================
   */

  /**
   * Limpeza mensal: Arquivar alertas antigos
   * Executado mensalmente no primeiro dia às 3h da manhã
   *
   * Cron: 0 3 1 * *
   */
  static async monthlyAlertArchival() {
    console.log('📦 [AlertAutomation] Iniciando arquivação mensal de alertas...');

    try {
      // Buscar alertas resolvidos > 90 dias
      const archiveThreshold = new Date(
        Date.now() - this.ALERT_RETENTION_DAYS * 24 * 60 * 60 * 1000
      );

      const alertsRef = collection(db, 'expiryAlerts');
      const archiveQuery = query(
        alertsRef,
        where('status', '==', 'resolved'),
        where('resolvedAt', '<', Timestamp.fromDate(archiveThreshold))
      );

      const archiveSnapshot = await getDocs(archiveQuery);

      const batch = writeBatch(db);
      let archived = 0;

      // Mover para arquivo
      for (const alertDoc of archiveSnapshot.docs) {
        const alert = alertDoc.data() as ExpiryAlert;

        try {
          // Copiar para coleção de arquivo
          const archiveRef = collection(db, 'alertArchive');
          batch.set(doc(archiveRef), {
            ...alert,
            archivedAt: serverTimestamp(),
            originalId: alertDoc.id,
          });

          // Marcar original como deleted
          batch.delete(doc(db, 'expiryAlerts', alertDoc.id));

          archived += 1;
        } catch (error) {
          console.error(`❌ Erro ao arquivar alerta ${alertDoc.id}:`, error);
        }
      }

      if (archived > 0) {
        await batch.commit();
      }

      console.log(`✅ Arquivação concluída: ${archived} alertas arquivados`);
      return { archived };
    } catch (error) {
      console.error('❌ Erro na arquivação de alertas:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * UTILITÁRIOS
   * ========================================
   */

  /**
   * Verificar se alerta já existe para produto
   */
  private static async checkExistingAlert(
    storeId: string,
    productId: string
  ): Promise<boolean> {
    try {
      const alertsRef = collection(db, 'stores', storeId, 'expiryAlerts');
      const existingQuery = query(
        alertsRef,
        where('productId', '==', productId),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(existingQuery);
      return snapshot.size > 0;
    } catch (error) {
      console.error('Erro ao verificar alerta existente:', error);
      return false;
    }
  }

  /**
   * Obter canais padrão baseado em severidade
   */
  private static getDefaultChannels(severity: AlertSeverity): string[] {
    switch (severity) {
      case 'CRITICAL':
        return ['in-app', 'email', 'whatsapp']; // Todos os canais
      case 'WARNING':
        return ['in-app', 'email']; // In-app + Email
      case 'INFO':
        return ['in-app']; // Apenas in-app
      default:
        return ['in-app'];
    }
  }

  /**
   * Registar job agendado
   */
  static async registerScheduledJob(job: Omit<ScheduledJob, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const jobsRef = collection(db, 'scheduledJobs');
      const docRef = await (jobsRef as any).add({
        ...job,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log(`✅ Job agendado: ${job.name} (${docRef.id})`);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao registar job agendado:', error);
      throw error;
    }
  }

  /**
   * Listar jobs agendados
   */
  static async listScheduledJobs(): Promise<ScheduledJob[]> {
    try {
      const jobsRef = collection(db, 'scheduledJobs');
      const snapshot = await getDocs(jobsRef);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as ScheduledJob));
    } catch (error) {
      console.error('Erro ao listar jobs:', error);
      return [];
    }
  }
}
