/**
 * SendGrid Integration
 * Envio de emails transacionais
 * Fase: Integrações Avançadas - Email
 */

import axios from 'axios';

interface EmailMessage {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    name: string;
    type: string;
    base64: string;
  }>;
}

interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

class SendGridServiceImpl {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private apiUrl = 'https://api.sendgrid.com/v3/mail/send';

  constructor(config: SendGridConfig) {
    this.apiKey = config.apiKey;
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;
  }

  /**
   * Enviar email simples
   */
  async sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.apiKey) {
        console.warn('⚠️ SendGrid API key not configured. Email not sent.');
        return { success: false, error: 'SendGrid not configured' };
      }

      const payload = {
        personalizations: [
          {
            to: [{ email: message.to }],
            subject: message.subject,
          },
        ],
        from: {
          email: message.from || this.fromEmail,
          name: this.fromName,
        },
        content: [
          {
            type: 'text/html',
            value: message.htmlContent,
          },
        ],
        replyTo: message.replyTo ? { email: message.replyTo } : undefined,
        attachments: message.attachments,
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`✅ Email enviado para ${message.to}`);

      return {
        success: true,
        messageId: response.headers['x-message-id'],
      };
    } catch (error) {
      console.error('❌ Erro ao enviar email via SendGrid:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Enviar email de alerta
   */
  async sendAlertEmail(
    to: string,
    alertType: string,
    title: string,
    message: string,
    data?: any
  ): Promise<{ success: boolean }> {
    const htmlContent = this.generateAlertEmailHTML(alertType, title, message, data);

    return this.sendEmail({
      to,
      subject: `🚨 Alerta PreçoCerto: ${title}`,
      htmlContent,
    });
  }

  /**
   * Enviar relatório diário
   */
  async sendDailyReportEmail(
    to: string,
    storeName: string,
    reportDate: string,
    reportData: any
  ): Promise<{ success: boolean }> {
    const htmlContent = this.generateDailyReportHTML(storeName, reportDate, reportData);

    return this.sendEmail({
      to,
      subject: `📊 Relatório Diário PreçoCerto - ${reportDate}`,
      htmlContent,
      textContent: this.generateDailyReportText(storeName, reportDate, reportData),
    });
  }

  /**
   * Gerar HTML do email de alerta
   */
  private generateAlertEmailHTML(alertType: string, title: string, message: string, data?: any): string {
    const alertEmojis: { [key: string]: string } = {
      stock_critical: '🔴',
      stock_low: '📦',
      expiry_soon: '⏰',
      expiry_today: '🚨',
      negative_margin: '⚠️',
      reorder_needed: '🛒',
    };

    const emoji = alertEmojis[alertType] || '❗';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #1a1a1a; margin: 0; }
            .message { font-size: 16px; line-height: 1.6; margin: 15px 0; }
            .data { background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .footer { font-size: 12px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
            .btn { display: inline-block; background: #007bff; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="title">${emoji} ${title}</h1>
            </div>

            <p class="message">${message}</p>

            ${
              data
                ? `
              <div class="data">
                <strong>Detalhes:</strong><br>
                ${Object.entries(data)
                  .map(([key, value]) => `<strong>${key}:</strong> ${value}<br>`)
                  .join('')}
              </div>
            `
                : ''
            }

            <p>
              <a href="https://precocerto-als.netlify.app/" class="btn">Ver PreçoCerto</a>
            </p>

            <div class="footer">
              <p>Este é um email automático do sistema PreçoCerto. Por favor, não responda a este email.</p>
              <p>© 2026 PreçoCerto - Gestão de Lojas Inteligente</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Gerar HTML do email de relatório diário
   */
  private generateDailyReportHTML(storeName: string, reportDate: string, reportData: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 8px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .title { font-size: 28px; margin: 0; font-weight: bold; }
            .subtitle { font-size: 14px; opacity: 0.9; margin-top: 5px; }
            .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .kpi-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; }
            .kpi-label { font-size: 12px; color: #666; font-weight: bold; }
            .kpi-value { font-size: 24px; font-weight: bold; color: #333; margin-top: 5px; }
            .section { margin: 20px 0; }
            .section-title { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 10px; border-bottom: 2px solid #667eea; padding-bottom: 5px; }
            .highlight { background: #fff3cd; padding: 10px; border-radius: 4px; margin: 10px 0; }
            .alert { background: #f8d7da; padding: 10px; border-radius: 4px; margin: 10px 0; color: #721c24; }
            .footer { font-size: 12px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; }
            .btn { display: inline-block; background: #667eea; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="title">📊 Relatório Diário</h1>
              <p class="subtitle">${storeName} - ${reportDate}</p>
            </div>

            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-label">💰 Receita Total</div>
                <div class="kpi-value">${(reportData.totalRevenue || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'AOA' })}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">📦 Unidades Vendidas</div>
                <div class="kpi-value">${reportData.totalUnits || 0}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">📈 Lucro Total</div>
                <div class="kpi-value">${(reportData.totalProfit || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'AOA' })}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">% Margem Média</div>
                <div class="kpi-value">${(reportData.avgMargin || 0).toFixed(1)}%</div>
              </div>
            </div>

            ${
              reportData.topProduct
                ? `
              <div class="section">
                <div class="section-title">⭐ Produto Top</div>
                <p><strong>${reportData.topProduct.name}</strong></p>
                <p>Vendas: ${reportData.topProduct.units} unidades | Receita: ${reportData.topProduct.revenue.toLocaleString('pt-PT', { style: 'currency', currency: 'AOA' })}</p>
              </div>
            `
                : ''
            }

            ${
              reportData.highlights && reportData.highlights.length > 0
                ? `
              <div class="section">
                <div class="section-title">✅ Destaques</div>
                ${reportData.highlights.map((h: string) => `<div class="highlight">${h}</div>`).join('')}
              </div>
            `
                : ''
            }

            ${
              reportData.recommendations && reportData.recommendations.length > 0
                ? `
              <div class="section">
                <div class="section-title">💡 Recomendações</div>
                ${reportData.recommendations.map((r: string) => `<div>${r}</div>`).join('')}
              </div>
            `
                : ''
            }

            ${
              reportData.alerts && (reportData.alerts.stockCritical > 0 || reportData.alerts.expiry > 0)
                ? `
              <div class="section">
                <div class="section-title">⚠️ Alertas do Dia</div>
                ${reportData.alerts.stockCritical > 0 ? `<div class="alert">🔴 ${reportData.alerts.stockCritical} produto(s) com stock crítico</div>` : ''}
                ${reportData.alerts.expiry > 0 ? `<div class="alert">⏰ ${reportData.alerts.expiry} produto(s) vencendo em breve</div>` : ''}
              </div>
            `
                : ''
            }

            <center>
              <a href="https://precocerto-als.netlify.app/" class="btn">Ver Detalhes Completos</a>
            </center>

            <div class="footer">
              <p>Este é um email automático do sistema PreçoCerto.</p>
              <p>© 2026 PreçoCerto - Gestão de Lojas Inteligente</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Gerar texto plano do relatório
   */
  private generateDailyReportText(storeName: string, reportDate: string, reportData: any): string {
    let text = `RELATÓRIO DIÁRIO - ${reportDate}\n`;
    text += `Loja: ${storeName}\n`;
    text += `${'='.repeat(50)}\n\n`;

    text += `KPIS DO DIA:\n`;
    text += `Receita Total: ${reportData.totalRevenue || 0} Kz\n`;
    text += `Unidades Vendidas: ${reportData.totalUnits || 0}\n`;
    text += `Lucro Total: ${reportData.totalProfit || 0} Kz\n`;
    text += `Margem Média: ${(reportData.avgMargin || 0).toFixed(1)}%\n\n`;

    if (reportData.topProduct) {
      text += `PRODUTO TOP:\n`;
      text += `${reportData.topProduct.name}\n`;
      text += `Vendas: ${reportData.topProduct.units} unidades\n`;
      text += `Receita: ${reportData.topProduct.revenue} Kz\n\n`;
    }

    if (reportData.highlights && reportData.highlights.length > 0) {
      text += `DESTAQUES:\n`;
      reportData.highlights.forEach((h: string) => {
        text += `- ${h}\n`;
      });
      text += '\n';
    }

    text += `Ver relatório completo em: https://precocerto-als.netlify.app/\n`;

    return text;
  }
}

// Inicializar com variáveis de ambiente
const config: SendGridConfig = {
  apiKey: process.env.SENDGRID_API_KEY || '',
  fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@precocerto.ao',
  fromName: 'PreçoCerto Automações',
};

export const SendGridService = new SendGridServiceImpl(config);
