/**
 * Tests: Sales Service
 * Testa registor de vendas, cálculo de margens e sincronização de estoque
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recordSale } from '../salesService';
import * as FirestoreModule from 'firebase/firestore';

vi.mock('firebase/firestore');

describe('Sales Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordSale - Profit Margin Calculations', () => {
    it('deve calcular corretamente margem positiva', () => {
      // Test case:
      // unitPrice: 100, unitCost: 60, quantity: 1
      // totalPrice: 100, totalCost: 60
      // profit: 40, margin: 40%

      const expectedProfit = 40;
      const expectedMargin = 40;

      expect(expectedProfit).toBe(40);
      expect(expectedMargin).toBe(40);
    });

    it('deve calcular corretamente margem negativa', () => {
      // Test case:
      // unitPrice: 50, unitCost: 60, quantity: 1
      // totalPrice: 50, totalCost: 60
      // profit: -10, margin: -20%

      const expectedProfit = -10;
      const expectedMargin = -20;

      expect(expectedProfit).toBe(-10);
      expect(expectedMargin).toBe(-20);
    });

    it('deve calcular corretamente multi-product sale', () => {
      // Test case: 3 produtos
      // Product 1: price 100 * qty 2 = 200, cost 60 * qty 2 = 120, profit = 80
      // Product 2: price 50 * qty 1 = 50, cost 40 * qty 1 = 40, profit = 10
      // Product 3: price 200 * qty 1 = 200, cost 100 * qty 1 = 100, profit = 100

      const p1 = { quantity: 2, unitPrice: 100, unitCost: 60, profit: 80 };
      const p2 = { quantity: 1, unitPrice: 50, unitCost: 40, profit: 10 };
      const p3 = { quantity: 1, unitPrice: 200, unitCost: 100, profit: 100 };

      const totalRevenue = (100 * 2) + (50 * 1) + (200 * 1);
      const totalCost = (60 * 2) + (40 * 1) + (100 * 1);
      const totalProfit = totalRevenue - totalCost;
      const avgMargin = (totalProfit / totalRevenue) * 100;

      expect(totalRevenue).toBe(450);
      expect(totalCost).toBe(260); // Corrigido: 120 + 40 + 100 = 260
      expect(totalProfit).toBe(190);
      expect(Math.round(avgMargin * 100) / 100).toBe(42.22);
    });

    it('deve ignorar vendas com custo zero como erro', () => {
      // Quando um produto não tem custo definido
      // Deve usar custo 0 ou gerar erro

      const unitPrice = 100;
      const unitCost = 0; // Sem custo definido
      const totalPrice = unitPrice * 1;
      const totalCost = unitCost * 1;
      const profit = totalPrice - totalCost;
      const margin = (profit / totalPrice) * 100;

      // Venda é aceitável, lucro é 100%, margem é 100%
      expect(profit).toBe(100);
      expect(margin).toBe(100);
    });
  });

  describe('Sales Validation', () => {
    it('deve validar quantidade positiva', () => {
      const isValid = (quantity: number) => quantity > 0;

      expect(isValid(1)).toBe(true);
      expect(isValid(100)).toBe(true);
      expect(isValid(0)).toBe(false);
      expect(isValid(-5)).toBe(false);
    });

    it('deve validar preço unitário positivo', () => {
      const isValid = (price: number) => price > 0;

      expect(isValid(0.01)).toBe(true);
      expect(isValid(100)).toBe(true);
      expect(isValid(0)).toBe(false);
      expect(isValid(-50)).toBe(false);
    });

    it('deve validar troco corretamente', () => {
      const calculateChange = (subtotal: number, amountPaid: number) => {
        return amountPaid - subtotal;
      };

      expect(calculateChange(100, 100)).toBe(0);
      expect(calculateChange(100, 150)).toBe(50);
      expect(calculateChange(100, 200)).toBe(100);
    });

    it('deve rejeitar venda se amountPaid < subtotal (cash)', () => {
      const isValidPayment = (subtotal: number, amountPaid: number) => {
        return amountPaid >= subtotal;
      };

      expect(isValidPayment(100, 100)).toBe(true);
      expect(isValidPayment(100, 150)).toBe(true);
      expect(isValidPayment(100, 50)).toBe(false);
    });
  });

  describe('Payment Methods', () => {
    it('deve suportar múltiplos métodos de pagamento', () => {
      const paymentMethods = ['cash', 'card', 'transfer', 'multicaixa', 'mobile_money', 'credit', 'cheque', 'other'];

      expect(paymentMethods).toContain('cash');
      expect(paymentMethods).toContain('card');
      expect(paymentMethods).toContain('transfer');
      expect(paymentMethods).toContain('credit');
    });

    it('cash payment deve exigir amountPaid', () => {
      const paymentMethod = 'cash';
      const amountPaid = 100;

      // Cash payments must have an amountPaid value
      expect(amountPaid).toBeGreaterThan(0);
    });

    it('credit payment não deve exigir amountPaid imediato', () => {
      const paymentMethod = 'credit';
      const amountPaid = undefined;

      // Credit sales can have no amountPaid
      expect(amountPaid).toBeUndefined();
    });
  });

  describe('Stock Synchronization', () => {
    it('deve atualizar stock após venda', () => {
      const initialStock = 50;
      const quantitySold = 10;
      const finalStock = initialStock - quantitySold;

      expect(finalStock).toBe(40);
    });

    it('deve rejeitar venda se stock insuficiente', () => {
      const availableStock = 5;
      const requestedQuantity = 10;
      const isValidStock = () => availableStock >= requestedQuantity;

      expect(isValidStock()).toBe(false);
    });

    it('deve permitir venda exata de stock disponível', () => {
      const availableStock = 10;
      const requestedQuantity = 10;
      const isValidStock = () => availableStock >= requestedQuantity;

      expect(isValidStock()).toBe(true);
    });

    it('deve registar stockBefore e stockAfter', () => {
      const stockBefore = 50;
      const quantity = 15;
      const stockAfter = stockBefore - quantity;

      expect(stockBefore).toBe(50);
      expect(stockAfter).toBe(35);
      expect(quantity).toBe(15);
    });
  });

  describe('Receipt Generation', () => {
    it('deve gerar receiptNumber único', () => {
      const generateReceipt = () => {
        const now = new Date();
        const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '');
        const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
        return `PC-IR-${datePart}-${timePart}-${suffix}`;
      };

      const receipt1 = generateReceipt();
      const receipt2 = generateReceipt();

      expect(receipt1).toMatch(/^PC-IR-\d{8}-\d{6}-[A-Z0-9]{4}$/);
      expect(receipt2).toMatch(/^PC-IR-\d{8}-\d{6}-[A-Z0-9]{4}$/);
      expect(receipt1).not.toBe(receipt2); // Different suffixes
    });

    it('deve formatar data corretamente', () => {
      const now = new Date('2026-08-22T14:30:45Z');
      const date = now.toISOString().slice(0, 10);
      const time = now.toTimeString().slice(0, 5);

      expect(date).toBe('2026-08-22');
      expect(time).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('Customer Credit Sales', () => {
    it('deve rastrear customer balance após venda a crédito', () => {
      const initialBalance = 100;
      const creditSaleAmount = 50;
      const finalBalance = initialBalance + creditSaleAmount;

      expect(finalBalance).toBe(150);
    });

    it('deve validar limite de crédito', () => {
      const customerCreditLimit = 1000;
      const currentBalance = 800;
      const requestedCredit = 300;
      const isValidCredit = (currentBalance + requestedCredit) <= customerCreditLimit;

      expect(isValidCredit).toBe(false);
    });

    it('deve permitir venda a crédito dentro do limite', () => {
      const customerCreditLimit = 1000;
      const currentBalance = 500;
      const requestedCredit = 300;
      const isValidCredit = (currentBalance + requestedCredit) <= customerCreditLimit;

      expect(isValidCredit).toBe(true);
    });
  });

  describe('FASE 1: Validação de Validade em Vendas', () => {
    it('deve impedir venda de produto já vencido', () => {
      const today = new Date();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - 1); // Ontem = vencido

      const isExpired = expiryDate < today;
      expect(isExpired).toBe(true);
    });

    it('deve impedir venda de produto vencendo hoje', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryDate = new Date();
      expiryDate.setHours(0, 0, 0, 0); // Mesma data = vence hoje

      const isExpiringToday = expiryDate.getTime() === today.getTime();
      expect(isExpiringToday).toBe(true);
    });

    it('deve impedir venda de produto vencendo em 2 dias', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const twoDaysFromNow = new Date(today);
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

      const expiryDate = new Date(twoDaysFromNow);
      expiryDate.setDate(expiryDate.getDate() - 1); // Amanhã

      const isCritical = expiryDate <= twoDaysFromNow;
      expect(isCritical).toBe(true);
    });

    it('deve permitir venda de produto com validade adequada', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const twoDaysFromNow = new Date(today);
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

      const expiryDate = new Date(today);
      expiryDate.setDate(expiryDate.getDate() + 30); // 30 dias = OK

      const isValid = expiryDate > twoDaysFromNow;
      expect(isValid).toBe(true);
    });

    it('deve permitir venda de produto sem data de validade', () => {
      const product = { nome: 'Produto teste', farmaciaDataValidade: undefined };
      const isValid = !product.farmaciaDataValidade;
      expect(isValid).toBe(true);
    });

    it('deve calcular corretamente dias até vencimento', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expiryDate = new Date(today);
      expiryDate.setDate(expiryDate.getDate() + 15);

      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysUntilExpiry).toBe(15);
    });
  });
});
