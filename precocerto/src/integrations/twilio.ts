/**
 * Twilio Integration
 * Envio de mensagens WhatsApp e SMS
 * Fase: Integrações Avançadas - WhatsApp & SMS
 */

interface TwilioMessage {
  to: string; // Número no formato +244XXXXXXXXX
  body: string;
  mediaUrl?: string;
}

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string; // Número Twilio ou WhatsApp Business
  whatsappFromNumber?: string; // Número WhatsApp Business (opcional)
}

class TwilioServiceImpl {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  private whatsappFromNumber: string;
  private apiUrl: string;
  private whatsappApiUrl: string;

  constructor(config: TwilioConfig) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.fromNumber = config.fromNumber;
    this.whatsappFromNumber = config.whatsappFromNumber || config.fromNumber;
    this.apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    this.whatsappApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
  }

  /**
   * Validar número de telefone Angola
   */
  private validateAngolaNumber(number: string): boolean {
    // Aceita formatos: +244XXXXXXXXX, 244XXXXXXXXX, 9XXXXXXXX (9 dígitos)
    const angolaNineDigits = /^9\d{8}$/;
    const angolaWithCountry = /^(\+)?244\d{9}$/;

    if (angolaNineDigits.test(number)) {
      return true;
    }

    if (angolaWithCountry.test(number)) {
      return true;
    }

    return false;
  }

  /**
   * Normalizar número para formato +244XXXXXXXXX
   */
  private normalizeNumber(number: string): string {
    // Remove espaços e caracteres especiais
    let cleaned = number.replace(/\D/g, '');

    // Se começa com 9 (sem país), adiciona 244
    if (cleaned.length === 9 && cleaned.startsWith('9')) {
      return `+244${cleaned}`;
    }

    // Se tem 244 mas sem +, adiciona +
    if (cleaned.length === 12 && cleaned.startsWith('244')) {
      return `+${cleaned}`;
    }

    // Se já tem +244, retorna como está
    if (cleaned.startsWith('+244') || cleaned.startsWith('244')) {
      return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    }

    throw new Error(`Número de telefone inválido: ${number}`);
  }

  /**
   * Enviar SMS
   */
  async sendSMS(to: string, body: string): Promise<{ success: boolean; sid?: string; error?: string }> {
    try {
      if (!this.accountSid || !this.authToken) {
        console.warn('⚠️ Twilio credentials not configured. SMS not sent.');
        return { success: false, error: 'Twilio not configured' };
      }

      // Validar número
      if (!this.validateAngolaNumber(to)) {
        return { success: false, error: `Número de telefone inválido: ${to}` };
      }

      const toNumber = this.normalizeNumber(to);

      const params = new URLSearchParams();
      params.append('From', this.fromNumber);
      params.append('To', toNumber);
      params.append('Body', body);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${this.accountSid}:${this.authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Twilio HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      console.log(`✅ SMS enviado para ${toNumber}`);

      return {
        success: true,
        sid: data.sid,
      };
    } catch (error) {
      console.error('❌ Erro ao enviar SMS via Twilio:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Enviar mensagem WhatsApp
   */
  async sendWhatsApp(to: string, body: string, mediaUrl?: string): Promise<{ success: boolean; sid?: string; error?: string }> {
    try {
      if (!this.accountSid || !this.authToken) {
        console.warn('⚠️ Twilio credentials not configured. WhatsApp message not sent.');
        return { success: false, error: 'Twilio not configured' };
      }

      // Validar número
      if (!this.validateAngolaNumber(to)) {
        return { success: false, error: `Número de telefone inválido: ${to}` };
      }

      const toNumber = `whatsapp:${this.normalizeNumber(to)}`;

      const params = new URLSearchParams();
      params.append('From', `whatsapp:${this.whatsappFromNumber}`);
      params.append('To', toNumber);
      params.append('Body', body);

      if (mediaUrl) {
        params.append('MediaUrl', mediaUrl);
      }

      const response = await fetch(this.whatsappApiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${this.accountSid}:${this.authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Twilio HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      console.log(`✅ WhatsApp enviado para ${toNumber}`);

      return {
        success: true,
        sid: data.sid,
      };
    } catch (error) {
      console.error('❌ Erro ao enviar WhatsApp via Twilio:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Enviar alerta via WhatsApp
   */
  async sendAlertWhatsApp(to: string, alertType: string, title: string, message: string): Promise<{ success: boolean }> {
    const alertEmojis: { [key: string]: string } = {
      stock_critical: '🔴',
      stock_low: '📦',
      expiry_soon: '⏰',
      expiry_today: '🚨',
      negative_margin: '⚠️',
      reorder_needed: '🛒',
    };

    const emoji = alertEmojis[alertType] || '❗';

    const whatsappMessage = `${emoji} *Alerta PreçoCerto*\n\n*${title}*\n\n${message}\n\nVer detalhes: https://precocerto-als.netlify.app/`;

    return this.sendWhatsApp(to, whatsappMessage);
  }

  /**
   * Enviar relatório via WhatsApp
   */
  async sendReportWhatsApp(
    to: string,
    storeName: string,
    reportDate: string,
    reportData: any
  ): Promise<{ success: boolean }> {
    const reportMessage = `📊 *Relatório Diário - ${reportDate}*\n\n` +
      `*Loja:* ${storeName}\n\n` +
      `💰 *Receita:* ${(reportData.totalRevenue || 0).toLocaleString('pt-PT')} Kz\n` +
      `📦 *Unidades:* ${reportData.totalUnits || 0}\n` +
      `📈 *Lucro:* ${(reportData.totalProfit || 0).toLocaleString('pt-PT')} Kz\n` +
      `% *Margem:* ${(reportData.avgMargin || 0).toFixed(1)}%\n\n` +
      (reportData.topProduct
        ? `⭐ *Top:* ${reportData.topProduct.name} (${reportData.topProduct.units} un.)\n\n`
        : '') +
      `Ver relatório completo: https://precocerto-als.netlify.app/`;

    return this.sendWhatsApp(to, reportMessage);
  }

  /**
   * Enviar notificação diária resumida
   */
  async sendDailySummaryWhatsApp(to: string, storeName: string, summary: any): Promise<{ success: boolean }> {
    const summaryMessage = `📊 *Resumo do Dia - ${storeName}*\n\n` +
      `✅ Alertas: ${summary.alertsCount || 0}\n` +
      `📦 Stock: ${summary.stockStatus || 'OK'}\n` +
      `💰 Receita: ${summary.revenue || '0'} Kz\n` +
      `⏰ Atualizado: ${new Date().toLocaleTimeString('pt-PT')}\n\n` +
      `Detalhes: https://precocerto-als.netlify.app/`;

    return this.sendWhatsApp(to, summaryMessage);
  }
}

// Inicializar com variáveis de ambiente
const config: TwilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  fromNumber: process.env.TWILIO_PHONE_NUMBER || '',
  whatsappFromNumber: process.env.TWILIO_WHATSAPP_NUMBER,
};

export const TwilioService = new TwilioServiceImpl(config);
