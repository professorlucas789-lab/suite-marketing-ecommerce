/**
 * MarginSelector Component
 * Seletor inteligente de margens por loja
 * NOVO: Fase 13 - Margin Management
 *
 * Funcionalidades:
 * - Seleciona categorias com margem de forma compacta
 * - Mostra um resumo curto da margem aplicada
 */

import React from "react";
import { CategoryMarginConfig } from "../types/category";
import { Percent } from "lucide-react";

interface MarginSelectorProps {
  categories: CategoryMarginConfig[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
}

export default function MarginSelector({
  categories,
  selectedCategoryId,
  onCategoryChange,
}: MarginSelectorProps) {
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div>
      <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
          <div className="flex items-center gap-2 mb-2">
            <Percent size={16} className="text-emerald-600" />
            Categoria (com Margens)
          </div>
        </label>

        {categories.length === 0 ? (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg text-sm text-yellow-700 dark:text-yellow-400">
            Nenhuma categoria criada. Aceda a "Categorias" para criar uma.
          </div>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedCategoryId}
              onChange={(event) => onCategoryChange(event.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
            >
              <option value="">Selecionar categoria com margem</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} - Base {cat.marginRules.baseMargin}% ({cat.marginRules.minMargin}%-{cat.marginRules.maxMargin}%)
                </option>
              ))}
            </select>

            {selectedCategory && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 rounded-lg text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {selectedCategory.name}
                </span>
                <span>
                  Base: <strong className="text-emerald-700 dark:text-emerald-300">{selectedCategory.marginRules.baseMargin}%</strong>
                </span>
                <span>
                  Intervalo: {selectedCategory.marginRules.minMargin}%-{selectedCategory.marginRules.maxMargin}%
                </span>
                {selectedCategory.regulatoryConstraints?.maxMarginPercentage && (
                  <span className="text-amber-700 dark:text-amber-300">
                    Máx regulatório: {selectedCategory.regulatoryConstraints.maxMarginPercentage}%
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
