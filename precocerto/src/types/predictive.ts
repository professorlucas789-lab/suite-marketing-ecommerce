/**
 * Tipos e Interfaces para Análise Preditiva
 * Fase 8: Análise Preditiva e Alertas Inteligentes
 */

/**
 * Configuração de Modelo Preditivo
 */
export interface PredictiveModel {
  id: string;
  name: string;
  type: 'SALES_FORECAST' | 'DEMAND_PREDICTION' | 'ANOMALY_DETECTION' | 'RECOMMENDATION';
  storeId: string;
  storeName: string;
  metric: 'vendas' | 'produtos' | 'usuarios' | 'preco' | 'margem' | 'stock';
  status: 'TRAINING' | 'READY' | 'ACTIVE' | 'INACTIVE' | 'FAILED';
  accuracy: number;                                    // 0-100%
  lastTraining: string;                               // ISO timestamp
  nextTraining: string;                               // ISO timestamp
  trainingInterval: 'DAILY' | 'WEEKLY' | 'MONTHLY';  // Frequência de retrainamento
  minDataPoints: number;                              // Mínimo de pontos para treinar
  currentDataPoints: number;                          // Pontos disponíveis
  createdAt: string;
  createdBy: string;
}

/**
 * Previsão Gerada por Modelo
 */
export interface Prediction {
  id: string;
  modelId: string;
  storeId: string;
  period: {
    start: string;
    end: string;
  };
  predictions: PredictionPoint[];                     // Array de valores previstos
  confidence: number;                                 // 0-100%
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  trendStrength: number;                              // 0-100%
  seasonality: {
    detected: boolean;
    pattern: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
    amplitude: number;
  };
  generatedAt: string;
  validUntil: string;
  accuracy?: number;                                  // Acurácia histórica do modelo
}

/**
 * Ponto Individual de Previsão
 */
export interface PredictionPoint {
  date: string;
  value: number;
  lower: number;                                      // Limite inferior (95% confiança)
  upper: number;                                      // Limite superior (95% confiança)
  confidence: number;
}

/**
 * Detecção de Anomalia
 */
export interface AnomalyDetection {
  id: string;
  storeId: string;
  storeName: string;
  metric: string;
  timestamp: string;
  value: number;
  expectedRange: {
    min: number;
    max: number;
  };
  deviation: number;                                  // Desvios padrão do esperado
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: 'SPIKE' | 'DROP' | 'TREND_CHANGE' | 'PATTERN_BREAK';
  description: string;
  detected: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
}

/**
 * Recomendação Inteligente
 */
export interface SmartRecommendation {
  id: string;
  storeId: string;
  storeName: string;
  category: 'INVENTORY' | 'PRICING' | 'MARKETING' | 'OPERATIONS' | 'STAFFING';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;                                 // 0-100%
  title: string;
  description: string;
  action: string;
  expectedImpact: {
    metric: string;
    change: number;                                   // Percentual esperado
    timeframe: string;                                // e.g., "7 days", "1 month"
  };
  supportingData: {
    currentValue: number;
    projectedValue: number;
    benchmark: number;
  };
  createdAt: string;
  status: 'NEW' | 'VIEWED' | 'IMPLEMENTED' | 'IGNORED' | 'DISMISSED';
  implementedAt?: string;
  feedback?: string;
}

/**
 * Alerta Automático Baseado em Previsão
 */
export interface PredictiveAlert {
  id: string;
  storeId: string;
  storeName: string;
  type: 'SALES_DROP' | 'STOCK_WARNING' | 'DEMAND_SPIKE' | 'PRICE_ANOMALY' | 'TREND_REVERSAL';
  severity: 'WARNING' | 'ALERT' | 'CRITICAL';
  confidence: number;                                 // 0-100%
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  predictedValue: number;
  changePercent: number;
  timeframe: string;                                  // Quando ocorrerá
  recommendation: string;
  timestamp: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

/**
 * Análise de Correlação entre Métricas
 */
export interface CorrelationAnalysis {
  id: string;
  storeId: string;
  metric1: string;
  metric2: string;
  correlation: number;                               // -1 a 1
  strength: 'VERY_WEAK' | 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
  lag: number;                                        // Dias de diferença
  significance: number;                               // p-value
  samples: number;
  period: {
    start: string;
    end: string;
  };
  description: string;
}

/**
 * Dados de Treino para Modelo
 */
export interface TrainingData {
  id: string;
  modelId: string;
  storeId: string;
  startDate: string;
  endDate: string;
  dataPoints: DataPoint[];
  statistics: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    variance: number;
  };
  quality: number;                                    // 0-100%
  missingValues: number;
  outliers: number;
}

