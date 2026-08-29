/**
 * Componente: StockMovementHistory
 * Histórico de movimentações de estoque
 * FASE 2: Gestão de Estoque Automática
 */

import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, RotateCcw, Calendar, User } from 'lucide-react';
import { StockMovement, StockMovementType } from '../types/inventory';
import { useStockMovements } from '../hooks/useStockMovements';
import { useStore } from '../contexts/StoreContext';

interface StockMovementHistoryProps {
  productId?: string;
  limit?: number;
}

const getMovementIcon = (type: StockMovementType) => {
  switch (type) {
    case 'IN':
      return <ArrowUp className="w-4 h-4 text-green-600" />;
    case 'OUT':
      return <ArrowDown className="w-4 h-4 text-red-600" />;
    case 'ADJUSTMENT':
      return <RotateCcw className="w-4 h-4 text-blue-600" />;
    default:
      return <RotateCcw className="w-4 h-4 text-gray-600" />;
  }
};

const getMovementColor = (type: StockMovementType) => {
  switch (type) {
    case 'IN':
      return 'bg-green-50 border-green-200';
    case 'OUT':
      return 'bg-red-50 border-red-200';
    case 'ADJUSTMENT':
      return 'bg-blue-50 border-blue-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

const getMovementTimestampLabel = (timestamp: unknown) => {
  if (!timestamp) return 'Data não registada';
  if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toLocaleDateString('pt-PT');
  }

  const date = new Date(String(timestamp));
  return Number.isNaN(date.getTime()) ? 'Data não registada' : date.toLocaleDateString('pt-PT');
};

export function StockMovementHistory({ productId, limit = 50 }: StockMovementHistoryProps) {
  const { movements, isLoading, getMovementHistory } = useStockMovements();
  const { currentStore } = useStore();
  const [displayLimit, setDisplayLimit] = useState(limit);

  useEffect(() => {
    if (currentStore?.storeId) {
      getMovementHistory({ productId, limit: limit * 2 });
    }
  }, [currentStore?.storeId, productId, getMovementHistory, limit]);

  const safeMovements = Array.isArray(movements)
    ? movements.filter((movement): movement is StockMovement =>
        Boolean(movement && typeof movement === 'object')
      )
    : [];
  const displayedMovements = safeMovements.slice(0, displayLimit);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
        <p className="mt-2 text-gray-500">Carregando histórico...</p>
      </div>
    );
  }

  if (safeMovements.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <RotateCcw className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nenhuma movimentação registada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtro de limite */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Histórico de Movimentações</h3>
        <span className="text-sm text-gray-500">{safeMovements.length} movimentações</span>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {displayedMovements.map((movement, index) => (
          <div
            key={movement.id || `${movement.productId || 'movement'}-${movement.timestamp || index}`}
            className={`p-4 border rounded-lg ${getMovementColor(movement.type || 'ADJUSTMENT')} ${
              index !== 0 ? 'mt-2' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Ícone */}
              <div className="flex-shrink-0 pt-1">{getMovementIcon(movement.type || 'ADJUSTMENT')}</div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{movement.productName || 'Produto sem nome'}</h4>
                    <p className="text-sm text-gray-600 capitalize">{(movement.reason || 'other').replace('_', ' ')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-semibold text-lg ${
                      movement.type === 'IN'
                        ? 'text-green-600'
                        : movement.type === 'OUT'
                        ? 'text-red-600'
                        : 'text-blue-600'
                    }`}>
                      {movement.type === 'IN' ? '+' : movement.type === 'OUT' ? '-' : ''}
                      {Number(movement.quantity || 0)}
                    </p>
                  </div>
                </div>

                {/* Quantidade antes/depois */}
                <div className="text-sm text-gray-600 mb-2">
                  <span>{Number(movement.previousQuantity || 0)}</span>
                  <span className="mx-2">→</span>
                  <span className="font-medium">{Number(movement.newQuantity || 0)}</span>
                </div>

                {/* Metadados */}
                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  {movement.reference && (
                    <div>
                      <span className="font-medium">Ref:</span> {movement.reference}
                    </div>
                  )}
                  {movement.batchNumber && (
                    <div>
                      <span className="font-medium">Lote:</span> {movement.batchNumber}
                    </div>
                  )}
                  {movement.unitCost && (
                    <div>
                      <span className="font-medium">Custo:</span> Kz {movement.unitCost.toFixed(2)}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {getMovementTimestampLabel(movement.timestamp)}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {movement.createdBy || 'Sistema'}
                  </div>
                </div>

                {/* Notas */}
                {movement.notes && <p className="text-xs text-gray-600 mt-2 italic">{movement.notes}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      {displayedMovements.length < safeMovements.length && (
        <div className="text-center">
          <button
            onClick={() => setDisplayLimit((prev) => prev + limit)}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            Ver mais ({safeMovements.length - displayedMovements.length} restantes)
          </button>
        </div>
      )}
    </div>
  );
}
