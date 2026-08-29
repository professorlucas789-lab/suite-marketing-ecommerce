/**
 * Serviço de Push Notifications
 * FASE 9: Dashboard Mobile com Push Notifications
 *
 * Gerencia push notifications via Firebase Cloud Messaging (FCM)
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  PushNotificationConfig,
  PushNotification,
  PushNotificationEvent,
} from '../types/mobile';

/**
 * Serviço para gerenciar push notifications
 */
export class PushNotificationService {
  /**
   * Registar dispositivo para push notifications
   */
  static async registerDevice(
    userId: string,
    storeId: string,
    fcmToken: string,
    deviceId: string,
    deviceType: 'ios' | 'android'
  ): Promise<void> {
    try {
      const q = query(
        collection(db, 'users', userId, 'pushConfig'),
        where('storeId', '==', storeId)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Atualizar config existente
        const docRef = snapshot.docs[0].ref;
        const config = snapshot.docs[0].data() as PushNotificationConfig;

        // Verificar se device já existe
        const deviceExists = config.registeredDevices.some(
          (d) => d.deviceId === deviceId
        );

        if (!deviceExists) {
          await updateDoc(docRef, {
            registeredDevices: [
              ...config.registeredDevices,
              {
                fcmToken,
                deviceId,
                deviceType,
                registeredAt: new Date().toISOString(),
              },
            ],
            updatedAt: Timestamp.now(),
          });
        }
      } else {
        // Criar nova config
        await addDoc(collection(db, 'users', userId, 'pushConfig'), {
          userId,
          storeId,
          enabled: true,
          enabledTypes: {
            criticalAlert: true,
            urgentRestock: true,
            lowStock: true,
            expiryAlert: true,
            dailyReport: true,
            weeklyReport: true,
          },
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00',
          },
          registeredDevices: [
            {
              fcmToken,
              deviceId,
              deviceType,
              registeredAt: new Date().toISOString(),
            },
          ],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Erro ao registar dispositivo:', error);
      throw error;
    }
  }

  /**
   * Obter configuração de push notifications
   */
  static async getPushConfig(
    userId: string,
    storeId: string
  ): Promise<PushNotificationConfig | null> {
    try {
      const q = query(
        collection(db, 'users', userId, 'pushConfig'),
        where('storeId', '==', storeId)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      return snapshot.docs[0].data() as PushNotificationConfig;
    } catch (error) {
      console.error('Erro ao obter configuração de push:', error);
      return null;
    }
  }

  /**
   * Atualizar configuração de push notifications
   */
  static async updatePushConfig(
    userId: string,
    storeId: string,
    updates: Partial<PushNotificationConfig>
  ): Promise<void> {
    try {
      const q = query(
        collection(db, 'users', userId, 'pushConfig'),
        where('storeId', '==', storeId)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return;

      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Erro ao atualizar configuração de push:', error);
      throw error;
    }
  }

  /**
   * Enviar push notification
   */
  static async sendPushNotification(
    notification: PushNotification
  ): Promise<boolean> {
    try {
      // Verificar se utilizador tem push habilitado
      const config = await this.getPushConfig(
        notification.userId,
        notification.storeId
      );

      if (!config || !config.enabled) {
        console.warn('Push notifications desabilitadas para este utilizador');
        return false;
      }

      // Verificar quiet hours
      if (config.quietHours.enabled) {
        if (this.isInQuietHours(config.quietHours)) {
          console.log('Está em quiet hours, agendando para depois');
          // Agendar para depois do quiet hours
          return this.schedulePushNotification(notification, config);
        }
      }

      // Verificar tipos habilitados
      const type = notification.data.type;
      const enabledTypeMap: Record<string, keyof typeof config.enabledTypes> = {
        critical_alert: 'criticalAlert',
        urgent_restock: 'urgentRestock',
        low_stock: 'lowStock',
        expiry_alert: 'expiryAlert',
        daily_report: 'dailyReport',
        weekly_report: 'weeklyReport',
      };

      if (
        enabledTypeMap[type] &&
        !config.enabledTypes[enabledTypeMap[type]]
      ) {
        console.warn(`Notificação tipo ${type} está desabilitada`);
        return false;
      }

      // Enviar para cada dispositivo registado
      let successCount = 0;
      for (const device of config.registeredDevices) {
        try {
          await this.sendToFCM(notification, device.fcmToken, device.deviceType);
          successCount++;
        } catch (err) {
          console.error(`Erro ao enviar para dispositivo ${device.deviceId}:`, err);
        }
      }

      // Atualizar status de notificação
      const status =
        successCount === config.registeredDevices.length
          ? 'sent'
          : successCount > 0
            ? 'partial'
            : 'failed';

      await this.updateNotificationStatus(
        notification.storeId,
        notification.id,
        status
      );

      return successCount > 0;
    } catch (error) {
      console.error('Erro ao enviar push notification:', error);
      return false;
    }
  }

  /**
   * Enviar para FCM (Firebase Cloud Messaging)
   * Em produção, chamar Cloud Function
   */
  private static async sendToFCM(
    notification: PushNotification,
    fcmToken: string,
    deviceType: 'ios' | 'android'
  ): Promise<void> {
    try {
      const response = await fetch('/.netlify/functions/send-push', {
        method: 'POST',
        body: JSON.stringify({
          fcmToken,
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon,
            badge: notification.badge,
            sound: notification.sound,
          },
          data: {
            type: notification.data.type,
            actionUrl: notification.data.actionUrl,
            anomalyId: notification.data.anomalyId,
            productId: notification.data.productId,
            storeId: notification.data.storeId,
          },
          apns:
            deviceType === 'ios'
              ? {
                  payload: {
                    aps: {
                      alert: {
                        title: notification.title,
                        body: notification.body,
                      },
                      sound: notification.sound || 'default',
                      badge: 1,
                    },
                  },
                }
              : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`FCM error: ${response.statusText}`);
      }

      // Registar evento
      await this.logEvent(
        notification.userId,
        notification.storeId,
        notification.id,
        'sent'
      );
    } catch (error) {
      console.error('Erro ao enviar para FCM:', error);
      throw error;
    }
  }

  /**
   * Agendar push notification para depois do quiet hours
   */
  private static async schedulePushNotification(
    notification: PushNotification,
    config: PushNotificationConfig
  ): Promise<boolean> {
    try {
      const [endHour, endMinute] = config.quietHours.endTime.split(':');
      const scheduledFor = new Date();
      scheduledFor.setHours(parseInt(endHour), parseInt(endMinute), 0);

      // Se já passou, agendar para amanhã
      if (scheduledFor < new Date()) {
        scheduledFor.setDate(scheduledFor.getDate() + 1);
      }

      await addDoc(
        collection(
          db,
          'stores',
          notification.storeId,
          'scheduledPushNotifications'
        ),
        {
          ...notification,
          status: 'pending',
          scheduledFor: scheduledFor.toISOString(),
          createdAt: Timestamp.now(),
        }
      );

      return true;
    } catch (error) {
      console.error('Erro ao agendar push notification:', error);
      return false;
    }
  }

  /**
   * Verificar se está em quiet hours
   */
  private static isInQuietHours(
    quietHours: PushNotificationConfig['quietHours']
  ): boolean {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const [startHour, startMinute] = quietHours.startTime.split(':');
    const [endHour, endMinute] = quietHours.endTime.split(':');

    const startTotalMinutes = parseInt(startHour) * 60 + parseInt(startMinute);
    const endTotalMinutes = parseInt(endHour) * 60 + parseInt(endMinute);
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    if (startTotalMinutes < endTotalMinutes) {
      // Quiet hours normais (ex: 22:00 - 08:00)
      return (
        currentTotalMinutes >= startTotalMinutes &&
        currentTotalMinutes < endTotalMinutes
      );
    } else {
      // Quiet hours que atravessam meia-noite (ex: 22:00 - 08:00)
      return (
        currentTotalMinutes >= startTotalMinutes ||
        currentTotalMinutes < endTotalMinutes
      );
    }
  }

  /**
   * Registar evento de interação com push
   */
  static async logEvent(
    userId: string,
    storeId: string,
    notificationId: string,
    eventType: 'received' | 'clicked' | 'dismissed' | 'failed',
    deviceId?: string
  ): Promise<void> {
    try {
      const event: PushNotificationEvent = {
        id: `evt_${Date.now()}`,
        userId,
        storeId,
        notificationId,
        eventType,
        timestamp: new Date().toISOString(),
        deviceId: deviceId || 'unknown',
        deviceType: 'android', // Detectar do user agent em produção
      };

      await addDoc(
        collection(db, 'stores', storeId, 'pushNotificationEvents'),
        event
      );
    } catch (error) {
      console.error('Erro ao registar evento de push:', error);
    }
  }

  /**
   * Atualizar status de notificação
   */
  private static async updateNotificationStatus(
    storeId: string,
    notificationId: string,
    status: 'sent' | 'failed' | 'partial'
  ): Promise<void> {
    try {
      const docRef = doc(
        db,
        'stores',
        storeId,
        'pushNotifications',
        notificationId
      );
      await updateDoc(docRef, {
        status,
        sentAt: status !== 'failed' ? Timestamp.now() : undefined,
      });
    } catch (error) {
      console.error('Erro ao atualizar status de notificação:', error);
    }
  }

  /**
   * Remover dispositivo do registo de push
   */
  static async unregisterDevice(
    userId: string,
    storeId: string,
    deviceId: string
  ): Promise<void> {
    try {
      const config = await this.getPushConfig(userId, storeId);
      if (!config) return;

      const q = query(
        collection(db, 'users', userId, 'pushConfig'),
        where('storeId', '==', storeId)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return;

      const docRef = snapshot.docs[0].ref;
      const updatedDevices = config.registeredDevices.filter(
        (d) => d.deviceId !== deviceId
      );

      await updateDoc(docRef, {
        registeredDevices: updatedDevices,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Erro ao remover dispositivo:', error);
      throw error;
    }
  }

  /**
   * Obter histórico de notificações
   */
  static async getNotificationHistory(
    storeId: string,
    limit: number = 20
  ): Promise<PushNotification[]> {
    try {
      const q = query(
        collection(db, 'stores', storeId, 'pushNotifications'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs
        .slice(0, limit)
        .map((doc) => doc.data() as PushNotification);
    } catch (error) {
      console.error('Erro ao obter histórico de notificações:', error);
      return [];
    }
  }

  /**
   * Obter estatísticas de engajamento
   */
  static async getEngagementStats(
    storeId: string,
    days: number = 7
  ): Promise<{
    totalSent: number;
    totalClicked: number;
    clickRate: number;
    averageEngagement: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const q = query(
        collection(db, 'stores', storeId, 'pushNotifications'),
        where('sentAt', '>=', cutoffDate.toISOString()),
        orderBy('sentAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(
        (doc) => doc.data() as PushNotification
      );

      const totalSent = notifications.length;
      const totalClicked = notifications.reduce(
        (sum, n) => sum + (n.clicks || 0),
        0
      );
      const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
      const averageEngagement = totalSent > 0 ? totalClicked / totalSent : 0;

      return {
        totalSent,
        totalClicked,
        clickRate,
        averageEngagement,
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas de engajamento:', error);
      return {
        totalSent: 0,
        totalClicked: 0,
        clickRate: 0,
        averageEngagement: 0,
      };
    }
  }
}
