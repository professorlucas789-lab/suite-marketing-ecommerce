import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Banknote, CreditCard, Landmark, Plus, ReceiptText, Search, WalletCards } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useCustomers } from '../hooks/useCustomers';
import { useFinanceTransactions } from '../hooks/useFinanceTransactions';
import { useSuppliers } from '../hooks/useSuppliers';
import type { ExpenseCategory, FinancialTransaction } from '../types/finance';
import type { Supplier } from '../types/purchasing';
import { recordExpense, recordSupplierPayment } from '../services/financeService';
import { buildFinancialSummary, filterTransactionsByDate } from '../utils/financeUtils';
import { formatKz } from '../utils';

interface FinancialViewProps {
  onNotification?: (message: string, type: 'success' | 'error') => void;
}

const inputClass = 'w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

const paymentMethods = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'multicaixa', label: 'Multicaixa' },
  { value: 'transfer', label: 'Transferência' },
  { value: 'card', label: 'Cartão' },
  { value: 'mobile_money', label: 'Carteira móvel' },
  { value: 'other', label: 'Outro' },
];

const expenseCategories: Array<{ value: ExpenseCategory; label: string }> = [
  { value: 'rent', label: 'Renda' },
  { value: 'salary', label: 'Salários' },
  { value: 'utilities', label: 'Energia / água / internet' },
  { value: 'transport', label: 'Transporte' },
  { value: 'tax', label: 'Impostos / taxas' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'maintenance', label: 'Manutenção' },
  { value: 'bank_fee', label: 'Taxas bancárias' },
  { value: 'other', label: 'Outros' },
];

const transactionTypeLabels: Record<string, string> = {
  sale_income: 'Venda',
  customer_payment: 'Recebimento de cliente',
  purchase_payment: 'Pagamento de compra',
  supplier_payment: 'Pagamento a fornecedor',
  expense: 'Despesa',
  adjustment: 'Ajuste',
};

