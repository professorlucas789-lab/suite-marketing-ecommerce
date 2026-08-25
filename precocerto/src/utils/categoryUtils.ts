/**
 * Category Utilities
 * Funções auxiliares para validação e cálculo com categorias
 */

import { CategoryMarginConfig } from '../types/category';
import { Product } from '../types';
import { calculateProductFields, CalculationInput } from './pricing';

type CategoryPricingMode = CategoryMarginConfig & {
  calculationMode?: 'margin' | 'markup';
};

function markupToMarginPercent(markupPercent: number): number {
  if (markupPercent <= 0) {
    return 0;
  }

  return (markupPercent / (100 + markupPercent)) * 100;
}

function getCalculationMargin(category: CategoryPricingMode | undefined, value: number): number {
  if (category?.calculationMode === 'markup') {
    return markupToMarginPercent(value);
  }

  return value;
}

/**
 * NOVO (Fase 2): Validar se margem está dentro dos limites regulatórios
 * Aceita ambos os formatos de argumentos para compatibilidade
 */
export function validateMarginCompliance(
  categoryOrMargin: CategoryMarginConfig | number,
  marginOrCategory?: number | CategoryMarginConfig
): {
  isCompliant: boolean;
  reason?: string;
  isValid?: boolean;
  error?: string;
  warnings?: string[];
} {
  // Aceita ambos os formatos: (category, margin) ou (margin, category)
  let category: CategoryMarginConfig;
  let margin: number;

  if (typeof categoryOrMargin === 'number') {
    // Formato: (margin, category)
    margin = categoryOrMargin;
    category = marginOrCategory as CategoryMarginConfig;
  } else {
    // Formato: (category, margin)
    category = categoryOrMargin;
    margin = marginOrCategory as number;
  }

  const { marginRules, regulatoryConstraints } = category;

  // Verificar min/max da categoria
  if (margin < marginRules.minMargin) {
    const reason = `Margem ${margin}% é abaixo do mínimo (${marginRules.minMargin}%) para ${category.name}`;
    return {
      isCompliant: false,
      reason,
      isValid: false,
      error: reason,
    };
  }

  if (margin > marginRules.maxMargin) {
    const reason = `Margem ${margin}% é acima do máximo (${marginRules.maxMargin}%) para ${category.name}`;
    return {
      isCompliant: false,
      reason,
      isValid: false,
      error: reason,
    };
  }

  // Verificar limites regulatórios
  if (regulatoryConstraints?.maxMarginPercentage) {
    if (margin > regulatoryConstraints.maxMarginPercentage) {
      const reason = `Margem ${margin}% excede limite regulatório (${regulatoryConstraints.maxMarginPercentage}%) - ${regulatoryConstraints.restrictionBody}`;
      return {
        isCompliant: false,
        reason,
        isValid: false,
        error: reason,
      };
    }
  }

  return {
    isCompliant: true,
    isValid: true
  };
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

/**
 * NOVO (Fase 2): Calcular preços de produto usando margem da categoria
 * Integra a lógica de herança de margem e validação de conformidade
 *
 * @param calculationInput - Dados de cálculo sem margem definida
 * @param category - Categoria do produto (contém regras de margem)
 * @param overrideMargin - Margem override se houver
 * @returns Resultado completo do cálculo de preços com margem da categoria
 */
export function calculateProductPricesWithCategoryMargin(
  calculationInput: Omit<CalculationInput, 'margemDesejada'>,
  category?: CategoryPricingMode,
  overrideMargin?: number
) {
  // Determinar margem a usar
  let effectiveMargin = 0;

  if (overrideMargin !== undefined && overrideMargin !== null) {
    effectiveMargin = overrideMargin;
  } else if (category) {
    effectiveMargin = category.marginRules.baseMargin;
  } else {
    // Fallback se não houver categoria
    effectiveMargin = (calculationInput as any).margemDesejada || 0;
  }

  // Validar conformidade se houver categoria
  if (category && overrideMargin !== undefined) {
    const compliance = validateMarginCompliance(category, overrideMargin);
    if (!compliance.isCompliant) {
      console.warn(`Margem não está em conformidade: ${compliance.reason}`);
    }
  }

  // Executar cálculo com margem efetiva
  return calculateProductFields({
    ...calculationInput,
    margemDesejada: getCalculationMargin(category, effectiveMargin),
  });
}
