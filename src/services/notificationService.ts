/**
 * Serviço de Notificações Multi-Canal
 * FASE 8: Cloud Functions Automáticas
 *
 * Envia notificações via Email, WhatsApp, SMS usando Twilio e SendGrid
 * Integração com preferências de notificação por utilizador
 */

import { AutomatedNotification, NotificationHistory } from '../types/automation';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Configuração para serviços externos
 * Em produção, usar Firebase Secrets ou variáveis de ambiente
 */
const NOTIFICATION_CONFIG = {
  twilio: {
    accountSid: process.env.REACT_APP_TWILIO_ACCOUNT_SID,
    authToken: process.env.REACT_APP_TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.REACT_APP_TWILIO_PHONE_NUMBER,
    whatsappNumber: process.env.REACT_APP_TWILIO_WHATSAPP_NUMBER,
  },
  sendgrid: {
    apiKey: process.env.REACT_APP_SENDGRID_API_KEY,
    fromEmail: 'noreply@precocerto.com',
  },
};

/**
 * Serviço para enviar notificações multi-canal
 */
export class NotificationService {
  /**
   * Enviar notificação através de múltiplos canais
   */
  static async sendNotification(notification: AutomatedNotification): Promise<boolean> {
    try {
      const results: boolean[] = [];

      // Enviar por email
      if (notification.channels.includes('email') && notification.recipient.email) {
        try {
          await this.sendEmail(notification);
          results.push(true);
        } catch (err) {
          console.error('Erro ao enviar email:', err);
          results.push(false);
        }
      }

      // Enviar por WhatsApp
      if (notification.channels.includes('whatsapp') && notification.recipient.phoneNumber) {
        try {
          await this.sendWhatsApp(notification);
          results.push(true);
        } catch (err) {
          console.error('Erro ao enviar WhatsApp:', err);
          results.push(false);
        }
      }

      // Enviar por SMS
      if (notification.channels.includes('sms') && notification.recipient.phoneNumber) {
        try {
          await this.sendSMS(notification);
          results.push(true);
        } catch (err) {
          console.error('Erro ao enviar SMS:', err);
          results.push(false);
        }
      }

      // In-app (sempre salvo no Firestore)
      if (notification.channels.includes('inApp')) {
        try {
          await this.saveInAppNotification(notification);
          results.push(true);
        } catch (err) {
          console.error('Erro ao salvar notificação in-app:', err);
          results.push(false);
        }
      }

      // Atualizar status de notificação
      const allSuccess = results.every((r) => r);
      await this.updateNotificationStatus(notification.id, notification.storeId, allSuccess);

      return results.length > 0 && results.some((r) => r);
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      throw error;
    }
  }

