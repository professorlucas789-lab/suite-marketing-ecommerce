/**
 * Componente: StockAnalyticsPanel
 * Análise e gráficos de stock
 * FASE 2: Gestão de Estoque Automática
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Calendar } from 'lucide-react';
import { StockAnalytics } from '../types/inventory';
import { useStockMovements } from '../hooks/useStockMovements';
import { Product } from '../types';

interface StockAnalyticsPanelProps {
  product?: Product;
}

export function StockAnalyticsPanel({ product }: StockAnalyticsPanelProps) {
  const { getStockAnalytics, isLoading, error } = useStockMovements();
  const [analytics, setAnalytics] = useState<StockAnalytics | null>(null);

  // Se não houver product, mostrar mensagem
  if (!product) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-600 dark:text-slate-400">Selecione um produto para ver a análise de stock</p>
      </div>
    );
  }

  useEffect(() => {
    if (product?.id) {
      loadAnalytics();
    }
  }, [product?.id]);

  const loadAnalytics = async () => {
    try {
      if (!product?.id) return;
      const data = await getStockAnalytics(product.id, product);
      setAnalytics(data);
    } catch (err) {
      console.error('Erro ao carregar análise:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
        <p className="mt-2 text-gray-500">Calculando análise...</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-800">{error || 'Erro ao calcular análise'}</p>
      </div>
    );
  }

  const getTrendIcon = () => {
    if (analytics.trend === 'increasing') {
      return <TrendingUp className="w-5 h-5 text-green-600" />;
    } else if (analytics.trend === 'decreasing') {
      return <TrendingDown className="w-5 h-5 text-red-600" />;
    } else {
      return <Calendar className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTrendLabel = () => {
    if (analytics.trend === 'increasing') {
      return `Aumentando +${analytics.trendPercent.toFixed(1)}%`;
    } else if (analytics.trend === 'decreasing') {
      return `Diminuindo ${analytics.trendPercent.toFixed(1)}%`;
    } else {
      return 'Estável';
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stock Atual */}
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Stock Atual</p>
          <p className="text-3xl font-bold text-gray-900">{analytics.currentQuantity}</p>
          <p className="text-xs text-gray-500 mt-2">Mínimo: {analytics.minQuantity}</p>
        </div>

        {/* Trend */}
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm text-gray-600">Tendência</p>
            {getTrendIcon()}
          </div>
          <p className="text-lg font-semibold text-gray-900">{getTrendLabel()}</p>
          <p className="text-xs text-gray-500 mt-2">Últimos 7 dias</p>
        </div>

        {/* Uso Médio Diário */}
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Uso Médio/Dia</p>
          <p className="text-3xl font-bold text-gray-900">{analytics.averageDailyUsage.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-2">Últimos 30 dias</p>
        </div>

        {/* Dias até Esgotar */}
        <div className={`p-4 bg-white rounded-lg border ${
          analytics.daysUntilStockout && analytics.daysUntilStockout < 7
            ? 'border-red-200 bg-red-50'
            : 'border-gray-200'
        }`}>
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm text-gray-600">Dias até esgotar</p>
            {analytics.daysUntilStockout && analytics.daysUntilStockout < 7 && (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
          </div>
          <p className={`text-3xl font-bold ${
            analytics.daysUntilStockout && analytics.daysUntilStockout < 7
              ? 'text-red-600'
              : 'text-gray-900'
          }`}>
            {analytics.daysUntilStockout || '∞'}
          </p>
          <p className="text-xs text-gray-500 mt-2">Se trend continuar</p>
        </div>
      </div>

      {/* Gráfico de Stock */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold mb-4">Evolução de Stock</h3>

        {analytics.quantityHistory.length > 0 ? (
          <div className="overflow-x-auto">
            {/* Gráfico simples em barras ASCII */}
            <svg width="100%" height="200" viewBox="0 0 800 200" className="border border-gray-200 rounded">
              {/* Grid */}
              {[0, 25, 50, 75, 100].map((pct) => (
                <line
                  key={`grid-${pct}`}
                  x1="50"
                  y1={200 - (pct / 100) * 150}
                  x2="780"
                  y2={200 - (pct / 100) * 150}
                  stroke="#e5e7eb"
                  strokeDasharray="4"
                  strokeWidth="1"
                />
              ))}

              {/* Eixos */}
              <line x1="50" y1="50" x2="50" y2="200" stroke="#000" strokeWidth="2" />
              <line x1="50" y1="200" x2="780" y2="200" stroke="#000" strokeWidth="2" />

              {/* Pontos */}
              {analytics.quantityHistory.map((item, idx) => {
                const x = 50 + ((idx / (analytics.quantityHistory.length - 1)) * 730) || 50;
                const maxQty = Math.max(...analytics.quantityHistory.map((h) => h.quantity));
                const y = 200 - ((item.quantity / maxQty) * 150);

                return (
                  <g key={`point-${idx}`}>
                    <circle cx={x} cy={y} r="3" fill="#3b82f6" />
                    {idx > 0 && (
                      <line
                        x1={50 + (((idx - 1) / (analytics.quantityHistory.length - 1)) * 730) || 50}
                        y1={200 - ((analytics.quantityHistory[idx - 1].quantity / maxQty) * 150)}
                        x2={x}
                        y2={y}
                        stroke="#3b82f6"
                        strokeWidth="2"
                      />
                    )}
                  </g>
                );
              })}

              {/* Label Y */}
              <text x="10" y="55" fontSize="12" fill="#666">
                Max
              </text>
              <text x="10" y="205" fontSize="12" fill="#666">
                0
              </text>
            </svg>

            <div className="text-center mt-4 text-sm text-gray-500">
              Últimos {analytics.quantityHistory.length} dias
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500">Sem dados de histórico</p>
        )}
      </div>

      {/* Recomendações */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          Recomendações
        </h3>
        <ul className="space-y-2 text-sm">
          {analytics.daysUntilStockout && analytics.daysUntilStockout < 7 && (
            <li>
              🚨 <strong>Ação urgente:</strong> Stock vai esgotar em{' '}
              {analytics.daysUntilStockout} dias. Reabasteça imediatamente.
            </li>
          )}
          {analytics.trend === 'decreasing' && Math.abs(analytics.trendPercent) > 10 && (
            <li>
              📉 <strong>Trend negativo:</strong> Stock está diminuindo rapidamente. Verifique
              se as vendas aumentaram.
            </li>
          )}
          {analytics.trend === 'increasing' && analytics.trendPercent > 20 && (
            <li>
              📈 <strong>Trend positivo:</strong> Stock está aumentando. Bom para
              atender picos de demanda.
            </li>
          )}
          {analytics.currentQuantity > (analytics.minQuantity * 3) && (
            <li>
              ✅ <strong>Stock saudável:</strong> Quantidade acima do normal. Monitore
              a validade de produtos.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
