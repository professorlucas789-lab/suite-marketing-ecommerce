/**
 * SendGrid Email Service
 * FASE 5: Integrações Avançadas
 *
 * Responsabilidades:
 * - Enviar emails através de SendGrid
 * - Templating de emails profissionais
 * - Rastreamento de aberturas e cliques
 * - Gerenciamento de listas de contatos
 */

/**
 * Nota: Requer variáveis de ambiente:
 * - VITE_SENDGRID_API_KEY: Chave de API do SendGrid
 * - VITE_SENDGRID_FROM_EMAIL: Email remetente
 * - VITE_SENDGRID_FROM_NAME: Nome do remetente
 */

export interface SendGridEmailPayload {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  trackingSettings?: {
    openTracking: boolean;
    clickTracking: boolean;
  };
  customArgs?: Record<string, string>;
  sendAt?: number; // Unix timestamp para agendamento
}

export interface EmailTemplate {
  templateId: string;
  name: string;
  subject: string;
  type: 'alert' | 'report' | 'notification' | 'digest' | 'system';
}

export interface EmailTrackingEvent {
  id: string;
  email: string;
  eventType: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'marked_spam' | 'unsubscribed';
  timestamp: string;
  url?: string; // Para click events
  metadata?: Record<string, any>;
}

/**
 * Classe para integração com SendGrid
 */
export class SendGridEmailService {
  private static readonly API_KEY = import.meta.env.VITE_SENDGRID_API_KEY || '';
  private static readonly FROM_EMAIL = import.meta.env.VITE_SENDGRID_FROM_EMAIL || 'noreply@precocerto.app';
  private static readonly FROM_NAME = import.meta.env.VITE_SENDGRID_FROM_NAME || 'PreçoCerto';
  private static readonly API_BASE = 'https://api.sendgrid.com/v3';

  /**
   * Verificar se SendGrid está configurado
   */
  static isConfigured(): boolean {
    return !!this.API_KEY;
  }

