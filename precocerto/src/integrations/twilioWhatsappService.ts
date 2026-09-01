/**
 * Twilio WhatsApp Business Service
 * FASE 5: Integrações Avançadas
 *
 * Responsabilidades:
 * - Enviar mensagens WhatsApp através de Twilio
 * - Suporte a templates de mensagens
 * - Geolocalização e idioma automático
 * - Webhook para mensagens recebidas
 */

/**
 * Nota: Requer variáveis de ambiente:
 * - VITE_TWILIO_ACCOUNT_SID: SID da conta Twilio
 * - VITE_TWILIO_AUTH_TOKEN: Token de autenticação
 * - VITE_TWILIO_WHATSAPP_NUMBER: Número WhatsApp de negócio (com +)
 */

export interface WhatsAppMessage {
  to: string; // Número com +244
  body: string;
  mediaUrl?: string; // Opcional: URL de imagem/vídeo
  templateId?: string; // Opcional: usar template
  templateParams?: Record<string, string>;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: 'approved' | 'pending' | 'rejected';
  content: string;
  parameters: string[];
}

export interface WhatsAppWebhookEvent {
  from: string;
  to: string;
  messageId: string;
  timestamp: string;
  body: string;
  mediaUrl?: string;
  eventType: 'message_received' | 'message_sent' | 'message_delivered' | 'message_read' | 'delivery_failed';
}

/**
 * Classe para integração com Twilio WhatsApp Business
 */
export class TwilioWhatsAppService {
  private static readonly ACCOUNT_SID = import.meta.env.VITE_TWILIO_ACCOUNT_SID || '';
  private static readonly AUTH_TOKEN = import.meta.env.VITE_TWILIO_AUTH_TOKEN || '';
  private static readonly WHATSAPP_NUMBER = import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER || 'whatsapp:+244923000000';
  private static readonly API_BASE = 'https://api.twilio.com/2010-04-01';

  /**
   * Verificar se Twilio está configurado
   */
  static isConfigured(): boolean {
    return !!this.ACCOUNT_SID && !!this.AUTH_TOKEN;
  }

