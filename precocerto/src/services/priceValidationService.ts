/**
 * Price Validation Service
 * Validação de preços contra regras de markup
 * Fase 13 - Validação de Preços
 */

import {
  PriceValidationResult,
  ValidationConfig,
  ValidationSummary,
  CategoryValidationReport,
  DEFAULT_VALIDATION_CONFIG,
  ValidationSeverity,
} from '../types/priceValidation';
import { MarkupCategory } from '../types/markup';
import { calcularMargemReal } from '../types/markup';

/**
 * Validar um único preço de produto contra regras de markup
 * @param productId ID do produto
 * @param productName Nome do produto
 * @param custo Custo unitário
 * @param preco Preço de venda
 * @param markupCategory Categoria de markup com regras
 * @param config Configuração de validação
 * @returns Resultado da validação
 */
export function validarPreco(
  productId: string,
  productName: string,
  custo: number,
  preco: number,
  markupCategory: MarkupCategory | undefined,
  config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
): PriceValidationResult {
  const agora = new Date().toISOString();
  const mensagens: string[] = [];
  const avisos: string[] = [];
  const sugestoes: string[] = [];

  // Se não tem categoria, não validar
  if (!markupCategory || !config.ativo) {
    return {
      productId,
      productName,
      categoryId: markupCategory?.id,
      categoryName: markupCategory?.name,
      custo,
      preco,
      markupAplicado: 0,
      margemReal: 0,
      severidade: 'ok',
      valido: true,
      mensagens: ['Sem categoria ou validação desativada'],
      avisos,
      sugestoes,
      validadoEm: agora,
    };
  }

  // Validações básicas
  if (custo <= 0 || preco <= 0) {
    return {
      productId,
      productName,
      categoryId: markupCategory.id,
      categoryName: markupCategory.name,
      custo,
      preco,
      markupAplicado: 0,
      margemReal: 0,
      severidade: 'critico',
      valido: false,
      mensagens: ['Custo ou preço inválido'],
      avisos: ['Valores devem ser maiores que zero'],
      sugestoes,
      validadoEm: agora,
    };
  }

  // Calcular markup aplicado
  const markupAplicado = ((preco - custo) / custo) * 100;
  const margemReal = calcularMargemReal(markupAplicado);
  const margemEsperada = calcularMargemReal(markupCategory.markupMedio);

  // Calcular desvio
  const desvioPercentual = ((markupAplicado - markupCategory.markupMedio) / markupCategory.markupMedio) * 100;

  // Determinar severidade
  let severidade: ValidationSeverity = 'ok';
  let valido = true;

  // Verificar limites críticos
  if (markupAplicado < markupCategory.markupMinimo * 0.7) {
    // Muito abaixo do mínimo
    severidade = 'critico';
    valido = false;
    mensagens.push('⛔ PREÇO MUITO BAIXO');
    avisos.push(`Markup ${markupAplicado.toFixed(1)}% está 30%+ abaixo do mínimo ${markupCategory.markupMinimo}%`);
    sugestoes.push(`Preço mínimo sugerido: ${(custo * (1 + markupCategory.markupMinimo / 100)).toFixed(2)} Kz`);
  } else if (markupAplicado > markupCategory.markupAlto * 1.5) {
    // Muito acima do máximo
    if (!config.permitirAlto) {
      severidade = 'critico';
      valido = false;
    } else {
      severidade = 'aviso';
      avisos.push(`⚠️ Preço muito alto: ${markupAplicado.toFixed(1)}% vs máximo ${markupCategory.markupAlto}%`);
    }
    mensagens.push('💰 PREÇO MUITO ALTO');
    sugestoes.push(`Preço máximo sugerido: ${(custo * (1 + markupCategory.markupAlto / 100)).toFixed(2)} Kz`);
  }

  // Verificar limites de aviso (se não tiver crítico)
  if (severidade === 'ok') {
    if (Math.abs(desvioPercentual) > config.desvioMaximoCritico) {
      severidade = 'critico';
      valido = false;
      avisos.push(`⛔ Desvio crítico de ${desvioPercentual.toFixed(1)}% vs esperado`);
    } else if (Math.abs(desvioPercentual) > config.desvioMinimoAviso) {
      severidade = 'aviso';
      avisos.push(`⚠️ Desvio de ${desvioPercentual.toFixed(1)}% vs esperado ${markupCategory.markupMedio}%`);
    }
  }

  // Se abaixo do mínimo
  if (markupAplicado < markupCategory.markupMinimo) {
    if (!config.permitirBaixo && severidade !== 'critico') {
      severidade = 'aviso';
    }
    if (severidade === 'ok' || severidade === 'aviso') {
      avisos.push(`Markup abaixo do mínimo: ${markupAplicado.toFixed(1)}% vs ${markupCategory.markupMinimo}%`);
    }
  }

  // Preço recomendado
  const precoSugerido = custo * (1 + markupCategory.markupMedio / 100);

  mensagens.push(`${markupCategory.name}: ${markupAplicado.toFixed(1)}% markup, ${margemReal.toFixed(1)}% margem real`);

  return {
    productId,
    productName,
    categoryId: markupCategory.id,
    categoryName: markupCategory.name,
    custo,
    preco,
    markupAplicado,
    margemReal,
    markupMinimo: markupCategory.markupMinimo,
    markupMedio: markupCategory.markupMedio,
    markupAlto: markupCategory.markupAlto,
    markupPadrao: markupCategory.markupPadrao,
    margemEsperada,
    desvioPercentual,
    precoSugerido,
    precoBaixo: markupAplicado < markupCategory.markupMinimo,
    precoAlto: markupAplicado > markupCategory.markupAlto,
    severidade,
    valido,
    mensagens,
    avisos,
    sugestoes,
    validadoEm: agora,
  };
}

