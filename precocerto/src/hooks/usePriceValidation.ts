/**
 * usePriceValidation Hook
 * Hook reativo para validação de preços contra regras de markup
 * Padrão: [validation, loading, error, validate]
 */

import { useState, useCallback, useMemo } from 'react';
import {
  PriceValidationResult,
  ValidationConfig,
  ValidationSummary,
  DEFAULT_VALIDATION_CONFIG,
} from '../types/priceValidation';
import { MarkupCategory } from '../types/markup';
import {
  validarPreco,
  validarMultiplosProdutos,
  gerarSumarioValidacao,
  gerarRelatoriosPorCategoria,
} from '../services/priceValidationService';

interface UsePriceValidationOptions {
  // Configuração de validação
  config?: ValidationConfig;

  // Validar automaticamente?
  autoValidate?: boolean;
}

/**
 * Hook para validação de preço individual
 */
export function usePriceValidation(options: UsePriceValidationOptions = {}) {
  const { config = DEFAULT_VALIDATION_CONFIG, autoValidate = false } = options;

  const [validation, setValidation] = useState<PriceValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para validar um preço
  const validate = useCallback(
    async (
      productId: string,
      productName: string,
      custo: number,
      preco: number,
      markupCategory?: MarkupCategory
    ) => {
      try {
        setLoading(true);
        setError(null);

        // Validação síncrona (sem I/O)
        const result = validarPreco(
          productId,
          productName,
          custo,
          preco,
          markupCategory,
          config
        );

        setValidation(result);
        console.log(`✅ [usePriceValidation] Preço validado para ${productName}: ${result.severidade}`);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao validar preço';
        console.error('❌ [usePriceValidation] Erro:', err);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [config]
  );

  // Função para limpar validação
  const clearValidation = useCallback(() => {
    setValidation(null);
    setError(null);
  }, []);

  // Determinar status visual baseado em severidade
  const status = useMemo(() => {
    if (!validation) return 'neutro';
    return validation.severidade;
  }, [validation]);

  return {
    validation,
    loading,
    error,
    status,
    validate,
    clearValidation,
  };
}

/**
 * Hook para validação de múltiplos produtos
 */
export function useMultiplePriceValidation(options: UsePriceValidationOptions = {}) {
  const { config = DEFAULT_VALIDATION_CONFIG } = options;

  const [validations, setValidations] = useState<PriceValidationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validar múltiplos produtos
  const validateMultiple = useCallback(
    async (
      produtos: Array<{
        productId: string;
        productName: string;
        custo: number;
        preco: number;
        markupCategory?: MarkupCategory;
      }>
    ) => {
      try {
        setLoading(true);
        setError(null);

        const results = validarMultiplosProdutos(produtos, config);
        setValidations(results);

        console.log(`✅ [useMultiplePriceValidation] ${results.length} produtos validados`);
        return results;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao validar produtos';
        console.error('❌ [useMultiplePriceValidation] Erro:', err);
        setError(errorMessage);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [config]
  );

  // Gerar sumário
  const summary = useMemo((): ValidationSummary => {
    return gerarSumarioValidacao(validations);
  }, [validations]);

  // Gerar relatórios por categoria
  const relatorioPorCategoria = useMemo(() => {
    return gerarRelatoriosPorCategoria(validations);
  }, [validations]);

  // Filtros
  const criticos = useMemo(() => validations.filter(v => v.severidade === 'critico'), [validations]);
  const avisos = useMemo(() => validations.filter(v => v.severidade === 'aviso'), [validations]);
  const validos = useMemo(() => validations.filter(v => v.severidade === 'ok'), [validations]);

  // Limpar validações
  const clearValidations = useCallback(() => {
    setValidations([]);
    setError(null);
  }, []);

  return {
    validations,
    loading,
    error,
    validateMultiple,
    clearValidations,
    // Sumários
    summary,
    relatorioPorCategoria,
    // Filtros rápidos
    criticos,
    avisos,
    validos,
  };
}

/**
 * Hook para validação em tempo real durante edição
 */
export function useRealtimePriceValidation(
  custo: number,
  preco: number,
  markupCategory?: MarkupCategory,
  config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
) {
  const [validation, setValidation] = useState<PriceValidationResult | null>(null);

  // Validar sempre que custo, preco ou categoria mudam
  useMemo(() => {
    if (custo > 0 && preco > 0 && markupCategory) {
      const result = validarPreco(
        'temp-product',
        markupCategory.name,
        custo,
        preco,
        markupCategory,
        config
      );
      setValidation(result);
    } else {
      setValidation(null);
    }
  }, [custo, preco, markupCategory, config]);

  return validation;
}
