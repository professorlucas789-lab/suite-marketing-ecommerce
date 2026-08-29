/**
 * Orquestrador de Notificações
 * FASE 4: Integrações e Automação
 *
 * Responsabilidades:
 * - Decidir qual canal usar baseado em preferências
 * - Retry automático se falhar
 * - Logging e auditoria
 * - Rate limiting
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { NotificationPayload, NotificationLog } from './types';

// Inicializar Firebase Admin
const apps = getApps();
if (apps.length === 0) {
  initializeApp({
    credential: cert(
      JSON.parse(process.env.FIREBASE_ADMIN_SDK || '{}')
    ),
  });
}

const db = getFirestore();

/**
 * Configuração de notificações por canal
 */
const NOTIFICATION_CONFIG = {
  email: {
    enabled: process.env.SENDGRID_API_KEY ? true : false,
    serviceName: 'SendGrid',
    timeout: 30000,
  },
  whatsapp: {
    enabled: process.env.TWILIO_ACCOUNT_SID ? true : false,
    serviceName: 'Twilio WhatsApp',
    timeout: 15000,
  },
  sms: {
    enabled: process.env.TWILIO_ACCOUNT_SID ? true : false,
    serviceName: 'Twilio SMS',
    timeout: 15000,
  },
  'in-app': {
    enabled: true,
    serviceName: 'In-App Notification',
    timeout: 5000,
  },
};

/**
 * Enviar notificação através de múltiplos canais
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  console.log(`📢 Processando notificação: ${payload.type} (${payload.severity})`);

  const logEntry: NotificationLog = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    storeId: payload.storeId,
    type: payload.type,
    channels: payload.channels,
    status: 'pending',
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };

  try {
    // Filtrar canais habilitados
    const enabledChannels = payload.channels.filter(
      (channel) => NOTIFICATION_CONFIG[channel].enabled
    );

    if (enabledChannels.length === 0) {
      console.warn('⚠️ Nenhum canal de notificação habilitado');
      logEntry.status = 'failed';
      logEntry.error = 'Nenhum canal disponível';
      await saveNotificationLog(logEntry);
      return;
    }

    console.log(`📤 Enviando através de canais: ${enabledChannels.join(', ')}`);

    // Enviar paralelo em todos os canais
    const results = await Promise.allSettled(
      enabledChannels.map((channel) => sendViaChannel(channel, payload))
    );

    // Analisar resultados
    const failures = results.filter((r) => r.status === 'rejected');
    const successes = results.filter((r) => r.status === 'fulfilled');

    if (failures.length === 0) {
      logEntry.status = 'sent';
      logEntry.sentAt = new Date().toISOString();
      console.log(`✅ Notificação enviada com sucesso (${successes.length} canais)`);
    } else {
      logEntry.status = 'failed';
      logEntry.error = `${failures.length} de ${enabledChannels.length} canais falharam`;
      console.error(`❌ Falha ao enviar: ${logEntry.error}`);

      // Retry automático para canais críticos
      if (payload.severity === 'CRITICAL') {
        await retryNotification(payload, logEntry);
      }
    }
  } catch (error) {
    logEntry.status = 'failed';
    logEntry.error = error instanceof Error ? error.message : String(error);
    console.error(`❌ Erro ao processar notificação: ${logEntry.error}`);
  }

  // Salvar log
  await saveNotificationLog(logEntry);
}

/**
 * Enviar notificação através de um canal específico
 */
