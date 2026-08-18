/**
 * QuickSaleRecorder Component
 * Modal rápido para registar vendas
 * NOVO (Fase 13): Rastreamento de vendas
 */

import React from "react";
import { Product } from "../types";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ShoppingCart,
  DollarSign,
  Percent,
  Plus,
} from "lucide-react";
import { useQuickSale } from "../hooks/useQuickSale";
import { Sale } from "../types/sales";

interface QuickSaleRecorderProps {
  products: Product[];
  onSaleRecorded?: (sale: Sale) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickSaleRecorder({
  products,
  onSaleRecorded,
  isOpen,
  onClose,
}: QuickSaleRecorderProps) {
  const {
    selectedProduct,
    setSelectedProduct,
    quantity,
    setQuantity,
    customPrice,
    setCustomPrice,
    recording,
    handleRecordSale,
    suggestedPrice,
  } = useQuickSale({ products });

  const handleSubmit = async () => {
    await handleRecordSale(async (sale) => {
      await onSaleRecorded?.(sale);
      onClose();
    });
  };

  const totalPrice =
    (customPrice ? parseFloat(customPrice) : suggestedPrice) *
    parseFloat(quantity || 1);
  const unitCost = selectedProduct?.custoCompra || 0;
  const totalCost = unitCost * parseFloat(quantity || 1);
  const profit = totalPrice - totalCost;
  const marginPercent =
    totalCost > 0 ? ((profit / totalCost) * 100) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <ShoppingCart
                    className="text-emerald-600 dark:text-emerald-400"
                    size={20}
                  />
                </div>
                <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                  Registar Venda Rápida
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {/* Product Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Produto
                </label>
                <select
                  value={selectedProduct?.id || ""}
                  onChange={(e) => {
                    const product = products.find(p => p.id === e.target.value);
                    setSelectedProduct(product || null);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Selecione um produto...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({(p.quantidadeDisponível || 0)} disponível)
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <>
                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Preço Unitário (Kz)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={suggestedPrice.toFixed(2)}
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                        Sugerido: {suggestedPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          Preço Total
                        </span>
                        <p className="font-bold text-slate-800 dark:text-slate-100">
                          {totalPrice.toFixed(2)} Kz
                        </p>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          Lucro
                        </span>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">
                          {profit.toFixed(2)} Kz
                        </p>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          Margem
                        </span>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">
                          {marginPercent.toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          Stock Após
                        </span>
                        <p className="font-bold text-slate-800 dark:text-slate-100">
                          {Math.max(
                            0,
                            (selectedProduct.quantidadeDisponível || 0) -
                              parseFloat(quantity || 0)
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  recording ||
                  !selectedProduct ||
                  quantity === "" ||
                  parseFloat(quantity) <= 0
                }
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {recording ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Registando...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Registar Venda
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
