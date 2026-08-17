/**
 * StockMovementRecorder Component
 * Registar entrada/saída de produtos do estoque
 * Fase 5: Gestão de Estoque
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  Minus,
  Zap,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { StockMovementType, MovementReason } from '../types/inventory';
import { Product } from '../types';
import { useStockMovements } from '../hooks/useStockMovements';
import { useStore } from '../contexts/StoreContext';

interface StockMovementRecorderProps {
  products: Product[];
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const MOVEMENT_REASONS: Record<StockMovementType, MovementReason[]> = {
  IN: ['Compra', 'Devolução', 'Ajuste', 'Reabastecimento'],
  OUT: ['Venda', 'Perda', 'Devolução', 'Ajuste'],
  ADJUSTMENT: ['Inventário', 'Ajuste', 'Outro'],
};

export const StockMovementRecorder: React.FC<StockMovementRecorderProps> = ({
  products,
  onSuccess,
  onError,
}) => {
  const { currentStore } = useStore();
  const storeId = currentStore?.storeId || '';

  const { recordMovement, loading, error } = useStockMovements({
    storeId,
    autoFetch: false,
  });

  // Form states
  const [type, setType] = useState<StockMovementType>('IN');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState<MovementReason>('Compra');
  const [notes, setNotes] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Filtrar razões baseado no tipo
  const availableReasons = useMemo(
    () => MOVEMENT_REASONS[type],
    [type]
  );

  // Validar formulário
  const isValid =
    selectedProduct &&
    quantity &&
    parseInt(quantity) > 0 &&
    reason;

  // Submeter
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct || !isValid) {
      onError?.('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const movement = await recordMovement({
        storeId,
        productId: selectedProduct.id,
        productName: selectedProduct.nome,
        type,
        quantity: parseInt(quantity),
        reason,
        notes: notes || undefined,
        costUnitPrice: costPrice ? parseFloat(costPrice) : undefined,
        userId: 'current-user', // TODO: Obter do contexto
      });

      if (movement) {
        setSubmitSuccess(true);
        onSuccess?.(`Movimentação registada com sucesso!`);

        // Reset form
        setTimeout(() => {
          setQuantity('1');
          setNotes('');
          setCostPrice('');
          setSubmitSuccess(false);
        }, 2000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao registar';
      onError?.(message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-lg dark:text-white">
            Registar Movimentação
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Entrada, saída ou ajuste de stock
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Tipo de movimento */}
        <div>
          <label className="block text-sm font-medium dark:text-slate-300 mb-2">
            Tipo de Movimento
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['IN', 'OUT', 'ADJUSTMENT'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  setReason(MOVEMENT_REASONS[t][0]);
                }}
                className={`p-3 rounded-lg font-medium transition ${
                  type === t
                    ? t === 'IN'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-300'
                      : t === 'OUT'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-300'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {t === 'IN' && <Plus className="w-4 h-4 mx-auto" />}
                {t === 'OUT' && <Minus className="w-4 h-4 mx-auto" />}
                {t === 'ADJUSTMENT' && <Zap className="w-4 h-4 mx-auto" />}
                <div className="text-xs mt-1">
                  {t === 'IN' ? 'Entrada' : t === 'OUT' ? 'Saída' : 'Ajuste'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Produto */}
        <div>
          <label className="block text-sm font-medium dark:text-slate-300 mb-2">
            Produto
          </label>
          <select
            value={selectedProduct?.id || ''}
            onChange={(e) => {
              const product = products.find((p) => p.id === e.target.value);
              setSelectedProduct(product || null);
            }}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Selecionar produto...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} (Stock: {p.quantidade || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Quantidade */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium dark:text-slate-300 mb-2">
              Quantidade
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {type === 'IN' && (
            <div>
              <label className="block text-sm font-medium dark:text-slate-300 mb-2">
                Custo Unitário (Kz)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="Opcional"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Razão */}
        <div>
          <label className="block text-sm font-medium dark:text-slate-300 mb-2">
            Motivo
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as MovementReason)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
            required
          >
            {availableReasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium dark:text-slate-300 mb-2">
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Adicione notas sobre esta movimentação..."
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Success */}
        {submitSuccess && (
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Registado com sucesso!</span>
          </motion.div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={!isValid || loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {loading ? 'Registando...' : 'Registar Movimentação'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default StockMovementRecorder;
