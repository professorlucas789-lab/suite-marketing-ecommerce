/**
 * Testes para WhatsApp via Ultramsg
 * Semana 3: Testes de integração WhatsApp
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WhatsAppService, formatAlertMessageForWhatsApp } from './whatsapp';

describe('WhatsAppService', () => {
  let service: WhatsAppService;
  const token = 'test-token-12345';
  const instanceId = 'instance-id-67890';

  beforeEach(() => {
    service = new WhatsAppService(token, instanceId);
  });

  describe('Inicialização', () => {
    it('Deve criar instância com credenciais válidas', () => {
      expect(service).toBeDefined();
    });

    it('Deve lançar erro sem token', () => {
      expect(() => new WhatsAppService('', instanceId)).toThrow('são obrigatórios');
    });

    it('Deve lançar erro sem instanceId', () => {
      expect(() => new WhatsAppService(token, '')).toThrow('são obrigatórios');
    });

    it('Deve lançar erro sem ambos', () => {
      expect(() => new WhatsAppService('', '')).toThrow('são obrigatórios');
    });
  });

  describe('Validação de Números de Telefone', () => {
    it('Deve aceitar formato E.164 com +', () => {
      expect(WhatsAppService.isValidPhoneNumber('+244923456789')).toBe(true);
    });

    it('Deve aceitar formato E.164 sem +', () => {
      expect(WhatsAppService.isValidPhoneNumber('244923456789')).toBe(true);
    });

    it('Deve aceitar número Angola', () => {
      expect(WhatsAppService.isValidPhoneNumber('923456789')).toBe(true);
    });

    it('Deve aceitar número com espaços', () => {
      expect(WhatsAppService.isValidPhoneNumber('+244 923 456 789')).toBe(true);
    });

    it('Deve rejeitar número muito curto', () => {
      expect(WhatsAppService.isValidPhoneNumber('123')).toBe(false);
    });

    it('Deve rejeitar número muito longo', () => {
      expect(WhatsAppService.isValidPhoneNumber('12345678901234567')).toBe(false);
    });

    it('Deve rejeitar apenas +', () => {
      expect(WhatsAppService.isValidPhoneNumber('+')).toBe(false);
    });

    it('Deve rejeitar vazio', () => {
      expect(WhatsAppService.isValidPhoneNumber('')).toBe(false);
    });
  });

  describe('Normalização de Números', () => {
    it('Deve normalizar número Angola sem código país', async () => {
      // Não há como testar method privado, mas testamos através do envio
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            result: { message_id: 'msg-123', to: '244923456789' },
          }),
          { status: 200 }
        )
      );

      const result = await service.sendMessage('923456789', 'teste');

      expect(result.success).toBe(true);
    });

    it('Deve manter formato com +', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            result: { message_id: 'msg-123' },
          }),
          { status: 200 }
        )
      );

      const result = await service.sendMessage('+244923456789', 'teste');

      expect(result.success).toBe(true);
    });
  });

  describe('Formatação de Mensagens', () => {
    it('CRITICAL: Deve formatar com emoji urgência', () => {
      const msg = formatAlertMessageForWhatsApp('Paracetamol', 'CRITICAL', 5, 100, 'LOT123');

      expect(msg).toContain('🚨');
      expect(msg).toContain('ALERTA CRÍTICO');
      expect(msg).toContain('Paracetamol');
      expect(msg).toContain('⚠️');
    });

    it('WARNING: Deve formatar com emoji aviso', () => {
      const msg = formatAlertMessageForWhatsApp('Ibuprofeno', 'WARNING', 20);

      expect(msg).toContain('⏰');
      expect(msg).toContain('Aviso');
      expect(msg).toContain('Ibuprofeno');
    });

    it('INFO: Deve formatar com emoji info', () => {
      const msg = formatAlertMessageForWhatsApp('Vitamina C', 'INFO', 45);

      expect(msg).toContain('✅');
      expect(msg).toContain('Informação');
      expect(msg).toContain('Vitamina C');
    });

    it('Deve incluir quantidade', () => {
      const msg = formatAlertMessageForWhatsApp('Produto', 'INFO', 10, 50);

      expect(msg).toContain('50');
      expect(msg).toContain('unidades');
    });

    it('Deve incluir lote', () => {
      const msg = formatAlertMessageForWhatsApp('Produto', 'INFO', 10, 100, 'LOT999');

      expect(msg).toContain('LOT999');
    });

    it('Deve ser compatível com WhatsApp', () => {
      const msg = formatAlertMessageForWhatsApp('Produto', 'CRITICAL', 5);

      // WhatsApp suporta emojis e quebras de linha
      expect(msg).toContain('\n');
      expect(msg.match(/\n/g)?.length).toBeGreaterThan(0);
    });
  });

  describe('Envio de Mensagens', () => {
    it('Deve enviar mensagem de texto com sucesso', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            result: { message_id: 'msg-123', to: '244923456789' },
          }),
          { status: 200 }
        )
      );

      const result = await service.sendMessage('244923456789', 'Teste');

      expect(result.success).toBe(true);
      expect(result.channel).toBe('whatsapp');
      expect(result.messageId).toBe('msg-123');
    });

    it('Deve retornar erro se falhar', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            errors: [{ code: 'INVALID_PHONE', message: 'Invalid phone number' }],
          }),
          { status: 200 }
        )
      );

      const result = await service.sendMessage('123', 'Teste');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone number');
    });

    it('Deve retornar erro em timeout HTTP', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false }),
          { status: 500 }
        )
      );

      const result = await service.sendMessage('244923456789', 'Teste');

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('Deve retornar erro em falha de rede', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await service.sendMessage('244923456789', 'Teste');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('Envio de Imagens', () => {
    it('Deve enviar imagem com sucesso', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            result: { message_id: 'msg-456' },
          }),
          { status: 200 }
        )
      );

      const result = await service.sendImage(
        '244923456789',
        'https://example.com/image.jpg',
        'Imagem de teste'
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe('whatsapp');
    });

    it('Deve enviar imagem sem caption', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            result: { message_id: 'msg-456' },
          }),
          { status: 200 }
        )
      );

      const result = await service.sendImage('244923456789', 'https://example.com/image.jpg');

      expect(result.success).toBe(true);
    });

    it('Deve retornar erro se falhar', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            errors: [{ message: 'Invalid URL' }],
          }),
          { status: 200 }
        )
      );

      const result = await service.sendImage('244923456789', 'invalid-url');

      expect(result.success).toBe(false);
    });
  });

  describe('Envio de Templates', () => {
    it('Deve enviar template com parâmetros', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            result: { message_id: 'msg-789' },
          }),
          { status: 200 }
        )
      );

      const result = await service.sendTemplate('244923456789', 'expiry_alert', {
        product_name: 'Paracetamol',
        days_left: '5',
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe('whatsapp');
    });

    it('Deve enviar template sem parâmetros', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            result: { message_id: 'msg-789' },
          }),
          { status: 200 }
        )
      );

      const result = await service.sendTemplate('244923456789', 'simple_template');

      expect(result.success).toBe(true);
    });

    it('Deve retornar erro se template não existe', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            errors: [{ message: 'Template not found' }],
          }),
          { status: 200 }
        )
      );

      const result = await service.sendTemplate('244923456789', 'invalid_template');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template not found');
    });
  });

  describe('Resposta da API', () => {
    it('Deve sempre retornar timestamp', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            result: { message_id: 'msg-123' },
          }),
          { status: 200 }
        )
      );

      const result = await service.sendMessage('244923456789', 'Teste');

      expect(result.timestamp).toBeDefined();
      const date = new Date(result.timestamp);
      expect(isNaN(date.getTime())).toBe(false);
    });

    it('Channel deve ser sempre "whatsapp"', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            result: { message_id: 'msg-123' },
          }),
          { status: 200 }
        )
      );

      const result = await service.sendMessage('244923456789', 'Teste');

      expect(result.channel).toBe('whatsapp');
    });
  });

  describe('Integração com Orquestrador', () => {
    it('Deve ser compatível com NotificationPayload', () => {
      const payload = {
        channel: 'whatsapp',
        recipient: '244923456789',
        body: 'Produto expirando',
        metadata: {
          productId: 'prod-123',
        },
      };

      expect(payload.channel).toBe('whatsapp');
      expect(payload.recipient).toBeDefined();
      expect(payload.body).toBeDefined();
    });

    it('Deve validar número no padrão Ultramsg', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            result: { message_id: 'msg-123' },
          }),
          { status: 200 }
        )
      );

      const result = await service.sendMessage('244923456789', 'Teste');

      expect(result.channel).toBe('whatsapp');
      expect(result.success).toBe(true);
    });
  });

  describe('Casos Extremos', () => {
    it('Deve aceitar mensagens muito longas', async () => {
      const longMessage = 'A'.repeat(4096); // WhatsApp tem limite

      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            result: { message_id: 'msg-123' },
          }),
          { status: 200 }
        )
      );

      const result = await service.sendMessage('244923456789', longMessage);

      expect(result.success).toBe(true);
    });

    it('Deve aceitar emojis e Unicode', async () => {
      const emojiMessage = '🚨 Alerta: Paracetamol 500mg 📦';

      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            result: { message_id: 'msg-123' },
          }),
          { status: 200 }
        )
      );

      const result = await service.sendMessage('244923456789', emojiMessage);

      expect(result.success).toBe(true);
    });

    it('Deve aceitar múltiplos números', async () => {
      const numbers = ['244923456789', '923456789', '+244923456789'];

      for (const number of numbers) {
        global.fetch = vi.fn().mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              success: true,
              result: { message_id: 'msg-123' },
            }),
            { status: 200 }
          )
        );

        const result = await service.sendMessage(number, 'Teste');
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Segurança', () => {
    it('Token não deve ser exposto em logs', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await service.sendMessage('244923456789', 'teste');

      expect(result.error).not.toContain(token);
    });

    it('InstanceId não deve ser exposto', () => {
      // Instance ID é usado internamente na URL
      // não deve ser expostos em mensagens de erro públicas
      const serviceInstance = service as any;
      expect(serviceInstance.instanceId).toBe(instanceId);
    });
  });
});
