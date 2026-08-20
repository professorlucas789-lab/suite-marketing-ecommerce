import { describe, expect, it } from 'vitest';
import type { Supplier } from '../types/purchasing';
import {
  buildSupplierSummary,
  calculatePurchaseBalance,
  calculatePurchaseLineTotal,
  calculatePurchaseTotal,
  calculateWeightedAverageCost,
  normalizePurchasePayment,
} from './purchasingUtils';

const makeSupplier = (overrides: Partial<Supplier>): Supplier => ({
  id: 'supplier-1',
  storeId: 'store-1',
  userId: 'user-1',
  name: 'Fornecedor Teste',
  status: 'active',
  currentPayable: 0,
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
  ...overrides,
});

describe('purchasingUtils', () => {
  it('calcula total de linha e total da compra', () => {
    expect(calculatePurchaseLineTotal(3, 250)).toBe(750);
    expect(calculatePurchaseTotal([
      { quantity: 3, unitCost: 250 },
      { quantity: 2, unitCost: 100 },
    ])).toBe(950);
  });

  it('calcula custo medio ponderado de entrada de stock', () => {
    expect(calculateWeightedAverageCost(10, 100, 10, 200)).toBe(150);
    expect(calculateWeightedAverageCost(0, 0, 5, 300)).toBe(300);
  });

  it('normaliza pagamento de compra', () => {
    expect(normalizePurchasePayment(1000, undefined, 'paid')).toEqual({ amountPaid: 1000, balanceDue: 0 });
    expect(normalizePurchasePayment(1000, undefined, 'unpaid')).toEqual({ amountPaid: 0, balanceDue: 1000 });
    expect(normalizePurchasePayment(1000, 400, 'partial')).toEqual({ amountPaid: 400, balanceDue: 600 });
  });

  it('valida pagamento maior que total', () => {
    expect(() => calculatePurchaseBalance(1000, 1200, 'partial')).toThrow('maior que o total');
  });

  it('gera resumo de fornecedores', () => {
    expect(buildSupplierSummary([
      makeSupplier({ currentPayable: 500 }),
      makeSupplier({ id: 'supplier-2', status: 'inactive', currentPayable: 0 }),
    ])).toMatchObject({
      totalSuppliers: 2,
      activeSuppliers: 1,
      suppliersWithDebt: 1,
      totalPayable: 500,
    });
  });
});