  /**
   * Enviar email usando SendGrid
   */
  private static async sendEmail(notification: AutomatedNotification): Promise<void> {
    if (!notification.recipient.email) {
      throw new Error('Email não fornecido');
    }

    // Em produção, chamar Cloud Function que usa SendGrid
    // Aqui fazemos mock/stub para demonstração
    try {
      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: notification.recipient.email,
          subject: notification.title,
          html: this.generateEmailHTML(notification),
        }),
      });

      if (!response.ok) {
        throw new Error(`SendGrid error: ${response.statusText}`);
      }

      // Registrar envio
      await this.logNotificationSend(
        notification.storeId,
        notification.id,
        'email',
        notification.recipient.email,
        'sent'
      );
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      await this.logNotificationSend(
        notification.storeId,
        notification.id,
        'email',
        notification.recipient.email,
        'failed',
        error instanceof Error ? error.message : 'Erro desconhecido'
      );
      throw error;
    }
  }

  /**
   * Enviar WhatsApp usando Twilio
   */
  private static async sendWhatsApp(notification: AutomatedNotification): Promise<void> {
    if (!notification.recipient.phoneNumber) {
      throw new Error('Número de telefone não fornecido');
    }

    try {
      // Formato: +55 11 99999-9999 ou +244 912 345 678
      const formattedPhone = notification.recipient.phoneNumber.replace(/\D/g, '');
      const message = this.generateWhatsAppMessage(notification);

      const response = await fetch('/.netlify/functions/send-whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          to: `whatsapp:+${formattedPhone}`,
          body: message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Twilio WhatsApp error: ${response.statusText}`);
      }

      await this.logNotificationSend(
        notification.storeId,
        notification.id,
        'whatsapp',
        notification.recipient.phoneNumber,
        'sent'
      );
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      await this.logNotificationSend(
        notification.storeId,
        notification.id,
        'whatsapp',
        notification.recipient.phoneNumber || '',
        'failed',
        error instanceof Error ? error.message : 'Erro desconhecido'
      );
      throw error;
    }
  }

  /**
   * Enviar SMS usando Twilio
   */
  private static async sendSMS(notification: AutomatedNotification): Promise<void> {
    if (!notification.recipient.phoneNumber) {
      throw new Error('Número de telefone não fornecido');
    }

    try {
      const formattedPhone = notification.recipient.phoneNumber.replace(/\D/g, '');
      const message = this.generateSMSMessage(notification);

      const response = await fetch('/.netlify/functions/send-sms', {
        method: 'POST',
        body: JSON.stringify({
          to: `+${formattedPhone}`,
          body: message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Twilio SMS error: ${response.statusText}`);
      }

      await this.logNotificationSend(
        notification.storeId,
        notification.id,
        'sms',
        notification.recipient.phoneNumber,
        'sent'
      );
    } catch (error) {
      console.error('Erro ao enviar SMS:', error);
      await this.logNotificationSend(
        notification.storeId,
        notification.id,
        'sms',
        notification.recipient.phoneNumber || '',
        'failed',
        error instanceof Error ? error.message : 'Erro desconhecido'
      );
      throw error;
    }
  }

  /**
   * Salvar notificação in-app no Firestore
   */
  private static async saveInAppNotification(notification: AutomatedNotification): Promise<void> {
    try {
      await addDoc(
        collection(db, 'stores', notification.storeId, 'inAppNotifications'),
        {
          ...notification,
          createdAt: Timestamp.now(),
          read: false,
        }
      );
    } catch (error) {
      console.error('Erro ao salvar notificação in-app:', error);
      throw error;
    }
  }

  /**
   * Registar envio de notificação para auditoria
   */
  private static async logNotificationSend(
    storeId: string,
    notificationId: string,
    channel: 'email' | 'whatsapp' | 'sms' | 'inApp',
    recipient: string,
    status: 'sent' | 'failed',
    failureReason?: string
  ): Promise<void> {
    try {
      const history: NotificationHistory = {
        id: `hist_${Date.now()}`,
        storeId,
        automatedNotificationId: notificationId,
        channel,
        recipient,
        status,
        sentAt: status === 'sent' ? new Date().toISOString() : undefined,
        failureReason,
        retryCount: 0,
        createdAt: new Date().toISOString(),
      };

      await addDoc(
        collection(db, 'stores', storeId, 'notificationHistory'),
        history
      );
    } catch (error) {
      console.error('Erro ao registar envio de notificação:', error);
    }
  }

  /**
   * Atualizar status de notificação
   */
  private static async updateNotificationStatus(
    notificationId: string,
    storeId: string,
    success: boolean
  ): Promise<void> {
    try {
      const docRef = doc(db, 'stores', storeId, 'automatedNotifications', notificationId);
      await updateDoc(docRef, {
        status: success ? 'sent' : 'failed',
        sentAt: success ? Timestamp.now() : undefined,
      });
    } catch (error) {
      console.error('Erro ao atualizar status de notificação:', error);
    }
  }

  /**
   * Gerar HTML para email
   */
  private static generateEmailHTML(notification: AutomatedNotification): string {
    const baseURL = 'https://precocerto.com';

    let content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e293b; color: white; padding: 20px; text-align: center;">
          <h1>🔔 ${notification.title}</h1>
        </div>

        <div style="padding: 20px; background-color: #f8fafc;">
          <p>${notification.message}</p>
    `;

    // Dados específicos por tipo
    if (notification.type === 'daily_report') {
      content += `
        <h2>📊 Resumo Diário</h2>
        <ul>
          <li>Anomalias detectadas: ${notification.data.anomalyCount || 0}</li>
          <li>Críticas: ${notification.data.criticalCount || 0}</li>
          <li>Previsões geradas: ${notification.data.forecastsGenerated || 0}</li>
        </ul>
      `;
    } else if (notification.type === 'alert_critical') {
      content += `
        <h2>🚨 Alerta Crítico</h2>
        <p>Ação imediata necessária!</p>
      `;
    }

    if (notification.data.lowStockProducts && notification.data.lowStockProducts.length > 0) {
      content += `
        <h3>📦 Produtos com Estoque Baixo:</h3>
        <ul>
          ${notification.data.lowStockProducts.map((p) => `<li>${p}</li>`).join('')}
        </ul>
      `;
    }

    if (notification.data.urgentReorders && notification.data.urgentReorders.length > 0) {
      content += `
        <h3>⚡ Reabastecimento Urgente:</h3>
        <ul>
          ${notification.data.urgentReorders.map((r) => `<li>${r}</li>`).join('')}
        </ul>
      `;
    }

    content += `
          <p><a href="${baseURL}/dashboard" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Dashboard</a></p>
        </div>

        <div style="background-color: #e2e8f0; padding: 10px; text-align: center; font-size: 12px; color: #64748b;">
          <p>PreçoCerto © 2026 - Sistema de Gestão Inteligente</p>
          <p>Gerado automaticamente por Cloud Function</p>
        </div>
      </div>
    `;

    return content;
  }

  /**
   * Gerar mensagem para WhatsApp
   */
  private static generateWhatsAppMessage(notification: AutomatedNotification): string {
    let message = `🔔 *${notification.title}*\n\n${notification.message}\n\n`;

    if (notification.type === 'daily_report') {
      message += `📊 *Resumo Diário*\n`;
      message += `• Anomalias: ${notification.data.anomalyCount || 0}\n`;
      message += `• Críticas: ${notification.data.criticalCount || 0}\n`;
      message += `• Previsões: ${notification.data.forecastsGenerated || 0}\n\n`;
    }

    if (notification.data.lowStockProducts && notification.data.lowStockProducts.length > 0) {
      message += `📦 *Estoque Baixo:*\n`;
      notification.data.lowStockProducts.slice(0, 3).forEach((p) => {
        message += `• ${p}\n`;
      });
      message += '\n';
    }

    message += `👉 Ver dashboard: https://precocerto.com/dashboard`;

    return message;
  }

  /**
   * Gerar mensagem para SMS
   */
  private static generateSMSMessage(notification: AutomatedNotification): string {
    // SMS tem limite de 160 caracteres, então ser conciso
    let message = `${notification.title}: ${notification.data.anomalyCount || 0} anomalias detectadas`;

    if (notification.data.criticalCount && notification.data.criticalCount > 0) {
      message = `ALERTA CRÍTICO: ${notification.data.criticalCount} item(ns) crítico(s). Ver: https://precocerto.com/dashboard`;
    }

    return message.substring(0, 160);
  }

  /**
   * Obter histórico de notificações não enviadas
   */
  static async getFailedNotifications(
    storeId: string,
    limit: number = 10
  ): Promise<NotificationHistory[]> {
    try {
      const q = query(
        collection(db, 'stores', storeId, 'notificationHistory'),
        where('status', '==', 'failed')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs
        .slice(0, limit)
        .map((doc) => doc.data() as NotificationHistory);
    } catch (error) {
      console.error('Erro ao obter notificações falhadas:', error);
      return [];
    }
  }

  /**
   * Retry de notificações falhadas
   */
  static async retryFailedNotifications(storeId: string): Promise<number> {
    try {
      const failed = await this.getFailedNotifications(storeId, 50);
      let retryCount = 0;

      for (const history of failed) {
        if (history.retryCount < 3) {
          // Máximo 3 retries
          try {
            // Reenviar baseado no canal
            await this.retryNotification(history);
            retryCount++;
          } catch (err) {
            console.warn(`Falha no retry de notificação ${history.id}:`, err);
          }
        }
      }

      return retryCount;
    } catch (error) {
      console.error('Erro ao fazer retry de notificações:', error);
      return 0;
    }
  }

  /**
   * Retry de uma notificação específica
   */
  private static async retryNotification(history: NotificationHistory): Promise<void> {
    // Implementar lógica de retry baseado no canal
    console.log(`Retrying notification ${history.id} via ${history.channel}`);
    // TODO: Implementar retry logic
  }

  /**
   * Testar configuração de notificação
   */
  static async testNotificationConfig(
    storeId: string,
    channel: 'email' | 'whatsapp' | 'sms',
    recipient: string
  ): Promise<boolean> {
    try {
      const testNotification: AutomatedNotification = {
        id: `test_${Date.now()}`,
        storeId,
        type: 'daily_report',
        priority: 'low',
        title: '🧪 Teste de Notificação PreçoCerto',
        message: 'Se está a ver esta mensagem, a configuração está correta!',
        data: {
          anomalyCount: 0,
          criticalCount: 0,
          forecastsGenerated: 0,
        },
        channels: [channel],
        recipient: {
          email: channel === 'email' ? recipient : undefined,
          phoneNumber: ['whatsapp', 'sms'].includes(channel) ? recipient : undefined,
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      switch (channel) {
        case 'email':
          await this.sendEmail(testNotification);
          break;
        case 'whatsapp':
          await this.sendWhatsApp(testNotification);
          break;
        case 'sms':
          await this.sendSMS(testNotification);
          break;
      }

      return true;
    } catch (error) {
      console.error(`Erro ao testar notificação ${channel}:`, error);
      return false;
    }
  }
}