export default function FinancialView({ onNotification }: FinancialViewProps) {
  const { currentStore, currentUser } = useStore();
  const { customers } = useCustomers(currentUser?.id, currentStore?.storeId);
  const { suppliers } = useSuppliers(currentUser?.id, currentStore?.storeId);
  const { transactions, loading, error } = useFinanceTransactions(currentUser?.id, currentStore?.storeId);
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('other');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState('cash');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [supplierId, setSupplierId] = useState('');
  const [supplierPaymentAmount, setSupplierPaymentAmount] = useState('');
  const [supplierPaymentMethod, setSupplierPaymentMethod] = useState('transfer');
  const [supplierPaymentNotes, setSupplierPaymentNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredByDate = useMemo(
    () => filterTransactionsByDate(transactions, fromDate, toDate),
    [transactions, fromDate, toDate]
  );

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return filteredByDate;
    return filteredByDate.filter((transaction) =>
      `${transaction.description} ${transaction.partnerName || ''} ${transaction.paymentMethod}`.toLowerCase().includes(term)
    );
  }, [filteredByDate, search]);

  const receivables = useMemo(
    () => customers.reduce((sum, customer) => sum + (customer.currentBalance || 0), 0),
    [customers]
  );
  const payables = useMemo(
    () => suppliers.reduce((sum, supplier) => sum + (supplier.currentPayable || 0), 0),
    [suppliers]
  );
  const summary = useMemo(
    () => buildFinancialSummary(filteredByDate, receivables, payables),
    [filteredByDate, receivables, payables]
  );

  const payableSuppliers = suppliers.filter((supplier) => (supplier.currentPayable || 0) > 0);
  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId);

  const submitExpense = async () => {
    if (!currentStore || !currentUser) {
      onNotification?.('Não foi possível identificar a loja ou utilizador atual.', 'error');
      return;
    }

    try {
      setSaving(true);
      await recordExpense({
        storeId: currentStore.storeId,
        storeName: currentStore.storeName,
        userId: currentUser.id,
        userName: currentUser.nome,
        amount: Number(expenseAmount || 0),
        paymentMethod: expensePaymentMethod,
        category: expenseCategory,
        description: expenseDescription,
        occurredAt: `${expenseDate}T12:00:00.000Z`,
      });
      onNotification?.('Despesa registada.', 'success');
      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseCategory('other');
      setExpensePaymentMethod('cash');
      setExpenseDate(new Date().toISOString().slice(0, 10));
    } catch (err) {
      onNotification?.(err instanceof Error ? err.message : 'Erro ao registar despesa.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitSupplierPayment = async () => {
    if (!currentStore || !currentUser) {
      onNotification?.('Não foi possível identificar a loja ou utilizador atual.', 'error');
      return;
    }

    try {
      setSaving(true);
      await recordSupplierPayment({
        supplierId,
        storeId: currentStore.storeId,
        storeName: currentStore.storeName,
        userId: currentUser.id,
        userName: currentUser.nome,
        amount: Number(supplierPaymentAmount || 0),
        paymentMethod: supplierPaymentMethod,
        notes: supplierPaymentNotes,
      });
      onNotification?.('Pagamento ao fornecedor registado.', 'success');
      setSupplierId('');
      setSupplierPaymentAmount('');
      setSupplierPaymentMethod('transfer');
      setSupplierPaymentNotes('');
    } catch (err) {
      onNotification?.(err instanceof Error ? err.message : 'Erro ao pagar fornecedor.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <WalletCards className="w-6 h-6 text-emerald-600" />
              Financeiro Operacional
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Caixa, banco, contas a receber, contas a pagar e despesas da loja.
            </p>
          </div>
          <div className="text-sm text-slate-500">
            Loja: <strong className="text-slate-900 dark:text-white">{currentStore?.storeName || 'N/A'}</strong>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <SummaryCard label="Entradas" value={formatKz(summary.totalIn)} icon={Banknote} tone="green" />
        <SummaryCard label="Saídas" value={formatKz(summary.totalOut)} icon={CreditCard} tone="red" />
        <SummaryCard label="Fluxo líquido" value={formatKz(summary.netCashFlow)} icon={Landmark} tone={summary.netCashFlow >= 0 ? 'green' : 'red'} />
        <SummaryCard label="A receber" value={formatKz(summary.receivables)} icon={ReceiptText} tone="amber" />
        <SummaryCard label="A pagar" value={formatKz(summary.payables)} icon={CreditCard} tone="red" />
        <SummaryCard label="Saldo operacional" value={formatKz(summary.operationalBalance)} icon={WalletCards} tone={summary.operationalBalance >= 0 ? 'green' : 'red'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-5 space-y-4">
          <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Plus size={17} />
            Registar despesa
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Categoria">
              <select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value as ExpenseCategory)} className={inputClass}>
                {expenseCategories.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Data">
              <input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} className={inputClass} />
            </Field>
            <Field label="Valor">
              <input type="number" min="0" step="0.01" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} className={inputClass} />
            </Field>
            <Field label="Pagamento">
              <select value={expensePaymentMethod} onChange={(event) => setExpensePaymentMethod(event.target.value)} className={inputClass}>
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Descrição">
            <textarea rows={3} value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} className={`${inputClass} resize-none`} placeholder="Ex: renda, transporte, energia, salários..." />
          </Field>
          <button
            type="button"
            onClick={submitExpense}
            disabled={saving}
            className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-bold"
          >
            {saving ? 'A guardar...' : 'Guardar despesa'}
          </button>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-5 space-y-4">
          <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard size={17} />
            Pagar fornecedor
          </h2>
          <Field label="Fornecedor com saldo">
            <select
              value={supplierId}
              onChange={(event) => {
                const nextId = event.target.value;
                const supplier = suppliers.find((item) => item.id === nextId);
                setSupplierId(nextId);
                setSupplierPaymentAmount(supplier?.currentPayable ? String(supplier.currentPayable) : '');
              }}
              className={inputClass}
            >
              <option value="">Selecionar fornecedor</option>
              {payableSuppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} · {formatKz(supplier.currentPayable || 0)}
                </option>
              ))}
            </select>
          </Field>
          {selectedSupplier && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
              Saldo em aberto: <strong>{formatKz(selectedSupplier.currentPayable || 0)}</strong>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Valor pago">
              <input type="number" min="0" step="0.01" value={supplierPaymentAmount} onChange={(event) => setSupplierPaymentAmount(event.target.value)} className={inputClass} />
            </Field>
            <Field label="Forma de pagamento">
              <select value={supplierPaymentMethod} onChange={(event) => setSupplierPaymentMethod(event.target.value)} className={inputClass}>
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Observações">
            <textarea rows={3} value={supplierPaymentNotes} onChange={(event) => setSupplierPaymentNotes(event.target.value)} className={`${inputClass} resize-none`} />
          </Field>
          <button
            type="button"
            onClick={submitSupplierPayment}
            disabled={saving || !supplierId}
            className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-lg font-bold"
          >
            {saving ? 'A registar...' : 'Registar pagamento'}
          </button>
        </section>
      </div>

      <section className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <h2 className="font-bold text-slate-900 dark:text-white">Movimentos financeiros</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className={inputClass} />
              <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className={inputClass} />
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm w-full" placeholder="Pesquisar" />
              </div>
            </div>
          </div>
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">A carregar movimentos...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">Nenhum movimento financeiro neste período.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">Data</th>
                  <th className="px-5 py-3 text-left">Tipo</th>
                  <th className="px-5 py-3 text-left">Descrição</th>
                  <th className="px-5 py-3 text-left">Parceiro</th>
                  <th className="px-5 py-3 text-left">Pagamento</th>
                  <th className="px-5 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map((transaction) => (
                  <TransactionRow key={transaction.id || `${transaction.createdAt}-${transaction.amount}`} transaction={transaction} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'green' | 'red' | 'amber';
}) {
  const toneClass = tone === 'green'
    ? 'text-emerald-700 bg-emerald-50'
    : tone === 'red'
      ? 'text-red-700 bg-red-50'
      : 'text-amber-700 bg-amber-50';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{label}</p>
        <span className={`p-2 rounded-lg ${toneClass}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className="text-lg font-black mt-2 text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

const TransactionRow: React.FC<{ transaction: FinancialTransaction }> = ({ transaction }) => {
  const isIn = transaction.direction === 'in';
  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
      <td className="px-5 py-3 text-slate-500">{new Date(transaction.occurredAt || transaction.createdAt).toLocaleDateString('pt-AO')}</td>
      <td className="px-5 py-3">
        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${isIn ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {transactionTypeLabels[transaction.type] || transaction.type}
        </span>
      </td>
      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{transaction.description}</td>
      <td className="px-5 py-3 text-slate-500">{transaction.partnerName || 'N/A'}</td>
      <td className="px-5 py-3 text-slate-500">{transaction.paymentMethod}</td>
      <td className={`px-5 py-3 text-right font-mono font-bold ${isIn ? 'text-emerald-700' : 'text-red-700'}`}>
        {isIn ? '+' : '-'}{formatKz(transaction.amount)}
      </td>
    </tr>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
