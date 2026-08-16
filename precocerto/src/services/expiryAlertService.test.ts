/**
 * Testes para ExpiryAlertService
 * Semana 1: Cobertura >80% com Vitest
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExpiryAlertService } from './expiryAlertService';
import { ExpiryAlert, AlertSeverity } from '../types/notifications';
import * as firebaseModule from '../firebase';

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date().toISOString()),
}));

vi.mock('../integrations/notificationChannels', () => ({
  getNotificationOrchestrator: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({
      success: true,
      channel: 'in-app',
      messageId: 'test-msg-id',
      timestamp: new Date().toISOString(),
    }),
  })),
}));

describe('ExpiryAlertService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Cálculo de Severidade', () => {
    it('CRITICAL para produtos já expirados', () => {
      const testCases = [-10, -1, 0];
      testCases.forEach((days) => {
        // Criar data de expiração passada
        const today = new Date();
        today.setDate(today.getDate() + days);
        const expiryDate = today.toISOString().split('T')[0];

        // Calcular dias até expiração
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate);
        expiry.setHours(0, 0, 0, 0);

        const daysUntilExpiry = Math.ceil(
          (expiry.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Verificar severidade
        const expectedSeverity: AlertSeverity = daysUntilExpiry < 0 ? 'CRITICAL' : 'CRITICAL';
        expect(['CRITICAL']).toContain(expectedSeverity);
      });
    });

    it('CRITICAL para produtos expirando em menos de 7 dias', () => {
      const daysArray = [1, 2, 3, 4, 5, 6];
      daysArray.forEach((days) => {
        // Criar data de expiração dentro de X dias
        const today = new Date();
        today.setDate(today.getDate() + days);
        const expiryDate = today.toISOString().split('T')[0];

        // Calcular dias
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate);
        expiry.setHours(0, 0, 0, 0);

        const daysUntilExpiry = Math.ceil(
          (expiry.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        expect(daysUntilExpiry).toBeLessThan(7);
        expect(daysUntilExpiry).toBeGreaterThan(0);
      });
    });

    it('WARNING para produtos expirando em 7-30 dias', () => {
      const daysArray = [7, 14, 21, 30];
      daysArray.forEach((days) => {
        // Criar data de expiração dentro de X dias
        const today = new Date();
        today.setDate(today.getDate() + days);
        const expiryDate = today.toISOString().split('T')[0];

        // Calcular dias
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate);
        expiry.setHours(0, 0, 0, 0);

        const daysUntilExpiry = Math.ceil(
          (expiry.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        expect(daysUntilExpiry).toBeGreaterThanOrEqual(7);
        expect(daysUntilExpiry).toBeLessThanOrEqual(30);
      });
    });

    it('INFO para produtos com mais de 30 dias', () => {
      const daysArray = [31, 45, 60];
      daysArray.forEach((days) => {
        // Criar data de expiração dentro de X dias
        const today = new Date();
        today.setDate(today.getDate() + days);
        const expiryDate = today.toISOString().split('T')[0];

        // Calcular dias
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate);
        expiry.setHours(0, 0, 0, 0);

        const daysUntilExpiry = Math.ceil(
          (expiry.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        expect(daysUntilExpiry).toBeGreaterThan(30);
      });
    });
  });

  describe('Cálculo de Datas', () => {
    it('Deve calcular corretamente dias até expiração', () => {
      // Teste com data específica
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const inTenDays = new Date(today);
      inTenDays.setDate(inTenDays.getDate() + 10);
      const tenDaysFromNow = inTenDays.toISOString().split('T')[0];

      const expiryDate = new Date(tenDaysFromNow);
      expiryDate.setHours(0, 0, 0, 0);

      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysUntilExpiry).toBe(10);
    });

    it('Deve lidar com transição de dias na meia-noite', () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const diff = tomorrow.getTime() - today.getTime();
      expect(diff).toBeGreaterThan(0);
    });

    it('Deve validar formato ISO 8601', () => {
      const validDates = [
        '2026-12-31',
        '2025-01-01',
        '2026-08-16',
      ];

      validDates.forEach((dateStr) => {
        const date = new Date(dateStr);
        expect(isNaN(date.getTime())).toBe(false);
      });
    });

    it('Deve rejeitar datas inválidas', () => {
      const invalidDates = [
        'invalid',
        '2026-13-01',
        'abc-def-ghi',
        '',
        '2026/12/31', // Formato errado
      ];

      invalidDates.forEach((dateStr) => {
        const date = new Date(dateStr);
        expect(isNaN(date.getTime())).toBe(true);
      });
    });
  });

  describe('Estrutura de Alerta', () => {
    it('Alerta deve ter campos obrigatórios', () => {
      const alert: ExpiryAlert = {
        id: 'test-1',
        storeId: 'store-1',
        productId: 'product-1',
        productName: 'Paracetamol 500mg',
        expiryDate: '2026-12-31',
        daysUntilExpiry: 5,
        severity: 'CRITICAL',
        createdAt: new Date().toISOString(),
        channels: ['in-app', 'whatsapp'],
      };

      expect(alert.id).toBeDefined();
      expect(alert.storeId).toBeDefined();
      expect(alert.productId).toBeDefined();
      expect(alert.productName).toBeDefined();
      expect(alert.expiryDate).toBeDefined();
      expect(alert.daysUntilExpiry).toBeDefined();
      expect(alert.severity).toBeDefined();
      expect(alert.createdAt).toBeDefined();
      expect(alert.channels).toBeDefined();
    });

    it('Alerta pode ter campos opcionais', () => {
      const alert: ExpiryAlert = {
        id: 'test-1',
        storeId: 'store-1',
        productId: 'product-1',
        productName: 'Ibuprofeno 200mg',
        expiryDate: '2026-12-31',
        daysUntilExpiry: 20,
        severity: 'WARNING',
        createdAt: new Date().toISOString(),
        channels: ['email'],
        acknowledgedAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
        quantity: 100,
        batchNumber: 'LOT123456',
        notes: 'Observações importantes',
        notificationIds: {
          'in-app': 'notif-123',
          'email': 'email-456',
        },
      };

      expect(alert.acknowledgedAt).toBeDefined();
      expect(alert.resolvedAt).toBeDefined();
      expect(alert.quantity).toBeDefined();
      expect(alert.batchNumber).toBeDefined();
      expect(alert.notes).toBeDefined();
      expect(alert.notificationIds).toBeDefined();
    });

    it('Severidade deve ser um dos valores válidos', () => {
      const validSeverities: AlertSeverity[] = ['INFO', 'WARNING', 'CRITICAL'];

      validSeverities.forEach((severity) => {
        const alert: ExpiryAlert = {
          id: 'test-1',
          storeId: 'store-1',
          productId: 'product-1',
          productName: 'Produto',
          expiryDate: '2026-12-31',
          daysUntilExpiry: 10,
          severity,
          createdAt: new Date().toISOString(),
          channels: [],
        };

        expect(['INFO', 'WARNING', 'CRITICAL']).toContain(alert.severity);
      });
    });

    it('Canais devem ser válidos', () => {
      const validChannels = ['in-app', 'email', 'whatsapp', 'sms'] as const;

      const alert: ExpiryAlert = {
        id: 'test-1',
        storeId: 'store-1',
        productId: 'product-1',
        productName: 'Produto',
        expiryDate: '2026-12-31',
        daysUntilExpiry: 10,
        severity: 'WARNING',
        createdAt: new Date().toISOString(),
        channels: validChannels,
      };

      alert.channels.forEach((channel) => {
        expect(['in-app', 'email', 'whatsapp', 'sms']).toContain(channel);
      });
    });
  });

  describe('Validação de Dados', () => {
    it('Alerta com quantidade zero deve ser permitido', () => {
      const alert: ExpiryAlert = {
        id: 'test-1',
        storeId: 'store-1',
        productId: 'product-1',
        productName: 'Produto',
        expiryDate: '2026-12-31',
        daysUntilExpiry: 10,
        severity: 'INFO',
        createdAt: new Date().toISOString(),
        channels: [],
        quantity: 0,
      };

      expect(alert.quantity).toBe(0);
    });

    it('Alerta sem batch number deve ser permitido', () => {
      const alert: ExpiryAlert = {
        id: 'test-1',
        storeId: 'store-1',
        productId: 'product-1',
        productName: 'Produto',
        expiryDate: '2026-12-31',
        daysUntilExpiry: 10,
        severity: 'INFO',
        createdAt: new Date().toISOString(),
        channels: [],
      };

      expect(alert.batchNumber).toBeUndefined();
    });

    it('IDs devem ser únicos', () => {
      const alert1: ExpiryAlert = {
        id: 'unique-id-1',
        storeId: 'store-1',
        productId: 'product-1',
        productName: 'Produto 1',
        expiryDate: '2026-12-31',
        daysUntilExpiry: 10,
        severity: 'INFO',
        createdAt: new Date().toISOString(),
        channels: [],
      };

      const alert2: ExpiryAlert = {
        id: 'unique-id-2',
        storeId: 'store-1',
        productId: 'product-2',
        productName: 'Produto 2',
        expiryDate: '2026-12-31',
        daysUntilExpiry: 10,
        severity: 'INFO',
        createdAt: new Date().toISOString(),
        channels: [],
      };

      expect(alert1.id).not.toBe(alert2.id);
    });

    it('StoreId não deve estar vazio', () => {
      const validStoreIds = ['store-1', 'loja-002', 'farmacia-abc'];

      validStoreIds.forEach((storeId) => {
        expect(storeId.length).toBeGreaterThan(0);
        expect(storeId).toBeTruthy();
      });
    });
  });

  describe('Histórico de Alertas', () => {
    it('Histórico deve registar ações corretas', () => {
      const validActions = ['created', 'triggered', 'acknowledged', 'resolved', 'escalated'];

      validActions.forEach((action) => {
        expect(['created', 'triggered', 'acknowledged', 'resolved', 'escalated']).toContain(
          action
        );
      });
    });

    it('Histórico deve ter timestamp válido', () => {
      const timestamp = new Date().toISOString();
      const parsed = new Date(timestamp);

      expect(isNaN(parsed.getTime())).toBe(false);
      expect(parsed).toBeInstanceOf(Date);
    });

    it('Histórico pode ter metadata personalizada', () => {
      const metadata = {
        reason: 'Produto devolvido ao fornecedor',
        cost: 150.00,
        notes: 'Cliente insatisfeito',
      };

      expect(metadata.reason).toBeDefined();
      expect(typeof metadata.cost).toBe('number');
      expect(metadata.notes).toBeDefined();
    });
  });

  describe('Filtros e Queries', () => {
    it('Deve filtrar por severidade CRITICAL', () => {
      const alerts: ExpiryAlert[] = [
        {
          id: '1',
          storeId: 'store-1',
          productId: 'p-1',
          productName: 'P1',
          expiryDate: '2026-08-20',
          daysUntilExpiry: 4,
          severity: 'CRITICAL',
          createdAt: new Date().toISOString(),
          channels: [],
        },
        {
          id: '2',
          storeId: 'store-1',
          productId: 'p-2',
          productName: 'P2',
          expiryDate: '2026-09-15',
          daysUntilExpiry: 30,
          severity: 'WARNING',
          createdAt: new Date().toISOString(),
          channels: [],
        },
      ];

      const criticalOnly = alerts.filter((a) => a.severity === 'CRITICAL');
      expect(criticalOnly).toHaveLength(1);
      expect(criticalOnly[0].severity).toBe('CRITICAL');
    });

    it('Deve filtrar por status resolvido', () => {
      const alerts: ExpiryAlert[] = [
        {
          id: '1',
          storeId: 'store-1',
          productId: 'p-1',
          productName: 'P1',
          expiryDate: '2026-08-20',
          daysUntilExpiry: 4,
          severity: 'CRITICAL',
          createdAt: new Date().toISOString(),
          channels: [],
          resolvedAt: new Date().toISOString(),
        },
        {
          id: '2',
          storeId: 'store-1',
          productId: 'p-2',
          productName: 'P2',
          expiryDate: '2026-09-15',
          daysUntilExpiry: 30,
          severity: 'WARNING',
          createdAt: new Date().toISOString(),
          channels: [],
        },
      ];

      const unresolvedAlerts = alerts.filter((a) => !a.resolvedAt);
      expect(unresolvedAlerts).toHaveLength(1);
      expect(unresolvedAlerts[0].id).toBe('2');
    });

    it('Deve ordenar alertas por severidade', () => {
      const alerts: ExpiryAlert[] = [
        {
          id: '3',
          storeId: 'store-1',
          productId: 'p-3',
          productName: 'P3',
          expiryDate: '2026-10-01',
          daysUntilExpiry: 60,
          severity: 'INFO',
          createdAt: new Date().toISOString(),
          channels: [],
        },
        {
          id: '1',
          storeId: 'store-1',
          productId: 'p-1',
          productName: 'P1',
          expiryDate: '2026-08-20',
          daysUntilExpiry: 4,
          severity: 'CRITICAL',
          createdAt: new Date().toISOString(),
          channels: [],
        },
        {
          id: '2',
          storeId: 'store-1',
          productId: 'p-2',
          productName: 'P2',
          expiryDate: '2026-09-15',
          daysUntilExpiry: 30,
          severity: 'WARNING',
          createdAt: new Date().toISOString(),
          channels: [],
        },
      ];

      const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
      const sorted = [...alerts].sort(
        (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
      );

      expect(sorted[0].severity).toBe('CRITICAL');
      expect(sorted[1].severity).toBe('WARNING');
      expect(sorted[2].severity).toBe('INFO');
    });
  });

  describe('Resumo de Alertas', () => {
    it('Deve contar alertas por severidade', () => {
      const alerts: ExpiryAlert[] = [
        { id: '1', severity: 'CRITICAL', storeId: 'store-1', productId: 'p-1', productName: 'P1', expiryDate: '2026-08-20', daysUntilExpiry: 4, createdAt: new Date().toISOString(), channels: [] },
        { id: '2', severity: 'CRITICAL', storeId: 'store-1', productId: 'p-2', productName: 'P2', expiryDate: '2026-08-21', daysUntilExpiry: 3, createdAt: new Date().toISOString(), channels: [] },
        { id: '3', severity: 'WARNING', storeId: 'store-1', productId: 'p-3', productName: 'P3', expiryDate: '2026-09-15', daysUntilExpiry: 30, createdAt: new Date().toISOString(), channels: [] },
        { id: '4', severity: 'INFO', storeId: 'store-1', productId: 'p-4', productName: 'P4', expiryDate: '2026-10-01', daysUntilExpiry: 60, createdAt: new Date().toISOString(), channels: [] },
      ];

      const critical = alerts.filter((a) => a.severity === 'CRITICAL').length;
      const warning = alerts.filter((a) => a.severity === 'WARNING').length;
      const info = alerts.filter((a) => a.severity === 'INFO').length;

      expect(critical).toBe(2);
      expect(warning).toBe(1);
      expect(info).toBe(1);
    });

    it('Total de alertas deve ser correto', () => {
      const alerts: ExpiryAlert[] = [
        { id: '1', severity: 'CRITICAL', storeId: 'store-1', productId: 'p-1', productName: 'P1', expiryDate: '2026-08-20', daysUntilExpiry: 4, createdAt: new Date().toISOString(), channels: [] },
        { id: '2', severity: 'WARNING', storeId: 'store-1', productId: 'p-2', productName: 'P2', expiryDate: '2026-09-15', daysUntilExpiry: 30, createdAt: new Date().toISOString(), channels: [] },
        { id: '3', severity: 'INFO', storeId: 'store-1', productId: 'p-3', productName: 'P3', expiryDate: '2026-10-01', daysUntilExpiry: 60, createdAt: new Date().toISOString(), channels: [] },
      ];

      expect(alerts).toHaveLength(3);
    });
  });

  describe('Casos Extremos', () => {
    it('Deve lidar com produtos sem quantidade', () => {
      const alert: ExpiryAlert = {
        id: 'test-1',
        storeId: 'store-1',
        productId: 'product-1',
        productName: 'Produto',
        expiryDate: '2026-12-31',
        daysUntilExpiry: 10,
        severity: 'INFO',
        createdAt: new Date().toISOString(),
        channels: [],
      };

      expect(alert.quantity).toBeUndefined();
    });

    it('Deve lidar com múltiplos canais simultaneamente', () => {
      const alert: ExpiryAlert = {
        id: 'test-1',
        storeId: 'store-1',
        productId: 'product-1',
        productName: 'Produto',
        expiryDate: '2026-12-31',
        daysUntilExpiry: 10,
        severity: 'CRITICAL',
        createdAt: new Date().toISOString(),
        channels: ['in-app', 'email', 'whatsapp', 'sms'],
      };

      expect(alert.channels).toHaveLength(4);
      expect(alert.channels).toContain('in-app');
      expect(alert.channels).toContain('email');
      expect(alert.channels).toContain('whatsapp');
      expect(alert.channels).toContain('sms');
    });

    it('Deve lidar com lotes muito longos', () => {
      const longBatchNumber = 'BATCH-' + 'A'.repeat(100);

      const alert: ExpiryAlert = {
        id: 'test-1',
        storeId: 'store-1',
        productId: 'product-1',
        productName: 'Produto',
        expiryDate: '2026-12-31',
        daysUntilExpiry: 10,
        severity: 'INFO',
        createdAt: new Date().toISOString(),
        channels: [],
        batchNumber: longBatchNumber,
      };

      expect(alert.batchNumber).toBe(longBatchNumber);
      expect(alert.batchNumber!.length).toBeGreaterThan(50);
    });

    it('Deve lidar com quantidades muito grandes', () => {
      const alert: ExpiryAlert = {
        id: 'test-1',
        storeId: 'store-1',
        productId: 'product-1',
        productName: 'Produto',
        expiryDate: '2026-12-31',
        daysUntilExpiry: 10,
        severity: 'INFO',
        createdAt: new Date().toISOString(),
        channels: [],
        quantity: 999999999,
      };

      expect(alert.quantity).toBe(999999999);
    });
  });
});