  /**
   * Enviar mensagem WhatsApp
   */
  static async sendMessage(
    phoneNumber: string,
    message: string,
    mediaUrl?: string
  ): Promise<{ messageSid: string; success: boolean }> {
    if (!this.isConfigured()) {
      console.warn('⚠️ Twilio não está configurado. WhatsApp não será enviado.');
      return { messageSid: 'mock-' + Date.now(), success: false };
    }

    try {
      // Validar número
      if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+' + phoneNumber;
      }

      console.log(`💬 [Twilio] Enviando WhatsApp para ${phoneNumber}...`);

      const formData = new URLSearchParams();
      formData.append('From', this.WHATSAPP_NUMBER);
      formData.append('To', `whatsapp:${phoneNumber}`);
      formData.append('Body', message);

      if (mediaUrl) {
        formData.append('MediaUrl', mediaUrl);
      }

      const auth = Buffer.from(`${this.ACCOUNT_SID}:${this.AUTH_TOKEN}`).toString('base64');

      const response = await fetch(
        `${this.API_BASE}/Accounts/${this.ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Twilio error: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      console.log(`✅ WhatsApp enviado com sucesso: ${data.sid}`);

      return { messageSid: data.sid, success: true };
    } catch (error) {
      console.error('❌ Erro ao enviar WhatsApp via Twilio:', error);
      return { messageSid: '', success: false };
    }
  }

  /**
   * Enviar alerta de validade por WhatsApp
   */
  static async sendExpiryAlert(
    phoneNumber: string,
    productName: string,
    daysUntilExpiry: number,
    severity: 'CRITICAL' | 'WARNING' | 'INFO'
  ): Promise<{ messageSid: string; success: boolean }> {
    const severityEmoji = {
      CRITICAL: '🚨',
      WARNING: '⚠️',
      INFO: 'ℹ️',
    }[severity];

    const actionText = {
      CRITICAL: 'AÇÃO URGENTE: Remova ou venda prioritariamente!',
      WARNING: 'Prepare ações de venda ou devolução',
      INFO: 'Monitorar validade',
    }[severity];

    const message = `${severityEmoji} *ALERTA DE VALIDADE*

Produto: ${productName}
Dias até vencimento: ${daysUntilExpiry}
Severidade: ${severity}

${actionText}

PreçoCerto - Sistema Inteligente`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Enviar alerta de stock baixo por WhatsApp
   */
  static async sendLowStockAlert(
    phoneNumber: string,
    productName: string,
    currentStock: number,
    minimumStock: number
  ): Promise<{ messageSid: string; success: boolean }> {
    const deficit = Math.max(0, minimumStock - currentStock);

    const message = `📦 *ALERTA DE STOCK BAIXO*

Produto: ${productName}
Stock atual: ${currentStock} un.
Stock mínimo: ${minimumStock} un.
Deficit: ${deficit} un.

Recomenda-se reabastecimento urgente.

PreçoCerto - Sistema Inteligente`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Enviar resumo de vendas diário por WhatsApp
   */
  static async sendDailySalesDigest(
    phoneNumber: string,
    storeId: string,
    storeName: string,
    date: string,
    totalSales: number,
    totalRevenue: number,
    topProduct: string
  ): Promise<{ messageSid: string; success: boolean }> {
    const message = `💰 *RESUMO DE VENDAS*

Loja: ${storeName}
Data: ${date}

Transações: ${totalSales}
Receita: Kz ${totalRevenue.toLocaleString()}
Produto Top: ${topProduct}

Parabéns pelo desempenho!

PreçoCerto - Sistema Inteligente`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Enviar saudação de boas-vindas
   */
  static async sendWelcomeMessage(phoneNumber: string, userName: string): Promise<{ messageSid: string; success: boolean }> {
    const message = `👋 *Bem-vindo ao PreçoCerto!*

Olá ${userName}!

Você foi adicionado ao sistema de notificações automáticas. Receberá alertas sobre:
✅ Produtos vencendo
✅ Stock baixo
✅ Resumos diários de vendas
✅ Relatórios importantes

Para gerenciar as preferências, aceda ao painel de controlo.

PreçoCerto - Sistema Inteligente`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Enviar relatório de alertas críticos
   */
  static async sendCriticalAlertsReport(
    phoneNumber: string,
    storeName: string,
    criticalCount: number,
    warningCount: number
  ): Promise<{ messageSid: string; success: boolean }> {
    if (criticalCount === 0 && warningCount === 0) {
      const message = `✅ *TUDO BEM*

${storeName}: Não há alertas críticos.

PreçoCerto - Sistema Inteligente`;
      return this.sendMessage(phoneNumber, message);
    }

    const message = `🚨 *ALERTAS PENDENTES*

${storeName}

Críticos (0-7 dias): ${criticalCount}
Avisos (7-30 dias): ${warningCount}

Aceda ao painel para ação imediata!

PreçoCerto - Sistema Inteligente`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Validar número de telefone
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    // Remover caracteres especiais
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Angola: +244 ou 244
    // Se começar com 9, assume +244
    if (cleaned.length === 9 && cleaned.startsWith('9')) {
      return true;
    }

    // Se começar com 244
    if (cleaned.startsWith('244') && cleaned.length === 12) {
      return true;
    }

    // Se começar com +244
    if (phoneNumber.includes('+244') && cleaned.length === 12) {
      return true;
    }

    return false;
  }

  /**
   * Normalizar número para formato Twilio (+244...)
   */
  static normalizePhoneNumber(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Se tem 9 dígitos (começando com 9), assume Angola sem código
    if (cleaned.length === 9) {
      cleaned = '244' + cleaned;
    }

    // Se não tem o +, adiciona
    if (!phoneNumber.includes('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  /**
   * Webhook handler para eventos de Twilio
   * Para ser implementado em backend/Cloud Function
   */
  static parseWebhookEvent(payload: any): WhatsAppWebhookEvent | null {
    try {
      const from = payload.From || '';
      const to = payload.To || '';
      const sid = payload.MessageSid || '';
      const timestamp = new Date().toISOString();
      const body = payload.Body || '';
      const mediaUrl = payload.MediaUrl0;

      // Detectar tipo de evento
      let eventType: WhatsAppWebhookEvent['eventType'] = 'message_received';

      if (payload.MessageStatus === 'sent') {
        eventType = 'message_sent';
      } else if (payload.MessageStatus === 'delivered') {
        eventType = 'message_delivered';
      } else if (payload.MessageStatus === 'read') {
        eventType = 'message_read';
      } else if (payload.MessageStatus === 'failed') {
        eventType = 'delivery_failed';
      }

      return {
        from: from.replace('whatsapp:', ''),
        to: to.replace('whatsapp:', ''),
        messageId: sid,
        timestamp,
        body,
        mediaUrl,
        eventType,
      };
    } catch (error) {
      console.error('Erro ao fazer parse do webhook de Twilio:', error);
      return null;
    }
  }

  /**
   * Obter templates aprovados de WhatsApp
   */
  static async getApprovedTemplates(): Promise<WhatsAppTemplate[]> {
    // Este método seria implementado com lista de templates pré-aprovados
    // Para produção, usar Twilio API para listar templates

    return [
      {
        id: 'expiry_alert_critical',
        name: 'Alerta Crítico de Validade',
        language: 'pt_PT',
        status: 'approved',
        content: '🚨 Produto {{productName}} expira em {{days}} dias - AÇÃO URGENTE',
        parameters: ['productName', 'days'],
      },
      {
        id: 'low_stock_alert',
        name: 'Alerta de Stock Baixo',
        language: 'pt_PT',
        status: 'approved',
        content: '📦 {{productName}} tem apenas {{quantity}} unidades em stock',
        parameters: ['productName', 'quantity'],
      },
      {
        id: 'daily_digest',
        name: 'Resumo Diário',
        language: 'pt_PT',
        status: 'approved',
        content: '💰 Vendas hoje: {{sales}} transações, Kz {{revenue}}',
        parameters: ['sales', 'revenue'],
      },
    ];
  }
}
