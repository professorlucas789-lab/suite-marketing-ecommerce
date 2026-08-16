/**
 * Integração com Telegram Bot API
 * Semana 3: Alternativa a Twilio para notificações via Telegram
 *
 * Vantagens:
 * - Gratuita
 * - Official API do Telegram
 * - Altamente confiável
 * - Fácil de configurar
 * - Sem limites de mensagens
 *
 * Requer: TELEGRAM_BOT_TOKEN (obtido de BotFather)
 */

import { NotificationPayload, NotificationSendResponse } from './notificationChannels';

/**
 * Configuração do Telegram
 */
export interface TelegramConfig {
  botToken: string; // Obtido de @BotFather
  enabled: boolean;
  timeout?: number; // milliseconds
  retryCount?: number;
}

/**
 * Resposta da API do Telegram
 */
interface TelegramApiResponse {
  ok: boolean;
  result?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
  error_code?: number;
  description?: string;
}

/**
 * Serviço de Telegram
 */
export class TelegramService {
  private botToken: string;
  private apiUrl = 'https://api.telegram.org/bot';
  private timeout: number = 10000; // 10 segundos

  constructor(botToken: string) {
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN não configurado');
    }
    this.botToken = botToken;
  }

  /**
   * Enviar mensagem para um chat (user, group, ou channel)
   */
  async sendMessage(chatId: string | number, message: string): Promise<NotificationSendResponse> {
    try {
      const url = `${this.apiUrl}${this.botToken}/sendMessage`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML', // Suporta formatação HTML
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          channel: 'telegram',
          error: error.description || `HTTP ${response.status}`,
          timestamp: new Date().toISOString(),
        };
      }

      const data: TelegramApiResponse = await response.json();

      if (!data.ok) {
        return {
          success: false,
          channel: 'telegram',
          error: data.description || 'Erro desconhecido',
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        channel: 'telegram',
        messageId: data.result?.message_id.toString(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        channel: 'telegram',
        error: error instanceof Error ? error.message : 'Erro ao enviar',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Enviar mensagem com botão/link
   */
  async sendMessageWithButton(
    chatId: string | number,
    message: string,
    buttonLabel: string,
    buttonUrl: string
  ): Promise<NotificationSendResponse> {
    try {
      const url = `${this.apiUrl}${this.botToken}/sendMessage`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: buttonLabel,
                  url: buttonUrl,
                },
              ],
            ],
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          channel: 'telegram',
          error: error.description || `HTTP ${response.status}`,
          timestamp: new Date().toISOString(),
        };
      }

      const data: TelegramApiResponse = await response.json();

      if (!data.ok) {
        return {
          success: false,
          channel: 'telegram',
          error: data.description || 'Erro desconhecido',
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        channel: 'telegram',
        messageId: data.result?.message_id.toString(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        channel: 'telegram',
        error: error instanceof Error ? error.message : 'Erro ao enviar',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Obter informações do bot
   */
  async getMe(): Promise<{
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
  } | null> {
    try {
      const url = `${this.apiUrl}${this.botToken}/getMe`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error('Erro ao obter info do bot:', response.status);
        return null;
      }

      const data: TelegramApiResponse = await response.json();

      if (!data.ok) {
        console.error('Telegram error:', data.description);
        return null;
      }

      return data.result as any;
    } catch (error) {
      console.error('Erro ao conectar com Telegram:', error);
      return null;
    }
  }

  /**
   * Verificar se o bot está configurado corretamente
   */
  async isConfigured(): Promise<boolean> {
    const botInfo = await this.getMe();
    return !!botInfo;
  }
}

/**
 * Factory para criar instância do serviço
 */
let telegramInstance: TelegramService | null = null;

export function getTelegramService(): TelegramService {
  if (!telegramInstance) {
    const token = process.env.VITE_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      throw new Error(
        'TELEGRAM_BOT_TOKEN não configurado. Configure a variável de ambiente VITE_TELEGRAM_BOT_TOKEN'
      );
    }

    telegramInstance = new TelegramService(token);
  }

  return telegramInstance;
}

/**
 * Reset para testes
 */
export function resetTelegramService(): void {
  telegramInstance = null;
}

/**
 * Formatar mensagem de alerta para Telegram
 */
export function formatAlertMessageForTelegram(
  productName: string,
  severity: 'CRITICAL' | 'WARNING' | 'INFO',
  daysUntilExpiry: number,
  quantity?: number,
  batchNumber?: string
): string {
  let emoji = '✅';
  let title = 'Informação';

  if (severity === 'CRITICAL') {
    emoji = '🚨';
    title = '<b>ALERTA CRÍTICO</b>';
  } else if (severity === 'WARNING') {
    emoji = '⏰';
    title = '<b>Aviso</b>';
  }

  let message = `${emoji} ${title}\n\n`;
  message += `<b>Produto:</b> ${productName}\n`;
  message += `<b>Dias:</b> ${daysUntilExpiry} dia(s)\n`;

  if (quantity) {
    message += `<b>Quantidade:</b> ${quantity} unidades\n`;
  }

  if (batchNumber) {
    message += `<b>Lote:</b> <code>${batchNumber}</code>\n`;
  }

  message += `\n<i>Ação necessária para ${severity === 'CRITICAL' ? 'HOJE' : 'breve'}</i>`;

  return message;
}
