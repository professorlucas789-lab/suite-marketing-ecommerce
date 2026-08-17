/**
 * Serviço de Canais de Notificação
 * Orquestra notificações por múltiplos canais
 * Fase 10: Automação de Alertas
 */

import { getTwilioConfig, formatPhoneForWhatsApp, formatPhoneForTwilio } from '../config/twilioConfig';

export type NotificationChannel = 'in-app' | 'email' | 'whatsapp' | 'sms';
export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface NotificationPayload {
  title: string;
  message: string;
  severity: AlertSeverity;
  channels: NotificationChannel[];
  recipientId: string; // ID do utilizador ou email
  recipientPhone?: string; // Telefone para WhatsApp/SMS
  recipientEmail?: string; // Email para email
  metadata?: {
    productId?: string;
    storeId?: string;
    alertType?: string;
    [key: string]: any;
  };
  timestamp: string; // ISO 8601
}

export interface NotificationResult {
  channel: NotificationChannel;
  sent: boolean;
  status: 'success' | 'failed' | 'pending' | 'skipped';
  error?: string;
  messageId?: string;
  timestamp: string;
}

/**
 * Enviar notificação por canal específico
 */
export async function sendNotificationByChannel(
  payload: NotificationPayload,
  channel: NotificationChannel
): Promise<NotificationResult> {
  const timestamp = new Date().toISOString();

  try {
    switch (channel) {
      case 'in-app':
        return await sendInAppNotification(payload);
      case 'email':
        return await sendEmailNotification(payload);
      case 'whatsapp':
        return await sendWhatsAppNotification(payload);
      case 'sms':
        return await sendSMSNotification(payload);
      default:
        return {
          channel,
          sent: false,
          status: 'skipped',
          error: 'Canal não suportado',
          timestamp,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`❌ Erro ao enviar notificação por ${channel}:`, error);
    return {
      channel,
      sent: false,
      status: 'failed',
      error: errorMessage,
      timestamp,
    };
  }
}

/**
 * Enviar notificação em-app (via Firestore)
 */
async function sendInAppNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const timestamp = new Date().toISOString();

  try {
    // Simular envio para Firebase Cloud Messaging
    // Em produção, usar: firebase.messaging().send()
    console.log('📱 Notificação in-app enfileirada:', {
      user: payload.recipientId,
      title: payload.title,
      severity: payload.severity,
    });

    // Mock: Simular sucesso após delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      channel: 'in-app',
      sent: true,
      status: 'success',
      messageId: `in-app-${Date.now()}`,
      timestamp,
    };
  } catch (error) {
    return {
      channel: 'in-app',
      sent: false,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp,
    };
  }
}

/**
 * Enviar email
 */
async function sendEmailNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const timestamp = new Date().toISOString();

  if (!payload.recipientEmail) {
    return {
      channel: 'email',
      sent: false,
      status: 'skipped',
      error: 'Email não fornecido',
      timestamp,
    };
  }

  try {
    console.log('📧 Email enfileirado:', {
      to: payload.recipientEmail,
      subject: payload.title,
      severity: payload.severity,
    });

    // Em produção, usar Firebase Cloud Functions com SendGrid/Resend
    // Exemplo:
    // const response = await fetch('https://us-central1-project.cloudfunctions.net/sendEmail', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     to: payload.recipientEmail,
    //     subject: `[${payload.severity}] ${payload.title}`,
    //     htmlBody: generateEmailHTML(payload),
    //   }),
    // });

    // Mock: Simular sucesso
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      channel: 'email',
      sent: true,
      status: 'success',
      messageId: `email-${Date.now()}`,
      timestamp,
    };
  } catch (error) {
    return {
      channel: 'email',
      sent: false,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp,
    };
  }
}

/**
 * Enviar WhatsApp via Twilio
 */
