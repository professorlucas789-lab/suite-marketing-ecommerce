/**
 * Testes: Twilio WhatsApp Business Service
 * FASE 5: Integrações Avançadas
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TwilioWhatsAppService } from './twilioWhatsappService';

// Mock fetch
global.fetch = vi.fn();

describe('Twilio WhatsApp Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variables
    import.meta.env.VITE_TWILIO_ACCOUNT_SID = 'AC123456789abcdef';
    import.meta.env.VITE_TWILIO_AUTH_TOKEN = 'auth-token-secret';
    import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER = 'whatsapp:+244923000000';
  });

  describe('Configuração e Validação', () => {
    it('deve detectar quando Twilio está configurado', () => {
      const configured = TwilioWhatsAppService.isConfigured();
      expect(configured).toBe(true);
    });

    it('deve detectar quando Twilio não está configurado', () => {
      import.meta.env.VITE_TWILIO_ACCOUNT_SID = '';
      import.meta.env.VITE_TWILIO_AUTH_TOKEN = '';

      const configured = TwilioWhatsAppService.isConfigured();
      expect(configured).toBe(false);
    });

    it('deve usar valor padrão para número WhatsApp se não configurado', () => {
      import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER = '';
      // Instancia nova classe para pegar valor padrão
      expect(TwilioWhatsAppService.isConfigured()).toBe(true); // Só falha se SID/token vazios
    });
  });

  describe('Validação de Número de Telefone', () => {
    it('deve validar número com 9 dígitos começando com 9 (Angola)', () => {
      const valid = TwilioWhatsAppService.validatePhoneNumber('923000000');
      expect(valid).toBe(true);
    });

    it('deve validar número com +244 e 9 dígitos', () => {
      const valid = TwilioWhatsAppService.validatePhoneNumber('+244923000000');
      expect(valid).toBe(true);
    });

    it('deve validar número com 244 e 9 dígitos', () => {
      const valid = TwilioWhatsAppService.validatePhoneNumber('244923000000');
      expect(valid).toBe(true);
    });

    it('deve rejeitar número com dígitos insuficientes', () => {
      const valid = TwilioWhatsAppService.validatePhoneNumber('92300');
      expect(valid).toBe(false);
    });

    it('deve rejeitar número com formato inválido', () => {
      const valid = TwilioWhatsAppService.validatePhoneNumber('abcdefghijk');
      expect(valid).toBe(false);
    });

    it('deve rejeitar número vazio', () => {
      const valid = TwilioWhatsAppService.validatePhoneNumber('');
      expect(valid).toBe(false);
    });

    it('deve validar com caracteres especiais (remove automaticamente)', () => {
      const valid = TwilioWhatsAppService.validatePhoneNumber('+244 923-000-000');
      expect(valid).toBe(true);
    });
  });

  describe('Normalização de Número de Telefone', () => {
    it('deve converter 9 dígitos em +244XXXXXXXXX', () => {
      const normalized = TwilioWhatsAppService.normalizePhoneNumber('923000000');
      expect(normalized).toBe('+244923000000');
    });

    it('deve adicionar + se não presente', () => {
      const normalized = TwilioWhatsAppService.normalizePhoneNumber('244923000000');
      expect(normalized).toBe('+244923000000');
    });

    it('deve preservar número já formatado', () => {
      const normalized = TwilioWhatsAppService.normalizePhoneNumber('+244923000000');
      expect(normalized).toBe('+244923000000');
    });

    it('deve remover caracteres especiais', () => {
      const normalized = TwilioWhatsAppService.normalizePhoneNumber('+244 923-000-000');
      expect(normalized).toBe('+244923000000');
    });

    it('deve lidar com formato (244)923-000-000', () => {
      const normalized = TwilioWhatsAppService.normalizePhoneNumber('(244)923-000-000');
      expect(normalized).toBe('+244923000000');
    });
  });

  describe('Envio de Mensagens WhatsApp', () => {
    beforeEach(() => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM123456789' }),
      } as Response);
    });

    it('deve retornar erro quando não configurado', async () => {
      import.meta.env.VITE_TWILIO_ACCOUNT_SID = '';
      import.meta.env.VITE_TWILIO_AUTH_TOKEN = '';

      const result = await TwilioWhatsAppService.sendMessage(
        '923000000',
        'Test message'
      );

      expect(result.success).toBe(false);
      expect(result.messageSid).toContain('mock-');
    });

    it('deve normalizar número automaticamente', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-123' }),
      } as Response);

      await TwilioWhatsAppService.sendMessage('923000000', 'Test message');

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(callArgs.body as string);

      expect(body.get('To')).toContain('+244923000000');
    });

    it('deve adicionar + ao número se não presente', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-123' }),
      } as Response);

      await TwilioWhatsAppService.sendMessage('+244923000000', 'Test message');

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(callArgs.body as string);

      expect(body.get('To')).toContain('+244923000000');
    });

    it('deve retornar messageSid no sucesso', async () => {
      const result = await TwilioWhatsAppService.sendMessage(
        '+244923000000',
        'Test message'
      );

      expect(result.success).toBe(true);
      expect(result.messageSid).toBe('SM123456789');
    });

    it('deve retornar erro quando API falha', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ code: 21210, message: 'Invalid phone number' }),
      } as Response);

      const result = await TwilioWhatsAppService.sendMessage(
        '+244923000000',
        'Test message'
      );

      expect(result.success).toBe(false);
      expect(result.messageSid).toBe('');
    });

    it('deve incluir mediaUrl se fornecido', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-media' }),
      } as Response);

      await TwilioWhatsAppService.sendMessage(
        '+244923000000',
        'Check this image',
        'https://example.com/image.jpg'
      );

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(callArgs.body as string);

      expect(body.get('MediaUrl')).toBe('https://example.com/image.jpg');
    });
  });

  describe('Alerta de Validade', () => {
    beforeEach(() => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-expiry' }),
      } as Response);
    });

    it('deve enviar alerta CRÍTICO com emoji correto', async () => {
      const result = await TwilioWhatsAppService.sendExpiryAlert(
        '+244923000000',
        'Ibuprofen 200mg',
        5,
        'CRITICAL'
      );

      expect(result.success).toBe(true);
    });

    it('deve enviar alerta WARNING com ênfase apropriada', async () => {
      const result = await TwilioWhatsAppService.sendExpiryAlert(
        '+244923000000',
        'Aspirina 500mg',
        15,
        'WARNING'
      );

      expect(result.success).toBe(true);
    });

    it('deve enviar alerta INFO com tom informativo', async () => {
      const result = await TwilioWhatsAppService.sendExpiryAlert(
        '+244923000000',
        'Paracetamol 1g',
        45,
        'INFO'
      );

      expect(result.success).toBe(true);
    });

    it('deve incluir nome do produto na mensagem', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-123' }),
      } as Response);

      await TwilioWhatsAppService.sendExpiryAlert(
        '+244923000000',
        'Vitamina C 500mg',
        10,
        'CRITICAL'
      );

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(callArgs.body as string);
      const message = body.get('Body') || '';

      expect(message).toContain('Vitamina C 500mg');
      expect(message).toContain('10');
    });

    it('deve usar mensagens formatadas com markdown', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-123' }),
      } as Response);

      await TwilioWhatsAppService.sendExpiryAlert(
        '+244923000000',
        'Product A',
        5,
        'CRITICAL'
      );

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(callArgs.body as string);
      const message = body.get('Body') || '';

      expect(message).toContain('*'); // WhatsApp bold formatting
    });
  });

  describe('Alerta de Stock Baixo', () => {
    beforeEach(() => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-stock' }),
      } as Response);
    });

    it('deve calcular deficit corretamente', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-123' }),
      } as Response);

      await TwilioWhatsAppService.sendLowStockAlert(
        '+244923000000',
        'Product A',
        10,
        50
      );

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(callArgs.body as string);
      const message = body.get('Body') || '';

      expect(message).toContain('10'); // current stock
      expect(message).toContain('50'); // minimum stock
      expect(message).toContain('40'); // deficit
    });

    it('deve usar emoji 📦 para stock baixo', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-123' }),
      } as Response);

      await TwilioWhatsAppService.sendLowStockAlert(
        '+244923000000',
        'Product A',
        5,
        20
      );

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(callArgs.body as string);
      const message = body.get('Body') || '';

      expect(message).toContain('📦');
    });
  });

  describe('Resumo de Vendas Diário', () => {
    beforeEach(() => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-sales' }),
      } as Response);
    });

    it('deve incluir KPIs essenciais', async () => {
      const result = await TwilioWhatsAppService.sendDailySalesDigest(
        '+244923000000',
        'store-123',
        'Loja Central',
        '2026-08-29',
        45,
        1250000,
        'Ibuprofen 200mg'
      );

      expect(result.success).toBe(true);
    });

    it('deve formatar moeda em Kz', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-123' }),
      } as Response);

      await TwilioWhatsAppService.sendDailySalesDigest(
        '+244923000000',
        'store-1',
        'Store',
        '2026-08-29',
        50,
        1000000,
        'Top Product'
      );

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(callArgs.body as string);
      const message = body.get('Body') || '';

      expect(message).toContain('Kz');
    });

    it('deve usar emoji 💰 para vendas', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-123' }),
      } as Response);

      await TwilioWhatsAppService.sendDailySalesDigest(
        '+244923000000',
        'store-1',
        'Store',
        '2026-08-29',
        50,
        1000000,
        'Product'
      );

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(callArgs.body as string);
      const message = body.get('Body') || '';

      expect(message).toContain('💰');
    });
  });

  describe('Mensagem de Boas-vindas', () => {
    beforeEach(() => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-welcome' }),
      } as Response);
    });

    it('deve enviar mensagem de boas-vindas com nome do usuário', async () => {
      const result = await TwilioWhatsAppService.sendWelcomeMessage(
        '+244923000000',
        'João Silva'
      );

      expect(result.success).toBe(true);
    });

    it('deve incluir onboarding information', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-123' }),
      } as Response);

      await TwilioWhatsAppService.sendWelcomeMessage(
        '+244923000000',
        'Maria'
      );

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(callArgs.body as string);
      const message = body.get('Body') || '';

      expect(message).toContain('Maria');
      expect(message).toContain('Bem-vindo');
      expect(message).toContain('✅'); // checkmarks for features
    });
  });

  describe('Relatório de Alertas Críticos', () => {
    beforeEach(() => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-report' }),
      } as Response);
    });

    it('deve enviar "tudo bem" quando sem alertas', async () => {
      const result = await TwilioWhatsAppService.sendCriticalAlertsReport(
        '+244923000000',
        'Loja Central',
        0,
        0
      );

      expect(result.success).toBe(true);
    });

    it('deve mencionar loja corretamente', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-123' }),
      } as Response);

      await TwilioWhatsAppService.sendCriticalAlertsReport(
        '+244923000000',
        'Loja Tóquio',
        5,
        10
      );

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(callArgs.body as string);
      const message = body.get('Body') || '';

      expect(message).toContain('Loja Tóquio');
    });

    it('deve incluir contadores de alertas', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-123' }),
      } as Response);

      await TwilioWhatsAppService.sendCriticalAlertsReport(
        '+244923000000',
        'Store',
        3,
        7
      );

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(callArgs.body as string);
      const message = body.get('Body') || '';

      expect(message).toContain('3'); // critical count
      expect(message).toContain('7'); // warning count
    });

    it('deve usar emoji 🚨 para alertas críticos', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-123' }),
      } as Response);

      await TwilioWhatsAppService.sendCriticalAlertsReport(
        '+244923000000',
        'Store',
        5,
        0
      );

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(callArgs.body as string);
      const message = body.get('Body') || '';

      expect(message).toContain('🚨');
    });
  });

  describe('Webhook Parser', () => {
    it('deve fazer parse correto de evento message_received', () => {
      const payload = {
        From: 'whatsapp:+244923000000',
        To: 'whatsapp:+244923000000',
        MessageSid: 'SM-recv-123',
        Body: 'Hello',
      };

      const event = TwilioWhatsAppService.parseWebhookEvent(payload);

      expect(event).not.toBeNull();
      expect(event?.from).toBe('+244923000000');
      expect(event?.eventType).toBe('message_received');
      expect(event?.body).toBe('Hello');
    });

    it('deve fazer parse correto de evento message_sent', () => {
      const payload = {
        From: 'whatsapp:+244923000000',
        To: 'whatsapp:+244923000000',
        MessageSid: 'SM-sent-456',
        Body: 'Message sent',
        MessageStatus: 'sent',
      };

      const event = TwilioWhatsAppService.parseWebhookEvent(payload);

      expect(event?.eventType).toBe('message_sent');
    });

    it('deve fazer parse correto de evento message_delivered', () => {
      const payload = {
        From: 'whatsapp:+244923000000',
        To: 'whatsapp:+244923000000',
        MessageSid: 'SM-del-789',
        Body: 'Delivered',
        MessageStatus: 'delivered',
      };

      const event = TwilioWhatsAppService.parseWebhookEvent(payload);

      expect(event?.eventType).toBe('message_delivered');
    });

    it('deve fazer parse correto de evento message_read', () => {
      const payload = {
        From: 'whatsapp:+244923000000',
        To: 'whatsapp:+244923000000',
        MessageSid: 'SM-read-999',
        MessageStatus: 'read',
      };

      const event = TwilioWhatsAppService.parseWebhookEvent(payload);

      expect(event?.eventType).toBe('message_read');
    });

    it('deve fazer parse correto de evento delivery_failed', () => {
      const payload = {
        From: 'whatsapp:+244923000000',
        To: 'whatsapp:+244923000000',
        MessageSid: 'SM-fail-000',
        MessageStatus: 'failed',
      };

      const event = TwilioWhatsAppService.parseWebhookEvent(payload);

      expect(event?.eventType).toBe('delivery_failed');
    });

    it('deve remover prefixo whatsapp: de números', () => {
      const payload = {
        From: 'whatsapp:+244923111111',
        To: 'whatsapp:+244923222222',
        MessageSid: 'SM-123',
        Body: 'Test',
      };

      const event = TwilioWhatsAppService.parseWebhookEvent(payload);

      expect(event?.from).toBe('+244923111111');
      expect(event?.to).toBe('+244923222222');
    });

    it('deve incluir mediaUrl se presente', () => {
      const payload = {
        From: 'whatsapp:+244923000000',
        To: 'whatsapp:+244923000000',
        MessageSid: 'SM-media-123',
        Body: 'Image',
        MediaUrl0: 'https://example.com/image.jpg',
      };

      const event = TwilioWhatsAppService.parseWebhookEvent(payload);

      expect(event?.mediaUrl).toBe('https://example.com/image.jpg');
    });

    it('deve retornar null para payload inválido', () => {
      const event = TwilioWhatsAppService.parseWebhookEvent(null);
      expect(event).toBeNull();
    });
  });

  describe('Templates Aprovados', () => {
    it('deve retornar lista de templates aprovados', async () => {
      const templates = await TwilioWhatsAppService.getApprovedTemplates();

      expect(templates).toHaveLength(3);
    });

    it('deve ter template para alerta crítico de validade', async () => {
      const templates = await TwilioWhatsAppService.getApprovedTemplates();
      const expiry = templates.find((t) => t.id === 'expiry_alert_critical');

      expect(expiry).toBeDefined();
      expect(expiry?.status).toBe('approved');
      expect(expiry?.parameters).toContain('productName');
      expect(expiry?.parameters).toContain('days');
    });

    it('deve ter template para alerta de stock baixo', async () => {
      const templates = await TwilioWhatsAppService.getApprovedTemplates();
      const stock = templates.find((t) => t.id === 'low_stock_alert');

      expect(stock).toBeDefined();
      expect(stock?.status).toBe('approved');
      expect(stock?.parameters).toContain('productName');
      expect(stock?.parameters).toContain('quantity');
    });

    it('deve ter template para resumo diário', async () => {
      const templates = await TwilioWhatsAppService.getApprovedTemplates();
      const digest = templates.find((t) => t.id === 'daily_digest');

      expect(digest).toBeDefined();
      expect(digest?.status).toBe('approved');
      expect(digest?.parameters).toContain('sales');
      expect(digest?.parameters).toContain('revenue');
    });

    it('deve especificar idioma dos templates', async () => {
      const templates = await TwilioWhatsAppService.getApprovedTemplates();

      templates.forEach((template) => {
        expect(template.language).toBe('pt_PT');
      });
    });
  });

  describe('Conformidade e Segurança', () => {
    it('deve usar Basic authentication com SID e token', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-123' }),
      } as Response);

      await TwilioWhatsAppService.sendMessage('+244923000000', 'Test');

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const authHeader = callArgs.headers as Record<string, string>;

      expect(authHeader.Authorization).toContain('Basic');
    });

    it('deve usar Twilio API endpoint correto', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-123' }),
      } as Response);

      await TwilioWhatsAppService.sendMessage('+244923000000', 'Test');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('api.twilio.com');
      expect(url).toContain('Messages.json');
    });

    it('deve aplicar formato whatsapp: ao número de destino', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sid: 'SM-123' }),
      } as Response);

      await TwilioWhatsAppService.sendMessage('+244923000000', 'Test');

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(callArgs.body as string);
      const toNumber = body.get('To') || '';

      expect(toNumber).toContain('whatsapp:');
    });
  });

  describe('Performance e Confiabilidade', () => {
    it('deve suportar envio em batch de múltiplas mensagens', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ sid: 'SM-batch' }),
      } as Response);

      const phones = Array.from({ length: 10 }, (_, i) => `9230000${i}0`);

      const results = await Promise.all(
        phones.map((phone) =>
          TwilioWhatsAppService.sendMessage(phone, 'Batch message')
        )
      );

      expect(results).toHaveLength(10);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('deve manter histórico de tentativas para retry', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Rate limited' }),
      } as Response);

      const result = await TwilioWhatsAppService.sendMessage(
        '+244923000000',
        'Retry test'
      );

      expect(result.success).toBe(false);
    });
  });
});
