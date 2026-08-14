import React, { useMemo } from 'react';
import { Product } from '../types';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatKz } from '../utils';

interface ProductComparisonProps {
  products: Product[];
  onRemoveProduct: (productId: string) => void;
  onClearAll: () => void;
}

type ComparisonField = {
  label: string;
  key: keyof Product | 'custoTotal';
  format?: (value: any) => string;
  type?: 'number' | 'percent' | 'text';
};

const COMPARISON_FIELDS: ComparisonField[] = [
  { label: 'Categoria', key: 'categoria', format: (v) => v || '-' },
  { label: 'Custo Compra', key: 'custoCompra', format: (v) => formatKz(v || 0), type: 'number' },
  { label: 'Custo Total', key: 'custoTotal', format: (v) => formatKz(v || 0), type: 'number' },
  { label: 'Preço Venda', key: 'precoVendaRecomendado', format: (v) => formatKz(v || 0), type: 'number' },
  { label: 'Lucro Estimado', key: 'lucroEstimado', format: (v) => formatKz(v || 0), type: 'number' },
  { label: 'Margem Real %', key: 'margemReal', format: (v) => `${(v || 0).toFixed(2)}%`, type: 'percent' },
  { label: 'ROI %', key: 'roi', format: (v) => `${(v || 0).toFixed(2)}%`, type: 'percent' },
];

/**
 * Product Comparison Component
 * Side-by-side analysis of selected products
 * Fase 5B Item 2: Product Comparison
 */
export function ProductComparison({
  products,
  onRemoveProduct,
  onClearAll
}: ProductComparisonProps) {
  // Calculate total cost for products
  const calculateTotalCost = (p: Product) => {
    return (p.custoCompra || 0) +
           (p.custoTransporte || 0) +
           (p.custoEmbalagem || 0) +
           (p.outrosCustos || 0);
  };

  const productsData = useMemo(() => {
    return products.map((p) => ({
      ...p,
      custoTotal: calculateTotalCost(p)
    }));
  }, [products]);

  // Get field value with default
  const getFieldValue = (product: any, field: ComparisonField) => {
    const value = product[field.key];
    return field.format ? field.format(value) : (value || '-');
  };

  // Calculate comparison metrics
  const metrics = useMemo(() => {
    if (productsData.length < 2) return null;

    return {
      bestPrice: productsData.reduce((min, p) =>
        p.precoVendaRecomendado < min.precoVendaRecomendado ? p : min
      ),
      bestMargin: productsData.reduce((max, p) =>
        (p.margemReal || 0) > (max.margemReal || 0) ? p : max
      ),
      bestROI: productsData.reduce((max, p) =>
        (p.roi || 0) > (max.roi || 0) ? p : max
      ),
      lowestCost: productsData.reduce((min, p) =>
        p.custoTotal < min.custoTotal ? p : min
      )
    };
  }, [productsData]);

  if (products.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">Nenhum produto selecionado para comparação</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Comparação de Produtos
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {products.length} produtos selecionados
          </p>
        </div>
        {products.length > 0 && (
          <button
            onClick={onClearAll}
            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
          >
            Limpar Comparação
          </button>
        )}
      </div>

      {/* Comparison Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-left font-semibold text-slate-700 dark:text-slate-300 min-w-[150px]">
                  Campo
                </th>
                {productsData.map((product) => (
                  <th key={product.id} className="px-6 py-4 text-left font-semibold text-slate-700 dark:text-slate-300 min-w-[180px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{product.nome}</span>
                      <button
                        onClick={() => onRemoveProduct(product.id)}
                        className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Remover da comparação"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {COMPARISON_FIELDS.map((field) => (
                <tr key={field.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300 bg-slate-50/30 dark:bg-slate-800/20">
                    {field.label}
                  </td>
                  {productsData.map((product) => {
                    const value = getFieldValue(product, field);
                    const isMetricLeader =
                      metrics && (
                        (field.key === 'precoVendaRecomendado' && product.id === metrics.bestPrice.id) ||
                        (field.key === 'margemReal' && product.id === metrics.bestMargin.id) ||
                        (field.key === 'roi' && product.id === metrics.bestROI.id) ||
                        (field.key === 'custoTotal' && product.id === metrics.lowestCost.id)
                      );

                    return (
                      <td
                        key={product.id}
                        className={`px-6 py-4 ${
                          isMetricLeader
                            ? 'bg-green-50/50 dark:bg-green-950/20 font-semibold text-green-700 dark:text-green-300'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparison Summary */}
      {metrics && products.length >= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ComparisonMetric
            label="Melhor Preço"
            product={metrics.bestPrice}
            value={formatKz(metrics.bestPrice.precoVendaRecomendado)}
            icon={TrendingDown}
          />
          <ComparisonMetric
            label="Melhor Margem"
            product={metrics.bestMargin}
            value={`${(metrics.bestMargin.margemReal || 0).toFixed(2)}%`}
            icon={TrendingUp}
          />
          <ComparisonMetric
            label="Melhor ROI"
            product={metrics.bestROI}
            value={`${(metrics.bestROI.roi || 0).toFixed(2)}%`}
            icon={TrendingUp}
          />
          <ComparisonMetric
            label="Menor Custo"
            product={metrics.lowestCost}
            value={formatKz(metrics.lowestCost.custoTotal)}
            icon={Minus}
          />
        </div>
      )}
    </div>
  );
}

interface ComparisonMetricProps {
  label: string;
  product: Product;
  value: string;
  icon: React.ReactNode;
}

function ComparisonMetric({
  label,
  product,
  value,
  icon: Icon
}: ComparisonMetricProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
        {label}
      </p>
      <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
        {value}
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
        {product.nome}
      </p>
    </div>
  );
}
