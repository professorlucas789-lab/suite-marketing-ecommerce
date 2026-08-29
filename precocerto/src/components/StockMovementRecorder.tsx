/**
 * Componente: StockMovementRecorder
 * Formulário rápido para registar movimentação de estoque
 * FASE 2: Gestão de Estoque Automática
 */

import React, { useState } from 'react';
import { ArrowUp, ArrowDown, RotateCcw, Save } from 'lucide-react';
import { useStockMovements } from '../hooks/useStockMovements';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../hooks/useAuth';
import { StockMovementType, StockMovementReason } from '../types/inventory';
import { Product } from '../types';

interface StockMovementRecorderProps {
  product?: Product;
  productId?: string;
  onSuccess?: () => void;
}

const MOVEMENT_TYPES: { type: StockMovementType; label: string; icon: React.ComponentType<any>; color: string }[] = [
  { type: 'IN', label: 'Entrada', icon: ArrowUp, color: 'bg-green-50 border-green-200' },
  { type: 'OUT', label: 'Saída', icon: ArrowDown, color: 'bg-red-50 border-red-200' },
  { type: 'ADJUSTMENT', label: 'Ajuste', icon: RotateCcw, color: 'bg-blue-50 border-blue-200' },
];

const REASONS: Record<StockMovementType, { value: StockMovementReason; label: string }[]> = {
  IN: [
    { value: 'purchase', label: 'Compra ao fornecedor' },
    { value: 'return', label: 'Devolução do cliente' },
    { value: 'transfer', label: 'Transferência de armazém' },
    { value: 'other', label: 'Outro' },
  ],
  OUT: [
    { value: 'sale', label: 'Venda ao cliente' },
    { value: 'damage', label: 'Produto danificado' },
    { value: 'expiry', label: 'Produto expirado' },
    { value: 'loss', label: 'Perda não identificada' },
    { value: 'other', label: 'Outro' },
  ],
  ADJUSTMENT: [
    { value: 'inventory_count', label: 'Contagem física' },
    { value: 'adjustment', label: 'Ajuste manual' },
    { value: 'other', label: 'Outro' },
  ],
};

export function StockMovementRecorder({ product, productId, onSuccess }: StockMovementRecorderProps) {
  const { recordMovement, isLoading, error, clearError } = useStockMovements();
  const { currentStore } = useStore();
  const { user } = useAuth();

  // Se não houver product, mostrar mensagem
  if (!product && !productId) {
    return (
      <div className="p-8 text-center">
        <ArrowUp className="w-12 h-12 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-600 dark:text-slate-400">Selecione um produto para registar uma movimentação</p>
      </div>
    );
  }

  const [movementType, setMovementType] = useState<StockMovementType>('IN');
  const [reason, setReason] = useState<StockMovementReason>('purchase');
  const [quantity, setQuantity] = useState<string>('1');
  const [reference, setReference] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [unitCost, setUnitCost] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const currentTypeConfig = MOVEMENT_TYPES.find((t) => t.type === movementType)!;
  const availableReasons = REASONS[movementType];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentStore?.storeId || !user?.uid) {
      return;
    }

    try {
      await recordMovement(
        product.id,
        product,
        movementType,
        parseInt(quantity),
        reason,
        user.uid,
        {
          reference: reference || undefined,
          batchNumber: batchNumber || undefined,
          unitCost: unitCost ? parseFloat(unitCost) : undefined,
          notes: notes || undefined,
        }
      );

      // Limpar formulário
      setQuantity('1');
      setReference('');
      setBatchNumber('');
      setUnitCost('');
      setNotes('');

      onSuccess?.();
    } catch (err) {
      console.error('Erro ao registar movimento:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Registar Movimentação</h2>
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg">
          <span className="text-sm font-medium text-gray-600">{product.nome}</span>
          <span className="text-sm text-gray-500">Stock: {product.quantidadeDisponível}</span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-300 rounded-lg mb-4 flex items-start justify-between">
          <p className="text-sm font-medium text-red-800">{error}</p>
          <button onClick={clearError} className="text-red-600 hover:text-red-800">
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo de movimento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de Movimentação</label>
          <div className="grid grid-cols-3 gap-3">
            {MOVEMENT_TYPES.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => {
                    setMovementType(option.type);
                    setReason(REASONS[option.type][0].value);
                  }}
                  className={`p-4 border-2 rounded-lg transition ${
                    movementType === option.type
                      ? `${option.color} border-current`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Razão */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Motivo</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as StockMovementReason)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableReasons.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Quantidade */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade*</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              max={movementType === 'OUT' ? product.quantidadeDisponível : 999999}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Custo Unitário (Kz)</label>
            <input
              type="number"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Referência e Lote */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Referência (ex: Fatura #)</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="FAT-2026-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Número de Lote</label>
            <input
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="LOT-2026-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Adicione observações sobre esta movimentação..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        {/* Preview */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700">
            Stock atual: <strong>{product.quantidadeDisponível}</strong>
            {' → '}
            <strong>
              {movementType === 'IN'
                ? product.quantidadeDisponível + parseInt(quantity)
                : movementType === 'OUT'
                ? product.quantidadeDisponível - parseInt(quantity)
                : parseInt(quantity)}
            </strong>
          </p>
        </div>

        {/* Botão Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Registando...' : 'Registar Movimentação'}
        </button>
      </form>
    </div>
  );
}
