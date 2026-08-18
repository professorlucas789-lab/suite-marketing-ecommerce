/**
 * QuickSalesRecorder Component
 * Formulário rápido para registar vendas
 * Fase 6: Módulo de Vendas
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, CheckCircle } from 'lucide-react';
import { Product } from '../types';
import { Sale } from '../types/sales';
import { useSalesRecorder } from '../hooks/useSalesRecorder';
import { useStore } from '../contexts/StoreContext';

interface QuickSalesRecorderProps {
  products: Product[];
  onSuccess?: (sale: Sale) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

export const QuickSalesRecorder: React.FC<QuickSalesRecorderProps> = ({
  products,
  onSuccess,
  onError,
  onClose,
}) => {
  const { currentStore, user } = useStore();
  const { recordedSale, loading, error, recordSale, reset } = useSalesRecorder();

  const [formData, setFormData] = useState({
    productId: '',
    quantity: 1,
    unitPrice: 0,
    paymentMethod: 'cash' as const,
    notes: '',
  });

  const [showSuccess, setShowSuccess] = useState(false);

  // Produto selecionado
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === formData.productId),
    [formData.productId, products]
  );

  // Calcular preço total e margem
  const calculations = useMemo(() => {
    if (!selectedProduct) return null;

    const totalPrice = formData.quantity * formData.unitPrice;
    const costTotal = formData.quantity * (selectedProduct.custo || 0);
    const profitTotal = totalPrice - costTotal;
    const margemReal = totalPrice > 0 ? (profitTotal / totalPrice) * 100 : 0;

    return { totalPrice, costTotal, profitTotal, margemReal };
  }, [selectedProduct, formData.quantity, formData.unitPrice]);

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setFormData((prev) => ({
      ...prev,
      productId,
      unitPrice: product?.preco || 0,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentStore || !user || !selectedProduct) {
      onError?.('Dados incompletos');
      return;
    }

    if (formData.quantity <= 0 || formData.unitPrice <= 0) {
      onError?.('Quantidade e preço devem ser maiores que zero');
      return;
    }

    try {
      const saleData: Omit<Sale, 'id' | 'timestamp' | 'createdAt'> = {
        storeId: currentStore.storeId,
        productId: selectedProduct.id,
        productName: selectedProduct.nome,
        category: selectedProduct.categoria,
        quantity: formData.quantity,
        unitPrice: formData.unitPrice,
        totalPrice: calculations?.totalPrice || 0,
        costUnitPrice: selectedProduct.custo || 0,
        costTotal: calculations?.costTotal || 0,
        profitTotal: calculations?.profitTotal || 0,
        margemReal: calculations?.margemReal || 0,
        date: new Date().toISOString().split('T')[0],
        userId: user.uid,
        userName: user.displayName || 'Utilizador',
        paymentMethod: formData.paymentMethod,
        notes: formData.notes || undefined,
      };

      await recordSale(saleData);
      setShowSuccess(true);

      setTimeout(() => {
        if (recordedSale) {
          onSuccess?.(recordedSale);
          reset();
          setFormData({
            productId: '',
            quantity: 1,
            unitPrice: 0,
            paymentMethod: 'cash',
            notes: '',
          });
          setShowSuccess(false);
        }
      }, 1500);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao registar venda';
      onError?.(errorMsg);
    }
  };

  if (showSuccess && recordedSale) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6 text-center"
      >
        <CheckCircle className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
        <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
          Venda Registada!
        </p>
        <p className="text-sm text-emerald-700 dark:text-emerald-200 mb-4">
          {recordedSale.productName} × {recordedSale.quantity}
        </p>
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
          Total: {(recordedSale.totalPrice || 0).toFixed(2)} Kz
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Registar Venda</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Produto */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Produto *
          </label>
          <select
            value={formData.productId}
            onChange={(e) => handleProductChange(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecionar produto...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} ({p.categoria})
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
          >
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Custo:</strong> {(selectedProduct.custo || 0).toFixed(2)} Kz
              {selectedProduct.quantidadeDisponível !== undefined && (
                <>
                  {' | '}
                  <strong>Stock:</strong> {selectedProduct.quantidadeDisponível}
                </>
              )}
            </p>
          </motion.div>
        )}

        {/* Quantidade */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Quantidade *
            </label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))
              }
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Preço Unitário */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Preço Unitário (Kz) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.unitPrice}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))
              }
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Cálculos */}
        {calculations && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800 rounded-lg p-3"
          >
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Total</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {calculations.totalPrice.toFixed(2)} Kz
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Lucro</p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {calculations.profitTotal.toFixed(2)} Kz
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Margem</p>
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {calculations.margemReal.toFixed(1)}%
              </p>
            </div>
          </motion.div>
        )}

        {/* Método de Pagamento */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Método de Pagamento
          </label>
          <select
            value={formData.paymentMethod}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                paymentMethod: e.target.value as any,
              }))
            }
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="cash">Dinheiro</option>
            <option value="card">Cartão</option>
            <option value="transfer">Transferência</option>
            <option value="cheque">Cheque</option>
            <option value="other">Outro</option>
          </select>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Notas (opcional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Adicionar notas sobre a venda..."
          />
        </div>

        {/* Erro */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3"
          >
            <p className="text-sm text-red-900 dark:text-red-200">❌ {error}</p>
          </motion.div>
        )}

        {/* Botões */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || !selectedProduct}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition"
          >
            {loading ? 'Registando...' : 'Registar Venda'}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-medium py-2 px-4 rounded-lg transition"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </motion.div>
  );
};

export default QuickSalesRecorder;
