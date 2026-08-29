/**
 * Tipos para Análise Preditiva e Machine Learning
 * FASE 5-6: Análise Preditiva
 *
 * Definições de interfaces para previsão de demanda, detecção de anomalias,
 * e análise de tendências usando histórico de vendas.
 */

/**
 * Dados históricos de uma venda
 * Agregado por dia para análise mais eficiente
 */
export interface DailySalesAggregate {
  date: string; // YYYY-MM-DD
  storeId: string;
  productId: string;

  // Métricas de vendas
  unitsSlod: number; // Unidades vendidas
  totalRevenue: number; // Receita total (Kz)
  totalCost: number; // Custo total (Kz)
  totalProfit: number; // Lucro (Kz)
  profitMargin: number; // Percentagem (%)

  // Frequência de vendas
  transactionCount: number; // Número de transações
  avgTransactionValue: number; // Valor médio por transação

  // Estoque
  stockStart: number; // Stock no início do dia
  stockEnd: number; // Stock no final do dia
  stockTurnover: number; // Rotatividade de estoque

  // Padrões
  peakHour?: string; // Hora de pico (HH:MM)
  topPaymentMethod?: string; // Método de pagamento mais comum

  createdAt: string; // ISO timestamp
}

/**
 * Previsão de demanda para um produto
 */
export interface DemandForecast {
  id: string;
  storeId: string;
  productId: string;
  productName: string;

  // Período de previsão
  forecastDate: string; // YYYY-MM-DD (data para a qual estamos prevendo)
  forecastPeriod: 'day' | 'week' | 'month'; // Horizonte de previsão

  // Valores previstos
  predictedUnits: number; // Unidades esperadas
  predictedRevenue: number; // Receita esperada
  confidenceInterval: { lower: number; upper: number }; // Intervalo de confiança
  confidence: number; // Percentagem de confiança (0-100)

  // Método usado
  method: 'moving_average' | 'exponential_smoothing' | 'linear_regression' | 'seasonal';

  // Histórico usado
  historicalDataPoints: number; // Quantos dias de história foram usados
  daysAnalyzed: number; // Período de análise

  // Padrões detectados
  trend: 'increasing' | 'decreasing' | 'stable'; // Tendência geral
  seasonality: 'high' | 'medium' | 'low'; // Sazonalidade detectada
  volatility: number; // Volatilidade (0-1, onde 1 é muito volátil)

  // Comparação
  vs_lastPeriod: {
    percentageChange: number; // % de mudança vs período anterior
    direction: 'up' | 'down' | 'stable';
  };
  vs_average: {
    percentageChange: number; // % de mudança vs média histórica
    direction: 'up' | 'down' | 'stable';
  };

  createdAt: string; // ISO timestamp
  generatedBy: string; // Método que criou a previsão
}

/**
 * Anomalia detectada em padrões de vendas
 */
export interface SalesAnomaly {
  id: string;
  storeId: string;
  productId?: string; // Opcional: anomalia pode ser por loja ou produto
  categoryId?: string;

  // Tipo de anomalia
  type:
    | 'low_sales' // Vendas abaixo do esperado
    | 'high_sales' // Vendas acima do esperado
    | 'unusual_margin' // Margem anormalmente baixa/alta
    | 'stock_mismatch' // Stock não corresponde a vendas
    | 'price_anomaly' // Preço anormalmente diferente
    | 'demand_spike' // Pico inesperado de demanda
    | 'demand_drop'; // Queda inesperada de demanda

  severity: 'INFO' | 'WARNING' | 'CRITICAL';

  // Detalhes da anomalia
  date: string; // YYYY-MM-DD
  actualValue: number; // Valor observado
  expectedValue: number; // Valor esperado
  deviation: number; // Desvios padrão (Z-score)
  deviationPercentage: number; // % de desvio

  // Contexto
  description: string; // Descrição legível (ex: "Vendas 60% abaixo da média")
  possibleCauses: string[]; // Possíveis causas
  recommendedActions: string[]; // Ações recomendadas

  // Status
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  notes?: string;

  createdAt: string;
}

/**
 * Recomendação de reabastecimento automático
 */
export interface AutoReorderRecommendation {
  id: string;
  storeId: string;
  productId: string;
  productName: string;

  // Stock atual
  currentStock: number;
  minimumStock: number;

  // Previsão
  forecastedDemand: number; // Demanda prevista para próximo período
  daysUntilStockout: number; // Dias até esgotar

