/**
 * Market Analysis Types
 * Definições para análise de mercado por categoria
 * Será preenchido pela IA na Fase 3
 */

/**
 * CategoryMarketAnalysis
 * Análise de mercado para uma categoria
 */
export interface CategoryMarketAnalysis {
  id: string;
  userId: string;
  categoryId: string;

  analysisDate: string; // ISO date

  // Será preenchido na Fase 3
  metrics?: {
    averagePricePoint: number;
    priceRange: {
      min: number;
      max: number;
    };
    competitorAveragePricing?: number;
    demandTrend?: 'increasing' | 'stable' | 'decreasing';
    demandIntensity?: number; // 0-100
    seasonalFactor?: number; // 0-2
  };

  aiInsights?: {
    marginRecommendation: number;
    priceAdjustmentSuggestion: number;
    confidenceScore: number;
    riskFactors?: string[];
    opportunities?: string[];
  };

  decisions?: Decision[];

  createdAt: string;
  updatedAt: string;
}

/**
 * Decision
 * Histórico de decisões sobre margem/preço
 */
export interface Decision {
  type: 'margin_change' | 'price_change' | 'strategy_change';
  changedAt: string; // ISO date
  reason: string;
  result?: 'positive' | 'negative' | 'neutral';
  notes?: string;
}
