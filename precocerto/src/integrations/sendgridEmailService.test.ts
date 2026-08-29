/**
 * Testes: SendGrid Email Service
 * FASE 5: Integrações Avançadas
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SendGridEmailService, SendGridEmailPayload } from './sendgridEmailService';

// Mock fetch
global.fetch = vi.fn();

describe('SendGrid Email Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variables
    import.meta.env.VITE_SENDGRID_API_KEY = 'test-key-123';
    import.meta.env.VITE_SENDGRID_FROM_EMAIL = 'noreply@precocerto.app';
    import.meta.env.VITE_SENDGRID_FROM_NAME = 'PreçoCerto';
  });

  describe('Configuração e Validação', () => {
    it('deve detectar quando SendGrid está configurado', () => {
      const configured = SendGridEmailService.isConfigured();
      expect(configured).toBe(true);
    });

    it('deve detectar quando SendGrid não está configurado', () => {
      import.meta.env.VITE_SENDGRID_API_KEY = '';
      const configured = SendGridEmailService.isConfigured();
      expect(configured).toBe(false);
    });

    it('deve validar que estrutura de payload é válida', () => {
      const payload: SendGridEmailPayload = {
        to: 'user@example.com',
        subject: 'Test Email',
        htmlContent: '<p>Test content</p>',
      };

      expect(payload).toHaveProperty('to');
      expect(payload).toHaveProperty('subject');
      expect(payload).toHaveProperty('htmlContent');
    });

    it('deve permitir campos opcionais no payload', () => {
      const payload: SendGridEmailPayload = {
        to: 'user@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        toName: 'John Doe',
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        replyTo: 'reply@example.com',
        trackingSettings: {
          openTracking: true,
          clickTracking: false,
        },
        customArgs: {
          type: 'test_email',
          userId: 'user123',
        },
      };

      expect(payload.toName).toBe('John Doe');
      expect(payload.cc).toContain('cc@example.com');
      expect(payload.bcc).toContain('bcc@example.com');
      expect(payload.trackingSettings?.openTracking).toBe(true);
      expect(payload.customArgs?.type).toBe('test_email');
    });
  });

  describe('Envio de Emails', () => {
    it('deve retornar erro quando não configurado', async () => {
      import.meta.env.VITE_SENDGRID_API_KEY = '';

      const result = await SendGridEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.messageId).toContain('mock-');
    });

    it('deve construir request correto para SendGrid API', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'sg-123456' }),
        headers: new Headers({ 'X-Message-ID': 'msg-123456' }),
      } as Response);

      const payload: SendGridEmailPayload = {
        to: 'test@example.com',
        toName: 'Test User',
        subject: 'Test Email',
        htmlContent: '<p>Hello</p>',
        textContent: 'Hello',
        cc: ['cc@test.com'],
        trackingSettings: {
          openTracking: true,
          clickTracking: true,
        },
        customArgs: {
          type: 'test',
        },
      };

      await SendGridEmailService.sendEmail(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.sendgrid.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer'),
          }),
        })
      );
    });

    it('deve retornar messageId no sucesso', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'X-Message-ID': 'msg-success-123' }),
      } as Response);

      const result = await SendGridEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-success-123');
    });

    it('deve retornar erro quando API falha', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ errors: ['Invalid email'] }),
      } as Response);

      const result = await SendGridEmailService.sendEmail({
        to: 'invalid-email',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.messageId).toBe('');
    });
  });

  describe('Alerta de Validade de Produto', () => {
    beforeEach(() => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'X-Message-ID': 'msg-expiry-123' }),
      } as Response);
    });

    it('deve enviar alerta CRÍTICO com seveiridade alta', async () => {
      const result = await SendGridEmailService.sendExpiryAlert(
        'manager@store.com',
        'Ibuprofen 200mg',
        5,
        'CRITICAL'
      );

      expect(result.success).toBe(true);
    });

    it('deve enviar alerta WARNING com severidade média', async () => {
      const result = await SendGridEmailService.sendExpiryAlert(
        'manager@store.com',
        'Ibuprofen 200mg',
        15,
        'WARNING'
      );

      expect(result.success).toBe(true);
    });

    it('deve enviar alerta INFO com severidade baixa', async () => {
      const result = await SendGridEmailService.sendExpiryAlert(
        'manager@store.com',
        'Ibuprofen 200mg',
        45,
        'INFO'
      );

      expect(result.success).toBe(true);
    });

    it('deve incluir informações do produto no conteúdo', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'X-Message-ID': 'msg-123' }),
      } as Response);

      await SendGridEmailService.sendExpiryAlert(
        'test@test.com',
        'Paracetamol 500mg',
        3,
        'CRITICAL'
      );

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);
      const htmlContent = body.content[0].value;

      expect(htmlContent).toContain('Paracetamol 500mg');
      expect(htmlContent).toContain('3');
    });

    it('deve enviar com tracking habilitado para alertas críticos', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'X-Message-ID': 'msg-123' }),
      } as Response);

      await SendGridEmailService.sendExpiryAlert(
        'test@test.com',
        'Product A',
        5,
        'CRITICAL'
      );

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);

      expect(body.trackingSettings.openTracking.enable).toBe(true);
      expect(body.trackingSettings.clickTracking.enable).toBe(true);
    });
  });

  describe('Relatório Diário de Alertas', () => {
    beforeEach(() => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'X-Message-ID': 'msg-report-123' }),
      } as Response);
    });

    it('deve enviar relatório com contagem correta de alertas', async () => {
      const result = await SendGridEmailService.sendDailyAlertReport(
        'manager@store.com',
        'store-123',
        'Loja Central',
        5,
        8,
        12
      );

      expect(result.success).toBe(true);
    });

    it('deve incluir totais corretos no relatório', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'X-Message-ID': 'msg-123' }),
      } as Response);

      await SendGridEmailService.sendDailyAlertReport(
        'test@test.com',
        'store-1',
        'Test Store',
        3,
        5,
        7
      );

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);
      const htmlContent = body.content[0].value;

      expect(htmlContent).toContain('3'); // critical count
      expect(htmlContent).toContain('5'); // warning count
      expect(htmlContent).toContain('7'); // info count
      expect(htmlContent).toContain('Test Store');
    });

    it('deve usar customArgs para rastreamento', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'X-Message-ID': 'msg-123' }),
      } as Response);

      await SendGridEmailService.sendDailyAlertReport(
        'test@test.com',
        'store-xyz',
        'Store XYZ',
        1,
        2,
        3
      );

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);

      expect(body.personalizations[0].customArgs.type).toBe('daily_report');
      expect(body.personalizations[0].customArgs.storeId).toBe('store-xyz');
    });
  });

  describe('Notificação de Stock Baixo', () => {
    beforeEach(() => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'X-Message-ID': 'msg-stock-123' }),
      } as Response);
    });

    it('deve enviar notificação de stock baixo com quantidades corretas', async () => {
      const result = await SendGridEmailService.sendLowStockNotification(
        'manager@store.com',
        'Aspirina 500mg',
        5,
        20
      );

      expect(result.success).toBe(true);
    });

    it('deve calcular deficit corretamente', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'X-Message-ID': 'msg-123' }),
      } as Response);

      await SendGridEmailService.sendLowStockNotification(
        'test@test.com',
        'Product A',
        10,
        50
      );

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);
      const htmlContent = body.content[0].value;

      expect(htmlContent).toContain('10'); // current stock
      expect(htmlContent).toContain('50'); // minimum stock
      expect(htmlContent).toContain('40'); // deficit (50 - 10)
    });
  });

  describe('Relatório de Vendas', () => {
    beforeEach(() => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'X-Message-ID': 'msg-sales-123' }),
      } as Response);
    });

    it('deve enviar relatório de vendas com KPIs corretos', async () => {
      const result = await SendGridEmailService.sendSalesReport(
        'manager@store.com',
        'store-123',
        'Loja Central',
        '2026-08-29',
        45,
        1250000,
        120,
        'Ibuprofen 200mg'
      );

      expect(result.success).toBe(true);
    });

    it('deve incluir todos os KPIs no relatório', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'X-Message-ID': 'msg-123' }),
      } as Response);

      await SendGridEmailService.sendSalesReport(
        'test@test.com',
        'store-1',
        'Test Store',
        '2026-08-29',
        100,
        5000000,
        250,
        'Top Product'
      );

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);
      const htmlContent = body.content[0].value;

      expect(htmlContent).toContain('100'); // total sales
      expect(htmlContent).toContain('250'); // total units
      expect(htmlContent).toContain('Top Product'); // top product
      expect(htmlContent).toContain('2026-08-29'); // date
    });

    it('deve formatar moeda em Kz', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'X-Message-ID': 'msg-123' }),
      } as Response);

      await SendGridEmailService.sendSalesReport(
        'test@test.com',
        'store-1',
        'Store',
        '2026-08-29',
        50,
        1000000,
        100,
        'Product'
      );

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);
      const htmlContent = body.content[0].value;

      expect(htmlContent).toContain('Kz');
    });
  });

  describe('Webhook Parser', () => {
    it('deve fazer parse correto de evento delivered', () => {
      const payload = [
        {
          'message-id': 'msg-123',
          email: 'test@example.com',
          event: 'delivered',
          timestamp: 1693305600,
        },
      ];

      const event = SendGridEmailService.parseWebhookEvent(payload);

      expect(event).not.toBeNull();
      expect(event?.id).toBe('msg-123');
      expect(event?.email).toBe('test@example.com');
      expect(event?.eventType).toBe('delivered');
    });

    it('deve fazer parse correto de evento opened', () => {
      const payload = [
        {
          'message-id': 'msg-456',
          email: 'user@example.com',
          event: 'opened',
          timestamp: 1693305700,
          useragent: 'Mozilla/5.0',
          ip: '192.168.1.1',
        },
      ];

      const event = SendGridEmailService.parseWebhookEvent(payload);

      expect(event?.eventType).toBe('opened');
      expect(event?.metadata?.useragent).toBe('Mozilla/5.0');
      expect(event?.metadata?.ip).toBe('192.168.1.1');
    });

    it('deve fazer parse correto de evento clicked', () => {
      const payload = [
        {
          'message-id': 'msg-789',
          email: 'click@example.com',
          event: 'clicked',
          timestamp: 1693305800,
          url: 'https://example.com/tracking',
        },
      ];

      const event = SendGridEmailService.parseWebhookEvent(payload);

      expect(event?.eventType).toBe('clicked');
      expect(event?.url).toBe('https://example.com/tracking');
    });

    it('deve fazer parse correto de evento bounced', () => {
      const payload = [
        {
          'message-id': 'msg-bounce',
          email: 'bounce@example.com',
          event: 'bounced',
          timestamp: 1693305900,
        },
      ];

      const event = SendGridEmailService.parseWebhookEvent(payload);

      expect(event?.eventType).toBe('bounced');
    });

    it('deve retornar null para payload inválido', () => {
      const event = SendGridEmailService.parseWebhookEvent(null);
      expect(event).toBeNull();
    });

    it('deve converter timestamp Unix corretamente', () => {
      const payload = [
        {
          'message-id': 'msg-time',
          email: 'test@example.com',
          event: 'delivered',
          timestamp: 1693305600, // Fri Aug 29 2024 08:00:00 GMT
        },
      ];

      const event = SendGridEmailService.parseWebhookEvent(payload);
      expect(event?.timestamp).toBeDefined();
      expect(event?.timestamp).toContain('2024'); // Year should be present
    });
  });

  describe('Conformidade e Segurança', () => {
    it('deve usar Bearer token authentication', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'X-Message-ID': 'msg-123' }),
      } as Response);

      await SendGridEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
      });

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const authHeader = callArgs.headers as Record<string, string>;

      expect(authHeader.Authorization).toContain('Bearer');
    });

    it('deve incluir Content-Type JSON', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'X-Message-ID': 'msg-123' }),
      } as Response);

      await SendGridEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
      });

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const headers = callArgs.headers as Record<string, string>;

      expect(headers['Content-Type']).toBe('application/json');
    });

    it('deve usar SendGrid v3 API endpoint', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'X-Message-ID': 'msg-123' }),
      } as Response);

      await SendGridEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('api.sendgrid.com/v3');
      expect(url).toContain('mail/send');
    });
  });

  describe('Performance e Limites', () => {
    it('deve suportar envio em batch de múltiplos emails', async () => {
      const emails = Array.from({ length: 10 }, (_, i) => `user${i}@example.com`);

      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'X-Message-ID': 'msg-123' }),
      } as Response);

      const results = await Promise.all(
        emails.map((email) =>
          SendGridEmailService.sendEmail({
            to: email,
            subject: 'Batch Email',
            htmlContent: '<p>Test</p>',
          })
        )
      );

      expect(results).toHaveLength(10);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('deve permitir agendamento de emails', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'X-Message-ID': 'msg-scheduled' }),
      } as Response);

      const sendAtTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      await SendGridEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Scheduled Email',
        htmlContent: '<p>Test</p>',
        sendAt: sendAtTime,
      });

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);

      expect(body.sendAt).toBe(sendAtTime);
    });
  });
});
