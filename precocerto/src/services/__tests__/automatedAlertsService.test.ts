/**
 * Tests: Automated Alerts Service
 * Testa detecção automática de alertas (stock, validade, etc)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutomatedAlertsService } from '../automatedAlertsService';
import { NotificationService } from '../notificationService';
import * as FirestoreModule from 'firebase/firestore';

// Mock Firestore
vi.mock('firebase/firestore');
vi.mock('../notificationService');

describe('AutomatedAlertsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkStockCritical', () => {
    it('deve disparar alerta quando stock <= 2', async () => {
      const mockProduct = {
        id: 'prod-1',
        nome: 'Paracetamol',
        quantidadeDisponível: 2,
        storeId: 'store-1',
      };

      const dispatchAlertSpy = vi.spyOn(AutomatedAlertsService as any, 'dispatchAlert');

      await AutomatedAlertsService.checkStockCritical('store-1', mockProduct as any);

      expect(dispatchAlertSpy).toHaveBeenCalled();
      expect(dispatchAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stock_critical',
          storeId: 'store-1',
          title: expect.stringContaining('STOCK CRÍTICO'),
        })
      );
    });

    it('não deve disparar alerta quando stock > 2', async () => {
      const mockProduct = {
        id: 'prod-1',
        nome: 'Paracetamol',
        quantidadeDisponível: 5,
        storeId: 'store-1',
      };

      const dispatchAlertSpy = vi.spyOn(AutomatedAlertsService as any, 'dispatchAlert');

      await AutomatedAlertsService.checkStockCritical('store-1', mockProduct as any);

      expect(dispatchAlertSpy).not.toHaveBeenCalled();
    });

    it('deve disparar alerta para stock zero', async () => {
      const mockProduct = {
        id: 'prod-1',
        nome: 'Paracetamol',
        quantidadeDisponível: 0,
        storeId: 'store-1',
      };

      const dispatchAlertSpy = vi.spyOn(AutomatedAlertsService as any, 'dispatchAlert');

      await AutomatedAlertsService.checkStockCritical('store-1', mockProduct as any);

      expect(dispatchAlertSpy).toHaveBeenCalled();
    });
  });

  describe('checkStockLow', () => {
    it('deve disparar alerta quando 2 < stock <= 5', async () => {
      const mockProduct = {
        id: 'prod-1',
        nome: 'Paracetamol',
        quantidadeDisponível: 3,
        storeId: 'store-1',
      };

      const dispatchAlertSpy = vi.spyOn(AutomatedAlertsService as any, 'dispatchAlert');

      await AutomatedAlertsService.checkStockLow('store-1', mockProduct as any);

      expect(dispatchAlertSpy).toHaveBeenCalled();
      expect(dispatchAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stock_low',
          storeId: 'store-1',
        })
      );
    });

    it('não deve disparar alerta quando stock <= 2', async () => {
      const mockProduct = {
        id: 'prod-1',
        nome: 'Paracetamol',
        quantidadeDisponível: 2,
        storeId: 'store-1',
      };

      const dispatchAlertSpy = vi.spyOn(AutomatedAlertsService as any, 'dispatchAlert');

      await AutomatedAlertsService.checkStockLow('store-1', mockProduct as any);

      expect(dispatchAlertSpy).not.toHaveBeenCalled();
    });

    it('não deve disparar alerta quando stock > 5', async () => {
      const mockProduct = {
        id: 'prod-1',
        nome: 'Paracetamol',
        quantidadeDisponível: 10,
        storeId: 'store-1',
      };

      const dispatchAlertSpy = vi.spyOn(AutomatedAlertsService as any, 'dispatchAlert');

      await AutomatedAlertsService.checkStockLow('store-1', mockProduct as any);

      expect(dispatchAlertSpy).not.toHaveBeenCalled();
    });
  });

  describe('checkExpirySoon', () => {
    it('deve disparar alerta quando vencimento em 7 dias', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const mockProduct = {
        id: 'prod-1',
        nome: 'Ibuprofen',
        farmaciaDataValidade: futureDate.toISOString().split('T')[0],
        storeId: 'store-1',
      };

      const dispatchAlertSpy = vi.spyOn(AutomatedAlertsService as any, 'dispatchAlert');

      await AutomatedAlertsService.checkExpirySoon('store-1', mockProduct as any);

      expect(dispatchAlertSpy).toHaveBeenCalled();
      expect(dispatchAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'expiry_soon',
          storeId: 'store-1',
        })
      );
    });

    it('não deve disparar alerta quando vencimento > 7 dias', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const mockProduct = {
        id: 'prod-1',
        nome: 'Ibuprofen',
        farmaciaDataValidade: futureDate.toISOString().split('T')[0],
        storeId: 'store-1',
      };

      const dispatchAlertSpy = vi.spyOn(AutomatedAlertsService as any, 'dispatchAlert');

      await AutomatedAlertsService.checkExpirySoon('store-1', mockProduct as any);

      expect(dispatchAlertSpy).not.toHaveBeenCalled();
    });

    it('deve usar prioridade crítica quando vencimento em <= 3 dias', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);

      const mockProduct = {
        id: 'prod-1',
        nome: 'Ibuprofen',
        farmaciaDataValidade: futureDate.toISOString().split('T')[0],
        storeId: 'store-1',
      };

      const dispatchAlertSpy = vi.spyOn(AutomatedAlertsService as any, 'dispatchAlert');

      await AutomatedAlertsService.checkExpirySoon('store-1', mockProduct as any);

      expect(dispatchAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'critical',
        })
      );
    });
  });

  describe('checkExpiryToday', () => {
    it('deve disparar alerta quando produto vence hoje', async () => {
      const today = new Date().toISOString().split('T')[0];

      const mockProduct = {
        id: 'prod-1',
        nome: 'Ibuprofen',
        farmaciaDataValidade: today,
        storeId: 'store-1',
      };

      const dispatchAlertSpy = vi.spyOn(AutomatedAlertsService as any, 'dispatchAlert');

      await AutomatedAlertsService.checkExpiryToday('store-1', mockProduct as any);

      expect(dispatchAlertSpy).toHaveBeenCalled();
      expect(dispatchAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'expiry_today',
          priority: 'critical',
        })
      );
    });

    it('não deve disparar alerta quando produto não vence hoje', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const mockProduct = {
        id: 'prod-1',
        nome: 'Ibuprofen',
        farmaciaDataValidade: tomorrow.toISOString().split('T')[0],
        storeId: 'store-1',
      };

      const dispatchAlertSpy = vi.spyOn(AutomatedAlertsService as any, 'dispatchAlert');

      await AutomatedAlertsService.checkExpiryToday('store-1', mockProduct as any);

      expect(dispatchAlertSpy).not.toHaveBeenCalled();
    });
  });

  describe('checkNegativeMargin', () => {
    it('deve disparar alerta para margem negativa', async () => {
      const dispatchAlertSpy = vi.spyOn(AutomatedAlertsService as any, 'dispatchAlert');

      await AutomatedAlertsService.checkNegativeMargin('store-1', 'Paracetamol', -10);

      expect(dispatchAlertSpy).toHaveBeenCalled();
      expect(dispatchAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'negative_margin',
          priority: 'high',
        })
      );
    });

    it('não deve disparar alerta para margem positiva', async () => {
      const dispatchAlertSpy = vi.spyOn(AutomatedAlertsService as any, 'dispatchAlert');

      await AutomatedAlertsService.checkNegativeMargin('store-1', 'Paracetamol', 20);

      expect(dispatchAlertSpy).not.toHaveBeenCalled();
    });

    it('não deve disparar alerta para margem zero', async () => {
      const dispatchAlertSpy = vi.spyOn(AutomatedAlertsService as any, 'dispatchAlert');

      await AutomatedAlertsService.checkNegativeMargin('store-1', 'Paracetamol', 0);

      expect(dispatchAlertSpy).not.toHaveBeenCalled();
    });
  });

  describe('checkReorderNeeded', () => {
    it('deve disparar alerta quando stock <= minStock', async () => {
      const dispatchAlertSpy = vi.spyOn(AutomatedAlertsService as any, 'dispatchAlert');

      await AutomatedAlertsService.checkReorderNeeded(
        'store-1',
        'Paracetamol',
        5, // currentStock
        10, // minStock
        50 // suggestedQuantity
      );

      expect(dispatchAlertSpy).toHaveBeenCalled();
      expect(dispatchAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'reorder_needed',
        })
      );
    });

    it('não deve disparar alerta quando stock > minStock', async () => {
      const dispatchAlertSpy = vi.spyOn(AutomatedAlertsService as any, 'dispatchAlert');

      await AutomatedAlertsService.checkReorderNeeded(
        'store-1',
        'Paracetamol',
        20, // currentStock
        10, // minStock
        50 // suggestedQuantity
      );

      expect(dispatchAlertSpy).not.toHaveBeenCalled();
    });
  });
});
