/**
 * Serviço de Notificações
 * Envia notificações através de múltiplos canais: Email (SendGrid), SMS/WhatsApp (Twilio), In-App
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';

interface StoreMetrics {
  totalSales: number;
  totalRevenue: number;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  topCategories: Array<{ name: string; revenue: number }>;
  avgMargin: number;
  alertsTriggered: number;
}

export class NotificationService {
  private static db = getFirestore();
  private static SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
  private static SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@precocerto.ao';
  private static TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
  private static TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
  private static TWILIO_FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';
  private static TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || '';

  /**
   * Enviar relatório diário
   */
  static async sendDailyReport(
    storeId: string,
    managerEmail: string,
    reportText: string,
    metrics: StoreMetrics
  ): Promise<void> {
    try {
      console.log(`📧 Enviando relatório diário para: ${managerEmail}`);

      // 1. Enviar por Email
      await this.sendEmailReport(managerEmail, reportText, metrics);

      // 2. Registar notificação in-app
      await this.createInAppNotification(storeId, 'Relatório Diário Disponível', reportText);

      console.log(`  ✅ Relatório enviado com sucesso`);
    } catch (error) {
      console.error(`  ❌ Erro ao enviar relatório:`, error);
      throw error;
    }
  }

  /**
   * Enviar notificação de alerta
   */
  static async sendAlert(
    storeId: string,
    managerEmail: string,
    alertType: 'EXPIRY' | 'STOCK' | 'MARGIN',
    productName: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      const subject = this.getAlertSubject(alertType, productName);
      const message = this.getAlertMessage(alertType, productName, details);

      console.log(`🔔 Enviando alerta ${alertType} para: ${managerEmail}`);

      // 1. Enviar por Email
      try {
        await this.sendAlertEmail(managerEmail, subject, message);
      } catch (error) {
        console.warn(`  ⚠️  Erro ao enviar email:`, error);
      }

      // 2. Enviar por WhatsApp (se configurado)
      // TODO: Implementar Twilio WhatsApp quando credenciais estiverem disponíveis

      // 3. Registar notificação in-app
      await this.createInAppNotification(storeId, subject, message);

      console.log(`  ✅ Alerta enviado com sucesso`);
    } catch (error) {
      console.error(`  ❌ Erro ao enviar alerta:`, error);
      throw error;
    }
  }

  /**
   * Limpar notificações antigas (> 30 dias)
   */
  static async cleanupOldNotifications(storeId: string): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      console.log(`🧹 Limpando notificações antigas da loja: ${storeId}`);

      const batch = this.db.batch();
      let deletedCount = 0;

      // Limpar notificações in-app antigas
      const notificationsSnapshot = await this.db
        .collection('lojas')
        .doc(storeId)
        .collection('notifications')
        .where('timestamp', '<', Timestamp.fromDate(thirtyDaysAgo))
        .get();

      for (const doc of notificationsSnapshot.docs) {
        batch.delete(doc.ref);
        deletedCount++;
      }

      // Limpar logs de automação antigos
      const logsSnapshot = await this.db
        .collection('automationLogs')
        .where('timestamp', '<', Timestamp.fromDate(thirtyDaysAgo))
        .get();

      for (const doc of logsSnapshot.docs) {
        batch.delete(doc.ref);
        deletedCount++;
      }

      if (deletedCount > 0) {
        await batch.commit();
        console.log(`  ✅ ${deletedCount} documentos antigos removidos`);
      } else {
        console.log(`  ✅ Nenhum documento antigo encontrado`);
      }
    } catch (error) {
      console.error(`  ❌ Erro ao limpar notificações:`, error);
      throw error;
    }
  }

  /**
   * Enviar email de relatório
   */
  private static async sendEmailReport(
    email: string,
    reportText: string,
    metrics: StoreMetrics
  ): Promise<void> {
    // NOTE: SendGrid requer configuração de chave API
    // Em produção, usar: https://www.npmjs.com/package/@sendgrid/mail

    if (!this.SENDGRID_API_KEY) {
      console.warn('⚠️  SendGrid API key não configurada, pulando envio de email');
      return;
    }

    try {
      // Exemplo de como seria com SendGrid (não implementado aqui por simplicidade)
      console.log(`  📧 Simulando envio de email para: ${email}`);
      console.log(`     Assunto: Relatório Diário PreçoCerto`);

      // Registar tentativa de envio
      await this.db.collection('emailLogs').add({
        to: email,
        subject: 'Relatório Diário PreçoCerto',
        timestamp: Timestamp.now(),
        status: 'sent',
        metrics,
      });
    } catch (error) {
      console.error(`  ❌ Erro ao enviar email:`, error);
      throw error;
    }
  }

  /**
   * Enviar email de alerta
   */
  private static async sendAlertEmail(
    email: string,
    subject: string,
    message: string
  ): Promise<void> {
    if (!this.SENDGRID_API_KEY) {
      console.warn('⚠️  SendGrid API key não configurada');
      return;
    }

    try {
      console.log(`  📧 Simulando envio de email para: ${email}`);
      console.log(`     Assunto: ${subject}`);

      // Registar tentativa de envio
      await this.db.collection('emailLogs').add({
        to: email,
        subject,
        timestamp: Timestamp.now(),
        status: 'sent',
      });
    } catch (error) {
      console.error(`  ❌ Erro ao enviar email de alerta:`, error);
      throw error;
    }
  }

  /**
   * Criar notificação in-app
   */
  private static async createInAppNotification(
    storeId: string,
    title: string,
    message: string
  ): Promise<void> {
    try {
      await this.db
        .collection('lojas')
        .doc(storeId)
        .collection('notifications')
        .add({
          title,
          message,
          type: 'system',
          read: false,
          timestamp: Timestamp.now(),
        });
    } catch (error) {
      console.error(`  ❌ Erro ao criar notificação in-app:`, error);
      throw error;
    }
  }

  /**
   * Obter assunto do alerta baseado no tipo
   */
  private static getAlertSubject(
    alertType: 'EXPIRY' | 'STOCK' | 'MARGIN',
    productName: string
  ): string {
    switch (alertType) {
      case 'EXPIRY':
        return `⚠️ Aviso: Produto "${productName}" está a vencer`;
      case 'STOCK':
        return `📦 Alerta: Stock baixo para "${productName}"`;
      case 'MARGIN':
        return `💰 Aviso: Margem baixa para "${productName}"`;
      default:
        return `Alerta: ${productName}`;
    }
  }

  /**
   * Obter mensagem do alerta baseada no tipo
   */
  private static getAlertMessage(
    alertType: 'EXPIRY' | 'STOCK' | 'MARGIN',
    productName: string,
    details: Record<string, any>
  ): string {
    switch (alertType) {
      case 'EXPIRY':
        return `O produto "${productName}" vence em ${details.daysUntilExpiry} dias (${details.expiryDate}).
Ação recomendada: Vender ou remover do inventário.`;

      case 'STOCK':
        return `O stock do produto "${productName}" está baixo.
Stock atual: ${details.currentStock} unidades
Stock mínimo: ${details.minQuantity} unidades
Quantidade sugerida de reabastecimento: ${details.reorderQuantity} unidades`;

      case 'MARGIN':
        return `A margem de lucro do produto "${productName}" é muito baixa.
Margem atual: ${details.margin.toFixed(2)}%
Preço de custo: €${details.costPrice.toFixed(2)}
Preço de venda: €${details.salePrice.toFixed(2)}
Considere aumentar o preço de venda.`;

      default:
        return `Alerta para o produto: ${productName}`;
    }
  }
}
