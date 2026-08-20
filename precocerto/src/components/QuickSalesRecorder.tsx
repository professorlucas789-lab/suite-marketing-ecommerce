/**
 * POS Sales Recorder
 * Operational sales screen with cart, internal receipt and stock control.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Minus, Plus, Printer, Receipt, Search, Trash2 } from 'lucide-react';
import { BusinessSettings, Product } from '../types';
import type { Customer } from '../types/customers';
import { PaymentMethod, SaleDocumentType, SaleReceipt, SaleTransactionInput } from '../types/sales';
import { recordSaleTransaction } from '../services/salesService';
import { useStore } from '../contexts/StoreContext';
import { formatKz } from '../utils';
import {
  calculateChangeDue,
  getDefaultSaleDocumentType,
  getSaleDocumentLabel,
  validatePaymentAmount,
} from '../utils/salesDocumentUtils';

interface QuickSalesRecorderProps {
  products: Product[];
  settings?: BusinessSettings | null;
  customers?: Customer[];
  onSuccess?: (receipt: SaleReceipt) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

interface CartItem {
  productId: string;
  productName: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  stockAvailable: number;
}

const getStock = (product: Product) => Number(product.quantidadeDisponivel ?? product.quantidade ?? 0);
const getPrice = (product: Product) =>
  Number(product.precoRecomendadoUnidadeVenda ?? product.precoVendaRecomendado ?? product.precoRetalho ?? 0);
const getCost = (product: Product) =>
  Number(product.custoRealUnidadeVenda ?? product.custoTotalReal ?? product.custoCompra ?? 0);

const paymentLabels: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  card: 'Cartao',
  transfer: 'Transferencia bancaria',
  multicaixa: 'Multicaixa',
  mobile_money: 'Carteira movel',
  credit: 'Credito',
  cheque: 'Cheque',
  other: 'Outro',
};

function printReceipt(receipt: SaleReceipt) {
  const lines = receipt.items.map((item) => `
    <tr>
      <td>${item.productName}</td>
      <td style="text-align:right">${item.quantity}</td>
      <td style="text-align:right">${formatKz(item.unitPrice)}</td>
      <td style="text-align:right">${formatKz(item.totalPrice)}</td>
    </tr>
  `).join('');

  const html = `
    <!doctype html>
    <html>
      <head>
        <title>${receipt.receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; width: 360px; margin: 24px auto; color: #111827; }
          h1 { font-size: 19px; margin: 0 0 4px; }
          .muted { color: #6b7280; font-size: 12px; }
          .section { border-top: 1px solid #e5e7eb; margin-top: 12px; padding-top: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { padding: 6px 0; border-bottom: 1px dashed #e5e7eb; }
          .row { display: flex; justify-content: space-between; gap: 16px; font-size: 12px; margin: 4px 0; }
          .total { font-size: 18px; font-weight: 700; display: flex; justify-content: space-between; margin-top: 8px; }
          .notice { font-size: 11px; color: #6b7280; margin-top: 12px; line-height: 1.4; }
          .stamp { border: 1px solid #111827; display: inline-block; padding: 4px 8px; font-size: 11px; font-weight: 700; margin-top: 8px; }
        </style>
      </head>
      <body>
        <h1>${receipt.storeName || 'PrecoCerto'}</h1>
        <div class="stamp">${getSaleDocumentLabel(receipt.documentType)}</div>
        <div class="muted">Documento: ${receipt.receiptNumber}</div>
        <div class="muted">Emissão: ${receipt.date} ${receipt.time}</div>
        <div class="section">
          <div class="muted">Cliente: ${receipt.customerName || 'Consumidor final'}</div>
          <div class="muted">NIF: ${receipt.customerNif || 'N/A'}</div>
          <div class="muted">Telefone: ${receipt.customerPhone || 'N/A'}</div>
          <div class="muted">Pagamento: ${paymentLabels[receipt.paymentMethod]}</div>
          <div class="muted">Operador: ${receipt.userName || 'N/A'}</div>
        </div>
        <div class="section">
          <table>
            <thead>
              <tr><th style="text-align:left">Produto</th><th>Qtd</th><th>Preco</th><th>Total</th></tr>
            </thead>
            <tbody>${lines}</tbody>
          </table>
        </div>
        <div class="section">
          <div class="row"><span>Subtotal</span><strong>${formatKz(receipt.subtotal)}</strong></div>
          <div class="row"><span>Valor pago</span><strong>${formatKz(receipt.amountPaid ?? receipt.subtotal)}</strong></div>
          <div class="row"><span>Troco</span><strong>${formatKz(receipt.changeDue || 0)}</strong></div>
          <div class="total"><span>Total</span><span>${formatKz(receipt.subtotal)}</span></div>
        </div>
        <p class="notice">
          Documento interno de controlo comercial e estoque. Validar requisitos fiscais no sistema/portal autorizado da AGT antes de usar como documento fiscal oficial.
        </p>
        <script>window.print();</script>
      </body>
    </html>
  `;

  const win = window.open('', '_blank', 'width=420,height=720');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

export const QuickSalesRecorder: React.FC<QuickSalesRecorderProps> = ({
  products,
  settings,
  customers = [],
  onSuccess,
  onError,
}) => {
  const { currentStore, currentUser } = useStore();
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerNif, setCustomerNif] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [documentType, setDocumentType] = useState<SaleDocumentType>(getDefaultSaleDocumentType(settings));
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);

  const storeProducts = useMemo(() => {
    return products.filter((product) => {
      if (currentStore?.storeId && product.storeId && product.storeId !== currentStore.storeId) return false;
      return getStock(product) > 0;
    });
  }, [products, currentStore?.storeId]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return storeProducts.slice(0, 20);
    return storeProducts
      .filter((product) =>
        `${product.nome} ${product.categoria} ${product.fornecedor}`.toLowerCase().includes(term)
      )
      .slice(0, 20);
  }, [storeProducts, search]);

  const selectedProduct = storeProducts.find((product) => product.id === selectedProductId);
  const activeCustomers = useMemo(
    () => customers.filter((customer) => customer.status === 'active'),
    [customers]
  );
  const selectedCustomer = activeCustomers.find((customer) => customer.id === selectedCustomerId);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const cost = cart.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    const profit = subtotal - cost;
    const margin = subtotal > 0 ? (profit / subtotal) * 100 : 0;
    return { subtotal, cost, profit, margin };
  }, [cart]);

  useEffect(() => {
    setDocumentType(getDefaultSaleDocumentType(settings));
  }, [settings?.segmentConfig?.salesDocumentMode]);

  useEffect(() => {
    if (totals.subtotal > 0 && amountPaid === '') {
      setAmountPaid(totals.subtotal.toFixed(2));
    }
  }, [totals.subtotal, amountPaid]);

  useEffect(() => {
    if (!selectedCustomer) return;
    setCustomerName(selectedCustomer.name);
    setCustomerNif(selectedCustomer.nif || '');
    setCustomerPhone(selectedCustomer.phone || '');
  }, [selectedCustomer]);

  const amountPaidNumber = paymentMethod === 'credit'
    ? undefined
    : amountPaid.trim() === ''
      ? totals.subtotal
      : Number(amountPaid);
  const changeDue = calculateChangeDue(totals.subtotal, amountPaidNumber);

  const addToCart = () => {
    if (!selectedProduct?.id) return;
    setError('');

    const stockAvailable = getStock(selectedProduct);
    if (quantity <= 0) {
      setError('Informe uma quantidade valida.');
      return;
    }

    const existingQuantity = cart.find((item) => item.productId === selectedProduct.id)?.quantity || 0;
    if (existingQuantity + quantity > stockAvailable) {
      setError(`Stock insuficiente. Disponivel: ${stockAvailable}, no carrinho: ${existingQuantity}.`);
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.productId === selectedProduct.id);
      if (existing) {
        return current.map((item) =>
          item.productId === selectedProduct.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [
        ...current,
        {
          productId: selectedProduct.id!,
          productName: selectedProduct.nome,
          category: selectedProduct.categoria,
          quantity,
          unitPrice: getPrice(selectedProduct),
          unitCost: getCost(selectedProduct),
          stockAvailable,
        },
      ];
    });

    setSelectedProductId('');
    setQuantity(1);
    setSearch('');
  };

  const updateCartQuantity = (productId: string, nextQuantity: number) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.productId !== productId) return item;
          const bounded = Math.max(1, Math.min(nextQuantity, item.stockAvailable));
          return { ...item, quantity: bounded };
        })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((current) => current.filter((item) => item.productId !== productId));
  };

  const submitSale = async () => {
    setError('');

    if (!currentStore || !currentUser) {
      setError('Nao foi possivel identificar a loja ou o utilizador atual.');
      return;
    }

    if (cart.length === 0) {
      setError('Adicione produtos ao carrinho antes de finalizar.');
      return;
    }

    if (paymentMethod === 'credit' && !selectedCustomerId) {
      setError('Selecione um cliente cadastrado para venda a credito.');
      return;
    }

    const paymentError = paymentMethod === 'credit'
      ? null
      : validatePaymentAmount(totals.subtotal, amountPaidNumber);
    if (paymentError) {
      setError(paymentError);
      return;
    }

    try {
      setLoading(true);
      const input: SaleTransactionInput = {
        storeId: currentStore.storeId,
        storeName: currentStore.storeName,
        userId: currentUser.id,
        userName: currentUser.nome,
        customerId: selectedCustomerId || undefined,
        customerName,
        customerNif,
        customerPhone,
        paymentMethod,
        documentType,
        amountPaid: amountPaidNumber,
        notes,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      const result = await recordSaleTransaction(input);
      setReceipt(result);
      setCart([]);
      setSelectedCustomerId('');
      setCustomerName('');
      setCustomerNif('');
      setCustomerPhone('');
      setAmountPaid('');
      setNotes('');
      onSuccess?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao finalizar venda.';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  if (receipt) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Venda finalizada</h3>
              <p className="text-sm text-slate-500">{getSaleDocumentLabel(receipt.documentType)} {receipt.receiptNumber}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => printReceipt(receipt)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
            >
              <Printer size={16} /> Imprimir
            </button>
            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Nova venda
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="text-left px-3 py-2">Produto</th>
                <th className="text-right px-3 py-2">Qtd</th>
                <th className="text-right px-3 py-2">Preco</th>
                <th className="text-right px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item) => (
                <tr key={item.productId} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2">{item.productName}</td>
                  <td className="px-3 py-2 text-right">{item.quantity}</td>
                  <td className="px-3 py-2 text-right">{formatKz(item.unitPrice)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatKz(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-full max-w-sm space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Lucro estimado</span>
              <span className="font-semibold text-emerald-700">{formatKz(receipt.totalProfit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Valor pago</span>
              <span className="font-semibold">{formatKz(receipt.amountPaid ?? receipt.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Troco</span>
              <span className="font-semibold">{formatKz(receipt.changeDue || 0)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t border-slate-200 pt-2">
              <span>Total</span>
              <span>{formatKz(receipt.subtotal)}</span>
            </div>
            <p className="text-xs text-slate-500">
              Recibo interno para controlo comercial e estoque. Nao substitui documento fiscal oficial validado pela AGT.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6"
    >
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-slate-500" />
            <h3 className="font-bold text-slate-900 dark:text-white">Adicionar produto</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px_120px] gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Pesquisar produto</label>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome, categoria ou fornecedor"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Quantidade</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(parseFloat(event.target.value) || 1)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={addToCart}
                disabled={!selectedProduct}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-semibold"
              >
                <Plus size={16} /> Adicionar
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            {visibleProducts.map((product) => {
              const active = selectedProductId === product.id;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedProductId(product.id || '')}
                  className={`text-left p-3 rounded-lg border transition ${
                    active
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{product.nome}</p>
                      <p className="text-xs text-slate-500">{product.categoria || 'Sem categoria'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-slate-900">{formatKz(getPrice(product))}</p>
                      <p className="text-xs text-slate-500">Stock {getStock(product)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-slate-500" />
            <h3 className="font-bold text-slate-900 dark:text-white">Carrinho</h3>
          </div>

          {cart.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
              Sem produtos no carrinho
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.productId} className="grid grid-cols-[minmax(0,1fr)_112px_92px_36px] gap-3 items-center p-3 border border-slate-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{item.productName}</p>
                    <p className="text-xs text-slate-500">
                      {formatKz(item.unitPrice)} cada · stock apos venda {item.stockAvailable - item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                      className="p-1 border border-slate-300 rounded"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={item.stockAvailable}
                      value={item.quantity}
                      onChange={(event) => updateCartQuantity(item.productId, parseFloat(event.target.value) || 1)}
                      className="w-14 text-center px-2 py-1 border border-slate-300 rounded text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                      className="p-1 border border-slate-300 rounded"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="text-right font-mono text-sm font-bold">
                    {formatKz(item.quantity * item.unitPrice)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.productId)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-5 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Finalizar venda</h3>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Cliente cadastrado</label>
            <select
              value={selectedCustomerId}
              onChange={(event) => setSelectedCustomerId(event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">Consumidor final / venda sem conta</option>
              {activeCustomers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.currentBalance > 0 ? `- saldo ${formatKz(customer.currentBalance)}` : ''}
                </option>
              ))}
            </select>
            {paymentMethod === 'credit' && activeCustomers.length === 0 && (
              <p className="text-[11px] text-amber-700 mt-1">
                Cadastre clientes no menu Clientes antes de vender a credito.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Cliente</label>
            <input
              type="text"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Consumidor final"
              disabled={!!selectedCustomer}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">NIF</label>
            <input
              type="text"
              value={customerNif}
              onChange={(event) => setCustomerNif(event.target.value)}
              placeholder="Opcional"
              disabled={!!selectedCustomer}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone</label>
            <input
              type="text"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="Opcional"
              disabled={!!selectedCustomer}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          {selectedCustomer && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <div className="flex justify-between gap-3">
                <span>Saldo atual</span>
                <strong>{formatKz(selectedCustomer.currentBalance || 0)}</strong>
              </div>
              <div className="flex justify-between gap-3 mt-1">
                <span>Limite</span>
                <strong>{selectedCustomer.creditLimit > 0 ? formatKz(selectedCustomer.creditLimit) : 'Sem limite definido'}</strong>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Documento</label>
            <select
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value as SaleDocumentType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="internal_receipt">Recibo interno</option>
              <option value="internal_invoice_receipt">Fatura-recibo interna</option>
            </select>
            <p className="text-[11px] text-amber-700 mt-1">
              Documento interno; nao e emissao fiscal certificada pela AGT.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Valor pago</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountPaid}
              onChange={(event) => setAmountPaid(event.target.value)}
              disabled={paymentMethod === 'credit'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Pagamento</label>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              {Object.entries(paymentLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Observacoes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"
              placeholder="Opcional"
            />
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Custo</span>
              <span className="font-mono">{formatKz(totals.cost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Lucro estimado</span>
              <span className="font-mono text-emerald-700">{formatKz(totals.profit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Margem</span>
              <span className="font-mono">{totals.margin.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Troco</span>
              <span className="font-mono">{formatKz(changeDue)}</span>
            </div>
            <div className="flex justify-between text-xl font-black pt-2 border-t border-slate-200">
              <span>Total</span>
              <span>{formatKz(totals.subtotal)}</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={submitSale}
            disabled={loading || cart.length === 0}
            className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-bold"
          >
            {loading ? 'A finalizar venda...' : 'Finalizar e baixar estoque'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default QuickSalesRecorder;
