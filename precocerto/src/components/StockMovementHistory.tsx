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
  }
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

  const displayedMovements = movements.slice(0, displayLimit);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
        <p className="mt-2 text-gray-500">Carregando histórico...</p>
      </div>
    );
  }

  if (movements.length === 0) {
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
        <span className="text-sm text-gray-500">{movements.length} movimentações</span>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {displayedMovements.map((movement, index) => (
          <div
            key={movement.id}
            className={`p-4 border rounded-lg ${getMovementColor(movement.type)} ${
              index !== 0 ? 'mt-2' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Ícone */}
              <div className="flex-shrink-0 pt-1">{getMovementIcon(movement.type)}</div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{movement.productName}</h4>
                    <p className="text-sm text-gray-600 capitalize">{movement.reason.replace('_', ' ')}</p>
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
                      {movement.quantity}
                    </p>
                  </div>
                </div>

                {/* Quantidade antes/depois */}
                <div className="text-sm text-gray-600 mb-2">
                  <span>{movement.previousQuantity}</span>
                  <span className="mx-2">→</span>
                  <span className="font-medium">{movement.newQuantity}</span>
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
                    {new Date(movement.timestamp).toLocaleDateString('pt-PT')}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {movement.createdBy}
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
      {displayedMovements.length < movements.length && (
        <div className="text-center">
          <button
            onClick={() => setDisplayLimit((prev) => prev + limit)}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            Ver mais ({movements.length - displayedMovements.length} restantes)
          </button>
        </div>
      )}
    </div>
  );
}
