/**
 * Category Types
 * Definições de tipos para categorias de produtos com configuração de margens
 */

/**
 * CategoryMarginConfig
 * Configuração de margens para uma categoria de produtos
 */
export interface CategoryMarginConfig {
  id: string;
  storeId: string; // NOVO (Fase 12): Cada categoria é isolada por loja
  // userId?: string; // Deprecated - usar storeId

  // Identificação
  name: string; // "Medicamentos", "Genéricos", "Cosméticos"
  businessType: string; // "farmacia", "supermercado", "boutique"
  description?: string;
  color?: string; // Para UI (ex: "emerald-600")
  icon?: string; // Para UI (ex: "Pill")

  // Regras de Margem
  marginRules: {
    baseMargin: number; // % (ex: 30)
    minMargin: number; // % (limite inferior)
    maxMargin: number; // % (limite superior)
    recommendedMargin?: number; // % (sugestão IA, vem Fase 3)
    historicalAverageMargin?: number; // % (calculado, vem Fase 4)
  };

  // Estratégia de Preço
  priceStrategy: 'fixed' | 'percentage' | 'tiered' | 'dynamic';
  // fixed: mesma margem para todos
  // percentage: margem % aplicada a cada custo
  // tiered: margens diferentes por faixa
  // dynamic: IA decide (Fase 3)

  // Restrições Regulatórias
  regulatoryConstraints: {
    maxMarginPercentage?: number; // Ex: 35 para ARMED
    requiresRegistration?: boolean;
    restrictionBody?: string; // "ARMED", "AECOC", etc
    notes?: string;
    lastUpdated: string; // ISO date
  };

  // Histórico (será preenchido ao longo do tempo)
  historicalData?: {
    totalProductsCount: number;
    totalProductsSold: number;
    averageMonthlyRevenue: number;
    averageProductROI: number;
    seasonalityPattern?: string; // "high_summer", "high_winter"
    lastUpdated: string; // ISO date
  };

  // Timestamps
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

/**
 * CategoryMarginRules
 * Extracted para facilitar updates parciais
 */
export interface CategoryMarginRules {
  baseMargin: number;
  minMargin: number;
  maxMargin: number;
  recommendedMargin?: number;
  historicalAverageMargin?: number;
}

/**
 * RegulatoryConstraints
 * Extracted para clarity
 */
export interface RegulatoryConstraints {
  maxMarginPercentage?: number;
  requiresRegistration?: boolean;
  restrictionBody?: string;
  notes?: string;
  lastUpdated: string;
}

/**
 * HistoricalData
 * Extracted para reutilização
 */
export interface HistoricalData {
  totalProductsCount: number;
  totalProductsSold: number;
  averageMonthlyRevenue: number;
  averageProductROI: number;
  seasonalityPattern?: string;
  lastUpdated: string;
}
