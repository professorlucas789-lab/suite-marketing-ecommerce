import { describe, expect, it } from 'vitest';
import type { Customer } from '../types/customers';
import {
  buildCustomerSummary,
  calculateCustomerBalance,
  getAvailableCustomerCredit,
  validateCreditSale,
  validateCustomerPayment,
} from './customerLedgerUtils';

const makeCustomer = (overrides: Partial<Customer>): Customer => ({
  id: 'customer-1',
  storeId: 'store-1',
  userId: 'user-1',
  name: 'Cliente Teste',
  status: 'active',
  creditLimit: 10000,
  currentBalance: 2500,
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
  ...overrides,
});

describe('customerLedgerUtils', () => {
  it('calcula saldo de venda a credito e pagamento', () => {
    expect(calculateCustomerBalance(2500, 'sale_credit', 1000)).toBe(3500);
    expect(calculateCustomerBalance(2500, 'payment', 500)).toBe(2000);
    expect(calculateCustomerBalance(2500, 'payment', 5000)).toBe(0);
  });

  it('calcula credito disponivel respeitando limite aberto', () => {
    expect(getAvailableCustomerCredit(makeCustomer({ creditLimit: 10000, currentBalance: 2500 }))).toBe(7500);
    expect(getAvailableCustomerCredit(makeCustomer({ creditLimit: 0, currentBalance: 2500 }))).toBe(Number.POSITIVE_INFINITY);
  });

  it('valida venda a credito por estado e limite', () => {
    expect(validateCreditSale(makeCustomer({ status: 'inactive' }), 1000)).toContain('Cliente inativo');
    expect(validateCreditSale(makeCustomer({ creditLimit: 3000, currentBalance: 2500 }), 1000)).toContain('Limite de crédito');
    expect(validateCreditSale(makeCustomer({ creditLimit: 5000, currentBalance: 2500 }), 1000)).toBeNull();
  });

  it('valida pagamento de conta corrente', () => {
    expect(validateCustomerPayment(0, 100)).toContain('não tem saldo');
    expect(validateCustomerPayment(1000, 0)).toContain('maior que zero');
    expect(validateCustomerPayment(1000, 1200)).toContain('maior que o saldo');
    expect(validateCustomerPayment(1000, 800)).toBeNull();
  });

  it('gera resumo dos clientes da loja', () => {
    const summary = buildCustomerSummary([
      makeCustomer({ status: 'active', creditLimit: 10000, currentBalance: 2500 }),
      makeCustomer({ id: 'customer-2', status: 'inactive', creditLimit: 5000, currentBalance: 0 }),
    ]);

    expect(summary).toMatchObject({
      totalCustomers: 2,
      activeCustomers: 1,
      customersWithDebt: 1,
      totalBalance: 2500,
      totalCreditLimit: 15000,
      availableCredit: 12500,
    });
  });
});
