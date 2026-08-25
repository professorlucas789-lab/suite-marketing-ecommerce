/**
 * SalesHistory Component
 * Histórico operacional por recibo, com reimpressão e anulação.
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Filter,
  Printer,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { Sale } from '../types/sales';
import { cancelSaleByReceipt } from '../services/salesService';
import { useSalesAnalytics } from '../hooks/useSalesAnalytics';
import { useStore } from '../contexts/StoreContext';
import { formatKz } from '../utils';

interface SalesHistoryProps {
  products?: any[];
}

interface ReceiptGroup {
  receiptNumber: string;
  items: Sale[];
  status: 'completed' | 'cancelled';
  timestamp: string;
  date: string;
  time: string;
  storeName?: string;
  customerName?: string;
  customerNif?: string;
  customerPhone?: string;
  paymentMethod?: string;
  documentType?: string;
  userName?: string;
  subtotal: number;
  amountPaid?: number;
  changeDue?: number;
  totalCost: number;
  totalProfit: number;
  totalUnits: number;
  profitMargin: number;
  cancelledAt?: string;
  cancellationReason?: string;
}

const paymentLabels: Record<string, string> = {
  cash: 'Dinheiro',
  card: 'Cartão',
  transfer: 'Transferência',
  multicaixa: 'Multicaixa',
  mobile_money: 'Carteira móvel',
  credit: 'Crédito',
  cheque: 'Cheque',
  other: 'Outro',
};

const documentLabels: Record<string, string> = {
  internal_receipt: 'Recibo interno',
  internal_invoice_receipt: 'Fatura-recibo interna',
};

function buildReceiptGroups(sales: Sale[]): ReceiptGroup[] {
  const map = new Map<string, Sale[]>();

  sales.forEach((sale) => {
    const key = sale.receiptNumber || sale.id;
    const current = map.get(key) || [];
    current.push(sale);
    map.set(key, current);
  });

  return Array.from(map.entries())
    .map(([receiptNumber, items]) => {
      const first = items[0];
      const subtotal = items.reduce((sum, sale) => sum + (sale.totalPrice || 0), 0);
      const totalCost = items.reduce((sum, sale) => sum + (sale.totalCost || sale.costTotal || 0), 0);
      const totalProfit = items.reduce((sum, sale) => sum + (sale.totalProfit || sale.profitTotal || 0), 0);
      const totalUnits = items.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
      const activeLines = items.filter((sale) => sale.status !== 'cancelled');

      return {
        receiptNumber,
        items,
        status: activeLines.length === 0 ? 'cancelled' : 'completed',
        timestamp: first.timestamp,
        date: first.date,
        time: first.time,
        storeName: first.storeName,
        customerName: first.customerName,
        customerNif: first.customerNif,
        customerPhone: first.customerPhone,
        paymentMethod: first.paymentMethod,
        documentType: first.documentType,
        userName: first.userName,
        subtotal,
        amountPaid: first.amountPaid,
        changeDue: first.changeDue,
        totalCost,
        totalProfit,
        totalUnits,
        profitMargin: subtotal > 0 ? (totalProfit / subtotal) * 100 : 0,
        cancelledAt: first.cancelledAt,
        cancellationReason: first.cancellationReason,
      } satisfies ReceiptGroup;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function printReceipt(receipt: ReceiptGroup) {
  const rows = receipt.items.map((item) => `
    <tr>
      <td>${item.productName}</td>
      <td style="text-align:right">${item.quantity}</td>
      <td style="text-align:right">${formatKz(item.unitPrice || 0)}</td>
      <td style="text-align:right">${formatKz(item.totalPrice || 0)}</td>
    </tr>
  `).join('');

  const html = `
    <!doctype html>
    <html>
      <head>
        <title>${receipt.receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; width: 360px; margin: 24px auto; color: #111827; }
          h1 { font-size: 18px; margin: 0 0 4px; }
          .muted { color: #6b7280; font-size: 12px; }
          .section { border-top: 1px solid #e5e7eb; margin-top: 12px; padding-top: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { padding: 6px 0; border-bottom: 1px dashed #e5e7eb; }
          .total { font-size: 18px; font-weight: 700; display: flex; justify-content: space-between; }
          .cancelled { color: #b91c1c; font-weight: 700; margin-top: 8px; }
          .notice { font-size: 11px; color: #6b7280; margin-top: 12px; line-height: 1.4; }
        </style>
      </head>
      <body>
        <h1>${receipt.storeName || 'PreçoCerto'}</h1>
        <div class="muted">${documentLabels[receipt.documentType || 'internal_receipt'] || 'Documento interno'}</div>
        <div class="muted">Documento: ${receipt.receiptNumber}</div>
        <div class="muted">Data: ${receipt.date} ${receipt.time}</div>
        ${receipt.status === 'cancelled' ? '<div class="cancelled">ANULADO</div>' : ''}
        <div class="section">
          <div class="muted">Cliente: ${receipt.customerName || 'Consumidor final'}</div>
          <div class="muted">NIF: ${receipt.customerNif || 'N/A'}</div>
          <div class="muted">Telefone: ${receipt.customerPhone || 'N/A'}</div>
          <div class="muted">Pagamento: ${paymentLabels[receipt.paymentMethod || 'other'] || 'Outro'}</div>
          <div class="muted">Operador: ${receipt.userName || 'N/A'}</div>
        </div>
        <div class="section">
          <table>
            <thead>
              <tr><th style="text-align:left">Produto</th><th>Qtd</th><th>Preço</th><th>Total</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="section total">
          <span>Total</span>
          <span>${formatKz(receipt.subtotal)}</span>
        </div>
        <div class="muted">Valor pago: ${formatKz(receipt.amountPaid ?? receipt.subtotal)} · Troco: ${formatKz(receipt.changeDue || 0)}</div>
        <p class="notice">
          Documento interno de controlo comercial e estoque. Validar requisitos fiscais no sistema/portal autorizado da AGT antes de usar como documento fiscal oficial.
        </p>
        <script>window.print();</script>
      </body>
    </html>
  `;

  const win = window.open('', '_blank', 'width=440,height=760');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

export const SalesHistory: React.FC<SalesHistoryProps> = () => {
  const { currentStore, currentUser } = useStore();
  const { salesHistory, loading, fetchHistory } = useSalesAnalytics();
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set());
  const [cancelTarget, setCancelTarget] = useState<ReceiptGroup | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [filters, setFilters] = useState({
    searchText: '',
    fromDate: '',
    toDate: '',
    paymentMethod: '',
    status: '',
  });

  React.useEffect(() => {
    if (currentStore) {
      fetchHistory(currentStore.storeId, { limit: 500 });
    }
  }, [currentStore?.storeId]);

  const receiptGroups = useMemo(() => buildReceiptGroups(salesHistory), [salesHistory]);

  const filteredReceipts = useMemo(() => {
    return receiptGroups.filter((receipt) => {
      const searchLower = filters.searchText.trim().toLowerCase();
      if (searchLower) {
        const productText = receipt.items.map((item) => item.productName).join(' ').toLowerCase();
        const receiptText = `${receipt.receiptNumber} ${receipt.customerName || ''} ${receipt.customerNif || ''}`.toLowerCase();
        if (!productText.includes(searchLower) && !receiptText.includes(searchLower)) return false;
      }

      if (filters.fromDate && new Date(receipt.timestamp) < new Date(filters.fromDate)) return false;
      if (filters.toDate && new Date(receipt.timestamp) > new Date(`${filters.toDate}T23:59:59`)) return false;
      if (filters.paymentMethod && receipt.paymentMethod !== filters.paymentMethod) return false;
      if (filters.status && receipt.status !== filters.status) return false;

      return true;
    });
  }, [receiptGroups, filters]);

  const summary = useMemo(() => {
    const completed = filteredReceipts.filter((receipt) => receipt.status !== 'cancelled');
    const revenue = completed.reduce((sum, receipt) => sum + receipt.subtotal, 0);
    const profit = completed.reduce((sum, receipt) => sum + receipt.totalProfit, 0);
    return {
      totalReceipts: filteredReceipts.length,
      cancelledReceipts: filteredReceipts.length - completed.length,
      totalRevenue: revenue,
      totalProfit: profit,
      totalUnits: completed.reduce((sum, receipt) => sum + receipt.totalUnits, 0),
      avgMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
    };
  }, [filteredReceipts]);

  const toggleExpanded = (receiptNumber: string) => {
    setExpandedReceipts((current) => {
      const next = new Set(current);
      if (next.has(receiptNumber)) next.delete(receiptNumber);
      else next.add(receiptNumber);
      return next;
    });
  };

  const handleCancelReceipt = async () => {
    if (!cancelTarget || !currentStore) return;

    try {
      setActionLoading(true);
      setActionError('');
      await cancelSaleByReceipt(cancelTarget.receiptNumber, {
        cancelledBy: currentUser?.id,
        cancelledByName: currentUser?.nome || currentUser?.email,
        reason: cancelReason,
      });
      setCancelTarget(null);
      setCancelReason('');
      await fetchHistory(currentStore.storeId, { limit: 500 });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao anular recibo.');
    } finally {
      setActionLoading(false);
    }
  };

  const getMarginColor = (margin: number) => {
    if (margin < 10) return 'text-red-600 dark:text-red-400';
    if (margin < 20) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Produto, recibo ou cliente..."
              value={filters.searchText}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchText: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filters.paymentMethod}
            onChange={(e) => setFilters((prev) => ({ ...prev, paymentMethod: e.target.value }))}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os pagamentos</option>
            <option value="cash">Dinheiro</option>
            <option value="card">Cartão</option>
            <option value="transfer">Transferência</option>
            <option value="multicaixa">Multicaixa</option>
            <option value="mobile_money">Carteira móvel</option>
            <option value="credit">Crédito</option>
            <option value="cheque">Cheque</option>
            <option value="other">Outro</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os estados</option>
            <option value="completed">Concluídos</option>
            <option value="cancelled">Anulados</option>
          </select>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">RECIBOS</p>
          <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{summary.totalReceipts}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">RECEITA ATIVA</p>
          <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">{formatKz(summary.totalRevenue)}</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">LUCRO ATIVO</p>
          <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{formatKz(summary.totalProfit)}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">UNIDADES</p>
          <p className="text-lg font-bold text-orange-900 dark:text-orange-100">{summary.totalUnits}</p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">MARGEM MÉD.</p>
          <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">{summary.avgMargin.toFixed(1)}%</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">ANULADOS</p>
          <p className="text-lg font-bold text-red-900 dark:text-red-100">{summary.cancelledReceipts}</p>
        </div>
      </motion.div>

      {actionError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-slate-500 dark:text-slate-400">Carregando histórico...</p>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
            <p>Nenhum recibo encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white">Recibo</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white">Cliente</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">Itens</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">Total</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">Margem</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((receipt, idx) => {
                  const isExpanded = expandedReceipts.has(receipt.receiptNumber);
                  return (
                    <React.Fragment key={receipt.receiptNumber}>
                      <motion.tr
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.01 }}
                        className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => toggleExpanded(receipt.receiptNumber)} className="flex items-center gap-2 text-left">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <span>
                              <span className="block font-semibold text-slate-900 dark:text-white">{receipt.receiptNumber}</span>
                              <span className="block text-xs text-slate-500">
                                {new Date(receipt.timestamp).toLocaleDateString('pt-PT')}{' '}
                                {new Date(receipt.timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          <span className="block font-medium">{receipt.customerName || 'Consumidor final'}</span>
                          <span className="block text-xs text-slate-500">{receipt.customerNif || 'NIF não informado'}</span>
                          {receipt.customerPhone && (
                            <span className="block text-xs text-slate-500">{receipt.customerPhone}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-900 dark:text-white">
                          {receipt.items.length} linhas / {receipt.totalUnits} un.
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">{formatKz(receipt.subtotal)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${getMarginColor(receipt.profitMargin)}`}>
                          {receipt.profitMargin.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                            receipt.status === 'cancelled'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          }`}>
                            {receipt.status === 'cancelled' ? 'Anulado' : 'Concluído'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => printReceipt(receipt)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <Printer size={14} /> Imprimir
                            </button>
                            {receipt.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActionError('');
                                  setCancelTarget(receipt);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/20"
                              >
                                <RotateCcw size={14} /> Anular
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/70 dark:bg-slate-800/50">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                              <table className="w-full text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Produto</th>
                                    <th className="px-3 py-2 text-right">Qtd</th>
                                    <th className="px-3 py-2 text-right">Preço</th>
                                    <th className="px-3 py-2 text-right">Custo</th>
                                    <th className="px-3 py-2 text-right">Lucro</th>
                                    <th className="px-3 py-2 text-right">Stock</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {receipt.items.map((item) => (
                                    <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                                      <td className="px-3 py-2 font-medium">{item.productName}</td>
                                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                                      <td className="px-3 py-2 text-right">{formatKz(item.totalPrice || 0)}</td>
                                      <td className="px-3 py-2 text-right">{formatKz(item.totalCost || item.costTotal || 0)}</td>
                                      <td className="px-3 py-2 text-right text-emerald-700">{formatKz(item.totalProfit || item.profitTotal || 0)}</td>
                                      <td className="px-3 py-2 text-right">{item.stockBefore ?? '-'} → {item.stockAfter ?? '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {receipt.status === 'cancelled' && (
                                <div className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                                  Anulado em {receipt.cancelledAt ? new Date(receipt.cancelledAt).toLocaleString('pt-PT') : 'data não registada'}.
                                  {receipt.cancellationReason ? ` Motivo: ${receipt.cancellationReason}` : ''}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Anular recibo</h3>
                <p className="text-sm text-slate-500">Esta ação repõe o estoque dos produtos vendidos.</p>
              </div>
              <button type="button" onClick={() => setCancelTarget(null)} className="rounded-lg p-1 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Vai anular o recibo <strong>{cancelTarget.receiptNumber}</strong> no valor de <strong>{formatKz(cancelTarget.subtotal)}</strong>.
            </div>

            <label className="mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Motivo da anulação
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                placeholder="Ex.: erro no produto, devolução, venda registada em duplicado..."
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCancelReceipt}
                disabled={actionLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {actionLoading ? 'A anular...' : 'Confirmar anulação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SalesHistory;