  /**
   * Enviar email profissional
   */
  static async sendEmail(payload: SendGridEmailPayload): Promise<{ messageId: string; success: boolean }> {
    if (!this.isConfigured()) {
      console.warn('⚠️ SendGrid não está configurado. Email não será enviado.');
      return { messageId: 'mock-' + Date.now(), success: false };
    }

    try {
      console.log(`📧 [SendGrid] Enviando email para ${payload.to}...`);

      const response = await fetch(`${this.API_BASE}/mail/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [
                {
                  email: payload.to,
                  name: payload.toName || '',
                },
              ],
              cc: payload.cc?.map((email) => ({ email })) || [],
              bcc: payload.bcc?.map((email) => ({ email })) || [],
              customArgs: payload.customArgs || {},
            },
          ],
          from: {
            email: this.FROM_EMAIL,
            name: this.FROM_NAME,
          },
          replyTo: payload.replyTo
            ? {
                email: payload.replyTo,
              }
            : undefined,
          subject: payload.subject,
          content: [
            {
              type: 'text/html',
              value: payload.htmlContent,
            },
            ...(payload.textContent
              ? [
                  {
                    type: 'text/plain',
                    value: payload.textContent,
                  },
                ]
              : []),
          ],
          trackingSettings: {
            openTracking: {
              enable: payload.trackingSettings?.openTracking ?? true,
            },
            clickTracking: {
              enable: payload.trackingSettings?.clickTracking ?? true,
            },
          },
          sendAt: payload.sendAt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`SendGrid error: ${JSON.stringify(error)}`);
      }

      // Extrair X-Message-ID do header
      const messageId = response.headers.get('X-Message-ID') || 'unknown';

      console.log(`✅ Email enviado com sucesso: ${messageId}`);
      return { messageId, success: true };
    } catch (error) {
      console.error('❌ Erro ao enviar email via SendGrid:', error);
      return { messageId: '', success: false };
    }
  }

  /**
   * Enviar alerta de validade por email
   */
  static async sendExpiryAlert(
    email: string,
    productName: string,
    daysUntilExpiry: number,
    severity: 'CRITICAL' | 'WARNING' | 'INFO'
  ): Promise<{ messageId: string; success: boolean }> {
    const severityLabel = {
      CRITICAL: '🚨 CRÍTICO',
      WARNING: '⚠️ AVISO',
      INFO: 'ℹ️ INFORMAÇÃO',
    }[severity];

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #${severity === 'CRITICAL' ? 'dc2626' : severity === 'WARNING' ? 'ea580c' : '2563eb'};">
              ${severityLabel}: Produto Expirando
            </h1>

            <p>Olá,</p>

            <p>O seguinte produto está próximo da data de validade:</p>

            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Produto:</strong> ${productName}<br/>
              <strong>Dias até vencimento:</strong> ${daysUntilExpiry}<br/>
              <strong>Severidade:</strong> ${severityLabel}
            </div>

            <p>${
              severity === 'CRITICAL'
                ? '<strong>⚠️ Ação urgente necessária!</strong> Este produto está próximo da data de validade. Recomenda-se remover do stock ou proceder a uma venda prioritária.'
                : severity === 'WARNING'
                ? 'Este produto vai expirar em breve. Considere preparar ações de venda ou devolução.'
                : 'Este produto está monitorado. Continue observando a data de validade.'
            }</p>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666;">
              Este é um email automático do sistema PreçoCerto. Por favor, não responda diretamente.
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `${severityLabel} - Produto ${productName} expirando`,
      htmlContent,
      trackingSettings: {
        openTracking: true,
        clickTracking: true,
      },
      customArgs: {
        type: 'expiry_alert',
        severity,
      },
    });
  }

  /**
   * Enviar relatório diário de alertas
   */
  static async sendDailyAlertReport(
    email: string,
    storeId: string,
    storeName: string,
    criticalCount: number,
    warningCount: number,
    infoCount: number
  ): Promise<{ messageId: string; success: boolean }> {
    const totalAlerts = criticalCount + warningCount + infoCount;

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1>📊 Relatório Diário de Alertas</h1>
            <p>Loja: <strong>${storeName}</strong></p>

            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Resumo de Alertas</h2>

              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; text-align: center;">
                  <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${criticalCount}</div>
                  <div style="font-size: 12px; color: #991b1b;">Críticos (0-7 dias)</div>
                </div>

                <div style="background-color: #fed7aa; padding: 15px; border-radius: 5px; text-align: center;">
                  <div style="font-size: 24px; font-weight: bold; color: #ea580c;">${warningCount}</div>
                  <div style="font-size: 12px; color: #92400e;">Avisos (7-30 dias)</div>
                </div>

                <div style="background-color: #dbeafe; padding: 15px; border-radius: 5px; text-align: center;">
                  <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${infoCount}</div>
                  <div style="font-size: 12px; color: #1e40af;">Informativos (30+ dias)</div>
                </div>
              </div>

              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #d1d5db;">
                <strong>Total de Alertas:</strong> ${totalAlerts}
              </div>
            </div>

            <p>Acesse o painel de controlo para ver detalhes completos.</p>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666;">
              Este é um relatório automático diário do sistema PreçoCerto.
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `📊 Relatório Diário de Alertas - ${storeName}`,
      htmlContent,
      trackingSettings: {
        openTracking: true,
        clickTracking: false,
      },
      customArgs: {
        type: 'daily_report',
        storeId,
      },
    });
  }

  /**
   * Enviar email de notificação de stock baixo
   */
  static async sendLowStockNotification(
    email: string,
    productName: string,
    currentStock: number,
    minimumStock: number
  ): Promise<{ messageId: string; success: boolean }> {
    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #ea580c;">📦 Alerta de Stock Baixo</h1>

            <p>O seguinte produto tem stock abaixo do nível mínimo:</p>

            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Produto:</strong> ${productName}<br/>
              <strong>Stock atual:</strong> ${currentStock} unidades<br/>
              <strong>Stock mínimo:</strong> ${minimumStock} unidades<br/>
              <strong>Deficit:</strong> ${Math.max(0, minimumStock - currentStock)} unidades
            </div>

            <p>Recomenda-se realizar um reabastecimento urgente.</p>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666;">
              Este é um email automático do sistema PreçoCerto.
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `📦 Alerta: Stock baixo de ${productName}`,
      htmlContent,
      trackingSettings: {
        openTracking: true,
        clickTracking: true,
      },
      customArgs: {
        type: 'low_stock_alert',
      },
    });
  }

  /**
   * Enviar email de resumo de vendas
   */
  static async sendSalesReport(
    email: string,
    storeId: string,
    storeName: string,
    date: string,
    totalSales: number,
    totalRevenue: number,
    totalUnits: number,
    topProduct: string
  ): Promise<{ messageId: string; success: boolean }> {
    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1>💰 Relatório de Vendas</h1>
            <p>Data: <strong>${date}</strong></p>
            <p>Loja: <strong>${storeName}</strong></p>

            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <div style="font-size: 12px; color: #666;">Total de Vendas</div>
                  <div style="font-size: 28px; font-weight: bold; color: #2563eb;">${totalSales}</div>
                </div>

                <div>
                  <div style="font-size: 12px; color: #666;">Receita Total</div>
                  <div style="font-size: 28px; font-weight: bold; color: #059669;">Kz ${totalRevenue.toLocaleString()}</div>
                </div>

                <div>
                  <div style="font-size: 12px; color: #666;">Unidades Vendidas</div>
                  <div style="font-size: 28px; font-weight: bold; color: #7c3aed;">${totalUnits}</div>
                </div>

                <div>
                  <div style="font-size: 12px; color: #666;">Produto Top</div>
                  <div style="font-size: 14px; font-weight: bold;">${topProduct}</div>
                </div>
              </div>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666;">
              Este é um relatório automático do sistema PreçoCerto.
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `💰 Relatório de Vendas - ${storeName} (${date})`,
      htmlContent,
      trackingSettings: {
        openTracking: true,
        clickTracking: false,
      },
      customArgs: {
        type: 'sales_report',
        storeId,
        date,
      },
    });
  }

  /**
   * Webhook handler para eventos de SendGrid (delivered, opened, clicked, etc.)
   * Para ser implementado em backend/Cloud Function
   */
  static parseWebhookEvent(payload: any): EmailTrackingEvent | null {
    try {
      const event = payload[0]; // SendGrid envia array de eventos

      if (!event) return null;

      return {
        id: event['message-id'],
        email: event.email,
        eventType: event.event,
        timestamp: new Date(event.timestamp * 1000).toISOString(),
        url: event.url,
        metadata: {
          useragent: event.useragent,
          ip: event.ip,
        },
      };
    } catch (error) {
      console.error('Erro ao fazer parse do webhook de SendGrid:', error);
      return null;
    }
  }
}
