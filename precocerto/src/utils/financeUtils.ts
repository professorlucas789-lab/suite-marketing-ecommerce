import type { FinancialSummary, FinancialTransaction } from '../types/finance';

const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

export function assertPositiveAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('O valor deve ser maior que zero.');
  }
}

export function calculateDirectionTotal(
  transactions: FinancialTransaction[],
  direction: FinancialTransaction['direction']
): number {
  return roundMoney(
    transactions
      .filter((transaction) => transaction.direction === direction)
      .reduce((sum, transaction) => sum + (transaction.amount || 0), 0)
  );
}

export function buildFinancialSummary(
  transactions: FinancialTransaction[],
  receivables: number,
  payables: number
): FinancialSummary {
  const totalIn = calculateDirectionTotal(transactions, 'in');
  const totalOut = calculateDirectionTotal(transactions, 'out');
  const netCashFlow = roundMoney(totalIn - totalOut);

  return {
    totalIn,
    totalOut,
    netCashFlow,
    receivables: roundMoney(receivables),
    payables: roundMoney(payables),
    operationalBalance: roundMoney(netCashFlow + receivables - payables),
    transactionCount: transactions.length,
  };
}

export function filterTransactionsByDate(
  transactions: FinancialTransaction[],
  fromDate?: string,
  toDate?: string
): FinancialTransaction[] {
  if (!fromDate && !toDate) return transactions;

  const from = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date(0);
  const to = toDate ? new Date(`${toDate}T23:59:59`) : new Date();

  return transactions.filter((transaction) => {
    const date = new Date(transaction.occurredAt || transaction.createdAt);
    return date >= from && date <= to;
  });
}
