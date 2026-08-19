/**
 * SalesCashClosing Component
 * Daily sales closing with payment breakdown and printable summary.
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Banknote, CalendarDays, CreditCard, Printer, ReceiptText, RotateCcw, Wallet } from 'lucide-react';
import { PaymentMethod, Sale } from '../types/sales';
import { useSalesAnalytics } from '../hooks/useSalesAnalytics';
import { useStore } from '../contexts/StoreContext';
import { formatKz } from '../utils';

interface ReceiptSummary {
  receiptNumber: string;
  status: 'completed' | 'cancelled';
  timestamp: string;
  customerName?: string;
  paymentMethod?: PaymentMethod;
  total: number;
  cost: number;
  profit: number;
  units: number;
  lines: number;
}

interface PaymentSummary {
  method: PaymentMethod;
  label: string;
  revenue: number;
  receipts: number;
  units: number;
}

const paymentLabels: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  card: 'Cartão',
  transfer: 'Transferência',
  multicaixa: 'Multicaixa',
  mobile_money: 'Carteira móvel',
  credit: 'Crédito',
  cheque: 'Cheque',
  other: 'Outro',
};

const paymentOrder: PaymentMethod[] = [
  'cash',
  'multicaixa',
  'card',
  'transfer',
  'mobile_money',
  'credit',
  'cheque',
  'other',
];

const todayISO = () => new Date().toISOString().slice(0, 10);

function buildReceipts(sales: Sale[]): ReceiptSummary[] {
  const groups = new Map<string, Sale[]>();

  sales.forEach((sale) => {
    const key = sale.receiptNumber || sale.id;
    const current = groups.get(key) || [];
    current.push(sale);
    groups.set(key, current);
  });

  return Array.from(groups.entries())
    .map(([receiptNumber, items]) => {
      const first = items[0];
      const activeItems = items.filter((item) => item.status !== 'cancelled');
      const usedItems = activeItems.length > 0 ? activeItems : items;
      const total = usedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      const cost = usedItems.reduce((sum, item) => sum + (item.totalCost || item.costTotal || 0), 0);
      const profit = usedItems.reduce((sum, item) => sum + (item.totalProfit || item.profitTotal || 0), 0);
      const units = usedItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

      return {
        receiptNumber,
        status: activeItems.length === 0 ? 'cancelled' : 'completed',
        timestamp: first.timestamp,
        customerName: first.customerName,
        paymentMethod: first.paymentMethod,
        total,
        cost,
        profit,
        units,
        lines: items.length,
      } satisfies ReceiptSummary;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function printClosing(args: {
  storeName?: string;
  date: string;
  receipts: ReceiptSummary[];
  paymentSummary: PaymentSummary[];
  totals: {
    activeReceipts: number;
    cancelledReceipts: number;
    revenue: number;
    cost: number;
    profit: number;
    units: number;
    margin: number;
  };
}) {
  const paymentRows = args.paymentSummary.map((item) => `
    <tr>
      <td>${item.label}</td>
      <td style="text-align:right">${item.receipts}</td>
      <td style="text-align:right">${item.units}</td>
      <td style="text-align:right">${formatKz(item.revenue)}</td>
    </tr>
  `).join('');

  const receiptRows = args.receipts.slice(0, 80).map((item) => `
    <tr>
      <td>${item.receiptNumber}</td>
      <td>${item.status === 'cancelled' ? 'Anulado' : 'Concluído'}</td>
      <td style="text-align:right">${item.units}</td>
      <td style="text-align:right">${formatKz(item.total)}</td>
    </tr>
  `).join('');

  const html = `
    <!doctype html>
    <html>
      <head>
        <title>Fecho de Caixa ${args.date}</title>
        <style>
          body { font-family: Arial, sans-serif; width: 760px; margin: 32px auto; color: #111827; }
          h1 { font-size: 22px; margin: 0 0 4px; }
          h2 { font-size: 15px; margin: 18px 0 8px; }
          .muted { color: #6b7280; font-size: 12px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
          .box { border: 1px solid #e5e7eb; padding: 10px; border-radius: 8px; }
          .label { color: #6b7280; font-size: 11px; text-transform: uppercase; }
          .value { font-size: 16px; font-weight: 700; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { padding: 7px 0; border-bottom: 1px solid #e5e7eb; }
          th { text-align: left; color: #374151; }
          .notice { margin-top: 20px; color: #6b7280; font-size: 11px; line-height: 1.4; }
        </style>
      </head>
      <body>
        <h1>Fecho de Caixa</h1>
        <div class="muted">${args.storeName || 'PreçoCerto'} · ${args.date}</div>

        <div class="grid">
          <div class="box"><div class="label">Receita ativa</div><div class="value">${formatKz(args.totals.revenue)}</div></div>
          <div class="box"><div class="label">Lucro estimado</div><div class="value">${formatKz(args.totals.profit)}</div></div>
          <div class="box"><div class="label">Recibos ativos</div><div class="value">${args.totals.activeReceipts}</div></div>
          <div class="box"><div class="label">Anulados</div><div class="value">${args.totals.cancelledReceipts}</div></div>
        </div>

        <h2>Resumo por pagamento</h2>
        <table>
          <thead><tr><th>Método</th><th style="text-align:right">Recibos</th><th style="text-align:right">Un.</th><th style="text-align:right">Valor</th></tr></thead>
          <tbody>${paymentRows}</tbody>
        </table>

        <h2>Recibos</h2>
        <table>
          <thead><tr><th>Recibo</th><th>Estado</th><th style="text-align:right">Un.</th><th style="text-align:right">Valor</th></tr></thead>
          <tbody>${receiptRows}</tbody>
        </table>

        <p class="notice">Fecho interno de caixa para controlo comercial. Não substitui documento fiscal oficial.</p>
        <script>window.print();</script>
      </body>
    </html>
  `;

  const win = window.open('', '_blank', 'width=840,height=900');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

export const SalesCashClosing: React.FC = () => {
  const { currentStore } = useStore();
  const { salesHistory, loading, error, fetchHistory } = useSalesAnalytics();
  const [selectedDate, setSelectedDate] = useState(todayISO());

  React.useEffect(() => {
    if (currentStore?.storeId) {
      fetchHistory(currentStore.storeId, {
        fromDate: selectedDate,
        toDate: selectedDate,
        limit: 1000,
      });
    }
  }, [currentStore?.storeId, selectedDate]);

  const receipts = useMemo(() => buildReceipts(salesHistory), [salesHistory]);
  const activeReceipts = receipts.filter((receipt) => receipt.status !== 'cancelled');
  const cancelledReceipts = receipts.filter((receipt) => receipt.status === 'cancelled');

  const paymentSummary = useMemo(() => {
    return paymentOrder.map((method) => {
      const items = activeReceipts.filter((receipt) => (receipt.paymentMethod || 'other') === method);
      return {
        method,
        label: paymentLabels[method],
        revenue: items.reduce((sum, receipt) => sum + receipt.total, 0),
        receipts: items.length,
        units: items.reduce((sum, receipt) => sum + receipt.units, 0),
      } satisfies PaymentSummary;
    }).filter((item) => item.revenue > 0 || item.receipts > 0);
  }, [activeReceipts]);

  const totals = useMemo(() => {
    const revenue = activeReceipts.reduce((sum, receipt) => sum + receipt.total, 0);
    const cost = activeReceipts.reduce((sum, receipt) => sum + receipt.cost, 0);
    const profit = activeReceipts.reduce((sum, receipt) => sum + receipt.profit, 0);
    const units = activeReceipts.reduce((sum, receipt) => sum + receipt.units, 0);

    return {
      activeReceipts: activeReceipts.length,
      cancelledReceipts: cancelledReceipts.length,
      revenue,
      cost,
      profit,
      units,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    };
  }, [activeReceipts, cancelledReceipts.length]);

  const topReceipts = activeReceipts.slice(0, 8);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fecho de Caixa</h2>
          <p className="text-sm text-slate-500">Resumo diário por recibo, método de pagamento e anulações.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative">
            <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white sm:w-auto"
            />
          </label>
          <button
            type="button"
            onClick={() => printClosing({
              storeName: currentStore?.storeName,
              date: selectedDate,
              receipts,
              paymentSummary,
              totals,
            })}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Printer size={16} /> Imprimir fecho
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-900/20">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">RECEITA</p>
          <p className="mt-1 text-lg font-bold text-emerald-900 dark:text-emerald-100">{formatKz(totals.revenue)}</p>
        </div>
        <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
          <p className="text-xs font-semibold text-purple-600 dark:text-purple-300">LUCRO</p>
          <p className="mt-1 text-lg font-bold text-purple-900 dark:text-purple-100">{formatKz(totals.profit)}</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-300">RECIBOS</p>
          <p className="mt-1 text-lg font-bold text-blue-900 dark:text-blue-100">{totals.activeReceipts}</p>
        </div>
        <div className="rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20">
          <p className="text-xs font-semibold text-orange-600 dark:text-orange-300">UNIDADES</p>
          <p className="mt-1 text-lg font-bold text-orange-900 dark:text-orange-100">{totals.units}</p>
        </div>
        <div className="rounded-lg bg-indigo-50 p-4 dark:bg-indigo-900/20">
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">MARGEM</p>
          <p className="mt-1 text-lg font-bold text-indigo-900 dark:text-indigo-100">{totals.margin.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-xs font-semibold text-red-600 dark:text-red-300">ANULADOS</p>
          <p className="mt-1 text-lg font-bold text-red-900 dark:text-red-100">{totals.cancelledReceipts}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-slate-500" />
            <h3 className="font-bold text-slate-900 dark:text-white">Resumo por método de pagamento</h3>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-slate-500">A carregar fecho...</p>
          ) : paymentSummary.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Sem vendas ativas neste dia.</p>
          ) : (
            <div className="space-y-3">
              {paymentSummary.map((item) => {
                const percent = totals.revenue > 0 ? (item.revenue / totals.revenue) * 100 : 0;
                return (
                  <div key={item.method} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {item.method === 'cash' ? <Banknote size={18} className="text-emerald-600" /> : <CreditCard size={18} className="text-blue-600" />}
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{item.label}</p>
                          <p className="text-xs text-slate-500">{item.receipts} recibos · {item.units} unidades</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-white">{formatKz(item.revenue)}</p>
                        <p className="text-xs text-slate-500">{percent.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(percent, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-red-500" />
            <h3 className="font-bold text-slate-900 dark:text-white">Anulações do dia</h3>
          </div>
          <div className="space-y-2">
            {cancelledReceipts.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Nenhum recibo anulado.</p>
            ) : (
              cancelledReceipts.slice(0, 8).map((receipt) => (
                <div key={receipt.receiptNumber} className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800">
                  <p className="font-semibold">{receipt.receiptNumber}</p>
                  <p className="text-xs">{receipt.lines} linhas · {formatKz(receipt.total)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <ReceiptText className="h-5 w-5 text-slate-500" />
          <h3 className="font-bold text-slate-900 dark:text-white">Últimos recibos ativos</h3>
        </div>
        {topReceipts.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">Sem recibos ativos para listar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left">Recibo</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-center">Pagamento</th>
                  <th className="px-4 py-3 text-right">Unidades</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {topReceipts.map((receipt) => (
                  <tr key={receipt.receiptNumber} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{receipt.receiptNumber}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{receipt.customerName || 'Consumidor final'}</td>
                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">
                      {paymentLabels[receipt.paymentMethod || 'other']}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{receipt.units}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">{formatKz(receipt.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SalesCashClosing;