/**
 * Validar múltiplos produtos
 * @param produtos Array de {productId, productName, custo, preco, markupCategory}
 * @param config Configuração de validação
 * @returns Array de resultados
 */
export function validarMultiplosProdutos(
  produtos: Array<{
    productId: string;
    productName: string;
    custo: number;
    preco: number;
    markupCategory?: MarkupCategory;
  }>,
  config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
): PriceValidationResult[] {
  return produtos.map(p =>
    validarPreco(p.productId, p.productName, p.custo, p.preco, p.markupCategory, config)
  );
}

/**
 * Gerar sumário de validação
 * @param resultados Array de resultados de validação
 * @returns Sumário consolidado
 */
export function gerarSumarioValidacao(resultados: PriceValidationResult[]): ValidationSummary {
  if (resultados.length === 0) {
    return {
      totalProdutos: 0,
      produtosValidos: 0,
      produtosAvisos: 0,
      produtosCriticos: 0,
      percentualValido: 0,
      percentualAvisos: 0,
      percentualCritico: 0,
      desvioMedioPercentual: 0,
      desvioMaximoPercentual: 0,
      produtosCriticosList: [],
      produtosAvisosList: [],
    };
  }

  const criticos = resultados.filter(r => r.severidade === 'critico');
  const avisos = resultados.filter(r => r.severidade === 'aviso');
  const validos = resultados.filter(r => r.severidade === 'ok');

  const desvios = resultados
    .map(r => Math.abs(r.desvioPercentual || 0))
    .filter(d => !isNaN(d));

  const desvioMedio = desvios.length > 0 ? desvios.reduce((a, b) => a + b, 0) / desvios.length : 0;
  const desvioMaximo = desvios.length > 0 ? Math.max(...desvios) : 0;

  return {
    totalProdutos: resultados.length,
    produtosValidos: validos.length,
    produtosAvisos: avisos.length,
    produtosCriticos: criticos.length,
    percentualValido: (validos.length / resultados.length) * 100,
    percentualAvisos: (avisos.length / resultados.length) * 100,
    percentualCritico: (criticos.length / resultados.length) * 100,
    desvioMedioPercentual: desvioMedio,
    desvioMaximoPercentual: desvioMaximo,
    produtosCriticosList: criticos.sort((a, b) => (b.desvioPercentual || 0) - (a.desvioPercentual || 0)),
    produtosAvisosList: avisos.sort((a, b) => (b.desvioPercentual || 0) - (a.desvioPercentual || 0)),
  };
}

/**
 * Gerar relatório por categoria
 * @param resultados Array de resultados de validação
 * @returns Array de relatórios por categoria
 */
export function gerarRelatoriosPorCategoria(resultados: PriceValidationResult[]): CategoryValidationReport[] {
  const porCategoria = new Map<string, PriceValidationResult[]>();

  // Agrupar por categoria
  resultados.forEach(r => {
    const key = r.categoryId || 'sem-categoria';
    if (!porCategoria.has(key)) {
      porCategoria.set(key, []);
    }
    porCategoria.get(key)!.push(r);
  });

  // Gerar relatórios
  const relatorios: CategoryValidationReport[] = [];

  porCategoria.forEach((produtos, categoryId) => {
    const criticos = produtos.filter(p => p.severidade === 'critico').length;
    const avisos = produtos.filter(p => p.severidade === 'aviso').length;
    const validos = produtos.filter(p => p.severidade === 'ok').length;

    const margemMedia = produtos.length > 0
      ? produtos.reduce((sum, p) => sum + p.margemReal, 0) / produtos.length
      : 0;

    const margemEsperada = produtos[0]?.margemEsperada || 0;

    const desvios = produtos.map(p => p.desvioPercentual || 0).filter(d => !isNaN(d));
    const desvioMedio = desvios.length > 0 ? desvios.reduce((a, b) => a + b, 0) / desvios.length : 0;

    relatorios.push({
      categoryId,
      categoryName: produtos[0]?.categoryName || 'Sem Categoria',
      totalProdutos: produtos.length,
      produtosValidos: validos,
      produtosCriticos: criticos,
      produtosAvisos: avisos,
      margemMedia,
      margemEsperada,
      desvioMedio,
      produtos,
    });
  });

  return relatorios.sort((a, b) => b.produtosCriticos - a.produtosCriticos);
}

/**
 * Gerar recomendações para um produto
 * @param validacao Resultado de validação
 * @returns String com recomendações
 */
export function gerarRecomendacoes(validacao: PriceValidationResult): string {
  if (validacao.severidade === 'ok') {
    return '✅ Preço dentro dos padrões de markup. Nenhuma ação necessária.';
  }

  const recomendacoes = [
    ...validacao.avisos,
    ...validacao.sugestoes,
    ...validacao.mensagens,
  ];

  return recomendacoes.join('\n');
}
