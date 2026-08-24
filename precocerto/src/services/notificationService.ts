/**
 * Notification Service
 * Serviço central para orquestrar notificações via múltiplos canais
 * Fase: Integrações Avançadas
 */

import { db } from '../firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';

export type NotificationChannel = 'in-app' | 'email' | 'whatsapp' | 'sms';
export type NotificationType =
  | 'stock_critical'
  | 'stock_low'
  | 'expiry_alert'
  | 'expiry_soon'
  | 'expiry_today'
  | 'sale_recorded'
  | 'sale_completed'
  | 'payment_alert'
  | 'reorder_suggestion'
  | 'reorder_needed'
  | 'daily_report'
  | 'anomaly_detected'
  | 'negative_margin';

export interface Notification {
  id?: string;
  storeId: string;
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];

  // Content
  title: string;
  message: string;
  data?: Record<string, any>;

  // Status
  status: 'pending' | 'sent' | 'failed' | 'read';
  sentAt?: string;
  readAt?: string;

  // Metadata
  priority: 'low' | 'normal' | 'high' | 'critical';
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
}

type NotificationInput = Omit<Notification, 'id' | 'createdAt' | 'status'> & {
  status?: Notification['status'];
};

export interface NotificationPreference {
  userId: string;
  storeId: string;

  // Canais habilitados
  enableInApp: boolean;
  enableEmail: boolean;
  enableWhatsApp: boolean;
  enableSms: boolean;

  // Tipos de notificação
  stockAlerts: boolean;
  expiryAlerts: boolean;
  saleAlerts: boolean;
  paymentAlerts: boolean;
  dailyReports: boolean;

  // Horários
  dailyReportTime?: string; // HH:mm
  quietHoursStart?: string; // HH:mm
  quietHoursEnd?: string; // HH:mm

  // Contatos
  emailAddress?: string;
  phoneNumber?: string;

  createdAt?: string;
  updatedAt?: string;
}

class NotificationServiceImpl {
  /**
   * Criar e enviar notificação
   */
  async sendNotification(notification: NotificationInput) {
    try {
      const timestamp = new Date().toISOString();

      // 1. Guardar em Firestore
      const docRef = await addDoc(
        collection(db, `stores/${notification.storeId}/notifications`),
        {
          ...notification,
          status: 'pending',
          createdAt: timestamp,
          updatedAt: timestamp,
        }
      );

      const notificationId = docRef.id;

      // 2. Enviar por cada canal habilitado
      const results: Record<NotificationChannel, boolean> = {
        'in-app': false,
        'email': false,
        'whatsapp': false,
        'sms': false,
      };

      for (const channel of notification.channels) {
        try {
          switch (channel) {
            case 'in-app':
              results['in-app'] = await this.sendInAppNotification(
                notificationId,
                notification
              );
              break;
            case 'email':
              results['email'] = await this.sendEmailNotification(
                notificationId,
                notification
              );
              break;
            case 'whatsapp':
              results['whatsapp'] = await this.sendWhatsAppNotification(
                notificationId,
                notification
              );
              break;
            case 'sms':
              results['sms'] = await this.sendSmsNotification(
                notificationId,
                notification
              );
              break;
          }
        } catch (error) {
          console.error(`Erro ao enviar ${channel}:`, error);
          results[channel] = false;
        }
      }

      // 3. Atualizar status
      const sentChannels = Object.entries(results)
        .filter(([_, success]) => success)
        .map(([channel]) => channel);

      if (sentChannels.length > 0) {
        await updateDoc(
          doc(db, `stores/${notification.storeId}/notifications`, notificationId),
          {
            status: 'sent',
            sentAt: timestamp,
          }
        );
      }

      return {
        id: notificationId,
        success: sentChannels.length > 0,
        channels: results,
      };
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      throw error;
    }
  }

  /**
   * Enviar notificação in-app (armazenar em Firestore)
   */
  private async sendInAppNotification(
    notificationId: string,
    notification: NotificationInput
  ): Promise<boolean> {
    try {
      // A notificação já está armazenada em Firestore
      // Aqui poderíamos disparar um evento real-time se necessário
      return true;
    } catch (error) {
      console.error('Erro ao enviar notificação in-app:', error);
      return false;
    }
  }

  /**
   * Enviar notificação por email
   */
  private async sendEmailNotification(
    notificationId: string,
    notification: NotificationInput
  ): Promise<boolean> {
    try {
      // Obter preferências do utilizador
      const preferences = await this.getNotificationPreferences(
        notification.userId,
        notification.storeId
      );

      if (!preferences?.enableEmail || !preferences?.emailAddress) {
        return false;
      }

      // Integração com SendGrid
      const SendGridService = await import('../integrations/sendgrid').then(m => m.SendGridService).catch(() => null);

      if (!SendGridService) {
        console.warn('⚠️ SendGrid não configurado. Email não enviado.');
        return false;
      }

      const htmlContent = this.generateEmailHTML(notification);

      const result = await SendGridService.sendEmail({
        to: preferences.emailAddress,
        subject: `🔔 ${notification.title}`,
        htmlContent,
        textContent: `${notification.title}\n\n${notification.message}`,
      });

      return result.success;
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      return false;
    }
  }

