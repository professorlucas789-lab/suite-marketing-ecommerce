/**
 * Margin Calculation Utilities
 * Cálculos de preço baseados em margens de categoria
 */

import { Product } from '../types';
import { CategoryMarginConfig } from '../types/category';

/**
 * Calcular todos os valores de preço para um produto
 * Baseado na margem (herdada de categoria)
 *
 * Esta função é chamada quando:
 * 1. Novo produto é adicionado
 * 2. Custo do produto muda
 * 3. Margem da categoria muda
 */
export function calculateProductPricesWithCategoryMargin(
  product: Product,
  category: CategoryMarginConfig
): {
  precoVendaRecomendado: number;
  lucroEstimado: number;
  margemReal: number;
  margemAplicada: number; // qual margem foi usada (base ou override)
} {
  // Determinar qual margem usar
  const margemAplicada =
    product.margemOverride !== undefined && product.margemOverride !== null
      ? product.margemOverride
      : category.marginRules.baseMargin;

  // Calcular custo total (custo de compra + adicionais)
  const custoTotal = calculateTotalCost(product);

  // Calcular preço de venda recomendado
  const precoVendaRecomendado = Math.round(
    (custoTotal * (1 + margemAplicada / 100)) * 100
  ) / 100;

  // Calcular lucro estimado
  const lucroEstimado = precoVendaRecomendado - custoTotal;

  // Margem real (pode diferir ligeiramente por arredondamentos)
  const margemReal = custoTotal > 0
    ? Math.round((lucroEstimado / custoTotal) * 100 * 100) / 100
    : 0;

  return {
    precoVendaRecomendado,
    lucroEstimado,
    margemReal,
    margemAplicada,
  };
}

/**
 * Calcular custo total de um produto
 * Inclui: custo de compra + transporte + embalagem + outros
 */
function calculateTotalCost(product: Product): number {
  let total = product.custoCompra || 0;

  // Adicionar custos adicionais (no modo simples, apenas transporte + embalagem)
  total += product.custoTransporte || 0;
  total += product.custoEmbalagem || 0;
  total += product.outrosCustos || 0;

  return total;
}

/**
 * Calcular preço com estratégia de preços múltiplos
 * Retorna: Saudável, Ideal, Recomendado
 */
export function calculateMultiplePricingStrategy(
  product: Product,
  category: CategoryMarginConfig
): {
  precoSaudavel: number; // Menor margem aceitável (ex: 20%)
  precoIdeal: number; // Margem ideal para rotação (ex: 70% de margin base)
  precoRecomendado: number; // Margem máxima confortável (margem da categoria)
} {
  const custoTotal = calculateTotalCost(product);

  // Margem saudável = 20% do custo (mínimo para sobreviver)
  const precoSaudavel = Math.round(
    (custoTotal * (1 + 20 / 100)) * 100
  ) / 100;

  // Margem ideal = 70% da margem da categoria (bom equilíbrio)
  const margemAplicada =
    product.margemOverride ?? category.marginRules.baseMargin;
  const precoIdeal = Math.round(
    (custoTotal * (1 + (margemAplicada * 0.7) / 100)) * 100
  ) / 100;

  // Margem recomendada = margem completa da categoria
  const precoRecomendado = Math.round(
    (custoTotal * (1 + margemAplicada / 100)) * 100
  ) / 100;

  return {
    precoSaudavel,
    precoIdeal,
    precoRecomendado,
  };
}

/**
 * Calcular ROI (Return on Investment)
 */
export function calculateROI(
  lucroEstimado: number,
  custoTotal: number
): number {
  if (custoTotal <= 0) return 0;
  return Math.round((lucroEstimado / custoTotal) * 100 * 100) / 100;
}

/**
 * Verificar se produto está em range aceitável
 */
export function validateProductMarginRange(
  product: Product,
  category: CategoryMarginConfig
): {
  isValid: boolean;
  message?: string;
  warning?: string;
} {
  const margemAplicada =
    product.margemOverride ?? category.marginRules.baseMargin;

  // Check against category rules
  if (
    margemAplicada < category.marginRules.minMargin ||
    margemAplicada > category.marginRules.maxMargin
  ) {
    return {
      isValid: false,
      message: `Margem ${margemAplicada}% está fora do range permitido (${category.marginRules.minMargin}%-${category.marginRules.maxMargin}%)`,
    };
  }

  // Check against regulatory constraints
  if (
    category.regulatoryConstraints?.maxMarginPercentage &&
    margemAplicada > category.regulatoryConstraints.maxMarginPercentage
  ) {
    return {
      isValid: false,
      message: `Margem ${margemAplicada}% excede limite regulatório (${category.regulatoryConstraints.maxMarginPercentage}%) - ${category.regulatoryConstraints.restrictionBody}`,
    };
  }

  // Warning if override is used
  if (
    product.margemOverride !== undefined &&
    product.margemOverride !== null
  ) {
    const difference = Math.abs(
      product.margemOverride - category.marginRules.baseMargin
    );
    return {
      isValid: true,
      warning: `Este produto tem margem diferente da categoria (+${difference}%)`,
    };
  }

  return { isValid: true };
}
