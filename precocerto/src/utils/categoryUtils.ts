/**
 * Category Utilities
 * Funções auxiliares para validação e cálculo com categorias
 */

import { CategoryMarginConfig } from '../types/category';
import { Product } from '../types';

/**
 * Validar se margem está dentro dos limites regulatórios
 */
export function validateMarginCompliance(
  margin: number,
  category: CategoryMarginConfig
): {
  isValid: boolean;
  error?: string;
  warnings?: string[];
} {
  const { marginRules, regulatoryConstraints } = category;

  // Verificar min/max da categoria
  if (margin < marginRules.minMargin) {
    return {
      isValid: false,
      error: `Margem ${margin}% é abaixo do mínimo (${marginRules.minMargin}%) para categoria ${category.name}`,
    };
  }

  if (margin > marginRules.maxMargin) {
    return {
      isValid: false,
      error: `Margem ${margin}% é acima do máximo (${marginRules.maxMargin}%) para categoria ${category.name}`,
    };
  }

  // Verificar limites regulatórios
  if (regulatoryConstraints?.maxMarginPercentage) {
    if (margin > regulatoryConstraints.maxMarginPercentage) {
      return {
        isValid: false,
        error: `Margem ${margin}% excede limite regulatório (${regulatoryConstraints.maxMarginPercentage}%) - ${regulatoryConstraints.restrictionBody}`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Obter a margem a usar para um produto
 * Retorna margem override se existir, senão margem da categoria
 */
export function getProductMargin(
  product: Product,
  category: CategoryMarginConfig
): number {
  if (product.margemOverride !== undefined && product.margemOverride !== null) {
    return product.margemOverride;
  }

  return category.marginRules.baseMargin;
}

/**
 * Calcular margem herdada da categoria
 */
export function calculateInheritedMargin(
  baseMargin: number,
  category: CategoryMarginConfig,
  overrideMargin?: number
): number {
  if (overrideMargin !== undefined && overrideMargin !== null) {
    return overrideMargin;
  }

  return baseMargin;
}

/**
 * Obter informações de conformidade para exibir ao user
 */
export function getMarginComplianceInfo(category: CategoryMarginConfig): {
  baseMargin: number;
  minMargin: number;
  maxMargin: number;
  regulatoryLimit?: number;
  regulatoryBody?: string;
  isCompliant: boolean;
} {
  const { marginRules, regulatoryConstraints } = category;
  const isCompliant =
    marginRules.baseMargin >= marginRules.minMargin &&
    marginRules.baseMargin <= marginRules.maxMargin &&
    (!regulatoryConstraints?.maxMarginPercentage ||
      marginRules.baseMargin <= regulatoryConstraints.maxMarginPercentage);

  return {
    baseMargin: marginRules.baseMargin,
    minMargin: marginRules.minMargin,
    maxMargin: marginRules.maxMargin,
    regulatoryLimit: regulatoryConstraints?.maxMarginPercentage,
    regulatoryBody: regulatoryConstraints?.restrictionBody,
    isCompliant,
  };
}

/**
 * Gerar categoria padrão para um tipo de negócio
 */
export function generateDefaultCategoryForBusinessType(
  businessType: string
): Omit<CategoryMarginConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
  const defaults: Record<string, any> = {
    farmacia: {
      name: 'Medicamentos',
      businessType: 'farmacia',
      marginRules: {
        baseMargin: 30,
        minMargin: 15,
        maxMargin: 35,
      },
      priceStrategy: 'percentage',
      regulatoryConstraints: {
        maxMarginPercentage: 35,
        restrictionBody: 'ARMED',
        notes: 'Limite máximo de margem definido pela Associação de Representantes de Medicamentos',
        lastUpdated: new Date().toISOString(),
      },
    },
    supermercado: {
      name: 'Produtos Gerais',
      businessType: 'supermercado',
      marginRules: {
        baseMargin: 25,
        minMargin: 10,
        maxMargin: 40,
      },
      priceStrategy: 'percentage',
      regulatoryConstraints: {
        notes: 'Sem limite regulatório específico',
        lastUpdated: new Date().toISOString(),
      },
    },
    boutique: {
      name: 'Artigos',
      businessType: 'boutique',
      marginRules: {
        baseMargin: 60,
        minMargin: 40,
        maxMargin: 100,
      },
      priceStrategy: 'percentage',
      regulatoryConstraints: {
        notes: 'Sem limite regulatório específico',
        lastUpdated: new Date().toISOString(),
      },
    },
  };

  return defaults[businessType] || defaults.supermercado;
}

/**
 * Validar dados de categoria antes de salvar
 */
export function validateCategoryData(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.name || data.name.trim() === '') {
    errors.push('Nome da categoria é obrigatório');
  }

  if (typeof data.marginRules?.baseMargin !== 'number') {
    errors.push('Margem base deve ser um número');
  }

  if (data.marginRules?.baseMargin < 0 || data.marginRules?.baseMargin > 100) {
    errors.push('Margem base deve estar entre 0 e 100%');
  }

  if (data.marginRules?.minMargin >= data.marginRules?.maxMargin) {
    errors.push('Margem mínima deve ser menor que máxima');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
