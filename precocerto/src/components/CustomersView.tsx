import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CreditCard, Pencil, Plus, ReceiptText, Save, Search, UserRound, X } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useCustomers } from '../hooks/useCustomers';
import type { Customer } from '../types/customers';
import { createCustomer, recordCustomerPayment, updateCustomer } from '../services/customerService';
import { buildCustomerSummary } from '../utils/customerLedgerUtils';
import { formatKz } from '../utils';

interface CustomersViewProps {
  onNotification?: (message: string, type: 'success' | 'error') => void;
}

type CustomerFormState = {
  name: string;
  nif: string;
  phone: string;
  email: string;
  address: string;
  creditLimit: string;
  status: Customer['status'];
  notes: string;
};

const emptyForm: CustomerFormState = {
  name: '',
  nif: '',
  phone: '',
  email: '',
  address: '',
  creditLimit: '',
  status: 'active',
  notes: '',
};

const paymentMethods = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'multicaixa', label: 'Multicaixa' },
  { value: 'transfer', label: 'Transferência' },
  { value: 'card', label: 'Cartão' },
  { value: 'other', label: 'Outro' },
];

const inputClass = 'w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

export const CustomersView: React.FC<CustomersViewProps> = ({ onNotification }) => {
  const { currentStore, currentUser } = useStore();
  const { customers, loading, error } = useCustomers(currentUser?.id, currentStore?.storeId);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<CustomerFormState>(emptyForm);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => buildCustomerSummary(customers), [customers]);
  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) =>
      `${customer.name} ${customer.nif || ''} ${customer.phone || ''}`.toLowerCase().includes(term)
    );
  }, [customers, search]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingCustomerId(null);
  };

  const editCustomer = (customer: Customer) => {
    setEditingCustomerId(customer.id || null);
    setForm({
      name: customer.name,
      nif: customer.nif || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      creditLimit: customer.creditLimit ? String(customer.creditLimit) : '',
      status: customer.status,
      notes: customer.notes || '',
    });
  };

  const saveCustomer = async () => {
    if (!currentStore || !currentUser) {
      onNotification?.('Não foi possível identificar a loja ou utilizador atual.', 'error');
      return;
    }

    if (!form.name.trim()) {
      onNotification?.('Informe o nome do cliente.', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        storeId: currentStore.storeId,
        storeName: currentStore.storeName,
        userId: currentUser.id,
        name: form.name,
        nif: form.nif,
        phone: form.phone,
        email: form.email,
        address: form.address,
        creditLimit: Number(form.creditLimit || 0),
        status: form.status,
        notes: form.notes,
      };

      if (editingCustomerId) {
        await updateCustomer(editingCustomerId, payload);
        onNotification?.('Cliente atualizado.', 'success');
      } else {
        await createCustomer(payload);
        onNotification?.('Cliente cadastrado.', 'success');
      }

      resetForm();
    } catch (err) {
      onNotification?.(err instanceof Error ? err.message : 'Erro ao salvar cliente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitPayment = async () => {
    if (!paymentCustomer || !currentStore || !currentUser) return;

    try {
      setSaving(true);
      await recordCustomerPayment({
        customerId: paymentCustomer.id || '',
        storeId: currentStore.storeId,
        storeName: currentStore.storeName,
        userId: currentUser.id,
        userName: currentUser.nome,
        amount: Number(paymentAmount || 0),
        paymentMethod,
        notes: paymentNotes,
      });
      onNotification?.('Pagamento registado na conta corrente.', 'success');
      setPaymentCustomer(null);
      setPaymentAmount('');
      setPaymentNotes('');
    } catch (err) {
      onNotification?.(err instanceof Error ? err.message : 'Erro ao registar pagamento.', 'error');
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
              <UserRound className="w-6 h-6 text-emerald-600" />
              Clientes e Contas Correntes
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Cadastro de clientes, venda a crédito e controlo de saldos por loja.
            </p>
          </div>
          <div className="text-sm text-slate-500">
            Loja: <strong className="text-slate-900 dark:text-white">{currentStore?.storeName || 'N/A'}</strong>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <SummaryCard label="Clientes" value={summary.totalCustomers} />
        <SummaryCard label="Ativos" value={summary.activeCustomers} />
        <SummaryCard label="Com saldo" value={summary.customersWithDebt} />
        <SummaryCard label="Saldo em aberto" value={formatKz(summary.totalBalance)} emphasis />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {editingCustomerId ? 'Editar cliente' : 'Novo cliente'}
            </h2>
            {editingCustomerId && (
              <button type="button" onClick={resetForm} className="p-2 rounded-lg hover:bg-slate-100">
                <X size={16} />
              </button>
            )}
          </div>

          <Field label="Nome">
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className={inputClass}
              placeholder="Nome do cliente"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="NIF">
              <input value={form.nif} onChange={(event) => setForm((current) => ({ ...current, nif: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="Telefone">
              <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={inputClass} />
            </Field>
          </div>

          <Field label="Email">
            <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={inputClass} />
          </Field>

          <Field label="Endereço">
            <input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className={inputClass} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Limite de crédito">
              <input
                type="number"
                min="0"
                value={form.creditLimit}
                onChange={(event) => setForm((current) => ({ ...current, creditLimit: event.target.value }))}
                className={inputClass}
                placeholder="0 = sem limite"
              />
            </Field>
            <Field label="Estado">
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Customer['status'] }))} className={inputClass}>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </Field>
          </div>

          <Field label="Observações">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              className={`${inputClass} resize-none`}
            />
          </Field>

          <button
            type="button"
            onClick={saveCustomer}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-bold"
          >
            <Save size={16} />
            {saving ? 'A guardar...' : 'Guardar cliente'}
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h2 className="font-bold text-slate-900 dark:text-white">Lista de clientes</h2>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm w-full md:w-72"
                placeholder="Pesquisar cliente"
              />
            </div>
          </div>

          {error && <div className="m-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">A carregar clientes...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">Nenhum cliente cadastrado nesta loja.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white truncate">{customer.name}</h3>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${customer.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {customer.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {customer.phone || 'Sem telefone'} · NIF {customer.nif || 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Limite: {customer.creditLimit > 0 ? formatKz(customer.creditLimit) : 'Sem limite definido'}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-slate-500">Saldo em aberto</p>
                      <p className={`font-mono font-bold ${customer.currentBalance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                        {formatKz(customer.currentBalance || 0)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentCustomer(customer);
                          setPaymentAmount(String(customer.currentBalance || ''));
                        }}
                        disabled={(customer.currentBalance || 0) <= 0}
                        className="p-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                        title="Registar pagamento"
                      >
                        <CreditCard size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => editCustomer(customer)}
                        className="p-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                        title="Editar cliente"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {paymentCustomer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-emerald-600" />
                Pagamento de cliente
              </h2>
              <button type="button" onClick={() => setPaymentCustomer(null)} className="p-2 rounded-lg hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">{paymentCustomer.name}</p>
              <p className="text-slate-500">Saldo atual: {formatKz(paymentCustomer.currentBalance || 0)}</p>
            </div>

            <Field label="Valor recebido">
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Forma de pagamento">
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className={inputClass}>
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Observações">
              <textarea rows={2} value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value)} className={`${inputClass} resize-none`} />
            </Field>

            <button
              type="button"
              onClick={submitPayment}
              disabled={saving}
              className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-bold"
            >
              {saving ? 'A registar...' : 'Registar pagamento'}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

function SummaryCard({ label, value, emphasis }: { label: string; value: React.ReactNode; emphasis?: boolean }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl font-black mt-1 ${emphasis ? 'text-red-700' : 'text-slate-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

export default CustomersView;
