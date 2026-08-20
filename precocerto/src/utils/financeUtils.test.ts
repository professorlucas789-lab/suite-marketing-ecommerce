import { describe, expect, it } from 'vitest';
import type { FinancialTransaction } from '../types/finance';
import {
  assertPositiveAmount,
  buildFinancialSummary,
  calculateDirectionTotal,
  filterTransactionsByDate,
} from './financeUtils';

const makeTransaction = (overrides: Partial<FinancialTransaction>): FinancialTransaction => ({
  id: 'tx-1',
  storeId: 'store-1',
  userId: 'user-1',
  direction: 'in',
  type: 'sale_income',
  amount: 1000,
  paymentMethod: 'cash',
  description: 'Venda',
  occurredAt: '2026-08-20T10:00:00.000Z',
  createdAt: '2026-08-20T10:00:00.000Z',
  ...overrides,
});

describe('financeUtils', () => {
  it('valida valores positivos', () => {
    expect(() => assertPositiveAmount(0)).toThrow('maior que zero');
    expect(() => assertPositiveAmount(100)).not.toThrow();
  });

  it('calcula totais por direção', () => {
    const transactions = [
      makeTransaction({ amount: 1000, direction: 'in' }),
      makeTransaction({ id: 'tx-2', amount: 300, direction: 'out', type: 'expense' }),
      makeTransaction({ id: 'tx-3', amount: 500, direction: 'in', type: 'customer_payment' }),
    ];

    expect(calculateDirectionTotal(transactions, 'in')).toBe(1500);
    expect(calculateDirectionTotal(transactions, 'out')).toBe(300);
  });

  it('gera resumo financeiro operacional', () => {
    const summary = buildFinancialSummary([
      makeTransaction({ amount: 1000, direction: 'in' }),
      makeTransaction({ id: 'tx-2', amount: 400, direction: 'out', type: 'purchase_payment' }),
    ], 2500, 800);

    expect(summary).toMatchObject({
      totalIn: 1000,
      totalOut: 400,
      netCashFlow: 600,
      receivables: 2500,
      payables: 800,
      operationalBalance: 2300,
      transactionCount: 2,
    });
  });

  it('filtra movimentos por período', () => {
    const filtered = filterTransactionsByDate([
      makeTransaction({ id: 'old', occurredAt: '2026-08-01T10:00:00.000Z' }),
      makeTransaction({ id: 'current', occurredAt: '2026-08-20T10:00:00.000Z' }),
    ], '2026-08-15', '2026-08-21');

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('current');
  });
});