/**
 * Ponto de Dado Individual para Treino
 */
export interface DataPoint {
  date: string;
  value: number;
  isOutlier?: boolean;
  weight?: number;                                    // Para dar peso a dados recentes
}

/**
 * Comparação de Lojas (Benchmarking)
 */
export interface StoreBenchmark {
  storeId: string;
  storeName: string;
  metric: string;
  value: number;
  percentile: number;                                // 0-100
  rank: number;
  average: number;
  topPerformer: {
    storeId: string;
    storeName: string;
    value: number;
  };
  improvement: {
    needed: number;
    percentage: number;
  };
  peers: {
    storeId: string;
    storeName: string;
    value: number;
    difference: number;
  }[];
}

/**
 * Relatório de Análise Preditiva
 */
export interface PredictiveReport {
  id: string;
  generatedAt: string;
  generatedBy: string;
  period: {
    start: string;
    end: string;
  };
  storeIds: string[];
  summary: {
    activePredictions: number;
    activeAnomalies: number;
    recommendations: number;
    alerts: number;
    modelsReady: number;
    accuracy: number;                                 // Média de acurácia
  };
  predictions: Prediction[];
  anomalies: AnomalyDetection[];
  recommendations: SmartRecommendation[];
  alerts: PredictiveAlert[];
  correlations: CorrelationAnalysis[];
  benchmarks: StoreBenchmark[];
  trends: {
    metric: string;
    direction: 'UP' | 'DOWN' | 'STABLE';
    strength: number;
  }[];
}

/**
 * Configuração de Treino de Modelo
 */
export interface ModelTrainingConfig {
  modelId: string;
  algorithm: 'LINEAR_REGRESSION' | 'EXPONENTIAL_SMOOTHING' | 'SEASONAL_DECOMPOSITION';
  timeframe: number;                                  // Dias de histórico a usar
  minConfidence: number;                              // Confiança mínima (0-100)
  seasonalityDetection: boolean;
  anomalyDetection: boolean;
  forecastPeriod: number;                            // Dias a prever
  retrainFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  autoOptimize: boolean;
}

/**
 * Resultado de Treino de Modelo
 */
export interface TrainingResult {
  modelId: string;
  timestamp: string;
  success: boolean;
  accuracy: number;
  mape: number;                                       // Mean Absolute Percentage Error
  rmse: number;                                       // Root Mean Square Error
  dataPointsUsed: number;
  trainingTime: number;                               // Milliseconds
  nextTraining: string;
  improvements: {
    accuracy: number;                                 // Mudança % vs. versão anterior
    mape: number;
  };
  errors?: string[];
}

/**
 * Configuração de Alerta Automático
 */
export interface AlertThreshold {
  id: string;
  storeId?: string;                                   // undefined = aplicar a todas as lojas
  metric: string;
  alertType: 'UPPER' | 'LOWER' | 'RANGE' | 'DEVIATION';
  thresholdValue: number;
  deviations?: number;                                // Para DEVIATION type
  severity: 'WARNING' | 'ALERT' | 'CRITICAL';
  enabled: boolean;
  createdAt: string;
  createdBy: string;
}

/**
 * Estatísticas de Modelo
 */
export interface ModelStatistics {
  modelId: string;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  averageConfidence: number;
  lastUpdated: string;
  performanceOverTime: {
    date: string;
    accuracy: number;
  }[];
}

/**
 * Histórico de Previsão para Validação
 */
export interface PredictionHistory {
  id: string;
  modelId: string;
  predictionDate: string;
  forecastDate: string;
  forecastedValue: number;
  actualValue: number;
  error: number;
  percentError: number;
  accuracy: number;                                   // 100 - percentError
  withinConfidenceInterval: boolean;
}
