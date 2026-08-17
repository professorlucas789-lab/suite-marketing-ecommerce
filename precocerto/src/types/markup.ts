/**
 * Markup Types
 * Tabela de Aplicação de Markup em Produtos Farmacêuticos
 * Fase 13: Gestão de Margens de Lucro por Categoria e Loja
 */

/**
 * MarkupCategory
 * Configuração de markup (margem de lucro) para uma categoria de produtos
 * Suporta diferentes valores por farmácia (Zango vs Viana)
 */
export interface MarkupCategory {
  id: string;
  storeId: string; // ID da loja (Zango ou Viana)

  // Identificação
  name: string; // ex: "Paracetamol português", "Antibióticos"
  descricao?: string;
  criterioUso?: string; // ex: "Usar Mínimo quando há muita concorrência"

  // Markup por nível (percentagens)
  // Aplicado sobre o custo: Preço = Custo × (1 + markup%)
  markupMinimo: number; // % (ex: 25)
  markupMedio: number; // % (ex: 28)
  markupAlto: number; // % (ex: 30)

  // Padrão aplicado automaticamente ao criar produto nesta categoria
  markupPadrao: 'minimo' | 'medio' | 'alto'; // ex: 'medio'

  // Conversão automática para margem real
  // Margem Real = (Preço - Custo) / Preço × 100
  // Calculada automaticamente a partir do markupPadrao
  margemRealPadrao?: number; // ex: 23.1 para 30% markup

  // Ativo/Inativo
  ativo: boolean;

  // Timestamps
  criadoEm: string; // ISO date
  atualizadoEm: string; // ISO date
}

/**
 * MarkupCategoryDTO
 * Data Transfer Object para criar/atualizar markup
 * Omite id, storeId e timestamps
 */
export type MarkupCategoryDTO = Omit<
  MarkupCategory,
  'id' | 'storeId' | 'criadoEm' | 'atualizadoEm'
>;

/**
 * Utilidade: Calcular margem real a partir do markup
 * Fórmula: margemReal = (markup / (1 + markup)) × 100
 * Exemplo: 30% markup = 23.08% margem real
 */
export function calcularMargemReal(markupPercentagem: number): number {
  if (markupPercentagem <= 0) return 0;
  return (markupPercentagem / (100 + markupPercentagem)) * 100;
}

/**
 * Utilidade: Calcular markup a partir da margem real
 * Fórmula inversa: markup = (margem / (100 - margem)) × 100
 * Exemplo: 23.08% margem = 30% markup
 */
export function calcularMarkup(margemPercentagem: number): number {
  if (margemPercentagem >= 100) return 0; // Margem >= 100% é inválida
  return (margemPercentagem / (100 - margemPercentagem)) * 100;
}

/**
 * Dados pré-carregados: 11 categorias do PDF
 * Aplicação por loja (Zango vs Viana)
 */
