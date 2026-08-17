/**
 * Price Validation Types
 * Validação de preços contra regras de markup
 * Fase 13 - Validação de Preços
 */

/**
 * Severity levels para validação de preço
 */
export type ValidationSeverity = 'critico' | 'aviso' | 'ok';

/**
 * Resultado de validação de preço
 */
export interface PriceValidationResult {
  // Identificação
  productId: string;
  productName: string;
  categoryId?: string;
  categoryName?: string;

  // Dados do produto
  custo: number;
  preco: number;
  markupAplicado: number; // % real aplicado
  margemReal: number; // % real calculada

  // Regras esperadas
  markupMinimo?: number;
  markupMedio?: number;
  markupAlto?: number;
  markupPadrao?: 'minimo' | 'medio' | 'alto';

  // Resultado da validação
  severidade: ValidationSeverity;
  valido: boolean;
  mensagens: string[];
  avisos: string[];
  sugestoes: string[];

  // Detalhes
  margemEsperada?: number;
  desvioPercentual?: number; // % de desvio vs esperado
  precoSugerido?: number;
  precoBaixo?: boolean;
  precoAlto?: boolean;

  // Timestamp
  validadoEm: string;
}

/**
 * Configuração de validação
 */
export interface ValidationConfig {
  // Tolerância de desvio (em %)
  // Ex: 10 = permite até 10% acima/abaixo do esperado
  toleranciaDesvio: number;

  // Limites severos
  desvioMaximoCritico: number; // Ex: 30% = muito fora do padrão
  desvioMinimoAviso: number;   // Ex: 10% = ligeiramente fora

  // Ativar validação
  ativo: boolean;

  // Modes
  permitirBaixo: boolean; // Permitir preço abaixo do mínimo?
  permitirAlto: boolean;  // Permitir preço acima do máximo?
}

/**
 * Sumário de validação para dashboard
 */
export interface ValidationSummary {
  totalProdutos: number;
  produtosValidos: number;
  produtosAvisos: number;
  produtosCriticos: number;

  percentualValido: number;
  percentualAvisos: number;
  percentualCritico: number;

  desvioMedioPercentual: number;
  desvioMaximoPercentual: number;

  produtosCriticosList: PriceValidationResult[];
  produtosAvisosList: PriceValidationResult[];
}

/**
 * Report de validação por categoria
 */
export interface CategoryValidationReport {
  categoryId: string;
  categoryName: string;

  totalProdutos: number;
  produtosValidos: number;
  produtosCriticos: number;
  produtosAvisos: number;

  margemMedia: number;
  margemEsperada: number;
  desvioMedio: number;

  produtos: PriceValidationResult[];
}

/**
 * Configuração padrão para validação
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  toleranciaDesvio: 10, // 10% de tolerância
  desvioMaximoCritico: 30, // Crítico se > 30%
  desvioMinimoAviso: 10,   // Aviso se > 10%
  ativo: true,
  permitirBaixo: false, // Não permitir preço abaixo do mínimo
  permitirAlto: true,   // Permitir preço acima do máximo (para promoções)
};
