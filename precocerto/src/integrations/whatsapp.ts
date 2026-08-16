/**
 * Integração com WhatsApp via Ultramsg
 * Semana 3: Alternativa a Twilio para notificações via WhatsApp
 *
 * Ultramsg é mais simples que Twilio:
 * - Menos configuração
 * - API mais clara
 * - Suporte a templates
 * - Plano gratuito disponível
 *
 * Requer: ULTRAMSG_TOKEN + ULTRAMSG_INSTANCE_ID
 */

import { NotificationSendResponse } from './notificationChannels';

/**
 * Configuração do Ultramsg
 */
export interface UltramsgConfig {
  token: string; // API token
  instanceId: string; // Instance ID
  enabled: boolean;
  timeout?: number;
}

/**
 * Resposta da API Ultramsg
 */
interface UltramsgApiResponse {
  success?: boolean;
  result?: {
    id: string;
    message_id: string;
    to: string;
    type: string;
    status: string;
  };
  error?: string;
  errors?: Array<{
    code: string;
    message: string;
  }>;
}

/**
 * Serviço de WhatsApp via Ultramsg
 */
export class WhatsAppService {
  private token: string;
  private instanceId: string;
  private apiUrl = 'https://api.ultramsg.com';
  private timeout: number = 10000;

  constructor(token: string, instanceId: string) {
    if (!token || !instanceId) {
      throw new Error('ULTRAMSG_TOKEN e ULTRAMSG_INSTANCE_ID são obrigatórios');
    }
    this.token = token;
    this.instanceId = instanceId;
  }

