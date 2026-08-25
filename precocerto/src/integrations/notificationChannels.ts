/**
 * Abstração para Canais de Notificação Multicanal
 * Semana 1: Infraestrutura base para sistema de alertas
 *
 * Interface unificada para enviar notificações através de:
 * - In-App: NotificationCenter (já existe)
 * - Email: SendGrid (futuro) / Firebase Admin
 * - WhatsApp: Twilio WhatsApp Business API
 * - SMS: Twilio SMS
 */

import { NotificationChannel, NotificationSendResponse } from '../types/notifications';

export type { NotificationSendResponse };

/**
 * Configuração de cada canal de notificação
 */
export interface ChannelConfig {
  channel: NotificationChannel;
  enabled: boolean;
  retryCount?: number;
  retryDelayMs?: number;
  timeout?: number;
}

/**
 * Payload unificado para envio de notificação
 */
export interface NotificationPayload {
  channel: NotificationChannel;
  recipient: string; // Identificador específico do canal (email, phone, userId)
  title?: string;
  subject?: string; // Para email
  body: string;
  action?: {
    label: string;
    url: string;
  };
  metadata?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Interface abstrata para implementação de canais
 */
export interface INotificationChannel {
  send(payload: NotificationPayload): Promise<NotificationSendResponse>;
  validate(payload: NotificationPayload): boolean;
  isAvailable(): Promise<boolean>;
}

function isValidPhoneRecipient(recipient: string): boolean {
  if (!recipient || !/^\+?[\d\s().-]+$/.test(recipient)) {
    return false;
  }

  const digits = recipient.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15 && !digits.startsWith('0');
}

/**
 * Implementação: In-App (usando NotificationCenter existente)
 */
export class InAppChannel implements INotificationChannel {
  validate(payload: NotificationPayload): boolean {
    return payload.channel === 'in-app' && !!payload.recipient; // recipient = userId
  }

