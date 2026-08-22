/**
 * StockMovementRecorder Component
 * Registar movimentações de stock (entrada/saída)
 * NOVO (Fase 13 Phase 2): Gestão de estoque
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  Minus,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useStockMovements } from '../hooks/useStockMovements';
import { StockMovementType, StockMovementReason } from '../types/inventory';

interface StockMovementRecorderProps {
  productId?: string;
  productName?: string;
  onSuccess?: () => void;
}

export default function StockMovementRecorder({
  productId: defaultProductId,
  productName: defaultProductName,
  onSuccess,
}: StockMovementRecorderProps) {
  const { products, currentStore } = useStore();
  const [, actions] = useStockMovements(currentStore?.storeId || '');

  const [formData, setFormData] = useState({
    productId: defaultProductId || '',
    type: 'IN' as StockMovementType,
    quantity: 1,
    reason: 'purchase' as StockMovementReason,
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const selectedProduct = products.find((p) => p.id === formData.productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!formData.productId || !currentStore?.storeId) {
      setMessage({
        type: 'error',
        text: 'Produto e loja são obrigatórios',
      });
      return;
    }

    if (formData.quantity <= 0) {
      setMessage({
        type: 'error',
        text: 'Quantidade deve ser maior que 0',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      await actions.recordMovement({
        storeId: currentStore.storeId,
        productId: formData.productId,
        type: formData.type,
        quantity: formData.quantity,
        reason: formData.reason,
        notes: formData.notes || undefined,
        userId: 'current-user', // TODO: Obter do contexto de autenticação
      });

      setMessage({
        type: 'success',
        text: `Movimento registado com sucesso`,
      });

      // Reset form
      setFormData({
        productId: defaultProductId || '',
        type: 'IN',
        quantity: 1,
        reason: 'purchase',
        notes: '',
      });

      onSuccess?.();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao registar movimento',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Registar Movimentação
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Produto */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Produto *
          </label>
          <select
            value={formData.productId}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                productId: e.target.value,
              }))
            }
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!!defaultProductId}
          >
            <option value="">Selecionar produto</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.nome} (Qty: {product.quantidadeDisponível || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de Movimento */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tipo *
            </label>
            <div className="flex gap-2">
              {(['IN', 'OUT'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, type }))
                  }
                  className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                    formData.type === type
                      ? type === 'IN'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-red-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {type === 'IN' ? (
                    <Plus size={18} className="inline mr-1" />
                  ) : (
                    <Minus size={18} className="inline mr-1" />
                  )}
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Quantidade *
            </label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  quantity: parseInt(e.target.value) || 1,
                }))
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Razão */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Razão *
          </label>
          <select
            value={formData.reason}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                reason: e.target.value as StockMovementReason,
              }))
            }
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="purchase">Compra</option>
            <option value="sale">Venda</option>
            <option value="return">Devolução</option>
            <option value="loss">Perda/Quebra</option>
            <option value="inventory">Ajuste Inventário</option>
            <option value="transfer">Transferência</option>
            <option value="damage">Danificado</option>
            <option value="expiry">Vencimento</option>
            <option value="other">Outro</option>
          </select>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Notas
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                notes: e.target.value,
              }))
            }
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Observações adicionais..."
          />
        </div>

        {/* Mensagem */}
        {message && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
              message.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            {message.text}
          </motion.div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? 'Registando...' : 'Registar Movimento'}
        </button>
      </form>
    </motion.div>
  );
}
