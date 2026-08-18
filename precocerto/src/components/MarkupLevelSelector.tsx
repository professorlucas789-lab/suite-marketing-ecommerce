/**
 * MarkupLevelSelector Component
 * Seletor visual de nível de markup (Mínimo/Médio/Alto)
 * Para integração no ProductForm
 */

import React from 'react';
import { MarkupCategory } from '../types/markup';
import { motion } from 'motion/react';
import { TrendingUp, AlertCircle, Info } from 'lucide-react';

interface MarkupLevelSelectorProps {
  markupCategory?: MarkupCategory;
  selectedLevel: 'minimo' | 'medio' | 'alto';
  onLevelChange: (level: 'minimo' | 'medio' | 'alto') => void;
  custo: number;
  precoVenda?: number;
}

export const MarkupLevelSelector: React.FC<MarkupLevelSelectorProps> = ({
  markupCategory,
  selectedLevel,
  onLevelChange,
  custo,
  precoVenda,
}) => {
  if (!markupCategory) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Selecione uma categoria para ver sugestões de markup
          </p>
        </div>
      </div>
    );
  }

  const levels = [
    {
      key: 'minimo' as const,
      label: 'Mínimo',
      value: markupCategory.markupMinimo,
      color: 'blue',
      description: 'Use em alta concorrência',
      icon: '📉',
    },
    {
      key: 'medio' as const,
      label: 'Médio',
      value: markupCategory.markupMedio,
      color: 'emerald',
      description: 'Padrão recomendado',
      icon: '➡️',
      isDefault: true,
    },
    {
      key: 'alto' as const,
      label: 'Alto',
      value: markupCategory.markupAlto,
      color: 'orange',
      description: 'Use em alta demanda',
      icon: '📈',
    },
  ];

  const calcularPreco = (markupPercentagem: number) => {
    return custo * (1 + markupPercentagem / 100);
  };

  const calcularMargem = (markupPercentagem: number) => {
    return (markupPercentagem / (100 + markupPercentagem)) * 100;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Nível de Markup
        </h3>
        <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full">
          {markupCategory.name}
        </span>
      </div>

      {/* Descrição da categoria */}
      {markupCategory.criterioUso && (
        <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3">
          <strong>Critério de uso:</strong> {markupCategory.criterioUso}
        </div>
      )}

      {/* Seletor de níveis */}
      <div className="grid grid-cols-3 gap-3">
        {levels.map((level) => {
          const isSelected = selectedLevel === level.key;
          const precoSugerido = calcularPreco(level.value);
          const margemReal = calcularMargem(level.value);

          return (
            <motion.button
              key={level.key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onLevelChange(level.key)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? `border-${level.color}-600 bg-${level.color}-50 dark:bg-${level.color}-900/20`
                  : `border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-${level.color}-300`
              }`}
            >
              {/* Header do card */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{level.icon}</span>
                {level.isDefault && !isSelected && (
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Padrão
                  </span>
                )}
                {isSelected && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    ✓ Selecionado
                  </span>
                )}
              </div>

              {/* Conteúdo */}
              <div className="space-y-2">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {level.label}
                  </p>
                  <p className={`text-sm font-bold text-${level.color}-600 dark:text-${level.color}-400`}>
                    {level.value}%
                  </p>
                </div>

                {custo > 0 && (
                  <div className="text-xs space-y-1">
                    <div className="text-gray-600 dark:text-gray-400">
                      Preço: <span className="font-semibold text-gray-900 dark:text-white">{precoSugerido.toFixed(2)} Kz</span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Margem: <span className="font-semibold text-gray-900 dark:text-white">{margemReal.toFixed(1)}%</span>
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {level.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Info sobre preço atual */}
      {precoVenda && custo > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
        >
          <div className="flex gap-2">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900 dark:text-blue-200">
                Preço Atual: {precoVenda.toFixed(2)} Kz
              </p>
              <p className="text-blue-800 dark:text-blue-300 mt-1">
                Markup aplicado: {(((precoVenda - custo) / custo) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Legenda de cores */}
      <div className="text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">Fórmula:</p>
        <p>Preço = Custo × (1 + Markup%)</p>
        <p className="mt-1">Margem Real = (Markup / (100 + Markup)) × 100</p>
      </div>
    </div>
  );
};