  // Recomendação
  recommendedQuantity: number; // Quantidade a reabastecer
  recommendedUrgency: 'immediate' | 'soon' | 'planned'; // Urgência
  reason: string; // Motivo da recomendação

  // Lead time
  supplierLeadDays: number; // Dias que o fornecedor leva para entregar
  optimalOrderDate: string; // Data ideal para fazer a encomenda (YYYY-MM-DD)

  // Impacto financeiro
  estimatedCost: number; // Custo estimado
  storageCapacity: number; // Espaço disponível

  // Status
  implemented: boolean;
  implementedAt?: string;
  implementedQuantity?: number;

  createdAt: string;
  expiresAt: string; // Validade da recomendação
}

/**
 * Análise de tendências de um produto
 */
export interface ProductTrendAnalysis {
  id: string;
  storeId: string;
  productId: string;
  productName: string;

  // Período de análise
  period: {
    startDate: string; // YYYY-MM-DD
    endDate: string;
    daysAnalyzed: number;
  };

  // Tendências
  salesTrend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    percentageChange: number; // % de mudança
    daysToReach: number; // Dias para atingir o dobro/metade
    trendStrength: number; // 0-1, onde 1 é muito forte
  };

  revenueTrend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    percentageChange: number;
  };

  marginTrend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    percentageChange: number;
  };

  // Sazonalidade
  seasonalPattern: {
    detected: boolean;
    season: 'peak' | 'off-season' | 'none';
    strength: number; // 0-1
    peakMonths?: number[]; // Meses de pico (1-12)
    offSeasonMonths?: number[];
  };

  // Comparações
  rankings: {
    byUnits: number; // Ranking por unidades vendidas (1 = melhor)
    byRevenue: number;
    byMargin: number;
    totalProducts: number; // Número de produtos comparados
  };

  // Oportunidades
  opportunities: string[]; // Oportunidades identificadas
  risks: string[]; // Riscos identificados

  createdAt: string;
}

/**
 * Dashboard executivo com insights preditivos
 */
export interface ExecutiveDashboard {
  id: string;
  storeId: string;
  generatedAt: string;

  // KPIs de previsão
  predictions: {
    nextDayRevenue: number;
    nextWeekRevenue: number;
    nextMonthRevenue: number;
    growthRate: number; // % de crescimento esperado
  };

  // Alertas prioritários
  criticalAlerts: SalesAnomaly[];
  lowStockProducts: AutoReorderRecommendation[];
  expiringProducts: { productId: string; productName: string; daysLeft: number }[];

  // Oportunidades
  topGrowingProducts: Array<{
    productId: string;
    productName: string;
    growthRate: number;
  }>;

  lowestPerformingProducts: Array<{
    productId: string;
    productName: string;
    reason: string;
  }>;

  // Recomendações automáticas
  recommendations: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    estimatedImpact: string; // Ex: "+15% revenue"
    actionItems: string[];
  }>;

  // Métricas de saúde
  healthScore: {
    overallScore: number; // 0-100
    byMetric: {
      salesHealth: number;
      profitabilityHealth: number;
      stockHealth: number;
      expiryHealth: number;
    };
  };
}

/**
 * Configuração de análise preditiva por loja
 */
export interface PredictiveAnalyticsConfig {
  id: string;
  storeId: string;

  // Ativar/desativar funcionalidades
  enabled: boolean;
  enableDemandForecasting: boolean;
  enableAnomalyDetection: boolean;
  enableAutoReorder: boolean;
  enableTrendAnalysis: boolean;

  // Parâmetros de análise
  historyWindowDays: number; // Quantos dias de história usar (padrão: 90)
  forecastHorizonDays: number; // Horizonte de previsão (padrão: 14)

  // Detecção de anomalias
  anomalyDetection: {
    enabled: boolean;
    zScoreThreshold: number; // Quantos desvios padrão (padrão: 2.5)
    minDataPoints: number; // Mínimo de pontos para detectar (padrão: 10)
    enableMarginAnomaly: boolean;
    enableStockAnomaly: boolean;
  };

  // Auto-reorder
  autoReorder: {
    enabled: boolean;
    useForecasting: boolean; // Usar previsão ou apenas stock mínimo
    leadTimeBuffer: number; // Dias extra de segurança (padrão: 3)
    minReorderQuantity: number; // Quantidade mínima (padrão: 10)
  };

  // Notificações
  notifications: {
    enableAnomalyAlerts: boolean;
    enableReorderRecommendations: boolean;
    enableTrendInsights: boolean;
    alertChannels: ('in-app' | 'email' | 'whatsapp')[];
  };

  updatedAt: string;
}