export const CATEGORIAS_PADRAO = {
  zango: [
    {
      name: 'Paracetamol português',
      markupMinimo: 25,
      markupMedio: 25,
      markupAlto: 25,
      markupPadrao: 'medio' as const,
      criterioUso: 'Produto comum, muita concorrência',
    },
    {
      name: 'Paracetamol indiano',
      markupMinimo: 20,
      markupMedio: 20,
      markupAlto: 25,
      markupPadrao: 'medio' as const,
      criterioUso: 'Genérico, preço baixo',
    },
    {
      name: 'Antibióticos',
      markupMinimo: 32,
      markupMedio: 45,
      markupAlto: 60,
      markupPadrao: 'medio' as const,
      criterioUso: 'Procura alta, margem elevada',
    },
    {
      name: 'Anti-inflamatórios',
      markupMinimo: 32,
      markupMedio: 36,
      markupAlto: 40,
      markupPadrao: 'medio' as const,
      criterioUso: 'Moderadamente concorrido',
    },
    {
      name: 'Cosméticos',
      markupMinimo: 40,
      markupMedio: 50,
      markupAlto: 60,
      markupPadrao: 'medio' as const,
      criterioUso: 'Alta margem, procura sazonal',
    },
    {
      name: 'Alimentação infantil',
      markupMinimo: 15,
      markupMedio: 20,
      markupAlto: 25,
      markupPadrao: 'medio' as const,
      criterioUso: 'Produto essencial, sensibilidade ao preço',
    },
    {
      name: 'Psicotrópicos',
      markupMinimo: 32,
      markupMedio: 38,
      markupAlto: 45,
      markupPadrao: 'medio' as const,
      criterioUso: 'Regulado, procura estável',
    },
    {
      name: 'Medicamentos comuns',
      markupMinimo: 25,
      markupMedio: 32,
      markupAlto: 40,
      markupPadrao: 'medio' as const,
      criterioUso: 'Variável conforme demanda',
    },
    {
      name: 'Higiene e cuidados pessoais',
      markupMinimo: 30,
      markupMedio: 40,
      markupAlto: 50,
      markupPadrao: 'medio' as const,
      criterioUso: 'Procura consistente',
    },
    {
      name: 'Suplementos e vitaminas',
      markupMinimo: 35,
      markupMedio: 45,
      markupAlto: 60,
      markupPadrao: 'medio' as const,
      criterioUso: 'Alta margem, público específico',
    },
    {
      name: 'Produtos hospitalares simples',
      markupMinimo: 25,
      markupMedio: 35,
      markupAlto: 45,
      markupPadrao: 'medio' as const,
      criterioUso: 'Procura variável, sazonalidade',
    },
  ],
  viana: [
    {
      name: 'Paracetamol português',
      markupMinimo: 28,
      markupMedio: 28,
      markupAlto: 30,
      markupPadrao: 'medio' as const,
      criterioUso: 'Produto comum, menos concorrência que Zango',
    },
    {
      name: 'Paracetamol indiano',
      markupMinimo: 22,
      markupMedio: 25,
      markupAlto: 25,
      markupPadrao: 'medio' as const,
      criterioUso: 'Genérico, preço médio',
    },
    {
      name: 'Antibióticos',
      markupMinimo: 45,
      markupMedio: 50,
      markupAlto: 60,
      markupPadrao: 'medio' as const,
      criterioUso: 'Procura alta, margem muito elevada',
    },
    {
      name: 'Anti-inflamatórios',
      markupMinimo: 36,
      markupMedio: 38,
      markupAlto: 40,
      markupPadrao: 'medio' as const,
      criterioUso: 'Procura consistente',
    },
    {
      name: 'Cosméticos',
      markupMinimo: 50,
      markupMedio: 55,
      markupAlto: 60,
      markupPadrao: 'medio' as const,
      criterioUso: 'Muito alta margem, exclusividade',
    },
    {
      name: 'Alimentação infantil',
      markupMinimo: 20,
      markupMedio: 22,
      markupAlto: 25,
      markupPadrao: 'medio' as const,
      criterioUso: 'Produto essencial, sensibilidade ao preço',
    },
    {
      name: 'Psicotrópicos',
      markupMinimo: 38,
      markupMedio: 40,
      markupAlto: 45,
      markupPadrao: 'medio' as const,
      criterioUso: 'Regulado, procura estável',
    },
    {
      name: 'Medicamentos comuns',
      markupMinimo: 32,
      markupMedio: 36,
      markupAlto: 40,
      markupPadrao: 'medio' as const,
      criterioUso: 'Variável conforme demanda local',
    },
    {
      name: 'Higiene e cuidados pessoais',
      markupMinimo: 40,
      markupMedio: 45,
      markupAlto: 50,
      markupPadrao: 'medio' as const,
      criterioUso: 'Procura alta',
    },
    {
      name: 'Suplementos e vitaminas',
      markupMinimo: 45,
      markupMedio: 50,
      markupAlto: 60,
      markupPadrao: 'medio' as const,
      criterioUso: 'Muito alta margem, público específico',
    },
    {
      name: 'Produtos hospitalares simples',
      markupMinimo: 35,
      markupMedio: 40,
      markupAlto: 45,
      markupPadrao: 'medio' as const,
      criterioUso: 'Procura local, menos sazonalidade',
    },
  ],
};
