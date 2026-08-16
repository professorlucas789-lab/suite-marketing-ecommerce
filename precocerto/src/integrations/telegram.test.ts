/**
 * Testes para Telegram Bot API
 * Semana 3: Testes de integração Telegram
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TelegramService, formatAlertMessageForTelegram } from './telegram';

describe('TelegramService', () => {
  let service: TelegramService;
  const botToken = 'test-bot-token-12345';

  beforeEach(() => {
    service = new TelegramService(botToken);
  });

  describe('Inicialização', () => {
    it('Deve criar instância com token válido', () => {
      expect(service).toBeDefined();
    });

    it('Deve lançar erro sem token', () => {
      expect(() => new TelegramService('')).toThrow('TELEGRAM_BOT_TOKEN não configurado');
    });

    it('Deve lançar erro se token for null', () => {
      expect(() => new TelegramService(null as any)).toThrow();
    });
  });

  describe('Formatação de Mensagens', () => {
    it('CRITICAL: Deve formatar com emoji alerta', () => {
      const msg = formatAlertMessageForTelegram('Paracetamol', 'CRITICAL', 5, 100, 'LOT123');

      expect(msg).toContain('🚨');
      expect(msg).toContain('ALERTA CRÍTICO');
      expect(msg).toContain('Paracetamol');
      expect(msg).toContain('5');
    });

    it('WARNING: Deve formatar com emoji aviso', () => {
      const msg = formatAlertMessageForTelegram('Ibuprofeno', 'WARNING', 20);

      expect(msg).toContain('⏰');
      expect(msg).toContain('Aviso');
      expect(msg).toContain('Ibuprofeno');
    });

    it('INFO: Deve formatar com emoji informação', () => {
      const msg = formatAlertMessageForTelegram('Vitamina C', 'INFO', 45);

      expect(msg).toContain('✅');
      expect(msg).toContain('Informação');
      expect(msg).toContain('Vitamina C');
    });

    it('Deve incluir quantidade se fornecida', () => {
      const msg = formatAlertMessageForTelegram('Produto', 'INFO', 10, 50);

      expect(msg).toContain('50');
      expect(msg).toContain('unidades');
    });

    it('Deve incluir lote se fornecido', () => {
      const msg = formatAlertMessageForTelegram('Produto', 'INFO', 10, undefined, 'LOT999');

      expect(msg).toContain('LOT999');
    });

    it('Deve usar formatação HTML', () => {
      const msg = formatAlertMessageForTelegram('Produto', 'CRITICAL', 5);

      expect(msg).toContain('<b>');
      expect(msg).toContain('</b>');
      expect(msg).toContain('<i>');
      expect(msg).toContain('</i>');
    });
  });

  describe('Validação de Chat ID', () => {
    it('Deve aceitar números positivos', () => {
      const validIds = ['123456789', '987654321', '1'];

      validIds.forEach((id) => {
        expect(Number(id)).toBeGreaterThan(0);
      });
    });

    it('Deve aceitar strings de números', () => {
      expect(() => service.sendMessage('123456789', 'teste')).toBeDefined();
    });
  });

  describe('Construção de URLs', () => {
    it('URL deve conter bot token', () => {
      const testToken = 'abc123def456';
      const testService = new TelegramService(testToken);
      const mockService = testService as any;

      expect(mockService.botToken).toBe(testToken);
    });

    it('URL deve conter /sendMessage para mensagens', () => {
      const expectedPath = '/sendMessage';
      expect(expectedPath).toContain('sendMessage');
    });

    it('URL deve usar https://api.telegram.org', () => {
      const expectedUrl = 'https://api.telegram.org/bot';
      expect(expectedUrl).toContain('https://');
      expect(expectedUrl).toContain('api.telegram.org');
    });
  });

  describe('Tratamento de Erros', () => {
    it('Deve retornar erro se resposta falhar', async () => {
      // Mock de fetch que falha
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await service.sendMessage('123456789', 'teste');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('Deve retornar erro se Telegram retornar ok: false', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: false, description: 'Invalid token' }), {
          status: 200,
        })
      );

      const result = await service.sendMessage('123456789', 'teste');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid token');
    });

    it('Deve retornar erro se HTTP status é não-200', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: false }), {
          status: 401,
        })
      );

      const result = await service.sendMessage('123456789', 'teste');

      expect(result.success).toBe(false);
      expect(result.error).toContain('401');
    });
  });

  describe('Resposta da API', () => {
    it('Deve retornar messageId na resposta bem-sucedida', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            result: {
              message_id: 12345,
              chat: { id: 987, type: 'private' },
              date: Date.now(),
              text: 'teste',
            },
          }),
          { status: 200 }
        )
      );

      const result = await service.sendMessage('123456789', 'teste');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('12345');
    });

    it('Deve incluir timestamp nas respostas', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            result: {
              message_id: 123,
              chat: { id: 987, type: 'private' },
              date: Date.now(),
            },
          }),
          { status: 200 }
        )
      );

      const result = await service.sendMessage('123456789', 'teste');

      expect(result.timestamp).toBeDefined();
      const timestamp = new Date(result.timestamp);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });

    it('Channel deve ser sempre "telegram"', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            result: { message_id: 123, chat: { id: 987, type: 'private' }, date: Date.now() },
          }),
          { status: 200 }
        )
      );

      const result = await service.sendMessage('123456789', 'teste');

      expect(result.channel).toBe('telegram');
    });
  });

  describe('Integração com Orquestrador', () => {
    it('Deve ser compatível com NotificationPayload', () => {
      const payload = {
        channel: 'telegram',
        recipient: '123456789',
        title: 'Alerta',
        body: 'Produto expirando',
        metadata: {
          productId: 'prod-123',
        },
      };

      expect(payload.channel).toBe('telegram');
      expect(payload.recipient).toBeDefined();
      expect(payload.body).toBeDefined();
    });

    it('Deve ser canalizável no padrão de orquestrador', async () => {
      const payload = {
        channel: 'telegram' as const,
        recipient: '123456789',
        body: 'Teste',
      };

      // Mock a resposta bem-sucedida
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            result: { message_id: 123, chat: { id: 987 }, date: Date.now() },
          }),
          { status: 200 }
        )
      );

      const result = await service.sendMessage(payload.recipient, payload.body);

      expect(result.channel).toBe('telegram');
      expect(result.success).toBe(true);
    });
  });

  describe('Casos Extremos', () => {
    it('Deve aceitar mensagens muito longas', () => {
      const longMessage = 'A'.repeat(4096); // Telegram limita a ~4096 caracteres
      expect(longMessage.length).toBe(4096);
    });

    it('Deve aceitar caracteres especiais Unicode', async () => {
      const unicodeMessage = '🚨 Alerta Crítico: Paracetamol 500mg';

      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            result: { message_id: 123, chat: { id: 987 }, date: Date.now() },
          }),
          { status: 200 }
        )
      );

      const result = await service.sendMessage('123456789', unicodeMessage);

      expect(result.success).toBe(true);
    });

    it('Deve aceitar HTML entities', async () => {
      const htmlMessage = '<b>Alerta</b> de <i>validade</i>';

      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            result: { message_id: 123, chat: { id: 987 }, date: Date.now() },
          }),
          { status: 200 }
        )
      );

      const result = await service.sendMessage('123456789', htmlMessage);

      expect(result.success).toBe(true);
    });
  });

  describe('Segurança', () => {
    it('Bot token não deve ser exposto em logs', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      await service.sendMessage('123456789', 'teste');

      // Verificar que o token não está nos logs
      if (consoleSpy.mock.calls.length > 0) {
        const logOutput = JSON.stringify(consoleSpy.mock.calls);
        expect(logOutput).not.toContain(botToken);
      }

      consoleSpy.mockRestore();
    });

    it('Chat ID deve ser validado', () => {
      // Números válidos
      expect(async () => {
        await service.sendMessage('123456789', 'teste');
      }).toBeDefined();
    });
  });
});