  async send(payload: NotificationPayload): Promise<NotificationSendResponse> {
    const startTime = Date.now();
    try {
      // Simular envio de notificação in-app
      // Em produção, isso chamaria o NotificationCenter service
      console.log('📱 In-App:', {
        userId: payload.recipient,
        title: payload.title,
        body: payload.body,
      });

      return {
        success: true,
        channel: 'in-app',
        messageId: `in-app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        channel: 'in-app',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    return true; // In-app sempre disponível
  }
}

/**
 * Implementação: Email (placeholder - será integrado com SendGrid/Firebase)
 */
export class EmailChannel implements INotificationChannel {
  validate(payload: NotificationPayload): boolean {
    return (
      payload.channel === 'email' &&
      !!payload.recipient &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.recipient)
    );
  }

  async send(payload: NotificationPayload): Promise<NotificationSendResponse> {
    try {
      if (!this.validate(payload)) {
        return {
          success: false,
          channel: 'email',
          error: 'Invalid email address',
          timestamp: new Date().toISOString(),
        };
      }

      // Placeholder: em produção, integraria com SendGrid ou Firebase Cloud Messaging
      console.log('📧 Email:', {
        to: payload.recipient,
        subject: payload.subject || payload.title,
        body: payload.body,
      });

      // Simular latência de envio
      await new Promise((resolve) => setTimeout(resolve, 100));

      return {
        success: true,
        channel: 'email',
        messageId: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        channel: 'email',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    // Em produção, verificar se SendGrid/Firebase está configurado
    return true;
  }
}

/**
 * Implementação: SMS via Twilio (placeholder - será integrado depois)
 */
export class SMSChannel implements INotificationChannel {
  validate(payload: NotificationPayload): boolean {
    // Validar número de telefone format (simples)
    return (
      payload.channel === 'sms' &&
      isValidPhoneRecipient(payload.recipient)
    );
  }

  async send(payload: NotificationPayload): Promise<NotificationSendResponse> {
    try {
      if (!this.validate(payload)) {
        return {
          success: false,
          channel: 'sms',
          error: 'Invalid phone number',
          timestamp: new Date().toISOString(),
        };
      }

      // Placeholder: em produção, integraria com Twilio SMS API
      console.log('📱 SMS:', {
        to: payload.recipient,
        message: payload.body,
      });

      return {
        success: true,
        channel: 'sms',
        messageId: `sms-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        channel: 'sms',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    // Em produção, verificar se Twilio está configurado
    return true;
  }
}

/**
 * Implementação: WhatsApp via Twilio Business API (placeholder - será integrado depois)
 */
export class WhatsAppChannel implements INotificationChannel {
  validate(payload: NotificationPayload): boolean {
    // Número WhatsApp (mesmo que SMS)
    return (
      payload.channel === 'whatsapp' &&
      isValidPhoneRecipient(payload.recipient)
    );
  }

  async send(payload: NotificationPayload): Promise<NotificationSendResponse> {
    try {
      if (!this.validate(payload)) {
        return {
          success: false,
          channel: 'whatsapp',
          error: 'Invalid phone number',
          timestamp: new Date().toISOString(),
        };
      }

      // Tentar usar Ultramsg se configurado
      try {
        const { getWhatsAppService } = await import('./whatsapp');
        const whatsappService = getWhatsAppService();
        return await whatsappService.sendMessage(payload.recipient, payload.body);
      } catch (error) {
        // Fallback: mock message se não tiver Ultramsg configurado
        console.log('💬 WhatsApp (mock):', {
          to: payload.recipient,
          message: payload.body,
          note: 'Configure ULTRAMSG_TOKEN e ULTRAMSG_INSTANCE_ID para ativar',
        });

        return {
          success: true,
          channel: 'whatsapp',
          messageId: `whatsapp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      return {
        success: false,
        channel: 'whatsapp',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    // Em produção, verificar se Twilio está configurado
    return true;
  }
}

/**
 * Orquestrador central de notificações multicanal
 * Gerencia envio através de múltiplos canais com retry automático
 */
export class NotificationOrchestrator {
  private channels: Map<NotificationChannel, INotificationChannel>;
  private defaultRetryCount: number = 3;
  private defaultRetryDelayMs: number = 1000;

  constructor() {
    this.channels = new Map([
      ['in-app', new InAppChannel()],
      ['email', new EmailChannel()],
      ['sms', new SMSChannel()],
      ['whatsapp', new WhatsAppChannel()],
    ]);
  }

  /**
   * Enviar notificação através de um único canal
   */
  async send(
    payload: NotificationPayload,
    retryCount: number = this.defaultRetryCount
  ): Promise<NotificationSendResponse> {
    const channel = this.channels.get(payload.channel);

    if (!channel) {
      return {
        success: false,
        channel: payload.channel,
        error: `Channel not supported: ${payload.channel}`,
        timestamp: new Date().toISOString(),
      };
    }

    // Tentar enviar com retry
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        if (!channel.validate(payload)) {
          return {
            success: false,
            channel: payload.channel,
            error: 'Invalid payload for this channel',
            timestamp: new Date().toISOString(),
          };
        }

        const result = await channel.send(payload);
        result.retryCount = attempt - 1;
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < retryCount) {
          // Delay exponencial antes de retentativa
          const delayMs = this.defaultRetryDelayMs * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    return {
      success: false,
      channel: payload.channel,
      error: `Failed after ${retryCount} attempts: ${lastError?.message}`,
      timestamp: new Date().toISOString(),
      retryCount,
    };
  }

  /**
   * Enviar notificação através de múltiplos canais em paralelo
   */
  async sendMultiple(
    payload: Omit<NotificationPayload, 'channel'>,
    channels: NotificationChannel[]
  ): Promise<NotificationSendResponse[]> {
    const payloads = channels.map((channel) => ({
      ...payload,
      channel,
    }));

    return Promise.all(payloads.map((p) => this.send(p)));
  }

  /**
   * Registar implementação customizada de um canal
   */
  registerChannel(channel: NotificationChannel, implementation: INotificationChannel): void {
    this.channels.set(channel, implementation);
  }

  /**
   * Verificar quais canais estão disponíveis
   */
  async getAvailableChannels(): Promise<NotificationChannel[]> {
    const available: NotificationChannel[] = [];

    for (const [channel, implementation] of this.channels) {
      if (await implementation.isAvailable()) {
        available.push(channel);
      }
    }

    return available;
  }
}

/**
 * Singleton do orquestrador
 */
let orchestratorInstance: NotificationOrchestrator | null = null;

export function getNotificationOrchestrator(): NotificationOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new NotificationOrchestrator();
  }
  return orchestratorInstance;
}

/**
 * Helper para resetar orquestrador (útil para testes)
 */
export function resetNotificationOrchestrator(): void {
  orchestratorInstance = null;
}
