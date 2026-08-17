/**
 * Markup Calculation Utilities
 * Funções para calcular preços baseados em markups
 * Fase 13 - Integração com ProductForm
 */

import { MarkupCategory, calcularMargemReal } from '../types/markup';

/**
 * Calcular preço de venda baseado em custo + markup
 * Fórmula: Preço = Custo × (1 + markup%)
 * @param custo Custo unitário
 * @param markupPercentagem Markup em percentagem (ex: 30 = 30%)
 * @returns Preço de venda sugerido
 */
export function calcularPrecoComMarkup(custo: number, markupPercentagem: number): number {
  if (custo <= 0 || markupPercentagem < 0) {
    return 0;
  }
  return custo * (1 + markupPercentagem / 100);
}

/**
 * Obter o valor de markup baseado no nível selecionado
 * @param markupCategory Categoria de markup
 * @param nivel 'minimo' | 'medio' | 'alto'
 * @returns Percentagem de markup
 */
export function obterMarkupPorNivel(
  markupCategory: MarkupCategory | undefined,
  nivel: 'minimo' | 'medio' | 'alto'
): number {
  if (!markupCategory) {
    return 0;
  }

  switch (nivel) {
    case 'minimo':
      return markupCategory.markupMinimo;
    case 'alto':
      return markupCategory.markupAlto;
    case 'medio':
    default:
      return markupCategory.markupMedio;
  }
}

/**
 * Obter recomendação de markup para uma categoria
 * Retorna o markup padrão configurado
 * @param markupCategory Categoria de markup
 * @returns Objeto com markup recomendado e nível
 */
export function obterRecomendacaoMarkup(markupCategory: MarkupCategory | undefined) {
  if (!markupCategory) {
    return {
      nivel: 'medio' as const,
      markup: 0,
      margemReal: 0,
      descricao: 'Nenhuma categoria selecionada',
    };
  }

  const markup = obterMarkupPorNivel(markupCategory, markupCategory.markupPadrao);
  const margemReal = calcularMargemReal(markup);

  const nivelDescricoes = {
    minimo: `Markup Mínimo (${markupCategory.markupMinimo}%) - Use em alta concorrência`,
    medio: `Markup Médio (${markupCategory.markupMedio}%) - Padrão recomendado`,
    alto: `Markup Alto (${markupCategory.markupAlto}%) - Use em alta demanda`,
  };

  return {
    nivel: markupCategory.markupPadrao,
    markup,
    margemReal,
    descricao: nivelDescricoes[markupCategory.markupPadrao],
  };
}

/**
 * Validar se um preço cumpre as regras de markup
 * @param custo Custo unitário
 * @param preco Preço de venda
 * @param markupCategory Categoria com regras de markup
 * @returns Objeto com validação
 */
export function validarPrecoComMarkup(
  custo: number,
  preco: number,
  markupCategory: MarkupCategory | undefined
) {
  if (!markupCategory || custo <= 0 || preco <= 0) {
    return {
      valido: true,
      avisos: [],
      markupAplicado: 0,
      margemReal: 0,
      status: 'neutro' as const,
    };
  }

  // Calcular markup aplicado
  const markupAplicado = ((preco - custo) / custo) * 100;
  const margemReal = calcularMargemReal(markupAplicado);

  const avisos: string[] = [];
  let status: 'critico' | 'aviso' | 'ok' | 'neutro' = 'ok';

  // Verificar se está dentro dos limites
  if (markupAplicado < markupCategory.markupMinimo * 0.9) {
    avisos.push(`⚠️ Markup muito baixo (${markupAplicado.toFixed(1)}% vs mín ${markupCategory.markupMinimo}%)`);
    status = 'critico';
  } else if (markupAplicado < markupCategory.markupMinimo) {
    avisos.push(`⚡ Markup ligeiramente abaixo do mínimo (${markupAplicado.toFixed(1)}% vs ${markupCategory.markupMinimo}%)`);
    status = 'aviso';
  }

  if (markupAplicado > markupCategory.markupAlto * 1.1) {
    avisos.push(`💰 Markup muito alto (${markupAplicado.toFixed(1)}% vs máx ${markupCategory.markupAlto}%)`);
    status = 'aviso';
  }

  return {
    valido: avisos.length === 0,
    avisos,
    markupAplicado,
    margemReal,
    status,
  };
}

/**
 * Sugerir faixa de preços baseado em markup
 * @param custo Custo unitário
 * @param markupCategory Categoria com regras de markup
 * @returns Objeto com preços mínimo/médio/máximo
 */
export function sugerirFaixaPrecos(
  custo: number,
  markupCategory: MarkupCategory | undefined
) {
  if (!markupCategory || custo <= 0) {
    return {
      minimo: 0,
      medio: 0,
      maximo: 0,
      recomendado: 0,
    };
  }

  return {
    minimo: calcularPrecoComMarkup(custo, markupCategory.markupMinimo),
    medio: calcularPrecoComMarkup(custo, markupCategory.markupMedio),
    maximo: calcularPrecoComMarkup(custo, markupCategory.markupAlto),
    recomendado: calcularPrecoComMarkup(custo, obterMarkupPorNivel(markupCategory, markupCategory.markupPadrao)),
  };
}

/**
 * Formatar descrição de markup para exibição
 * @param markup Valor de markup em percentagem
 * @param margemReal Valor de margem real em percentagem
 * @returns String formatada
 */
export function formatarMarkupDescricao(markup: number, margemReal?: number): string {
  const parts = [`${markup.toFixed(1)}% markup`];

  if (margemReal !== undefined) {
    parts.push(`(${margemReal.toFixed(1)}% margem real)`);
  }

  return parts.join(' ');
}
