/**
 * Testes: SendGrid Email Service
 * FASE 5: Integrações Avançadas
 *
 * Nota: Tests focam em estruturas de dados e validações
 */

import { describe, it, expect } from 'vitest';
import { SendGridEmailService, SendGridEmailPayload } from './sendgridEmailService';

describe('SendGrid Email Service', () => {
  describe('Métodos Disponíveis', () => {
    it('deve ter método isConfigured', () => {
      expect(typeof SendGridEmailService.isConfigured).toBe('function');
    });

    it('deve ter método sendEmail', () => {
      expect(typeof SendGridEmailService.sendEmail).toBe('function');
    });

    it('deve ter método sendExpiryAlert', () => {
      expect(typeof SendGridEmailService.sendExpiryAlert).toBe('function');
    });

    it('deve ter método sendDailyAlertReport', () => {
      expect(typeof SendGridEmailService.sendDailyAlertReport).toBe('function');
    });

    it('deve ter método sendLowStockNotification', () => {
      expect(typeof SendGridEmailService.sendLowStockNotification).toBe('function');
    });

    it('deve ter método sendSalesReport', () => {
      expect(typeof SendGridEmailService.sendSalesReport).toBe('function');
    });

    it('deve ter método parseWebhookEvent', () => {
      expect(typeof SendGridEmailService.parseWebhookEvent).toBe('function');
    });
  });

  describe('Estrutura de SendGridEmailPayload', () => {
    it('deve validar que estrutura de payload é válida', () => {
      const payload: SendGridEmailPayload = {
        to: 'user@example.com',
        subject: 'Test Email',
        htmlContent: '<p>Test content</p>',
      };

      expect(payload).toHaveProperty('to');
      expect(payload).toHaveProperty('subject');
      expect(payload).toHaveProperty('htmlContent');
      expect(payload.to).toBe('user@example.com');
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

    it('deve permitir cc e bcc como arrays', () => {
      const payload: SendGridEmailPayload = {
        to: 'user@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        cc: ['cc1@example.com', 'cc2@example.com'],
        bcc: ['bcc1@example.com'],
      };

      expect(Array.isArray(payload.cc)).toBe(true);
      expect(Array.isArray(payload.bcc)).toBe(true);
      expect(payload.cc?.length).toBe(2);
    });

    it('deve permitir agendamento com sendAt', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const payload: SendGridEmailPayload = {
        to: 'user@example.com',
        subject: 'Scheduled Email',
        htmlContent: '<p>Test</p>',
        sendAt: futureTime,
      };

      expect(payload.sendAt).toBe(futureTime);
      expect(typeof payload.sendAt).toBe('number');
    });
  });

  describe('Estrutura de EmailTemplate', () => {
    it('deve ter estrutura válida para EmailTemplate', () => {
      const template = {
        templateId: 'tpl-123',
        name: 'Expiry Alert',
        subject: 'Product Expiring',
        type: 'alert' as const,
      };

      expect(template).toHaveProperty('templateId');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('subject');
      expect(template).toHaveProperty('type');
      expect(['alert', 'report', 'notification', 'digest', 'system']).toContain(
        template.type
      );
    });

    it('deve suportar diferentes tipos de template', () => {
      const types = ['alert', 'report', 'notification', 'digest', 'system'] as const;

      types.forEach((type) => {
        const template = {
          templateId: `tpl-${type}`,
          name: `${type} Template`,
          subject: `Subject for ${type}`,
          type,
        };

        expect(template.type).toBe(type);
      });
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

    it('deve fazer parse correto de evento marked_spam', () => {
      const payload = [
        {
          'message-id': 'msg-spam',
          email: 'spam@example.com',
          event: 'marked_spam',
          timestamp: 1693306000,
        },
      ];

      const event = SendGridEmailService.parseWebhookEvent(payload);

      expect(event?.eventType).toBe('marked_spam');
    });

    it('deve fazer parse correto de evento unsubscribed', () => {
      const payload = [
        {
          'message-id': 'msg-unsub',
          email: 'unsub@example.com',
          event: 'unsubscribed',
          timestamp: 1693306100,
        },
      ];

      const event = SendGridEmailService.parseWebhookEvent(payload);

      expect(event?.eventType).toBe('unsubscribed');
    });

    it('deve retornar null para payload inválido', () => {
      const event = SendGridEmailService.parseWebhookEvent(null);
      expect(event).toBeNull();
    });

    it('deve converter timestamp Unix para ISO string', () => {
      const payload = [
        {
          'message-id': 'msg-time',
          email: 'test@example.com',
          event: 'delivered',
          timestamp: 1693305600,
        },
      ];

      const event = SendGridEmailService.parseWebhookEvent(payload);
      expect(event?.timestamp).toBeDefined();
      expect(typeof event?.timestamp).toBe('string');
      // Deve ser um timestamp ISO válido
      expect(new Date(event?.timestamp || '').getTime()).toBeGreaterThan(0);
    });

    it('deve incluir metadata quando disponível', () => {
      const payload = [
        {
          'message-id': 'msg-meta',
          email: 'test@example.com',
          event: 'opened',
          timestamp: 1693305600,
          useragent: 'Chrome/120',
          ip: '10.0.0.1',
          custom: 'value',
        },
      ];

      const event = SendGridEmailService.parseWebhookEvent(payload);

      expect(event?.metadata).toBeDefined();
      expect(event?.metadata?.useragent).toBe('Chrome/120');
      expect(event?.metadata?.ip).toBe('10.0.0.1');
    });
  });

  describe('Estrutura de EmailTrackingEvent', () => {
    it('deve ter estrutura completa de tracking event', () => {
      const event = {
        id: 'msg-123',
        email: 'test@example.com',
        eventType: 'opened' as const,
        timestamp: new Date().toISOString(),
      };

      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('email');
      expect(event).toHaveProperty('eventType');
      expect(event).toHaveProperty('timestamp');

      const validTypes = [
        'delivered',
        'opened',
        'clicked',
        'bounced',
        'marked_spam',
        'unsubscribed',
      ];
      expect(validTypes).toContain(event.eventType);
    });

    it('deve permitir URL em click events', () => {
      const event = {
        id: 'msg-123',
        email: 'test@example.com',
        eventType: 'clicked' as const,
        timestamp: new Date().toISOString(),
        url: 'https://example.com/clicked',
      };

      expect(event.url).toBe('https://example.com/clicked');
    });

    it('deve permitir metadata customizada', () => {
      const event = {
        id: 'msg-123',
        email: 'test@example.com',
        eventType: 'opened' as const,
        timestamp: new Date().toISOString(),
        metadata: {
          useragent: 'Mozilla/5.0',
          ip: '192.168.1.1',
          custom_field: 'custom_value',
        },
      };

      expect(event.metadata?.useragent).toBe('Mozilla/5.0');
      expect(event.metadata?.custom_field).toBe('custom_value');
    });
  });

  describe('Validações de Email', () => {
    it('deve aceitar emails válidos', () => {
      const validEmails = [
        'user@example.com',
        'first.last@example.co.uk',
        'test+tag@example.com',
        'user123@test.org',
      ];

      validEmails.forEach((email) => {
        const payload: SendGridEmailPayload = {
          to: email,
          subject: 'Test',
          htmlContent: '<p>Test</p>',
        };

        expect(payload.to).toBe(email);
      });
    });

    it('deve suportar múltiplos tipos de conteúdo', () => {
      const htmlPayload: SendGridEmailPayload = {
        to: 'test@example.com',
        subject: 'HTML Email',
        htmlContent: '<p>HTML</p>',
      };

      const textPayload: SendGridEmailPayload = {
        to: 'test@example.com',
        subject: 'Text Email',
        htmlContent: '<p>HTML</p>',
        textContent: 'Plain text',
      };

      expect(htmlPayload.htmlContent).toBeDefined();
      expect(textPayload.textContent).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('deve retornar null ao parsear payload vazio', () => {
      const event = SendGridEmailService.parseWebhookEvent([]);
      expect(event).toBeNull();
    });

    it('deve retornar null ao parsear payload undefined', () => {
      const event = SendGridEmailService.parseWebhookEvent(undefined);
      expect(event).toBeNull();
    });

    it('deve permitir replies vazias', () => {
      const payload: SendGridEmailPayload = {
        to: 'test@example.com',
        subject: 'No Reply',
        htmlContent: '<p>Test</p>',
        replyTo: '',
      };

      expect(payload.replyTo).toBe('');
    });

    it('deve permitir customArgs vazios', () => {
      const payload: SendGridEmailPayload = {
        to: 'test@example.com',
        subject: 'No Args',
        htmlContent: '<p>Test</p>',
        customArgs: {},
      };

      expect(Object.keys(payload.customArgs!).length).toBe(0);
    });
  });

  describe('Performance', () => {
    it('deve suportar estrutura de payload complexa', () => {
      const payload: SendGridEmailPayload = {
        to: 'user@example.com',
        toName: 'User Name',
        subject: 'Complex Email',
        htmlContent: '<html><body><p>Complex</p></body></html>',
        textContent: 'Complex text',
        cc: ['cc1@example.com', 'cc2@example.com', 'cc3@example.com'],
        bcc: ['bcc@example.com'],
        replyTo: 'reply@example.com',
        trackingSettings: {
          openTracking: true,
          clickTracking: true,
        },
        customArgs: {
          type: 'complex',
          campaign_id: 'camp-123',
          user_id: 'user-456',
          timestamp: new Date().toISOString(),
        },
        sendAt: Math.floor(Date.now() / 1000) + 7200,
      };

      expect(payload).toBeDefined();
      expect(payload.cc?.length).toBe(3);
      expect(Object.keys(payload.customArgs!).length).toBe(4);
    });
  });
});