  /**
   * Gerar HTML para email
   */
  private generateEmailHTML(notification: NotificationInput): string {
    const priorityColors: { [key: string]: string } = {
      'critical': '#dc3545',
      'high': '#fd7e14',
      'normal': '#0d6efd',
      'low': '#6c757d',
    };

    const color = priorityColors[notification.priority] || '#0d6efd';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { border-left: 4px solid ${color}; padding: 20px; background: #f8f9fa; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; color: ${color}; margin: 0; }
            .message { font-size: 16px; line-height: 1.6; margin: 15px 0; }
            .btn { display: inline-block; background: ${color}; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; }
            .footer { font-size: 12px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="title">${notification.title}</h1>
            </div>
            <p class="message">${notification.message}</p>
            <p><a href="https://precocerto-als.netlify.app/" class="btn">Ver PreçoCerto</a></p>
            <div class="footer">
              <p>© 2026 PreçoCerto - Gestão de Lojas Inteligente</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Enviar notificação por WhatsApp
   */
  private async sendWhatsAppNotification(
    notificationId: string,
    notification: NotificationInput
  ): Promise<boolean> {
    try {
      // Obter preferências do utilizador
      const preferences = await this.getNotificationPreferences(
        notification.userId,
        notification.storeId
      );

      if (!preferences?.enableWhatsApp || !preferences?.phoneNumber) {
        return false;
      }

      // Integração com Twilio WhatsApp
      const TwilioService = await import('../integrations/twilio').then(m => m.TwilioService).catch(() => null);

      if (!TwilioService) {
        console.warn('⚠️ Twilio não configurado. WhatsApp não enviado.');
        return false;
      }

      const result = await TwilioService.sendWhatsApp(
        preferences.phoneNumber,
        `${notification.title}\n\n${notification.message}`
      );

      return result.success;
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      return false;
    }
  }

  /**
   * Enviar notificação por SMS
   */
  private async sendSmsNotification(
    notificationId: string,
    notification: NotificationInput
  ): Promise<boolean> {
    try {
      // Obter preferências do utilizador
      const preferences = await this.getNotificationPreferences(
        notification.userId,
        notification.storeId
      );

      if (!preferences?.enableSms || !preferences?.phoneNumber) {
        return false;
      }

      // Integração com Twilio SMS
      const TwilioService = await import('../integrations/twilio').then(m => m.TwilioService).catch(() => null);

      if (!TwilioService) {
        console.warn('⚠️ Twilio não configurado. SMS não enviado.');
        return false;
      }

      // SMS tem limite de 160 caracteres
      const messageText = `${notification.title} - ${notification.message}`.substring(0, 160);

      const result = await TwilioService.sendSMS(
        preferences.phoneNumber,
        messageText
      );

      return result.success;
    } catch (error) {
      console.error('Erro ao enviar SMS:', error);
      return false;
    }
  }

  /**
   * Marcar notificação como lida
   */
  async markAsRead(storeId: string, notificationId: string): Promise<void> {
    try {
      await updateDoc(
        doc(db, `stores/${storeId}/notifications`, notificationId),
        {
          status: 'read',
          readAt: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
      throw error;
    }
  }

  /**
   * Obter notificações do utilizador
   */
  async getUserNotifications(
    storeId: string,
    userId: string,
    limit = 50
  ): Promise<Notification[]> {
    try {
      const q = query(
        collection(db, `stores/${storeId}/notifications`),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const notifications = snapshot.docs
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

      return notifications;
    } catch (error) {
      console.error('Erro ao obter notificações:', error);
      return [];
    }
  }

  /**
   * Obter preferências de notificação
   */
  async getNotificationPreferences(
    userId: string,
    storeId: string
  ): Promise<NotificationPreference | null> {
    try {
      const q = query(
        collection(db, `stores/${storeId}/notificationPreferences`),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      if (snapshot.docs.length === 0) {
        return null;
      }

      return {
        userId,
        storeId,
        ...snapshot.docs[0].data(),
      } as NotificationPreference;
    } catch (error) {
      console.error('Erro ao obter preferências:', error);
      return null;
    }
  }

  /**
   * Guardar preferências de notificação
   */
  async saveNotificationPreferences(
    preferences: NotificationPreference
  ): Promise<void> {
    try {
      const q = query(
        collection(db, `stores/${preferences.storeId}/notificationPreferences`),
        where('userId', '==', preferences.userId)
      );

      const snapshot = await getDocs(q);
      const timestamp = new Date().toISOString();

      if (snapshot.docs.length > 0) {
        // Atualizar
        await updateDoc(
          doc(
            db,
            `stores/${preferences.storeId}/notificationPreferences`,
            snapshot.docs[0].id
          ),
          {
            ...preferences,
            updatedAt: timestamp,
          }
        );
      } else {
        // Criar
        await addDoc(
          collection(db, `stores/${preferences.storeId}/notificationPreferences`),
          {
            ...preferences,
            createdAt: timestamp,
            updatedAt: timestamp,
          }
        );
      }
    } catch (error) {
      console.error('Erro ao guardar preferências:', error);
      throw error;
    }
  }

  /**
   * Contar notificações não lidas
   */
  async getUnreadCount(storeId: string, userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, `stores/${storeId}/notifications`),
        where('userId', '==', userId),
        where('status', '!=', 'read')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.length;
    } catch (error) {
      console.error('Erro ao contar não lidas:', error);
      return 0;
    }
  }

  /**
   * Limpar notificações antigas (>30 dias)
   */
  async cleanupOldNotifications(storeId: string): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const q = query(
        collection(db, `stores/${storeId}/notifications`),
        where('createdAt', '<', thirtyDaysAgo.toISOString())
      );

      const snapshot = await getDocs(q);
      let deleted = 0;

      for (const notificationDoc of snapshot.docs) {
        await deleteDoc(notificationDoc.ref);
        deleted++;
      }

      return deleted;
    } catch (error) {
      console.error('Erro ao limpar notificações:', error);
      return 0;
    }
  }
}

export const NotificationService = new NotificationServiceImpl();
