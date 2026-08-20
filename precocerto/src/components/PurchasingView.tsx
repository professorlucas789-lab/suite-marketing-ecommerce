import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ClipboardList, Edit3, PackagePlus, Plus, Save, Search, Truck, X } from 'lucide-react';
import type { Product } from '../types';
import type { PurchaseLineInput, PurchasePaymentStatus, Supplier } from '../types/purchasing';
import { useStore } from '../contexts/StoreContext';
import { useSuppliers } from '../hooks/useSuppliers';
import { createSupplier, recordPurchaseReceipt, updateSupplier } from '../services/purchasingService';
import { buildSupplierSummary, calculatePurchaseTotal } from '../utils/purchasingUtils';
import { getProductAvailableStock } from '../utils/stockUtils';
import { formatKz } from '../utils';

interface PurchasingViewProps {
  products: Product[];
  onNotification?: (message: string, type: 'success' | 'error') => void;
}

type SupplierFormState = {
  name: string;
  nif: string;
  phone: string;
  email: string;
  address: string;
  status: Supplier['status'];
  notes: string;
};

const emptySupplierForm: SupplierFormState = {
  name: '',
  nif: '',
  phone: '',
  email: '',
  address: '',
  status: 'active',
  notes: '',
};

const inputClass = 'w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

const paymentStatusLabels: Record<PurchasePaymentStatus, string> = {
  paid: 'Pago',
  partial: 'Parcial',
  unpaid: 'Por pagar',
};