  /**
   * Enviar mensagem de texto
   */
  async sendMessage(chatId: string, message: string): Promise<NotificationSendResponse> {
    try {
      // Normalizar número (remover +, adicionar código país se necessário)
      const normalizedChatId = this.normalizePhoneNumber(chatId);

      const url = `${this.apiUrl}/${this.instanceId}/messages/chat`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: this.token,
          to: normalizedChatId,
          body: message,
        }).toString(),
      });

      if (!response.ok) {
        return {
          success: false,
          channel: 'whatsapp',
          error: `HTTP ${response.status}`,
          timestamp: new Date().toISOString(),
        };
      }

      const data: UltramsgApiResponse = await response.json();

      if (!data.success && data.errors) {
        return {
          success: false,
          channel: 'whatsapp',
          error: data.errors[0]?.message || 'Erro ao enviar',
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: !!data.success,
        channel: 'whatsapp',
        messageId: data.result?.message_id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        channel: 'whatsapp',
        error: error instanceof Error ? error.message : 'Erro ao enviar',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Enviar mensagem com imagem
   */
  async sendImage(
    chatId: string,
    imageUrl: string,
    caption?: string
  ): Promise<NotificationSendResponse> {
    try {
      const normalizedChatId = this.normalizePhoneNumber(chatId);

      const url = `${this.apiUrl}/${this.instanceId}/messages/image`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: this.token,
          to: normalizedChatId,
          image: imageUrl,
          caption: caption || '',
        }).toString(),
      });

      if (!response.ok) {
        return {
          success: false,
          channel: 'whatsapp',
          error: `HTTP ${response.status}`,
          timestamp: new Date().toISOString(),
        };
      }

      const data: UltramsgApiResponse = await response.json();

      return {
        success: !!data.success,
        channel: 'whatsapp',
        messageId: data.result?.message_id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        channel: 'whatsapp',
        error: error instanceof Error ? error.message : 'Erro ao enviar',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Enviar template de mensagem
   * (Requer templates criados na dashboard Ultramsg)
   */
  async sendTemplate(
    chatId: string,
    templateName: string,
    parameters?: Record<string, string>
  ): Promise<NotificationSendResponse> {
    try {
      const normalizedChatId = this.normalizePhoneNumber(chatId);

      const url = `${this.apiUrl}/${this.instanceId}/messages/template`;

      const body: Record<string, any> = {
        token: this.token,
        to: normalizedChatId,
        template: templateName,
      };

      if (parameters) {
        body.parameters = JSON.stringify(parameters);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(body).toString(),
      });

      if (!response.ok) {
        return {
          success: false,
          channel: 'whatsapp',
          error: `HTTP ${response.status}`,
          timestamp: new Date().toISOString(),
        };
      }

      const data: UltramsgApiResponse = await response.json();

      return {
        success: !!data.success,
        channel: 'whatsapp',
        messageId: data.result?.message_id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        channel: 'whatsapp',
        error: error instanceof Error ? error.message : 'Erro ao enviar',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Verificar status do serviço
   */
  async getStatus(): Promise<{
    connected: boolean;
    phone?: string;
    qrCode?: string;
  } | null> {
    try {
      const url = `${this.apiUrl}/${this.instanceId}/status`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return {
        connected: data.result?.connected || false,
        phone: data.result?.phone,
        qrCode: data.result?.qrCode,
      };
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      return null;
    }
  }

  /**
   * Normalizar número de telefone
   * Converte para formato E.164
   */
  private normalizePhoneNumber(phone: string): string {
    // Remover espaços e caracteres especiais
    let normalized = phone.replace(/\D/g, '');

    // Se não tem código país (começa com 9 ou menos dígitos), assume Angola (+244)
    if (normalized.length <= 9) {
      normalized = '244' + normalized;
    }

    // Se começa com 244 mas sem +, adicionar
    if (normalized.startsWith('244') && !phone.startsWith('+')) {
      return normalized;
    }

    return normalized;
  }

  /**
   * Validar número de telefone
   */
  static isValidPhoneNumber(phone: string): boolean {
    // Remove non-digits
    const cleaned = phone.replace(/\D/g, '');

    // Deve ter entre 7 e 15 dígitos (padrão E.164)
    if (cleaned.length < 7 || cleaned.length > 15) {
      return false;
    }

    return true;
  }
}

/**
 * Factory para criar instância do serviço
 */
let whatsappInstance: WhatsAppService | null = null;

export function getWhatsAppService(): WhatsAppService {
  if (!whatsappInstance) {
    const token = process.env.VITE_ULTRAMSG_TOKEN || process.env.ULTRAMSG_TOKEN;
    const instanceId = process.env.VITE_ULTRAMSG_INSTANCE_ID || process.env.ULTRAMSG_INSTANCE_ID;

    if (!token || !instanceId) {
      throw new Error(
        'ULTRAMSG_TOKEN e ULTRAMSG_INSTANCE_ID não configurados. Configure as variáveis de ambiente VITE_ULTRAMSG_TOKEN e VITE_ULTRAMSG_INSTANCE_ID'
      );
    }

    whatsappInstance = new WhatsAppService(token, instanceId);
  }

  return whatsappInstance;
}

/**
 * Reset para testes
 */
export function resetWhatsAppService(): void {
  whatsappInstance = null;
}

/**
 * Formatar mensagem de alerta para WhatsApp
 */
export function formatAlertMessageForWhatsApp(
  productName: string,
  severity: 'CRITICAL' | 'WARNING' | 'INFO',
  daysUntilExpiry: number,
  quantity?: number,
  batchNumber?: string
): string {
  let emoji = '✅';
  let title = 'Informação';
  let urgent = '';

  if (severity === 'CRITICAL') {
    emoji = '🚨';
    title = 'ALERTA CRÍTICO';
    urgent = '\n⚠️ AÇÃO URGENTE NECESSÁRIA HOJE!';
  } else if (severity === 'WARNING') {
    emoji = '⏰';
    title = 'Aviso de Validade';
  }

  let message = `${emoji} ${title}\n\n`;
  message += `Produto: ${productName}\n`;
  message += `Dias restantes: ${daysUntilExpiry}\n`;

  if (quantity) {
    message += `Quantidade: ${quantity} unidades\n`;
  }

  if (batchNumber) {
    message += `Lote: ${batchNumber}\n`;
  }

  message += urgent;

  return message;
}
