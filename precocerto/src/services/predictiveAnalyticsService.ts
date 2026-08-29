/**
 * Predictive Analytics Service
 * FASE 6: Machine Learning
 *
 * Responsabilidades:
 * - Previsão de demanda baseada em histórico
 * - Análise de sazonalidade
 * - Detecção de anomalias em vendas
 * - Sugestões automáticas de reorder
 * - Análise de elasticidade de preço
 */

export interface SalesDataPoint {
  date: string;
  quantity: number;
  revenue: number;
  margin: number;
  price?: number;
}

export interface DemandForecast {
  productId: string;
  productName: string;
  forecastPeriod: {
    start: string;
    end: string;
    days: number;
  };
  forecast: {
    date: string;
    expectedQuantity: number;
    confidence: number; // 0-1
  }[];
  trend: 'up' | 'down' | 'stable';
  seasonality: {
    pattern: string;
    peak: number; // mes
    low: number; // mes
  } | null;
  recommendation: {
    reorderQuantity: number;
    optimalPrice: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export interface AnomalyAlert {
  id: string;
  type: 'unusual_sales_spike' | 'unusual_sales_drop' | 'price_anomaly' | 'margin_anomaly';
  severity: 'low' | 'medium' | 'high';
  productId: string;
  productName: string;
  description: string;
  expectedValue: number;
  actualValue: number;
  deviation: number; // percentual
  timestamp: string;
  recommendedAction?: string;
}

/**
 * Classe para análise preditiva com Machine Learning
 */
export class PredictiveAnalyticsService {
  /**
   * ========================================
   * PREVISÃO DE DEMANDA
   * ========================================
   */

  /**
   * Prever demanda futura usando Moving Average
   * Algoritmo: ARIMA simplificado (Moving Average de 7 dias)
   */
  static forecastDemand(
    productId: string,
    productName: string,
    historicalData: SalesDataPoint[],
    forecastDays: number = 7
  ): DemandForecast {
    // Validar dados
    if (historicalData.length < 7) {
      console.warn(`⚠️ Dados insuficientes para ${productName}. Usando fallback.`);
      return this.createFallbackForecast(productId, productName, forecastDays);
    }

    // Calcular moving average de 7 dias
    const movingAverages = this.calculateMovingAverage(
      historicalData.map((d) => d.quantity),
      7
    );

    // Usar último valor como base
    const lastMA = movingAverages[movingAverages.length - 1];

    // Calcular trend
    const trend = this.calculateTrend(movingAverages);

    // Calcular sazonalidade (se > 30 dias de dados)
    const seasonality =
      historicalData.length >= 30
        ? this.detectSeasonality(historicalData)
        : null;

    // Gerar forecast
    const forecast = [];
    let lastValue = lastMA;

    for (let i = 1; i <= forecastDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      let trendFactor = 0;
      if (trend === 'up') {
        trendFactor = 1.02; // +2% por dia
      } else if (trend === 'down') {
        trendFactor = 0.98; // -2% por dia
      }

      // Aplicar sazonalidade se disponível
      let seasonalFactor = 1;
      if (seasonality) {
        const month = date.getMonth() + 1;
        if (month === seasonality.peak) {
          seasonalFactor = 1.3; // +30% em mês de pico
        } else if (month === seasonality.low) {
          seasonalFactor = 0.7; // -30% em mês baixo
        }
      }

      // Confidence decresce com distância
      const confidence = Math.max(0.5, 1 - i / (forecastDays * 2));

      const expectedQuantity = Math.round(lastValue * trendFactor * seasonalFactor);

      forecast.push({
        date: date.toISOString().split('T')[0],
        expectedQuantity: Math.max(0, expectedQuantity),
        confidence,
      });

      lastValue = expectedQuantity;
    }

    // Calcular recomendação
    const avgForecast = forecast.reduce((sum, f) => sum + f.expectedQuantity, 0) / forecast.length;
    const safetyStock = Math.ceil(avgForecast * 1.2); // +20% de buffer

    return {
      productId,
      productName,
      forecastPeriod: {
        start: forecast[0].date,
        end: forecast[forecast.length - 1].date,
        days: forecastDays,
      },
      forecast,
      trend,
      seasonality,
      recommendation: {
        reorderQuantity: Math.max(safetyStock, Math.ceil(avgForecast * 2)),
        optimalPrice: this.calculateOptimalPrice(historicalData),
        riskLevel: this.assessRiskLevel(trend, seasonality),
      },
    };
  }

  /**
   * ========================================
   * DETECÇÃO DE ANOMALIAS
   * ========================================
   */

  /**
   * Detectar anomalias em vendas usando desvio padrão
   */
  static detectAnomalies(
    productId: string,
    productName: string,
    historicalData: SalesDataPoint[],
    threshold: number = 2.5 // Standard deviations
  ): AnomalyAlert[] {
    const alerts: AnomalyAlert[] = [];

    if (historicalData.length < 7) {
      return alerts; // Dados insuficientes
    }

    // Análise de quantidade
    const quantities = historicalData.map((d) => d.quantity);
    const qtyStats = this.calculateStats(quantities);

    historicalData.forEach((data, index) => {
      if (index === 0) return; // Skip primeiro ponto

      const deviation = Math.abs(data.quantity - qtyStats.mean) / qtyStats.stdDev;

      if (deviation > threshold) {
        const type =
          data.quantity > qtyStats.mean
            ? 'unusual_sales_spike'
            : 'unusual_sales_drop';

        alerts.push({
          id: `anomaly-${productId}-${index}`,
          type,
          severity: deviation > threshold * 1.5 ? 'high' : 'medium',
          productId,
          productName,
          description: `Quantidade de ${data.quantity} é ${deviation.toFixed(1)}σ do normal`,
          expectedValue: qtyStats.mean,
          actualValue: data.quantity,
          deviation: ((data.quantity - qtyStats.mean) / qtyStats.mean) * 100,
          timestamp: data.date,
          recommendedAction:
            type === 'unusual_sales_spike'
              ? 'Verificar se há promoção ou evento especial'
              : 'Investigar possível falta de stock ou problema de suprimento',
        });
      }
    });

    // Análise de margem
    const margins = historicalData.map((d) => d.margin);
    const marginStats = this.calculateStats(margins);

    historicalData.forEach((data, index) => {
      const marginDeviation = Math.abs(data.margin - marginStats.mean) / marginStats.stdDev;

      if (marginDeviation > threshold) {
        alerts.push({
          id: `margin-anomaly-${productId}-${index}`,
          type: 'margin_anomaly',
          severity: marginDeviation > threshold * 1.5 ? 'high' : 'medium',
          productId,
          productName,
          description: `Margem de ${data.margin}% é ${marginDeviation.toFixed(1)}σ do normal`,
          expectedValue: marginStats.mean,
          actualValue: data.margin,
          deviation: ((data.margin - marginStats.mean) / marginStats.mean) * 100,
          timestamp: data.date,
          recommendedAction: 'Revisar precificação e custos do produto',
        });
      }
    });

    return alerts;
  }

  /**
   * ========================================
   * ANÁLISE DE SAZONALIDADE
   * ========================================
   */

  /**
   * Detectar padrões sazonais
   */
  private static detectSeasonality(
    data: SalesDataPoint[]
  ): { pattern: string; peak: number; low: number } | null {
    try {
      // Agrupar por mês
      const monthlyData: Record<number, number[]> = {};

      data.forEach((point) => {
        const date = new Date(point.date);
        const month = date.getMonth() + 1;

        if (!monthlyData[month]) {
          monthlyData[month] = [];
        }
        monthlyData[month].push(point.quantity);
      });

      if (Object.keys(monthlyData).length < 4) {
        return null; // Dados insuficientes
      }

      // Calcular média por mês
      const monthlyAverages: Record<number, number> = {};
      Object.entries(monthlyData).forEach(([month, values]) => {
        monthlyAverages[parseInt(month)] = values.reduce((a, b) => a + b) / values.length;
      });

      // Encontrar pico e baixo
      const sorted = Object.entries(monthlyAverages).sort((a, b) => b[1] - a[1]);
      const peak = parseInt(sorted[0][0]);
      const low = parseInt(sorted[sorted.length - 1][0]);

      // Calcular coeficiente de variação para pattern
      const avgValue = Object.values(monthlyAverages).reduce((a, b) => a + b) / Object.values(monthlyAverages).length;
      const cv = this.calculateCV(Object.values(monthlyAverages));

      let pattern = 'stable';
      if (cv > 0.3) pattern = 'highly_seasonal';
      else if (cv > 0.15) pattern = 'moderately_seasonal';

      return { pattern, peak, low };
    } catch (error) {
      console.error('Erro ao detectar sazonalidade:', error);
      return null;
    }
  }

  /**
   * ========================================
   * CÁLCULOS ESTATÍSTICOS
   * ========================================
   */

  /**
   * Calcular média móvel
   */
  private static calculateMovingAverage(values: number[], period: number): number[] {
    const result: number[] = [];

    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(values[i]);
      } else {
        const window = values.slice(i - period + 1, i + 1);
        const avg = window.reduce((a, b) => a + b) / window.length;
        result.push(avg);
      }
    }

    return result;
  }