export default function PurchasingView({ products, onNotification }: PurchasingViewProps) {
  const { currentStore, currentUser } = useStore();
  const { suppliers, activeSuppliers, loading, error } = useSuppliers(currentUser?.id, currentStore?.storeId);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>(emptySupplierForm);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentStatus, setPaymentStatus] = useState<PurchasePaymentStatus>('paid');
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState('transfer');
  const [amountPaid, setAmountPaid] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [lineQuantity, setLineQuantity] = useState('1');
  const [lineUnitCost, setLineUnitCost] = useState('');
  const [lines, setLines] = useState<PurchaseLineInput[]>([]);
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => buildSupplierSummary(suppliers), [suppliers]);
  const filteredSuppliers = useMemo(() => {
    const term = supplierSearch.trim().toLowerCase();
    if (!term) return suppliers;
    return suppliers.filter((supplier) =>
      `${supplier.name} ${supplier.nif || ''} ${supplier.phone || ''}`.toLowerCase().includes(term)
    );
  }, [supplierSearch, suppliers]);

  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const totalAmount = useMemo(() => {
    try {
      return calculatePurchaseTotal(lines);
    } catch {
      return 0;
    }
  }, [lines]);

  const resetSupplierForm = () => {
    setSupplierForm(emptySupplierForm);
    setEditingSupplierId(null);
  };

  const editSupplier = (supplier: Supplier) => {
    setEditingSupplierId(supplier.id || null);
    setSupplierForm({
      name: supplier.name,
      nif: supplier.nif || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      status: supplier.status,
      notes: supplier.notes || '',
    });
  };

  const saveSupplier = async () => {
    if (!currentStore || !currentUser) {
      onNotification?.('Não foi possível identificar a loja ou utilizador atual.', 'error');
      return;
    }

    if (!supplierForm.name.trim()) {
      onNotification?.('Informe o nome do fornecedor.', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        storeId: currentStore.storeId,
        storeName: currentStore.storeName,
        userId: currentUser.id,
        name: supplierForm.name,
        nif: supplierForm.nif,
        phone: supplierForm.phone,
        email: supplierForm.email,
        address: supplierForm.address,
        status: supplierForm.status,
        notes: supplierForm.notes,
      };

      if (editingSupplierId) {
        await updateSupplier(editingSupplierId, payload);
        onNotification?.('Fornecedor atualizado.', 'success');
      } else {
        const newSupplierId = await createSupplier(payload);
        setSupplierId(newSupplierId);
        onNotification?.('Fornecedor cadastrado.', 'success');
      }

      resetSupplierForm();
    } catch (err) {
      onNotification?.(err instanceof Error ? err.message : 'Erro ao guardar fornecedor.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addLine = () => {
    if (!selectedProduct?.id) {
      onNotification?.('Selecione um produto.', 'error');
      return;
    }

    const quantity = Number(lineQuantity);
    const unitCost = Number(lineUnitCost);
    if (quantity <= 0 || unitCost <= 0) {
      onNotification?.('Informe quantidade e custo unitário maiores que zero.', 'error');
      return;
    }

    setLines((current) => {
      const existing = current.find((line) => line.productId === selectedProduct.id);
      if (existing) {
        return current.map((line) =>
          line.productId === selectedProduct.id
            ? {
                ...line,
                quantity: line.quantity + quantity,
                unitCost,
              }
            : line
        );
      }

      return [...current, { productId: selectedProduct.id!, quantity, unitCost }];
    });
    setSelectedProductId('');
    setLineQuantity('1');
    setLineUnitCost('');
  };

  const submitPurchase = async () => {
    if (!currentStore || !currentUser) {
      onNotification?.('Não foi possível identificar a loja ou utilizador atual.', 'error');
      return;
    }

    try {
      setSaving(true);
      const receipt = await recordPurchaseReceipt({
        storeId: currentStore.storeId,
        storeName: currentStore.storeName,
        userId: currentUser.id,
        userName: currentUser.nome,
        supplierId,
        invoiceNumber,
        invoiceDate,
        paymentStatus,
        paymentMethod: purchasePaymentMethod,
        amountPaid: amountPaid ? Number(amountPaid) : undefined,
        notes: purchaseNotes,
        lines,
      });

      onNotification?.(`Compra registada: ${receipt.receiptNumber}`, 'success');
      setInvoiceNumber('');
      setInvoiceDate(new Date().toISOString().slice(0, 10));
      setPaymentStatus('paid');
      setPurchasePaymentMethod('transfer');
      setAmountPaid('');
      setPurchaseNotes('');
      setLines([]);
    } catch (err) {
      onNotification?.(err instanceof Error ? err.message : 'Erro ao registar compra.', 'error');
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
              <Truck className="w-6 h-6 text-emerald-600" />
              Fornecedores & Compras
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Registe fornecedores, receba mercadoria, atualize custo médio e aumente stock da loja.
            </p>
          </div>
          <div className="text-sm text-slate-500">
            Loja: <strong className="text-slate-900 dark:text-white">{currentStore?.storeName || 'N/A'}</strong>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <SummaryCard label="Fornecedores" value={summary.totalSuppliers} />
        <SummaryCard label="Ativos" value={summary.activeSuppliers} />
        <SummaryCard label="Com dívida" value={summary.suppliersWithDebt} />
        <SummaryCard label="A pagar" value={formatKz(summary.totalPayable)} emphasis />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-6">
        <section className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus size={16} />
              {editingSupplierId ? 'Editar fornecedor' : 'Novo fornecedor'}
            </h2>
            {editingSupplierId && (
              <button type="button" onClick={resetSupplierForm} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={16} />
              </button>
            )}
          </div>

          <Field label="Nome">
            <input value={supplierForm.name} onChange={(event) => setSupplierForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="NIF">
              <input value={supplierForm.nif} onChange={(event) => setSupplierForm((current) => ({ ...current, nif: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="Telefone">
              <input value={supplierForm.phone} onChange={(event) => setSupplierForm((current) => ({ ...current, phone: event.target.value }))} className={inputClass} />
            </Field>
          </div>
          <Field label="Email">
            <input value={supplierForm.email} onChange={(event) => setSupplierForm((current) => ({ ...current, email: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Endereço">
            <input value={supplierForm.address} onChange={(event) => setSupplierForm((current) => ({ ...current, address: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Estado">
            <select value={supplierForm.status} onChange={(event) => setSupplierForm((current) => ({ ...current, status: event.target.value as Supplier['status'] }))} className={inputClass}>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </Field>
          <Field label="Observações">
            <textarea rows={2} value={supplierForm.notes} onChange={(event) => setSupplierForm((current) => ({ ...current, notes: event.target.value }))} className={`${inputClass} resize-none`} />
          </Field>
          <button
            type="button"
            onClick={saveSupplier}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-bold"
          >
            <Save size={16} />
            {saving ? 'A guardar...' : 'Guardar fornecedor'}
          </button>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-5 space-y-5">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PackagePlus size={17} />
              Registar compra e entrada de stock
            </h2>
            <p className="text-xs text-slate-500 mt-1">Selecione produtos já cadastrados para atualizar stock e custo médio.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <Field label="Fornecedor">
              <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className={inputClass}>
                <option value="">Selecionar</option>
                {activeSuppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Nº da fatura">
              <input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} className={inputClass} />
            </Field>
            <Field label="Data da fatura">
              <input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} className={inputClass} />
            </Field>
            <Field label="Pagamento">
              <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PurchasePaymentStatus)} className={inputClass}>
                {Object.entries(paymentStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
          </div>

          {paymentStatus !== 'unpaid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Forma de pagamento">
                <select value={purchasePaymentMethod} onChange={(event) => setPurchasePaymentMethod(event.target.value)} className={inputClass}>
                  <option value="cash">Dinheiro</option>
                  <option value="multicaixa">Multicaixa</option>
                  <option value="transfer">Transferência</option>
                  <option value="card">Cartão</option>
                  <option value="other">Outro</option>
                </select>
              </Field>
              {paymentStatus === 'partial' && (
                <Field label="Valor pago">
                  <input type="number" min="0" step="0.01" value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} className={inputClass} />
                </Field>
              )}
            </div>
          )}

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_110px_150px_110px] gap-3">
              <Field label="Produto">
                <select
                  value={selectedProductId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    const product = products.find((item) => item.id === nextId);
                    setSelectedProductId(nextId);
                    setLineUnitCost(
                      product
                        ? String(product.custoRealUnidadeVenda ?? product.custoTotalReal ?? product.custoCompra ?? '')
                        : ''
                    );
                  }}
                  className={inputClass}
                >
                  <option value="">Selecionar produto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.nome} · stock {getProductAvailableStock(product)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Qtd">
                <input type="number" min="0.01" step="0.01" value={lineQuantity} onChange={(event) => setLineQuantity(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Custo unitário">
                <input type="number" min="0.01" step="0.01" value={lineUnitCost} onChange={(event) => setLineUnitCost(event.target.value)} className={inputClass} />
              </Field>
              <div className="flex items-end">
                <button type="button" onClick={addLine} className="w-full px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800">
                  Adicionar
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Produto</th>
                  <th className="px-4 py-3 text-right">Qtd</th>
                  <th className="px-4 py-3 text-right">Custo</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lines.map((line) => {
                  const product = products.find((item) => item.id === line.productId);
                  return (
                    <tr key={line.productId}>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{product?.nome || line.productId}</td>
                      <td className="px-4 py-3 text-right font-mono">{line.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatKz(line.unitCost)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{formatKz(line.quantity * line.unitCost)}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => setLines((current) => current.filter((item) => item.productId !== line.productId))} className="p-2 rounded-lg text-red-600 hover:bg-red-50">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                      Nenhum produto adicionado à compra.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Field label="Observações">
            <textarea rows={2} value={purchaseNotes} onChange={(event) => setPurchaseNotes(event.target.value)} className={`${inputClass} resize-none`} />
          </Field>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-t border-slate-200 dark:border-slate-700 pt-4">
            <div>
              <p className="text-xs text-slate-500">Total da compra</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{formatKz(totalAmount)}</p>
            </div>
            <button
              type="button"
              onClick={submitPurchase}
              disabled={saving || lines.length === 0}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-bold flex items-center justify-center gap-2"
            >
              <ClipboardList size={17} />
              {saving ? 'A registar...' : 'Registar compra'}
            </button>
          </div>
        </section>
      </div>

      <section className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="font-bold text-slate-900 dark:text-white">Lista de fornecedores</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={supplierSearch}
              onChange={(event) => setSupplierSearch(event.target.value)}
              className="pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm w-full md:w-72"
              placeholder="Pesquisar fornecedor"
            />
          </div>
        </div>
        {error && <div className="m-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">A carregar fornecedores...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">Nenhum fornecedor cadastrado nesta loja.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredSuppliers.map((supplier) => (
              <div key={supplier.id} className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">{supplier.name}</h3>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${supplier.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {supplier.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{supplier.phone || 'Sem telefone'} · NIF {supplier.nif || 'N/A'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">A pagar</p>
                    <p className={`font-mono font-bold ${supplier.currentPayable > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatKz(supplier.currentPayable || 0)}</p>
                  </div>
                  <button type="button" onClick={() => editSupplier(supplier)} className="p-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">
                    <Edit3 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

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