async function sendWhatsAppNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const timestamp = new Date().toISOString();
  const config = getTwilioConfig();

  if (!config.enabled) {
    return {
      channel: 'whatsapp',
      sent: false,
      status: 'skipped',
      error: 'Twilio não configurado',
      timestamp,
    };
  }

  if (!payload.recipientPhone) {
    return {
      channel: 'whatsapp',
      sent: false,
      status: 'skipped',
      error: 'Telefone não fornecido',
      timestamp,
    };
  }

  try {
    const recipientWhatsApp = formatPhoneForWhatsApp(payload.recipientPhone);
    const messageBody = `*[${payload.severity}] ${payload.title}*\n\n${payload.message}`;

    console.log('💬 WhatsApp enfileirado:', {
      to: recipientWhatsApp,
      from: config.whatsappNumber,
      message: messageBody.substring(0, 50) + '...',
    });

    // Em produção, usar Twilio REST API:
    // const twilio = require('twilio')(config.accountSid, config.authToken);
    // const message = await twilio.messages.create({
    //   from: config.whatsappNumber,
    //   to: recipientWhatsApp,
    //   body: messageBody,
    // });
    // return { ... messageId: message.sid, status: 'success', ... };

    // Mock: Simular sucesso
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      channel: 'whatsapp',
      sent: true,
      status: 'success',
      messageId: `whatsapp-${Date.now()}`,
      timestamp,
    };
  } catch (error) {
    return {
      channel: 'whatsapp',
      sent: false,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp,
    };
  }
}

/**
 * Enviar SMS via Twilio
 */
async function sendSMSNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const timestamp = new Date().toISOString();
  const config = getTwilioConfig();

  if (!config.enabled) {
    return {
      channel: 'sms',
      sent: false,
      status: 'skipped',
      error: 'Twilio não configurado',
      timestamp,
    };
  }

  if (!payload.recipientPhone) {
    return {
      channel: 'sms',
      sent: false,
      status: 'skipped',
      error: 'Telefone não fornecido',
      timestamp,
    };
  }

  try {
    const recipientPhone = formatPhoneForTwilio(payload.recipientPhone);
    const messageBody = `[${payload.severity}] ${payload.title}: ${payload.message}`.substring(
      0,
      160
    ); // SMS limit

    console.log('📱 SMS enfileirado:', {
      to: recipientPhone,
      from: config.smsNumber,
      message: messageBody,
    });

    // Em produção, usar Twilio REST API (similar ao WhatsApp)

    // Mock: Simular sucesso
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      channel: 'sms',
      sent: true,
      status: 'success',
      messageId: `sms-${Date.now()}`,
      timestamp,
    };
  } catch (error) {
    return {
      channel: 'sms',
      sent: false,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp,
    };
  }
}

/**
 * Enviar notificação por múltiplos canais
 */
export async function sendNotificationMultiChannel(
  payload: NotificationPayload
): Promise<NotificationResult[]> {
  const results = await Promise.all(
    payload.channels.map((channel) => sendNotificationByChannel(payload, channel))
  );

  const successCount = results.filter((r) => r.sent).length;
  const totalCount = results.length;

  console.log(`✅ Notificações enviadas: ${successCount}/${totalCount}`, {
    title: payload.title,
    severity: payload.severity,
    results: results.map((r) => ({ channel: r.channel, status: r.status })),
  });

  return results;
}

/**
 * Gerar template de email HTML
 */
export function generateEmailHTML(payload: NotificationPayload): string {
  const severityColors: Record<AlertSeverity, string> = {
    CRITICAL: '#dc2626',
    WARNING: '#ea580c',
    INFO: '#2563eb',
  };

  const color = severityColors[payload.severity];

  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">[${payload.severity}] ${payload.title}</h2>
        </div>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px;">
          <p style="line-height: 1.6; color: #333;">${payload.message}</p>
          ${
            payload.metadata?.productId
              ? `<p style="color: #666; font-size: 14px;"><strong>Produto:</strong> ${payload.metadata.productId}</p>`
              : ''
          }
          ${
            payload.metadata?.storeId
              ? `<p style="color: #666; font-size: 14px;"><strong>Loja:</strong> ${payload.metadata.storeId}</p>`
              : ''
          }
          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            ${new Date(payload.timestamp).toLocaleString('pt-AO')}
          </p>
        </div>
      </body>
    </html>
  `;
}