async function sendViaChannel(
  channel: 'email' | 'whatsapp' | 'sms' | 'in-app',
  payload: NotificationPayload
): Promise<{ channel: string; messageId: string }> {
  const config = NOTIFICATION_CONFIG[channel];

  if (!config.enabled) {
    throw new Error(`Canal ${channel} não habilitado`);
  }

  console.log(`  → Enviando via ${config.serviceName}...`);

  try {
    switch (channel) {
      case 'email':
        return await sendEmailNotification(payload);

      case 'whatsapp':
        return await sendWhatsAppNotification(payload);

      case 'sms':
        return await sendSMSNotification(payload);

      case 'in-app':
        return await sendInAppNotification(payload);

      default:
        throw new Error(`Canal desconhecido: ${channel}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`  ✗ Falha ${config.serviceName}: ${errorMsg}`);
    throw error;
  }
}

/**
 * Enviar notificação por email via SendGrid
 */
async function sendEmailNotification(
  payload: NotificationPayload
): Promise<{ channel: string; messageId: string }> {
  if (!payload.recipientEmail) {
    throw new Error('Email do destinatário não fornecido');
  }

  // Simular envio (implementar com SendGrid SDK em produção)
  const mockMessageId = `email-${Date.now()}`;
  console.log(`    📧 Email enviado para ${payload.recipientEmail}`);

  // TODO: Implementar com @sendgrid/mail SDK
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send({
  //   to: payload.recipientEmail,
  //   from: process.env.SENDGRID_FROM_EMAIL,
  //   subject: payload.subject,
  //   html: payload.htmlContent || payload.message,
  // });

  return { channel: 'email', messageId: mockMessageId };
}

/**
 * Enviar notificação por WhatsApp via Twilio
 */
async function sendWhatsAppNotification(
  payload: NotificationPayload
): Promise<{ channel: string; messageId: string }> {
  if (!payload.recipientPhone) {
    throw new Error('Telefone do destinatário não fornecido');
  }

  // Simular envio (implementar com Twilio SDK em produção)
  const mockMessageId = `whatsapp-${Date.now()}`;
  console.log(`    💬 WhatsApp enviado para ${payload.recipientPhone}`);

  // TODO: Implementar com twilio SDK
  // const twilio = require('twilio');
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await client.messages.create({
  //   from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
  //   to: `whatsapp:${payload.recipientPhone}`,
  //   body: payload.message,
  // });

  return { channel: 'whatsapp', messageId: mockMessageId };
}

/**
 * Enviar notificação por SMS via Twilio
 */
async function sendSMSNotification(
  payload: NotificationPayload
): Promise<{ channel: string; messageId: string }> {
  if (!payload.recipientPhone) {
    throw new Error('Telefone do destinatário não fornecido');
  }

  // Simular envio (implementar com Twilio SDK em produção)
  const mockMessageId = `sms-${Date.now()}`;
  console.log(`    📱 SMS enviado para ${payload.recipientPhone}`);

  // TODO: Implementar com twilio SDK
  // const twilio = require('twilio');
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await client.messages.create({
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: payload.recipientPhone,
  //   body: payload.message,
  // });

  return { channel: 'sms', messageId: mockMessageId };
}

/**
 * Enviar notificação in-app (salvar em Firestore)
 */
async function sendInAppNotification(
  payload: NotificationPayload
): Promise<{ channel: string; messageId: string }> {
  const messageId = `inapp-${Date.now()}`;

  // Salvar em coleção de notificações
  await db.collection('stores').doc(payload.storeId).collection('notifications').doc(messageId).set({
    type: payload.type,
    severity: payload.severity,
    subject: payload.subject,
    message: payload.message,
    data: payload.data,
    read: false,
    createdAt: new Date().toISOString(),
  });

  console.log(`    🔔 Notificação in-app criada`);

  return { channel: 'in-app', messageId };
}

/**
 * Retry automático com backoff exponencial
 */
async function retryNotification(
  payload: NotificationPayload,
  logEntry: NotificationLog,
  attempt: number = 1
): Promise<void> {
  const maxRetries = 3;
  const backoffMs = Math.pow(2, attempt) * 5000; // 10s, 20s, 40s

  if (attempt > maxRetries) {
    console.log(`❌ Máximo de tentativas (${maxRetries}) atingido`);
    return;
  }

  console.log(`🔄 Tentativa ${attempt} de ${maxRetries} em ${backoffMs}ms...`);

  return new Promise((resolve) => {
    setTimeout(async () => {
      logEntry.retryCount = attempt;
      try {
        await sendNotification(payload);
        resolve();
      } catch (error) {
        console.error(`Tentativa ${attempt} falhou:`, error);
        await retryNotification(payload, logEntry, attempt + 1);
        resolve();
      }
    }, backoffMs);
  });
}

/**
 * Salvar log de notificação em Firestore
 */
async function saveNotificationLog(logEntry: NotificationLog): Promise<void> {
  try {
    await db
      .collection('stores')
      .doc(logEntry.storeId)
      .collection('notificationLogs')
      .doc(logEntry.id)
      .set(logEntry);

    console.log(`✅ Log de notificação salvo: ${logEntry.id}`);
  } catch (error) {
    console.error('Erro ao salvar log de notificação:', error);
  }
}

/**
 * Obter preferências de notificação de uma loja
 */
export async function getNotificationPreferences(storeId: string) {
  try {
    const doc = await db.collection('stores').doc(storeId).collection('settings').doc('notifications').get();

    if (!doc.exists) {
      // Preferências padrão
      return {
        expiryAlerts: { channels: ['in-app', 'email', 'whatsapp'], enabled: true },
        lowStockAlerts: { channels: ['in-app', 'email'], enabled: true },
        dailyReports: { channels: ['email'], enabled: true, time: '18:00' },
      };
    }

    return doc.data();
  } catch (error) {
    console.error('Erro ao obter preferências de notificação:', error);
    return null;
  }
}
