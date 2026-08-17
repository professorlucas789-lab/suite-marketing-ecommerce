/**
 * PriceValidationBadge Component
 * Mostrar resultado de validação de preço
 * Para integração em ProductForm e Product details
 */

import React from 'react';
import { PriceValidationResult } from '../types/priceValidation';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface PriceValidationBadgeProps {
  validation: PriceValidationResult;
  compact?: boolean;
  showDetails?: boolean;
}

export const PriceValidationBadge: React.FC<PriceValidationBadgeProps> = ({
  validation,
  compact = false,
  showDetails = true,
}) => {
  const getSeverityConfig = () => {
    switch (validation.severidade) {
      case 'critico':
        return {
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-900 dark:text-red-200',
          iconColor: 'text-red-600 dark:text-red-400',
          icon: <AlertCircle className="w-5 h-5" />,
          badge: '⛔ Crítico',
          badgeBg: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200',
        };
      case 'aviso':
        return {
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
          borderColor: 'border-amber-200 dark:border-amber-800',
          textColor: 'text-amber-900 dark:text-amber-200',
          iconColor: 'text-amber-600 dark:text-amber-400',
          icon: <AlertTriangle className="w-5 h-5" />,
          badge: '⚠️ Aviso',
          badgeBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200',
        };
      default:
        return {
          bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
          borderColor: 'border-emerald-200 dark:border-emerald-800',
          textColor: 'text-emerald-900 dark:text-emerald-200',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          icon: <CheckCircle className="w-5 h-5" />,
          badge: '✅ OK',
          badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200',
        };
    }
  };

  const config = getSeverityConfig();

  if (compact) {
    return (
      <motion.span
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${config.badgeBg}`}
      >
        {config.icon}
        {config.badge}
      </motion.span>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 space-y-3`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={config.iconColor}>{config.icon}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className={`font-semibold ${config.textColor}`}>
              {validation.productName}
            </h4>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${config.badgeBg}`}>
              {config.badge}
            </span>
          </div>

          {/* Mensagens principais */}
          {validation.mensagens.length > 0 && (
            <p className={`text-sm ${config.textColor} mb-2`}>
              {validation.mensagens[0]}
            </p>
          )}

          {/* Dados de validação */}
          {showDetails && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-3 pt-3 border-t border-current opacity-80">
              <div>
                <span className="font-semibold">Custo:</span>
                <p className="font-mono">{validation.custo.toFixed(2)} Kz</p>
              </div>
              <div>
                <span className="font-semibold">Preço:</span>
                <p className="font-mono">{validation.preco.toFixed(2)} Kz</p>
              </div>
              <div>
                <span className="font-semibold">Markup Aplicado:</span>
                <p className="font-mono">{validation.markupAplicado.toFixed(1)}%</p>
              </div>
              <div>
                <span className="font-semibold">Margem Real:</span>
                <p className="font-mono">{validation.margemReal.toFixed(1)}%</p>
              </div>
            </div>
          )}

          {/* Avisos específicos */}
          {validation.avisos.length > 0 && (
            <div className="text-xs space-y-1 mt-3">
              {validation.avisos.map((aviso, idx) => (
                <p key={idx} className={config.textColor}>
                  • {aviso}
                </p>
              ))}
            </div>
          )}

          {/* Sugestões */}
          {validation.sugestoes.length > 0 && (
            <div className="text-xs space-y-1 mt-3 pt-3 border-t border-current opacity-75">
              <p className="font-semibold">💡 Sugestões:</p>
              {validation.sugestoes.map((sugestao, idx) => (
                <p key={idx}>• {sugestao}</p>
              ))}
            </div>
          )}

          {/* Desvio visual */}
          {validation.desvioPercentual !== undefined && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.abs(validation.desvioPercentual))}%` }}
                  className={`h-full ${
                    validation.desvioPercentual > 0
                      ? 'bg-orange-500 dark:bg-orange-400'
                      : 'bg-blue-500 dark:bg-blue-400'
                  }`}
                />
              </div>
              <span className="text-xs font-semibold whitespace-nowrap">
                {validation.desvioPercentual > 0 ? '📈' : '📉'}
                {Math.abs(validation.desvioPercentual).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Componente compacto para uso inline
 */
export const PriceValidationInline: React.FC<{ validation: PriceValidationResult }> = ({ validation }) => {
  return (
    <div className="flex items-center gap-2 text-xs">
      <PriceValidationBadge validation={validation} compact={true} />
      {validation.desvioPercentual && (
        <span className="text-gray-600 dark:text-gray-400">
          Desvio: {validation.desvioPercentual > 0 ? '+' : ''}{validation.desvioPercentual.toFixed(1)}%
        </span>
      )}
    </div>
  );
};
