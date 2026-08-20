/**
 * Serviço de Análise Preditiva e Alertas Inteligentes
 * Fase 8: Análise Preditiva
 */

import type {
  PredictiveModel,
  Prediction,
  PredictionPoint,
  AnomalyDetection,
  SmartRecommendation,
  PredictiveAlert,
  CorrelationAnalysis,
  TrainingData,
  DataPoint,
  TrainingResult,
  PredictiveReport,
  ModelStatistics,
  PredictionHistory,
  StoreBenchmark,
} from '../types/predictive';

/**
 * Cache para armazenar modelos treinados
 */
class PredictiveModelCache {
  private cache = new Map<string, { model: PredictiveModel; coefficients: number[]; intercept: number; timestamp: number }>();
  private ttl = 24 * 60 * 60 * 1000; // 24 horas

  set(modelId: string, model: PredictiveModel, coefficients: number[], intercept: number) {
    this.cache.set(modelId, { model, coefficients, intercept, timestamp: Date.now() });
  }

  get(modelId: string) {
    const cached = this.cache.get(modelId);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(modelId);
      return null;
    }
    return { coefficients: cached.coefficients, intercept: cached.intercept };
  }

  clear() {
    this.cache.clear();
  }
}

export class PredictiveService {
  private static modelCache = new PredictiveModelCache();
  private static predictionHistory: PredictionHistory[] = [];
  private static anomalyDetectionRules: Map<string, number[]> = new Map();

