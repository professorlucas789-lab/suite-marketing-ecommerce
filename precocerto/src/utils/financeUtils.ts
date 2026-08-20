import type {
  FinancialAccountDescriptor,
  FinancialAccountSummary,
  FinancialSummary,
  FinancialTransaction,
  PaymentMethodSummary,
  ReconciliationSummary,
} from '../types/finance';

const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

const paymentMethodLabels: Record<string, string> = {
  cash: 'Dinheiro',
  multicaixa: 'Multicaixa',
  transfer: 'Transferência',
  card: 'Cartão',
  mobile_money: 'Carteira móvel',
  cheque: 'Cheque',
  credit: 'Crédito',
  internal_transfer: 'Transferência interna',
  other: 'Outro',
};

const defaultAccounts: FinancialAccountDescriptor[] = [
  {
    accountId: 'cash-register',
    accountName: 'Caixa físico',
    accountType: 'cash',
    paymentMethods: ['cash'],
  },
  {
    accountId: 'bank-account',
    accountName: 'Conta bancária',
    accountType: 'bank',
    paymentMethods: ['transfer', 'cheque'],
  },
  {
    accountId: 'multicaixa-tpa',
    accountName: 'TPA / Multicaixa',
    accountType: 'card',
    paymentMethods: ['multicaixa', 'card'],
  },
  {
    accountId: 'mobile-wallet',
    accountName: 'Carteira móvel',
    accountType: 'mobile_money',
    paymentMethods: ['mobile_money'],
  },
  {
    accountId: 'other-clearing',
    accountName: 'Conta de acerto',
    accountType: 'clearing',
    paymentMethods: ['other'],
  },
];

export function assertPositiveAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('O valor deve ser maior que zero.');
  }
}

export function getPaymentMethodLabel(paymentMethod?: string): string {
  const key = (paymentMethod || 'other').trim() || 'other';
  return paymentMethodLabels[key] || key;
}

export function getDefaultFinanceAccounts(): FinancialAccountDescriptor[] {
  return defaultAccounts.map((account) => ({ ...account, paymentMethods: [...account.paymentMethods] }));
}

export function getDefaultAccountForPaymentMethod(paymentMethod?: string): FinancialAccountDescriptor {
  const key = (paymentMethod || 'other').trim() || 'other';
  const account = defaultAccounts.find((item) => item.paymentMethods.includes(key)) || defaultAccounts[defaultAccounts.length - 1];
  return { ...account, paymentMethods: [...account.paymentMethods] };
}

export function getTransactionAccount(transaction: FinancialTransaction): FinancialAccountDescriptor {
  if (transaction.accountId && transaction.accountName && transaction.accountType) {
    return {
      accountId: transaction.accountId,
      accountName: transaction.accountName,
      accountType: transaction.accountType,
      paymentMethods: [transaction.paymentMethod || 'other'],
    };
  }

  return getDefaultAccountForPaymentMethod(transaction.paymentMethod);
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

export function buildAccountBalances(transactions: FinancialTransaction[]): FinancialAccountSummary[] {
  const accounts = new Map<string, FinancialAccountSummary>();

  getDefaultFinanceAccounts().forEach((account) => {
    accounts.set(account.accountId, {
      ...account,
      totalIn: 0,
      totalOut: 0,
      balance: 0,
      transactionCount: 0,
      unreconciledAmount: 0,
    });
  });

  transactions.forEach((transaction) => {
    const account = getTransactionAccount(transaction);
    const current = accounts.get(account.accountId) || {
      ...account,
      totalIn: 0,
      totalOut: 0,
      balance: 0,
      transactionCount: 0,
      unreconciledAmount: 0,
    };

    if (transaction.direction === 'in') {
      current.totalIn = roundMoney(current.totalIn + transaction.amount);
    } else {
      current.totalOut = roundMoney(current.totalOut + transaction.amount);
    }

    current.balance = roundMoney(current.totalIn - current.totalOut);
    current.transactionCount += 1;
    if (transaction.reconciled !== true) {
      current.unreconciledAmount = roundMoney(current.unreconciledAmount + (transaction.direction === 'in' ? transaction.amount : -transaction.amount));
    }

    const movementDate = transaction.occurredAt || transaction.createdAt;
    if (!current.lastMovementAt || new Date(movementDate).getTime() > new Date(current.lastMovementAt).getTime()) {
      current.lastMovementAt = movementDate;
    }

    accounts.set(account.accountId, current);
  });

  return Array.from(accounts.values()).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
}

export function buildPaymentMethodSummary(transactions: FinancialTransaction[]): PaymentMethodSummary[] {
  const methods = new Map<string, PaymentMethodSummary>();

  transactions.forEach((transaction) => {
    const key = transaction.paymentMethod || 'other';
    const current = methods.get(key) || {
      paymentMethod: key,
      label: getPaymentMethodLabel(key),
      totalIn: 0,
      totalOut: 0,
      net: 0,
      transactionCount: 0,
    };

    if (transaction.direction === 'in') {
      current.totalIn = roundMoney(current.totalIn + transaction.amount);
    } else {
      current.totalOut = roundMoney(current.totalOut + transaction.amount);
    }
    current.net = roundMoney(current.totalIn - current.totalOut);
    current.transactionCount += 1;
    methods.set(key, current);
  });

  return Array.from(methods.values()).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

export function buildReconciliationSummary(transactions: FinancialTransaction[]): ReconciliationSummary {
  return transactions.reduce<ReconciliationSummary>((summary, transaction) => {
    if (transaction.reconciled === true) {
      summary.reconciledCount += 1;
      return summary;
    }

    summary.pendingCount += 1;
    if (transaction.direction === 'in') {
      summary.pendingIn = roundMoney(summary.pendingIn + transaction.amount);
    } else {
      summary.pendingOut = roundMoney(summary.pendingOut + transaction.amount);
    }
    summary.pendingNet = roundMoney(summary.pendingIn - summary.pendingOut);
    return summary;
  }, {
    pendingCount: 0,
    pendingIn: 0,
    pendingOut: 0,
    pendingNet: 0,
    reconciledCount: 0,
  });
}
