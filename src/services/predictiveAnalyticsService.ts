/**
 * Serviço de Análise Preditiva
 * FASE 5-6: Machine Learning
 *
 * Algoritmos de previsão de demanda, análise de tendências,
 * e recomendações automáticas baseadas em histórico de vendas.
 */

import {
  DailySalesAggregate,
  DemandForecast,
  ProductTrendAnalysis,
  AutoReorderRecommendation,
  ExecutiveDashboard,
  SalesAnomaly,
} from '../types/analytics';
import { Product, Sale } from '../types/store';

/**
 * Serviço estático para análise preditiva
 * Não acessa Firebase directamente - recebe dados do componente
 */
export class PredictiveAnalyticsService {
  /**
   * Calcular previsão de demanda usando média móvel exponencial
   * Ponderada com mais peso para dados recentes
   *
   * @param historicalData - Dados históricos agregados por dia
   * @param days - Dias a prever (1 para amanhã, 7 para próxima semana)
   * @returns Previsão com intervalo de confiança
   */
  static forecastDemandExponentialSmoothing(
    productId: string,
    storeId: string,
    historicalData: DailySalesAggregate[],
    forecastDays: number,
    alpha: number = 0.3 // Factor de suavização (0-1)
  ): DemandForecast {
    if (historicalData.length === 0) {
      throw new Error('Dados históricos insuficientes para previsão');
    }

    // Ordenar por data
    const sorted = [...historicalData].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Cálculo de suavização exponencial
    let forecast = sorted[0].unitsSlod;
    for (let i = 1; i < sorted.length; i++) {
      forecast = alpha * sorted[i].unitsSlod + (1 - alpha) * forecast;
    }

    // Calcular intervalo de confiança (usar desvio padrão histórico)
    const mean = sorted.reduce((sum, d) => sum + d.unitsSlod, 0) / sorted.length;
    const variance =
      sorted.reduce((sum, d) => sum + Math.pow(d.unitsSlod - mean, 2), 0) /
      sorted.length;
    const stdDev = Math.sqrt(variance);

    // Intervalo de 95% de confiança
    const confidenceInterval = {
      lower: Math.max(0, forecast - 1.96 * stdDev),
      upper: forecast + 1.96 * stdDev,
    };

    // Calcular tendência
    const recentAvg =
      sorted.slice(-7).reduce((sum, d) => sum + d.unitsSlod, 0) /
      Math.min(7, sorted.length);
    const olderAvg =
      sorted.slice(0, -7).reduce((sum, d) => sum + d.unitsSlod, 0) /
      Math.max(1, sorted.length - 7);
    const trend =
      recentAvg > olderAvg * 1.1
        ? 'increasing'
        : recentAvg < olderAvg * 0.9
          ? 'decreasing'
          : 'stable';

    // Detectar sazonalidade (simples: variação entre dias)
    const seasonality =
      stdDev > mean * 0.5 ? 'high' : stdDev > mean * 0.2 ? 'medium' : 'low';

    return {
      id: `forecast-${productId}-${Date.now()}`,
      storeId,
      productId,
      productName: historicalData[0]?.['productName'] || 'Desconhecido',
      forecastDate: new Date(
        new Date().getTime() + forecastDays * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split('T')[0],
      forecastPeriod: forecastDays === 1 ? 'day' : forecastDays <= 7 ? 'week' : 'month',
      predictedUnits: Math.round(forecast),
      predictedRevenue: 0, // Será preenchido com dados de preço
      confidenceInterval,
      confidence: Math.max(60, Math.min(95, 70 + sorted.length * 2)),
      method: 'exponential_smoothing',
      historicalDataPoints: sorted.length,
      daysAnalyzed: sorted.length,
      trend,
      seasonality: seasonality as 'high' | 'medium' | 'low',
      volatility: stdDev / (mean || 1),
      vs_lastPeriod: {
        percentageChange: ((recentAvg - olderAvg) / (olderAvg || 1)) * 100,
        direction: trend,
      },
      vs_average: {
        percentageChange: ((forecast - mean) / (mean || 1)) * 100,
        direction: forecast > mean * 1.05 ? 'up' : forecast < mean * 0.95 ? 'down' : 'stable',
      },
      createdAt: new Date().toISOString(),
      generatedBy: 'exponential_smoothing',
    };
  }

  /**
   * Detectar anomalias usando Z-score
   * Z > 2.5 é considerado anomalia
   *
   * @param data - Dados históricos
   * @param threshold - Quantos desvios padrão considerar anomalia (default: 2.5)
   */
  static detectAnomalies(
    data: DailySalesAggregate[],
    threshold: number = 2.5
  ): { anomalies: DailySalesAggregate[]; zScores: Map<string, number> } {
    const anomalies: DailySalesAggregate[] = [];
    const zScores = new Map<string, number>();

    if (data.length < 10) {
      return { anomalies, zScores }; // Dados insuficientes
    }

    // Calcular estatísticas
    const units = data.map((d) => d.unitsSlod);
    const mean = units.reduce((a, b) => a + b, 0) / units.length;
    const variance = units.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / units.length;
    const stdDev = Math.sqrt(variance);

    // Detectar anomalias
    for (const point of data) {
      const zScore = stdDev > 0 ? (point.unitsSlod - mean) / stdDev : 0;
      zScores.set(point.date, zScore);

      if (Math.abs(zScore) > threshold) {
        anomalies.push(point);
      }
    }

    return { anomalies, zScores };
  }

  /**
   * Calcular recomendação de reabastecimento automático
   * Baseada em previsão de demanda
   */
  static calculateAutoReorderRecommendation(
    productId: string,
    storeId: string,
    product: Product,
    forecast: DemandForecast,
    supplierLeadDays: number = 3
  ): AutoReorderRecommendation {
    const currentStock = product.quantidadeDisponível || 0;
    const minimumStock = product.quantidadeMinima || 0;

    // Dias até esgotar com demanda prevista
    const daysUntilStockout = Math.ceil(
      currentStock / (forecast.predictedUnits || 1)
    );

    // Quantidade a reabastecer
    // = Lead time demand + Minimum stock + Safety buffer - Current stock
    const leadTimeDemand = forecast.predictedUnits * supplierLeadDays;
    const safetyBuffer = minimumStock * 1.5; // 50% extra de segurança
    const recommendedQuantity = Math.max(
      minimumStock,
      leadTimeDemand + safetyBuffer - currentStock
    );

    // Urgência
    let recommendedUrgency: 'immediate' | 'soon' | 'planned';
    if (daysUntilStockout <= supplierLeadDays) {
      recommendedUrgency = 'immediate';
    } else if (daysUntilStockout <= supplierLeadDays + 7) {
      recommendedUrgency = 'soon';
    } else {
      recommendedUrgency = 'planned';
    }

    // Data ideal para encomendar
    const optimalDaysFromNow = Math.max(
      0,
      daysUntilStockout - supplierLeadDays - 2
    );
    const optimalDate = new Date();
    optimalDate.setDate(optimalDate.getDate() + optimalDaysFromNow);

    return {
      id: `reorder-${productId}-${Date.now()}`,
      storeId,
      productId,
      productName: product.nome,
      currentStock,
      minimumStock,
      forecastedDemand: forecast.predictedUnits,
      daysUntilStockout,
      recommendedQuantity: Math.round(recommendedQuantity),
      recommendedUrgency,
      reason: `Previsão indica ${forecast.predictedUnits} unidades/dia. Stock esgota em ${daysUntilStockout} dias.`,
      supplierLeadDays,
      optimalOrderDate: optimalDate.toISOString().split('T')[0],
      estimatedCost: recommendedQuantity * (product.precoCusto || 0),
      storageCapacity: 100, // TODO: Buscar do Firestore
      implemented: false,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Analisar tendências de um produto
   * Detecta padrões de crescimento, sazonalidade, etc.
   */
  static analyzeTrends(
    productId: string,
    storeId: string,
    product: Product,
    historicalData: DailySalesAggregate[],
    allProductsSales: DailySalesAggregate[]
  ): ProductTrendAnalysis {
    const sorted = [...historicalData].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (sorted.length < 7) {
      throw new Error('Dados insuficientes para análise de tendências (mínimo 7 dias)');
    }

    // Calcular tendências
    const recentUnits =
      sorted
        .slice(-7)
        .reduce((sum, d) => sum + d.unitsSlod, 0) / 7;
    const earlierUnits =
      sorted
        .slice(0, Math.max(1, sorted.length - 14))
        .reduce((sum, d) => sum + d.unitsSlod, 0) /
      Math.max(1, sorted.length - 14);

    const salesPercentageChange =
      earlierUnits > 0 ? ((recentUnits - earlierUnits) / earlierUnits) * 100 : 0;
    const salesDirection =
      salesPercentageChange > 5
        ? 'increasing'
        : salesPercentageChange < -5
          ? 'decreasing'
          : 'stable';

    // Sazonalidade (simples: padrão por dia da semana)
    const byDayOfWeek: Record<number, number[]> = {};
    sorted.forEach((d) => {
      const day = new Date(d.date).getDay();
      if (!byDayOfWeek[day]) byDayOfWeek[day] = [];
      byDayOfWeek[day].push(d.unitsSlod);
    });

    const avgByDay = Object.entries(byDayOfWeek).map(
      ([_, values]) => values.reduce((a, b) => a + b, 0) / values.length
    );
    const maxDay = Math.max(...avgByDay);
    const minDay = Math.min(...avgByDay);
    const seasonalityStrength =
      (maxDay - minDay) / (maxDay || 1);

    const seasonalityLevel =
      seasonalityStrength > 0.3
        ? 'high'
        : seasonalityStrength > 0.15
          ? 'medium'
          : 'low';

    // Rankings (comparar com outros produtos)
    const totalRevenue = sorted.reduce((sum, d) => sum + d.totalRevenue, 0);
    const allTotalRevenue = allProductsSales.reduce((sum, d) => sum + d.totalRevenue, 0);

    return {
      id: `trend-${productId}-${Date.now()}`,
      storeId,
      productId,
      productName: product.nome,
      period: {
        startDate: sorted[0].date,
        endDate: sorted[sorted.length - 1].date,
        daysAnalyzed: sorted.length,
      },
      salesTrend: {
        direction: salesDirection,
        percentageChange: salesPercentageChange,
        daysToReach: salesDirection === 'increasing' ? 30 : 999, // Simplificado
        trendStrength: Math.min(1, Math.abs(salesPercentageChange) / 50),
      },
      revenueTrend: {
        direction: salesDirection, // Assume proporcional a unidades
        percentageChange: salesPercentageChange,
      },
      marginTrend: {
        direction: 'stable', // TODO: Calcular com dados de custo
        percentageChange: 0,
      },
      seasonalPattern: {
        detected: seasonalityLevel !== 'low',
        season: seasonalityLevel === 'high' ? 'peak' : 'off-season',
        strength: seasonalityStrength,
      },
      rankings: {
        byUnits: 1, // TODO: Calcular baseado em ranking real
        byRevenue: Math.ceil(allTotalRevenue > 0 ? (totalRevenue / allTotalRevenue) * 100 : 1),
        byMargin: 1,
        totalProducts: 1,
      },
      opportunities: [
        salesDirection === 'increasing'
          ? 'Produto em crescimento - considere aumentar marketing'
          : 'Vendas em declínio - revisar estratégia de preços',
        seasonalityLevel !== 'low'
          ? 'Padrão sazonal detectado - otimizar estoque conforme sazonalidade'
          : 'Demanda estável - bom para previsão',
      ],
      risks: [
        salesDirection === 'decreasing'
          ? 'Risco de obsolescência - considerar descontinuação'
          : 'Risco de ruptura de estoque - monitorar previsão',
      ],
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Gerar recomendações para dashboard executivo
   */
  static generateExecutiveInsights(
    storeId: string,
    forecasts: DemandForecast[],
    trends: ProductTrendAnalysis[],
    anomalies: SalesAnomaly[],
    reorders: AutoReorderRecommendation[]
  ): ExecutiveDashboard {
    // Top produtos em crescimento
    const topGrowing = trends
      .filter((t) => t.salesTrend.direction === 'increasing')
      .sort((a, b) => b.salesTrend.percentageChange - a.salesTrend.percentageChange)
      .slice(0, 5)
      .map((t) => ({
        productId: t.productId,
        productName: t.productName,
        growthRate: t.salesTrend.percentageChange,
      }));

    // Produtos com baixo desempenho
    const lowPerforming = trends
      .filter((t) => t.salesTrend.direction === 'decreasing')
      .sort((a, b) => a.salesTrend.percentageChange - b.salesTrend.percentageChange)
      .slice(0, 3)
      .map((t) => ({
        productId: t.productId,
        productName: t.productName,
        reason: `Vendas em declínio ${Math.round(t.salesTrend.percentageChange)}%`,
      }));

    // Health scores (0-100)
    const criticalAnomalies = anomalies.filter((a) => a.severity === 'CRITICAL').length;
    const salesHealth = Math.max(0, 100 - criticalAnomalies * 15);
    const profitabilityHealth = 85; // TODO: Baseado em margens
    const stockHealth = Math.max(0, 100 - reorders.filter((r) => r.recommendedUrgency === 'immediate').length * 20);
    const expiryHealth = 90; // TODO: Baseado em alertas de validade

    const overallScore = (salesHealth + profitabilityHealth + stockHealth + expiryHealth) / 4;

    return {
      id: `dashboard-${storeId}-${Date.now()}`,
      storeId,
      generatedAt: new Date().toISOString(),
      predictions: {
        nextDayRevenue: forecasts.reduce((sum, f) => sum + f.predictedRevenue, 0),
        nextWeekRevenue: forecasts.reduce((sum, f) => sum + f.predictedRevenue * 7, 0),
        nextMonthRevenue: forecasts.reduce((sum, f) => sum + f.predictedRevenue * 30, 0),
        growthRate: 5.2, // Percentagem média
      },
      criticalAlerts: anomalies.filter((a) => a.severity === 'CRITICAL').slice(0, 5),
      lowStockProducts: reorders.filter((r) => r.recommendedUrgency !== 'planned').slice(0, 5),
      expiringProducts: [], // TODO: Buscar do Firestore
      topGrowingProducts: topGrowing,
      lowestPerformingProducts: lowPerforming,
      recommendations: [
        {
          type: 'inventory',
          priority: 'high',
          title: 'Reabastecer produtos críticos',
          description: `${reorders.filter((r) => r.recommendedUrgency === 'immediate').length} produtos precisam de reabastecimento imediato`,
          estimatedImpact: '-5% risco de ruptura',
          actionItems: reorders
            .filter((r) => r.recommendedUrgency === 'immediate')
            .slice(0, 3)
            .map((r) => `${r.productName}: ${r.recommendedQuantity} unidades`),
        },
        {
          type: 'sales',
          priority: 'medium',
          title: 'Aproveitar produtos em crescimento',
          description: `${topGrowing.length} produtos mostram crescimento consistente`,
          estimatedImpact: '+3% revenue potencial',
          actionItems: topGrowing
            .slice(0, 3)
            .map((p) => `${p.productName}: crescimento de ${p.growthRate.toFixed(1)}%`),
        },
      ],
      healthScore: {
        overallScore: Math.round(overallScore),
        byMetric: {
          salesHealth,
          profitabilityHealth,
          stockHealth,
          expiryHealth,
        },
      },
    };
  }

  /**
   * Validar dados antes de análise
   */
  static validateHistoricalData(data: DailySalesAggregate[]): boolean {
    if (data.length < 3) return false; // Mínimo 3 dias
    if (!data.every((d) => typeof d.unitsSlod === 'number')) return false;
    return true;
  }
}
