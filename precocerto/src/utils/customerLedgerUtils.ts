import type { Customer, CustomerLedgerEntryType, CustomerSummary } from '../types/customers';

const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

export function calculateCustomerBalance(
  currentBalance: number,
  type: CustomerLedgerEntryType,
  amount: number
): number {
  const normalizedBalance = roundMoney(currentBalance);
  const normalizedAmount = roundMoney(amount);

  if (normalizedAmount <= 0) {
    throw new Error('O valor do movimento deve ser maior que zero.');
  }

  if (type === 'sale_credit') return roundMoney(normalizedBalance + normalizedAmount);
  if (type === 'payment') return roundMoney(Math.max(0, normalizedBalance - normalizedAmount));
  return normalizedAmount;
}

export function getAvailableCustomerCredit(customer: Pick<Customer, 'creditLimit' | 'currentBalance'>): number {
  const creditLimit = roundMoney(customer.creditLimit || 0);
  if (creditLimit <= 0) return Number.POSITIVE_INFINITY;
  return roundMoney(Math.max(0, creditLimit - roundMoney(customer.currentBalance || 0)));
}

export function validateCreditSale(customer: Pick<Customer, 'status' | 'creditLimit' | 'currentBalance'>, saleTotal: number): string | null {
  if (customer.status !== 'active') return 'Cliente inativo. Ative o cliente antes de vender a crédito.';
  if (saleTotal <= 0) return 'O total da venda a crédito deve ser maior que zero.';

  const availableCredit = getAvailableCustomerCredit(customer);
  if (Number.isFinite(availableCredit) && saleTotal > availableCredit) {
    return `Limite de crédito excedido. Disponível: ${availableCredit.toFixed(2)} Kz.`;
  }

  return null;
}

export function validateCustomerPayment(currentBalance: number, amount: number): string | null {
  if (amount <= 0) return 'Informe um valor de pagamento maior que zero.';
  if (currentBalance <= 0) return 'Este cliente não tem saldo em aberto.';
  if (amount > currentBalance) return 'O pagamento não pode ser maior que o saldo em aberto.';
  return null;
}

export function buildCustomerSummary(customers: Customer[]): CustomerSummary {
  const totalCreditLimit = roundMoney(customers.reduce((sum, customer) => sum + (customer.creditLimit || 0), 0));
  const totalBalance = roundMoney(customers.reduce((sum, customer) => sum + (customer.currentBalance || 0), 0));

  return {
    totalCustomers: customers.length,
    activeCustomers: customers.filter((customer) => customer.status === 'active').length,
    customersWithDebt: customers.filter((customer) => (customer.currentBalance || 0) > 0).length,
    totalBalance,
    totalCreditLimit,
    availableCredit: roundMoney(Math.max(0, totalCreditLimit - totalBalance)),
  };
}