  /**
   * Calcular estatísticas básicas
   */
  private static calculateStats(values: number[]): { mean: number; stdDev: number } {
    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
  }

  /**
   * Calcular coeficiente de variação
   */
  private static calculateCV(values: number[]): number {
    const stats = this.calculateStats(values);
    return stats.stdDev / stats.mean;
  }

  /**
   * Calcular trend
   */
  private static calculateTrend(
    values: number[]
  ): 'up' | 'down' | 'stable' {
    if (values.length < 3) return 'stable';

    const recent = values.slice(-7);
    const older = values.slice(-14, -7);

    const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b) / older.length;

    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (changePercent > 5) return 'up';
    if (changePercent < -5) return 'down';
    return 'stable';
  }

  /**
   * Avaliar nível de risco
   */
  private static assessRiskLevel(
    trend: 'up' | 'down' | 'stable',
    seasonality: { pattern: string; peak: number; low: number } | null
  ): 'low' | 'medium' | 'high' {
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    if (trend === 'down') riskLevel = 'medium';
    if (seasonality?.pattern === 'highly_seasonal') riskLevel = 'medium';
    if (trend === 'down' && seasonality?.pattern === 'highly_seasonal') riskLevel = 'high';

    return riskLevel;
  }

  /**
   * Calcular preço ótimo baseado em histórico
   */
  private static calculateOptimalPrice(data: SalesDataPoint[]): number {
    if (data.length === 0) return 0;

    // Usar preço com melhor margin/quantity ratio
    let bestPrice = data[0].price || 0;
    let bestRatio = 0;

    data.forEach((d) => {
      if (d.price && d.margin && d.quantity) {
        const ratio = (d.margin * d.quantity) / d.price;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestPrice = d.price;
        }
      }
    });

    return Math.round(bestPrice * 100) / 100;
  }

  /**
   * Criar forecast padrão quando dados insuficientes
   */
  private static createFallbackForecast(
    productId: string,
    productName: string,
    days: number
  ): DemandForecast {
    const forecast = [];
    const baseQuantity = 10; // padrão

    for (let i = 1; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      forecast.push({
        date: date.toISOString().split('T')[0],
        expectedQuantity: baseQuantity,
        confidence: 0.5, // baixa confiança
      });
    }

    return {
      productId,
      productName,
      forecastPeriod: {
        start: forecast[0].date,
        end: forecast[forecast.length - 1].date,
        days,
      },
      forecast,
      trend: 'stable',
      seasonality: null,
      recommendation: {
        reorderQuantity: Math.ceil(baseQuantity * 2),
        optimalPrice: 0,
        riskLevel: 'high',
      },
    };
  }

  /**
   * Gerar sumário de análise preditiva
   */
  static generatePredictiveSummary(
    products: Array<{ id: string; name: string; data: SalesDataPoint[] }>
  ): {
    totalProducts: number;
    highRiskCount: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let highRiskCount = 0;

    products.forEach((product) => {
      const forecast = this.forecastDemand(
        product.id,
        product.name,
        product.data,
        7
      );

      if (forecast.recommendation.riskLevel === 'high') {
        highRiskCount++;
        recommendations.push(
          `⚠️ ${product.name}: Risco alto - Considere revisar precificação`
        );
      }

      if (forecast.trend === 'down') {
        recommendations.push(`📉 ${product.name}: Tendência descendente`);
      }

      if (forecast.seasonality?.pattern === 'highly_seasonal') {
        recommendations.push(
          `📊 ${product.name}: Muito sazonal (pico mês ${forecast.seasonality.peak})`
        );
      }
    });

    return {
      totalProducts: products.length,
      highRiskCount,
      recommendations: recommendations.slice(0, 10), // Top 10
    };
  }
}
