/**
 * MarginSelector Component
 * Seletor inteligente de margens por loja
 * NOVO: Fase 13 - Margin Management
 *
 * Funcionalidades:
 * - Mostra categorias com suas margens base
 * - Permite sobrepor margem por produto
 * - Valida contra limites da categoria
 * - Mostra impacto de preço em tempo real
 */

import React, { useState, useEffect } from "react";
import { CategoryMarginConfig } from "../types/category";
import { motion } from "motion/react";
import {
  Percent,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  DollarSign
} from "lucide-react";

interface MarginSelectorProps {
  categories: CategoryMarginConfig[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  margemOverride?: number | null;
  onMargemOverrideChange: (margem: number | null) => void;
  custoCompra: number;
  onPricingUpdate?: (pricing: {
    precoVenda: number;
    lucro: number;
    margemReal: number;
  }) => void;
}

export default function MarginSelector({
  categories,
  selectedCategoryId,
  onCategoryChange,
  margemOverride,
  onMargemOverrideChange,
  custoCompra,
  onPricingUpdate,
}: MarginSelectorProps) {
  const [useOverride, setUseOverride] = useState(!!margemOverride);
  const [overrideValue, setOverrideValue] = useState(
    margemOverride?.toString() || ""
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  // Auto-update pricing when values change
  useEffect(() => {
    if (!selectedCategory || custoCompra <= 0) return;

    const margemAplicada = useOverride && overrideValue
      ? parseFloat(overrideValue)
      : selectedCategory.marginRules.baseMargin;

    const precoVenda = Math.round(
      (custoCompra * (1 + margemAplicada / 100)) * 100
    ) / 100;
    const lucro = precoVenda - custoCompra;
    const margemReal = custoCompra > 0
      ? Math.round((lucro / custoCompra) * 100 * 100) / 100
      : 0;

    onPricingUpdate?.({
      precoVenda,
      lucro,
      margemReal,
    });
  }, [selectedCategory, custoCompra, useOverride, overrideValue, onPricingUpdate]);

  const handleOverrideChange = (value: string) => {
    setOverrideValue(value);
    setValidationError(null);

    if (!value) {
      onMargemOverrideChange(null);
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      setValidationError("Margem deve ser um número positivo");
      return;
    }

    if (!selectedCategory) {
      setValidationError("Selecione uma categoria primeiro");
      return;
    }

    // Validação contra limites da categoria
    if (
      numValue < selectedCategory.marginRules.minMargin ||
      numValue > selectedCategory.marginRules.maxMargin
    ) {
      setValidationError(
        `Margem deve estar entre ${selectedCategory.marginRules.minMargin}% e ${selectedCategory.marginRules.maxMargin}%`
      );
      return;
    }

    // Validação contra limite regulatório
    if (
      selectedCategory.regulatoryConstraints?.maxMarginPercentage &&
      numValue > selectedCategory.regulatoryConstraints.maxMarginPercentage
    ) {
      setValidationError(
        `Margem não pode ultrapassar ${selectedCategory.regulatoryConstraints.maxMarginPercentage}% (${selectedCategory.regulatoryConstraints.restrictionBody})`
      );
      return;
    }

    onMargemOverrideChange(numValue);
  };

  const handleToggleOverride = (enabled: boolean) => {
    setUseOverride(enabled);
    setValidationError(null);
    if (!enabled) {
      setOverrideValue("");
      onMargemOverrideChange(null);
    }
  };

  const efectiveMargin = useOverride && overrideValue
    ? parseFloat(overrideValue)
    : selectedCategory?.marginRules.baseMargin || 0;

  const precoVendaEstimado = custoCompra > 0
    ? Math.round((custoCompra * (1 + efectiveMargin / 100)) * 100) / 100
    : 0;

  const lucroEstimado = precoVendaEstimado - custoCompra;

  return (
    <div className="space-y-4">
      {/* Category Selection */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  selectedCategoryId === cat.id
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 hover:border-emerald-400"
                }`}
              >
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                  {cat.name}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Base: <span className="font-bold text-emerald-600">{cat.marginRules.baseMargin}%</span>
                  {" "} | Range: {cat.marginRules.minMargin}%-{cat.marginRules.maxMargin}%
                </div>
                {cat.regulatoryConstraints?.maxMarginPercentage && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Máx regulatório: {cat.regulatoryConstraints.maxMarginPercentage}%
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Margin Override Section */}
      {selectedCategory && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-200 dark:border-purple-900"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="override-margin"
                checked={useOverride}
                onChange={(e) => handleToggleOverride(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <label
                htmlFor="override-margin"
                className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Sobrepor Margem para este Produto
              </label>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              (opcional)
            </div>
          </div>

          {useOverride && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-3 mt-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
                  Margem Desejada (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder={selectedCategory.marginRules.baseMargin.toString()}
                  value={overrideValue}
                  onChange={(e) => handleOverrideChange(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border-2 text-sm font-mono transition-colors ${
                    validationError
                      ? "border-rose-500 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400"
                      : "border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  }`}
                />
              </div>

              {validationError && (
                <div className="flex items-start gap-2 p-3 bg-rose-100 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900 rounded-lg">
                  <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-700 dark:text-rose-300">
                    {validationError}
                  </p>
                </div>
              )}

              {!validationError && overrideValue && (
                <div className="flex items-start gap-2 p-3 bg-emerald-100 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-900 rounded-lg">
                  <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Margem válida e será aplicada a este produto
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Pricing Preview */}
      {selectedCategory && custoCompra > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-emerald-600" />
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              Impacto de Preço
            </h4>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-xs text-slate-600 dark:text-slate-400">Margem Aplicada</span>
              <div className="font-bold text-emerald-600 text-lg">
                {efectiveMargin.toFixed(1)}%
              </div>
              {useOverride && overrideValue && (
                <div className="text-xs text-purple-600 dark:text-purple-400">
                  (sobre-escrito)
                </div>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-600 dark:text-slate-400">Preço Sugerido</span>
              <div className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                {precoVendaEstimado.toFixed(2)} Kz
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-600 dark:text-slate-400">Lucro Estimado</span>
              <div className="font-bold text-emerald-600 text-lg">
                {lucroEstimado.toFixed(2)} Kz
              </div>
            </div>
          </div>

          {useOverride && overrideValue && (
            <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-900">
              <div className="flex items-start gap-2 text-xs">
                <HelpCircle size={14} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-emerald-700 dark:text-emerald-300">
                  Margem original: {selectedCategory.marginRules.baseMargin}%
                  {" "}
                  <span className="font-semibold">
                    ({(parseFloat(overrideValue) - selectedCategory.marginRules.baseMargin) > 0 ? "+" : ""}
                    {(parseFloat(overrideValue) - selectedCategory.marginRules.baseMargin).toFixed(1)}%)
                  </span>
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