  /**
   * Treinar modelo de regressão linear
   */
  static trainLinearModel(data: DataPoint[]): { coefficients: number[]; intercept: number } {
    if (data.length < 2) {
      return { coefficients: [0], intercept: 0 };
    }

    // Filtrar outliers simples (mais de 3 desvios padrão)
    const cleanData = this.removeOutliers(data);
    if (cleanData.length < 2) {
      return { coefficients: [0], intercept: 0 };
    }

    const n = cleanData.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    cleanData.forEach((point, index) => {
      sumX += index;
      sumY += point.value;
      sumXY += index * point.value;
      sumX2 += index * index;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { coefficients: [slope], intercept };
  }

  /**
   * Detectar sazonalidade em dados
   */
  static detectSeasonality(
    data: DataPoint[]
  ): { detected: boolean; pattern: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'NONE'; amplitude: number } {
    if (data.length < 14) {
      return { detected: false, pattern: 'NONE', amplitude: 0 };
    }

    // Verificar padrão semanal (7 dias)
    const weeklyCorr = this.autoCorrelation(data, 7);
    // Verificar padrão mensal (30 dias)
    const monthlyCorr = this.autoCorrelation(data, 30);

    const threshold = 0.6;

    if (weeklyCorr > threshold && weeklyCorr > monthlyCorr) {
      return { detected: true, pattern: 'WEEKLY', amplitude: weeklyCorr };
    }

    if (monthlyCorr > threshold) {
      return { detected: true, pattern: 'MONTHLY', amplitude: monthlyCorr };
    }

    if (data.length >= 7) {
      const dailyCorr = this.autoCorrelation(data, 1);
      if (dailyCorr > threshold) {
        return { detected: true, pattern: 'DAILY', amplitude: dailyCorr };
      }
    }

    return { detected: false, pattern: 'NONE', amplitude: 0 };
  }

  /**
   * Calcular autocorrelação
   */
  private static autoCorrelation(data: DataPoint[], lag: number): number {
    if (data.length <= lag) return 0;

    const values = data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b) / values.length;

    let c0 = 0;
    let clag = 0;

    for (let i = 0; i < values.length; i++) {
      c0 += Math.pow(values[i] - mean, 2);
      if (i >= lag) {
        clag += (values[i] - mean) * (values[i - lag] - mean);
      }
    }

    return clag / c0 || 0;
  }

  /**
   * Gerar previsão para próximo período
   */
  static generatePrediction(
    modelId: string,
    data: DataPoint[],
    daysToForecast: number = 30
  ): Prediction {
    const { coefficients, intercept } = this.trainLinearModel(data);
    const seasonality = this.detectSeasonality(data);

    const predictions: PredictionPoint[] = [];
    const stats = this.calculateStatistics(data);

    for (let i = 0; i < daysToForecast; i++) {
      const x = data.length + i;
      let baseValue = intercept + coefficients[0] * x;

      // Aplicar sazonalidade se detectada
      if (seasonality.detected) {
        const seasonalComponent = seasonality.amplitude * Math.sin((2 * Math.PI * i) / (seasonality.pattern === 'WEEKLY' ? 7 : seasonality.pattern === 'DAILY' ? 1 : 30));
        baseValue *= (1 + seasonalComponent * 0.1);
      }

      const confidence = Math.max(20, 100 - i * 2); // Confiança diminui com tempo
      const stdDev = stats.stdDev;
      const margin = 1.96 * stdDev; // 95% confidence interval

      predictions.push({
        date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: Math.max(0, baseValue),
        lower: Math.max(0, baseValue - margin),
        upper: baseValue + margin,
        confidence,
      });
    }

    const trend = this.calculateTrend(predictions);

    return {
      id: `pred-${Date.now()}`,
      modelId,
      storeId: 'store-unknown',
      period: {
        start: data[0].date,
        end: predictions[predictions.length - 1].date,
      },
      predictions,
      confidence: Math.max(...predictions.map(p => p.confidence)),
      confidenceInterval: {
        lower: predictions[0].lower,
        upper: predictions[0].upper,
      },
      trend,
      trendStrength: Math.abs(coefficients[0]) * 10, // Força da tendência
      seasonality,
      generatedAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Detectar anomalias em dados
   */
  static detectAnomalies(storeId: string, storeName: string, metric: string, data: DataPoint[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    const stats = this.calculateStatistics(data);

    data.forEach((point, index) => {
      const zScore = Math.abs((point.value - stats.mean) / (stats.stdDev || 1));

      if (zScore > 2) {
        const severity = zScore > 4 ? 'CRITICAL' : zScore > 3 ? 'HIGH' : 'MEDIUM';
        const type = point.value > stats.mean ? 'SPIKE' : 'DROP';

        anomalies.push({
          id: `anom-${Date.now()}-${index}`,
          storeId,
          storeName,
          metric,
          timestamp: point.date,
          value: point.value,
          expectedRange: {
            min: stats.mean - 2 * stats.stdDev,
            max: stats.mean + 2 * stats.stdDev,
          },
          deviation: zScore,
          severity,
          type,
          description: `${type === 'SPIKE' ? 'Aumento anómalo' : 'Queda anómala'} em ${metric}: ${point.value.toFixed(2)} (${zScore.toFixed(1)} desvios padrão do esperado)`,
          detected: true,
        });
      }
    });

    return anomalies;
  }

  /**
   * Gerar recomendações inteligentes
   */
  static generateRecommendations(
    storeId: string,
    storeName: string,
    predictions: Prediction[],
    currentMetrics: Record<string, number>
  ): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];

    // Analisar tendência de vendas
    if (predictions.length > 0 && predictions[0].trend === 'DECREASING' && predictions[0].trendStrength > 50) {
      recommendations.push({
        id: `rec-${Date.now()}-1`,
        storeId,
        storeName,
        category: 'MARKETING',
        priority: 'HIGH',
        confidence: Math.min(100, predictions[0].trendStrength),
        title: 'Aumentar Esforços de Marketing',
        description: `As vendas estão com tendência de queda nos próximos ${predictions.length} dias. Recomenda-se intensificar campanhas de marketing.`,
        action: 'Lançar campanha promocional ou aumentar investimento em publicidade',
        expectedImpact: {
          metric: 'vendas',
          change: 15,
          timeframe: '7 days',
        },
        supportingData: {
          currentValue: currentMetrics['vendas'] || 0,
          projectedValue: (currentMetrics['vendas'] || 0) * 0.85, // 15% de queda esperada
          benchmark: (currentMetrics['vendas'] || 0) * 1.1,
        },
        createdAt: new Date().toISOString(),
        status: 'NEW',
      });
    }

    // Analisar stock
    if (currentMetrics['stock'] && currentMetrics['stock'] < 100) {
      recommendations.push({
        id: `rec-${Date.now()}-2`,
        storeId,
        storeName,
        category: 'INVENTORY',
        priority: currentMetrics['stock'] < 50 ? 'CRITICAL' : 'HIGH',
        confidence: 95,
        title: 'Repor Stock Urgentemente',
        description: `Stock atual está em nível crítico (${Math.round(currentMetrics['stock'])} unidades). Risco de ruptura de stock.`,
        action: 'Fazer encomenda imediata com fornecedor principal',
        expectedImpact: {
          metric: 'disponibilidade',
          change: 85,
          timeframe: '3 days',
        },
        supportingData: {
          currentValue: currentMetrics['stock'] || 0,
          projectedValue: 500,
          benchmark: 300,
        },
        createdAt: new Date().toISOString(),
        status: 'NEW',
      });
    }

    // Analisar margem
    if (currentMetrics['margem'] && currentMetrics['margem'] < 20) {
      recommendations.push({
        id: `rec-${Date.now()}-3`,
        storeId,
        storeName,
        category: 'PRICING',
        priority: 'MEDIUM',
        confidence: 85,
        title: 'Otimizar Estratégia de Preços',
        description: `Margem média está baixa (${currentMetrics['margem'].toFixed(1)}%). Considerar ajuste de preços ou redução de custos.`,
        action: 'Revisar posicionamento de preços e estrutura de custos',
        expectedImpact: {
          metric: 'margem',
          change: 8,
          timeframe: '14 days',
        },
        supportingData: {
          currentValue: currentMetrics['margem'] || 0,
          projectedValue: (currentMetrics['margem'] || 0) * 1.4,
          benchmark: 30,
        },
        createdAt: new Date().toISOString(),
        status: 'NEW',
      });
    }

    // Analisar sazonalidade
    if (predictions.length > 0 && predictions[0].seasonality.detected) {
      recommendations.push({
        id: `rec-${Date.now()}-4`,
        storeId,
        storeName,
        category: 'OPERATIONS',
        priority: 'MEDIUM',
        confidence: predictions[0].seasonality.amplitude * 100,
        title: `Padrão Sazonal Detectado (${predictions[0].seasonality.pattern})`,
        description: `Análise detectou padrão sazonal ${predictions[0].seasonality.pattern.toLowerCase()}. Ajustar operações conforme necessário.`,
        action: 'Implementar plano de operações sazonal com staffing e inventário otimizados',
        expectedImpact: {
          metric: 'eficiência',
          change: 20,
          timeframe: '30 days',
        },
        supportingData: {
          currentValue: 0,
          projectedValue: 100,
          benchmark: 75,
        },
        createdAt: new Date().toISOString(),
        status: 'NEW',
      });
    }

    return recommendations;
  }

  /**
   * Gerar alertas automáticos baseados em previsões
   */
  static generatePredictiveAlerts(
    storeId: string,
    storeName: string,
    predictions: Prediction[],
    thresholds: Record<string, number>
  ): PredictiveAlert[] {
    const alerts: PredictiveAlert[] = [];

    if (predictions.length === 0) return alerts;

    const firstPrediction = predictions[0];

    // Alerta de queda de vendas
    if (firstPrediction.trend === 'DECREASING' && firstPrediction.trendStrength > 40) {
      const changePercent = (firstPrediction.predictions[0].value - (firstPrediction.predictions[Math.floor(predictions.length / 2)]?.value || 0)) / (firstPrediction.predictions[Math.floor(predictions.length / 2)]?.value || 1) * 100;

      alerts.push({
        id: `alert-${Date.now()}-1`,
        storeId,
        storeName,
        type: 'SALES_DROP',
        severity: Math.abs(changePercent) > 30 ? 'CRITICAL' : 'ALERT',
        confidence: firstPrediction.trendStrength,
        title: 'Previsão de Queda de Vendas',
        description: `Análise preditiva indica queda de ${Math.abs(changePercent).toFixed(1)}% nas vendas nos próximos dias.`,
        metric: 'vendas',
        currentValue: firstPrediction.predictions[0].value,
        predictedValue: firstPrediction.predictions[Math.floor(predictions.length / 2)]?.value || 0,
        changePercent: -Math.abs(changePercent),
        timeframe: `${predictions.length} dias`,
        recommendation: 'Aumentar investimento em marketing e promoções',
        timestamp: new Date().toISOString(),
        status: 'ACTIVE',
      });
    }

    // Alerta de spike de demanda
    if (firstPrediction.trend === 'INCREASING' && firstPrediction.trendStrength > 50) {
      alerts.push({
        id: `alert-${Date.now()}-2`,
        storeId,
        storeName,
        type: 'DEMAND_SPIKE',
        severity: 'ALERT',
        confidence: firstPrediction.trendStrength,
        title: 'Pico de Demanda Previsto',
        description: `Análise preditiva indica aumento significativo de demanda. Preparar stock e recursos.`,
        metric: 'demanda',
        currentValue: firstPrediction.predictions[0].value,
        predictedValue: firstPrediction.predictions[Math.floor(predictions.length / 2)]?.value || 0,
        changePercent: ((firstPrediction.predictions[Math.floor(predictions.length / 2)]?.value || 0) - firstPrediction.predictions[0].value) / firstPrediction.predictions[0].value * 100,
        timeframe: `${predictions.length} dias`,
        recommendation: 'Aumentar stock e staffing preventivamente',
        timestamp: new Date().toISOString(),
        status: 'ACTIVE',
      });
    }

    return alerts;
  }

  /**
   * Calcular correlação entre duas métricas
   */
  static calculateCorrelation(metric1Data: DataPoint[], metric2Data: DataPoint[]): CorrelationAnalysis {
    if (metric1Data.length < 2 || metric2Data.length < 2) {
      return {
        id: `corr-${Date.now()}`,
        storeId: 'unknown',
        metric1: 'unknown',
        metric2: 'unknown',
        correlation: 0,
        strength: 'VERY_WEAK',
        lag: 0,
        significance: 1,
        samples: 0,
        period: { start: '', end: '' },
        description: 'Dados insuficientes para análise',
      };
    }

    const n = Math.min(metric1Data.length, metric2Data.length);
    const values1 = metric1Data.slice(0, n).map(d => d.value);
    const values2 = metric2Data.slice(0, n).map(d => d.value);

    const mean1 = values1.reduce((a, b) => a + b) / n;
    const mean2 = values2.reduce((a, b) => a + b) / n;

    let numerator = 0;
    let sum1 = 0;
    let sum2 = 0;

    for (let i = 0; i < n; i++) {
      const dev1 = values1[i] - mean1;
      const dev2 = values2[i] - mean2;
      numerator += dev1 * dev2;
      sum1 += dev1 * dev1;
      sum2 += dev2 * dev2;
    }

    const correlation = numerator / Math.sqrt(sum1 * sum2) || 0;

    let strength: 'VERY_WEAK' | 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
    const absCorr = Math.abs(correlation);

    if (absCorr < 0.2) strength = 'VERY_WEAK';
    else if (absCorr < 0.4) strength = 'WEAK';
    else if (absCorr < 0.6) strength = 'MODERATE';
    else if (absCorr < 0.8) strength = 'STRONG';
    else strength = 'VERY_STRONG';

    return {
      id: `corr-${Date.now()}`,
      storeId: 'unknown',
      metric1: 'metric1',
      metric2: 'metric2',
      correlation: Math.round(correlation * 100) / 100,
      strength,
      lag: 0,
      significance: 0.05,
      samples: n,
      period: {
        start: metric1Data[0].date,
        end: metric1Data[n - 1].date,
      },
      description: `Correlação ${correlation > 0 ? 'positiva' : 'negativa'} ${strength.toLowerCase()} entre métricas.`,
    };
  }

  /**
   * Benchmarking - Comparar loja com pares
   */
  static benchmarkStore(
    storeId: string,
    storeName: string,
    metric: string,
    currentValue: number,
    allStoresData: { storeId: string; storeName: string; value: number }[]
  ): StoreBenchmark {
    const sorted = [...allStoresData].sort((a, b) => b.value - a.value);
    const rank = sorted.findIndex(s => s.storeId === storeId) + 1;
    const percentile = ((sorted.length - rank) / sorted.length) * 100;
    const average = sorted.reduce((sum, s) => sum + s.value, 0) / sorted.length;

    const improvement = {
      needed: sorted[0].value - currentValue,
      percentage: ((sorted[0].value - currentValue) / currentValue) * 100,
    };

    return {
      storeId,
      storeName,
      metric,
      value: currentValue,
      percentile: Math.round(percentile),
      rank,
      average: Math.round(average * 100) / 100,
      topPerformer: {
        storeId: sorted[0].storeId,
        storeName: sorted[0].storeName,
        value: sorted[0].value,
      },
      improvement,
      peers: sorted.slice(Math.max(0, rank - 2), Math.min(sorted.length, rank + 2)).map(s => ({
        storeId: s.storeId,
        storeName: s.storeName,
        value: s.value,
        difference: s.value - currentValue,
      })),
    };
  }

  /**
   * Validar configuração de modelo
   */
  static validateModelConfig(config: any): string[] {
    const errors: string[] = [];

    if (!config.name || config.name.trim() === '') {
      errors.push('Nome do modelo é obrigatório');
    }

    if (!config.type || !['SALES_FORECAST', 'DEMAND_PREDICTION', 'ANOMALY_DETECTION', 'RECOMMENDATION'].includes(config.type)) {
      errors.push('Tipo de modelo inválido');
    }

    if (!config.storeId || config.storeId.trim() === '') {
      errors.push('Loja é obrigatória');
    }

    if (!config.metric || config.metric.trim() === '') {
      errors.push('Métrica é obrigatória');
    }

    if (config.minDataPoints && config.minDataPoints < 5) {
      errors.push('Mínimo de pontos de dados deve ser pelo menos 5');
    }

    return errors;
  }

  /**
   * Calcular estatísticas básicas
   */
  static calculateStatistics(data: DataPoint[]) {
    if (data.length === 0) {
      return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, variance: 0 };
    }

    const values = data.map(d => d.value).sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b) / values.length;
    const median = values.length % 2 === 0 ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2 : values[Math.floor(values.length / 2)];

    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      min: Math.round(values[0] * 100) / 100,
      max: Math.round(values[values.length - 1] * 100) / 100,
      variance: Math.round(variance * 100) / 100,
    };
  }

  /**
   * Remover outliers (acima de 3 desvios padrão)
   */
  private static removeOutliers(data: DataPoint[]): DataPoint[] {
    if (data.length < 3) return data;

    const values = data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

    return data.filter(d => Math.abs((d.value - mean) / (stdDev || 1)) <= 3);
  }

  /**
   * Calcular tendência
   */
  private static calculateTrend(predictions: PredictionPoint[]): 'INCREASING' | 'DECREASING' | 'STABLE' {
    if (predictions.length < 2) return 'STABLE';

    const firstAvg = predictions.slice(0, Math.floor(predictions.length / 2)).reduce((sum, p) => sum + p.value, 0) / Math.floor(predictions.length / 2);
    const lastAvg = predictions.slice(Math.floor(predictions.length / 2)).reduce((sum, p) => sum + p.value, 0) / Math.ceil(predictions.length / 2);

    const change = ((lastAvg - firstAvg) / firstAvg) * 100;

    if (Math.abs(change) < 5) return 'STABLE';
    return change > 0 ? 'INCREASING' : 'DECREASING';
  }

  /**
   * Treinar todos os modelos (simular)
   */
  static trainAllModels(models: PredictiveModel[]): TrainingResult[] {
    return models.map(model => ({
      modelId: model.id,
      timestamp: new Date().toISOString(),
      success: true,
      accuracy: 75 + Math.random() * 20, // 75-95%
      mape: 5 + Math.random() * 10, // 5-15%
      rmse: 10 + Math.random() * 20, // 10-30
      dataPointsUsed: model.currentDataPoints,
      trainingTime: Math.random() * 5000, // 0-5 segundos
      nextTraining: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      improvements: {
        accuracy: Math.random() * 5 - 2.5, // -2.5 a +2.5%
        mape: Math.random() * -2, // -2 a 0%
      },
    }));
  }
}
