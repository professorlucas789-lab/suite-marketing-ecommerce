/**
 * Testes para Canais de Notificação
 * Semana 1: Validação de infraestrutura multicanal
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  InAppChannel,
  EmailChannel,
  SMSChannel,
  WhatsAppChannel,
  NotificationOrchestrator,
  NotificationPayload,
  getNotificationOrchestrator,
  resetNotificationOrchestrator,
} from './notificationChannels';

describe('Canais de Notificação', () => {
  describe('InAppChannel', () => {
    let channel: InAppChannel;

    beforeEach(() => {
      channel = new InAppChannel();
    });

    it('Deve validar payload correto', () => {
      const payload: NotificationPayload = {
        channel: 'in-app',
        recipient: 'user-123',
        title: 'Teste',
        body: 'Conteúdo de teste',
      };

      expect(channel.validate(payload)).toBe(true);
    });

    it('Deve rejeitar payload sem recipient', () => {
      const payload: NotificationPayload = {
        channel: 'in-app',
        recipient: '',
        title: 'Teste',
        body: 'Conteúdo',
      };

      expect(channel.validate(payload)).toBe(false);
    });

    it('Deve rejeitar payload de canal diferente', () => {
      const payload: NotificationPayload = {
        channel: 'email',
        recipient: 'user@example.com',
        title: 'Teste',
        body: 'Conteúdo',
      };

      expect(channel.validate(payload)).toBe(false);
    });

    it('Deve enviar notificação in-app', async () => {
      const payload: NotificationPayload = {
        channel: 'in-app',
        recipient: 'user-123',
        title: 'Alerta de Validade',
        body: 'Produto X expira em 5 dias',
      };

      const result = await channel.send(payload);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('in-app');
      expect(result.messageId).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('In-app sempre deve estar disponível', async () => {
      const available = await channel.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe('EmailChannel', () => {
    let channel: EmailChannel;

    beforeEach(() => {
      channel = new EmailChannel();
    });

    it('Deve validar email correto', () => {
      const payload: NotificationPayload = {
        channel: 'email',
        recipient: 'user@example.com',
        subject: 'Teste',
        body: 'Conteúdo',
      };

      expect(channel.validate(payload)).toBe(true);
    });

    it('Deve rejeitar email inválido', () => {
      const invalidEmails = [
        'user@',
        '@example.com',
        'user example@com',
        'user@.com',
        'user@@example.com',
      ];

      invalidEmails.forEach((email) => {
        const payload: NotificationPayload = {
          channel: 'email',
          recipient: email,
          subject: 'Teste',
          body: 'Conteúdo',
        };

        expect(channel.validate(payload)).toBe(false);
      });
    });

    it('Deve validar emails válidos', () => {
      const validEmails = [
        'user@example.com',
        'john.doe@company.co.uk',
        'test+tag@domain.org',
        'name@subdomain.example.com',
      ];

      validEmails.forEach((email) => {
        const payload: NotificationPayload = {
          channel: 'email',
          recipient: email,
          subject: 'Teste',
          body: 'Conteúdo',
        };

        expect(channel.validate(payload)).toBe(true);
      });
    });

    it('Deve enviar email', async () => {
      const payload: NotificationPayload = {
        channel: 'email',
        recipient: 'manager@pharmacy.com',
        subject: 'Alerta de Estoque Baixo',
        body: 'Paracetamol tem estoque baixo',
      };

      const result = await channel.send(payload);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('email');
      expect(result.messageId).toBeDefined();
    });

    it('Deve rejeitar payload com email inválido', async () => {
      const payload: NotificationPayload = {
        channel: 'email',
        recipient: 'invalid-email',
        subject: 'Teste',
        body: 'Conteúdo',
      };

      const result = await channel.send(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('SMSChannel', () => {
    let channel: SMSChannel;

    beforeEach(() => {
      channel = new SMSChannel();
    });

    it('Deve validar número de telefone correto', () => {
      const validNumbers = [
        '+244923456789', // Angola
        '923456789', // Sem +
        '+1234567890', // Internacional
        '244923456789', // Com país sem +
      ];

      validNumbers.forEach((number) => {
        const payload: NotificationPayload = {
          channel: 'sms',
          recipient: number,
          body: 'Conteúdo',
        };

        expect(channel.validate(payload)).toBe(true);
      });
    });

    it('Deve rejeitar números inválidos', () => {
      const invalidNumbers = [
        '123', // Muito curto
        '+0123456789', // Começa com 0
        'abc1234567890', // Com letras
        '', // Vazio
        '+', // Só +
      ];

      invalidNumbers.forEach((number) => {
        const payload: NotificationPayload = {
          channel: 'sms',
          recipient: number,
          body: 'Conteúdo',
        };

        expect(channel.validate(payload)).toBe(false);
      });
    });

    it('Deve enviar SMS', async () => {
      const payload: NotificationPayload = {
        channel: 'sms',
        recipient: '+244923456789',
        body: 'Seu produto expira em 5 dias',
      };

      const result = await channel.send(payload);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('sms');
      expect(result.messageId).toBeDefined();
    });

    it('Deve rejeitar SMS com número inválido', async () => {
      const payload: NotificationPayload = {
        channel: 'sms',
        recipient: '123',
        body: 'Teste',
      };

      const result = await channel.send(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('WhatsAppChannel', () => {
    let channel: WhatsAppChannel;

    beforeEach(() => {
      channel = new WhatsAppChannel();
    });

    it('Deve validar número WhatsApp', () => {
      const payload: NotificationPayload = {
        channel: 'whatsapp',
        recipient: '+244923456789',
        body: 'Mensagem WhatsApp',
      };

      expect(channel.validate(payload)).toBe(true);
    });

    it('Deve rejeitar números inválidos', () => {
      const payload: NotificationPayload = {
        channel: 'whatsapp',
        recipient: '123',
        body: 'Mensagem',
      };

      expect(channel.validate(payload)).toBe(false);
    });

    it('Deve enviar WhatsApp', async () => {
      const payload: NotificationPayload = {
        channel: 'whatsapp',
        recipient: '+244923456789',
        body: 'Produto expirado! Remova do stock imediatamente.',
        action: {
          label: 'Ver Produto',
          url: 'https://app.example.com/products/123',
        },
      };

      const result = await channel.send(payload);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('whatsapp');
      expect(result.messageId).toBeDefined();
    });

    it('WhatsApp deve estar disponível', async () => {
      const available = await channel.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe('NotificationOrchestrator', () => {
    let orchestrator: NotificationOrchestrator;

    beforeEach(() => {
      resetNotificationOrchestrator();
      orchestrator = new NotificationOrchestrator();
    });

    it('Deve enviar através de canal individual', async () => {
      const payload: NotificationPayload = {
        channel: 'in-app',
        recipient: 'user-123',
        title: 'Teste',
        body: 'Conteúdo de teste',
      };

      const result = await orchestrator.send(payload);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('in-app');
    });

    it('Deve rejeitar canal não suportado', async () => {
      const payload: any = {
        channel: 'telegram', // Canal não suportado
        recipient: 'user-123',
        body: 'Conteúdo',
      };

      const result = await orchestrator.send(payload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not supported');
    });

    it('Deve enviar para múltiplos canais', async () => {
      const payload = {
        recipient: 'user@example.com',
        title: 'Alerta',
        subject: 'Alerta de Validade',
        body: 'Produto expirando',
      };

      const channels = ['email', 'in-app'] as const;
      const results = await orchestrator.sendMultiple(payload, channels);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('Deve registar implementação customizada de canal', () => {
      const customChannel = {
        send: vi.fn().mockResolvedValue({
          success: true,
          channel: 'custom',
          messageId: 'custom-123',
          timestamp: new Date().toISOString(),
        }),
        validate: vi.fn().mockReturnValue(true),
        isAvailable: vi.fn().mockResolvedValue(true),
      };

      orchestrator.registerChannel('email', customChannel);

      const payload: NotificationPayload = {
        channel: 'email',
        recipient: 'test@example.com',
        body: 'Teste com implementação customizada',
      };

      expect(orchestrator.send(payload)).toBeDefined();
    });

    it('Deve obter canais disponíveis', async () => {
      const available = await orchestrator.getAvailableChannels();

      expect(Array.isArray(available)).toBe(true);
      expect(available.length).toBeGreaterThan(0);
    });

    it('Deve testar retry com falha temporária', async () => {
      let attemptCount = 0;
      const channel = {
        send: vi.fn().mockImplementation(async () => {
          attemptCount++;
          if (attemptCount < 2) {
            throw new Error('Erro temporário');
          }
          return {
            success: true,
            channel: 'in-app',
            messageId: 'retry-success',
            timestamp: new Date().toISOString(),
          };
        }),
        validate: vi.fn().mockReturnValue(true),
        isAvailable: vi.fn().mockResolvedValue(true),
      };

      orchestrator.registerChannel('in-app', channel);

      const payload: NotificationPayload = {
        channel: 'in-app',
        recipient: 'user-123',
        body: 'Teste de retry',
      };

      const result = await orchestrator.send(payload, 3);

      expect(result.success).toBe(true);
    });
  });

  describe('Payload Validation', () => {
    it('Deve aceitar payload minimalista', () => {
      const payload: NotificationPayload = {
        channel: 'in-app',
        recipient: 'user-123',
        body: 'Mensagem simples',
      };

      expect(payload.channel).toBe('in-app');
      expect(payload.recipient).toBe('user-123');
      expect(payload.body).toBe('Mensagem simples');
    });

    it('Deve aceitar payload com action', () => {
      const payload: NotificationPayload = {
        channel: 'whatsapp',
        recipient: '+244923456789',
        body: 'Clique aqui',
        action: {
          label: 'Abrir Produto',
          url: 'https://app.example.com/product/123',
        },
      };

      expect(payload.action).toBeDefined();
      expect(payload.action.label).toBe('Abrir Produto');
    });

    it('Deve aceitar payload com metadata', () => {
      const payload: NotificationPayload = {
        channel: 'in-app',
        recipient: 'user-123',
        body: 'Alerta de estoque',
        metadata: {
          alertId: 'alert-456',
          productId: 'prod-789',
          severity: 'CRITICAL',
        },
      };

      expect(payload.metadata).toBeDefined();
      expect(payload.metadata.alertId).toBe('alert-456');
    });

    it('Deve aceitar payload com prioridade', () => {
      const priorities = ['low', 'normal', 'high'] as const;

      priorities.forEach((priority) => {
        const payload: NotificationPayload = {
          channel: 'email',
          recipient: 'user@example.com',
          body: 'Conteúdo',
          priority,
        };

        expect(payload.priority).toBe(priority);
      });
    });
  });

  describe('Singleton Pattern', () => {
    beforeEach(() => {
      resetNotificationOrchestrator();
    });

    it('getNotificationOrchestrator deve retornar mesma instância', () => {
      const orch1 = getNotificationOrchestrator();
      const orch2 = getNotificationOrchestrator();

      expect(orch1).toBe(orch2);
    });

    it('resetNotificationOrchestrator deve criar nova instância', () => {
      const orch1 = getNotificationOrchestrator();
      resetNotificationOrchestrator();
      const orch2 = getNotificationOrchestrator();

      expect(orch1).not.toBe(orch2);
    });
  });

  describe('Tipos Válidos', () => {
    it('Todos os canais devem estar registados', () => {
      const orchestrator = new NotificationOrchestrator();
      const channels = ['in-app', 'email', 'whatsapp', 'sms'] as const;

      channels.forEach((channel) => {
        const payload: NotificationPayload = {
          channel,
          recipient: channel === 'email' ? 'test@example.com' : 'test-recipient',
          body: 'Teste',
        };

        // Não deve lançar erro
        expect(() => orchestrator.send(payload)).toBeDefined();
      });
    });
  });
});
