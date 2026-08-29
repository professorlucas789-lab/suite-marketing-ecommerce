/**
 * Testes para Serviço de Análise Preditiva
 * FASE 5-6: Validação de Algoritmos
 *
 * Valida previsões, detecção de anomalias, e recomendações
 */

import { describe, it, expect } from 'vitest';
import { PredictiveAnalyticsService } from '../predictiveAnalyticsService';
import { AnomalyDetectionService } from '../anomalyDetectionService';
import { DailySalesAggregate, DemandForecast } from '../../types/analytics';

describe('PredictiveAnalyticsService', () => {
  // Dados de teste
  const mockHistoricalData: DailySalesAggregate[] = [
    {
      date: '2026-08-01',
      storeId: 'store-1',
      productId: 'prod-1',
      unitsSlod: 10,
      totalRevenue: 5000,
      totalCost: 3000,
      totalProfit: 2000,
      profitMargin: 40,
      transactionCount: 5,
      avgTransactionValue: 1000,
      stockStart: 100,
      stockEnd: 90,
      stockTurnover: 0.1,
      createdAt: '2026-08-01T10:00:00Z',
    },
    {
      date: '2026-08-02',
      storeId: 'store-1',
      productId: 'prod-1',
      unitsSlod: 12,
      totalRevenue: 6000,
      totalCost: 3600,
      totalProfit: 2400,
      profitMargin: 40,
      transactionCount: 6,
      avgTransactionValue: 1000,
      stockStart: 90,
      stockEnd: 78,
      stockTurnover: 0.133,
      createdAt: '2026-08-02T10:00:00Z',
    },
    {
      date: '2026-08-03',
      storeId: 'store-1',
      productId: 'prod-1',
      unitsSlod: 11,
      totalRevenue: 5500,
      totalCost: 3300,
      totalProfit: 2200,
      profitMargin: 40,
      transactionCount: 5,
      avgTransactionValue: 1100,
      stockStart: 78,
      stockEnd: 67,
      stockTurnover: 0.141,
      createdAt: '2026-08-03T10:00:00Z',
    },
    {
      date: '2026-08-04',
      storeId: 'store-1',
      productId: 'prod-1',
      unitsSlod: 25, // Anomalia: muito mais alto
      totalRevenue: 12500,
      totalCost: 7500,
      totalProfit: 5000,
      profitMargin: 40,
      transactionCount: 12,
      avgTransactionValue: 1041.67,
      stockStart: 67,
      stockEnd: 42,
      stockTurnover: 0.372,
      createdAt: '2026-08-04T10:00:00Z',
    },
    {
      date: '2026-08-05',
      storeId: 'store-1',
      productId: 'prod-1',
      unitsSlod: 9,
      totalRevenue: 4500,
      totalCost: 2700,
      totalProfit: 1800,
      profitMargin: 40,
      transactionCount: 4,
      avgTransactionValue: 1125,
      stockStart: 42,
      stockEnd: 33,
      stockTurnover: 0.273,
      createdAt: '2026-08-05T10:00:00Z',
    },
  ];

  describe('Previsão de Demanda', () => {
    it('deve gerar previsão com suavização exponencial', () => {
      const forecast = PredictiveAnalyticsService.forecastDemandExponentialSmoothing(
        'prod-1',
        'store-1',
        mockHistoricalData,
        7
      );

      expect(forecast).toBeDefined();
      expect(forecast.productId).toBe('prod-1');
      expect(forecast.storeId).toBe('store-1');
      expect(forecast.method).toBe('exponential_smoothing');
      expect(forecast.predictedUnits).toBeGreaterThan(0);
      expect(forecast.confidence).toBeGreaterThanOrEqual(60);
      expect(forecast.confidence).toBeLessThanOrEqual(100);
    });

    it('deve calcular intervalo de confiança', () => {
      const forecast = PredictiveAnalyticsService.forecastDemandExponentialSmoothing(
        'prod-1',
        'store-1',
        mockHistoricalData,
        7
      );

      expect(forecast.confidenceInterval.lower).toBeLessThanOrEqual(
        forecast.confidenceInterval.upper
      );
      expect(forecast.confidenceInterval.lower).toBeGreaterThanOrEqual(0);
    });

    it('deve detectar tendência crescente', () => {
      const growingData: DailySalesAggregate[] = [
        ...mockHistoricalData.slice(0, 2),
        {
          ...mockHistoricalData[2],
          date: '2026-08-06',
          unitsSlod: 15,
        },
        {
          ...mockHistoricalData[2],
          date: '2026-08-07',
          unitsSlod: 18,
        },
        {
          ...mockHistoricalData[2],
          date: '2026-08-08',
          unitsSlod: 20,
        },
      ];

      const forecast = PredictiveAnalyticsService.forecastDemandExponentialSmoothing(
        'prod-1',
        'store-1',
        growingData,
        7
      );

      expect(['increasing', 'stable']).toContain(forecast.trend);
    });

    it('deve rejeitar dados insuficientes', () => {
      const tooFewData = mockHistoricalData.slice(0, 1);

      expect(() => {
        PredictiveAnalyticsService.forecastDemandExponentialSmoothing(
          'prod-1',
          'store-1',
          tooFewData,
          7
        );
      }).toThrow();
    });

    it('deve variar com parâmetro alpha', () => {
      const forecast1 = PredictiveAnalyticsService.forecastDemandExponentialSmoothing(
        'prod-1',
        'store-1',
        mockHistoricalData,
        7,
        0.1 // Menor ponderação em dados recentes
      );

      const forecast2 = PredictiveAnalyticsService.forecastDemandExponentialSmoothing(
        'prod-1',
        'store-1',
        mockHistoricalData,
        7,
        0.5 // Maior ponderação em dados recentes
      );

      // Com alpha diferentes, forecasts devem variar
      expect(forecast1.predictedUnits).not.toBe(forecast2.predictedUnits);
    });
  });

  describe('Detecção de Anomalias', () => {
    it('deve detectar anomalias com Z-score', () => {
      const { anomalies, zScores } = PredictiveAnalyticsService.detectAnomalies(
        mockHistoricalData,
        2.5
      );

      expect(anomalies.length).toBeGreaterThan(0);
      expect(zScores.size).toBe(mockHistoricalData.length);
    });

    it('deve identificar o pico do 4º dia como anomalia', () => {
      const { anomalies } = PredictiveAnalyticsService.detectAnomalies(
        mockHistoricalData,
        2.0 // Threshold um pouco mais baixo
      );

      const aug4Anomaly = anomalies.find((a) => a.date === '2026-08-04');
      expect(aug4Anomaly).toBeDefined();
    });

    it('deve calcular Z-score correcto', () => {
      const { zScores } = PredictiveAnalyticsService.detectAnomalies(
        mockHistoricalData,
        2.5
      );

      // Dia 1: 10 unidades (deve estar perto de 0)
      const zscore1 = zScores.get('2026-08-01');
      expect(Math.abs(zscore1 || 0)).toBeLessThan(1);

      // Dia 4: 25 unidades (deve estar muito acima de 0)
      const zscore4 = zScores.get('2026-08-04');
      expect((zscore4 || 0)).toBeGreaterThan(2);
    });
  });

  describe('Recomendação de Reabastecimento', () => {
    it('deve gerar recomendação válida', () => {
      const forecast: DemandForecast = {
        id: 'test-forecast',
        storeId: 'store-1',
        productId: 'prod-1',
        productName: 'Test Product',
        forecastDate: '2026-08-10',
        forecastPeriod: 'week',
        predictedUnits: 12,
        predictedRevenue: 6000,
        confidenceInterval: { lower: 8, upper: 16 },
        confidence: 85,
        method: 'exponential_smoothing',
        historicalDataPoints: 5,
        daysAnalyzed: 5,
        trend: 'stable',
        seasonality: 'medium',
        volatility: 0.15,
        vs_lastPeriod: { percentageChange: 5, direction: 'up' },
        vs_average: { percentageChange: 10, direction: 'up' },
        createdAt: '2026-08-08T10:00:00Z',
        generatedBy: 'exponential_smoothing',
      };

      const mockProduct = {
        id: 'prod-1',
        nome: 'Test Product',
        quantidadeDisponível: 20,
        quantidadeMinima: 30,
        precoCusto: 300,
      } as any;

      const reorder = PredictiveAnalyticsService.calculateAutoReorderRecommendation(
        'prod-1',
        'store-1',
        mockProduct,
        forecast,
        3
      );

      expect(reorder).toBeDefined();
      expect(reorder.recommendedQuantity).toBeGreaterThan(0);
      expect(reorder.recommendedUrgency).toMatch(/immediate|soon|planned/);
    });

    it('deve indicar urgência imediata quando stock vai acabar em breve', () => {
      const forecast: DemandForecast = {
        id: 'test-forecast',
        storeId: 'store-1',
        productId: 'prod-1',
        productName: 'Test Product',
        forecastDate: '2026-08-10',
        forecastPeriod: 'day',
        predictedUnits: 10, // Alto consumo
        predictedRevenue: 5000,
        confidenceInterval: { lower: 8, upper: 12 },
        confidence: 85,
        method: 'exponential_smoothing',
        historicalDataPoints: 5,
        daysAnalyzed: 5,
        trend: 'increasing',
        seasonality: 'high',
        volatility: 0.25,
        vs_lastPeriod: { percentageChange: 20, direction: 'up' },
        vs_average: { percentageChange: 30, direction: 'up' },
        createdAt: '2026-08-08T10:00:00Z',
        generatedBy: 'exponential_smoothing',
      };

      const mockProduct = {
        id: 'prod-1',
        nome: 'Critical Product',
        quantidadeDisponível: 5, // Muito pouco
        quantidadeMinima: 30,
        precoCusto: 300,
      } as any;

      const reorder = PredictiveAnalyticsService.calculateAutoReorderRecommendation(
        'prod-1',
        'store-1',
        mockProduct,
        forecast,
        3
      );

      expect(reorder.recommendedUrgency).toBe('immediate');
    });
  });

  describe('Análise de Tendências', () => {
    it('deve analisar tendências correctamente', () => {
      const mockProduct = {
        id: 'prod-1',
        nome: 'Test Product',
        storeId: 'store-1',
      } as any;

      const trend = PredictiveAnalyticsService.analyzeTrends(
        'prod-1',
        'store-1',
        mockProduct,
        mockHistoricalData,
        mockHistoricalData
      );

      expect(trend).toBeDefined();
      expect(trend.productId).toBe('prod-1');
      expect(trend.salesTrend.direction).toMatch(/increasing|decreasing|stable/);
      expect(trend.opportunities.length).toBeGreaterThan(0);
      expect(trend.risks.length).toBeGreaterThan(0);
    });
  });

  describe('Validação de Dados', () => {
    it('deve validar dados históricos', () => {
      const valid = PredictiveAnalyticsService.validateHistoricalData(mockHistoricalData);
      expect(valid).toBe(true);

      const invalid = PredictiveAnalyticsService.validateHistoricalData(
        mockHistoricalData.slice(0, 1)
      );
      expect(invalid).toBe(false);
    });

    it('deve rejeitar dados sem unidades', () => {
      const badData = [
        {
          ...mockHistoricalData[0],
          unitsSlod: null as any,
        },
      ];

      const valid = PredictiveAnalyticsService.validateHistoricalData(badData);
      expect(valid).toBe(false);
    });
  });
});

describe('AnomalyDetectionService', () => {
  const mockProduct = {
    id: 'prod-1',
    nome: 'Test Product',
    storeId: 'store-1',
    averageDailyUsage: 10,
  } as any;

  const mockSales = [
    {
      id: 'sale-1',
      productId: 'prod-1',
      storeId: 'store-1',
      quantity: 10,
      unitPrice: 500,
      totalPrice: 5000,
      totalCost: 3000,
      date: '2026-08-01',
      timestamp: '2026-08-01T10:00:00Z',
    },
    {
      id: 'sale-2',
      productId: 'prod-1',
      storeId: 'store-1',
      quantity: 5,
      unitPrice: 510,
      totalPrice: 2550,
      totalCost: 1500,
      date: '2026-08-02',
      timestamp: '2026-08-02T10:00:00Z',
    },
    {
      id: 'sale-3',
      productId: 'prod-1',
      storeId: 'store-1',
      quantity: 8,
      unitPrice: 495,
      totalPrice: 3960,
      totalCost: 2400,
      date: '2026-08-03',
      timestamp: '2026-08-03T10:00:00Z',
    },
  ];

  describe('Detecção de Anomalias de Preço', () => {
    it('deve detectar anomalia de preço muito alto', () => {
      const anomalySale = {
        ...mockSales[0],
        unitPrice: 1000, // Dobro do normal
      };

      const anomaly = AnomalyDetectionService.detectSaleAnomaly(
        anomalySale,
        mockProduct,
        mockSales.slice(1)
      );

      expect(anomaly).not.toBeNull();
      expect(anomaly?.type).toBe('price_anomaly');
      expect(anomaly?.severity).toBe('CRITICAL');
    });

    it('deve detectar anomalia de preço muito baixo', () => {
      const anomalySale = {
        ...mockSales[0],
        unitPrice: 100, // 20% do normal
      };

      const anomaly = AnomalyDetectionService.detectSaleAnomaly(
        anomalySale,
        mockProduct,
        mockSales.slice(1)
      );

      expect(anomaly).not.toBeNull();
      expect(anomaly?.type).toBe('price_anomaly');
    });

    it('deve rejeitar dados insuficientes', () => {
      const anomaly = AnomalyDetectionService.detectSaleAnomaly(
        mockSales[0],
        mockProduct,
        [] // Sem histórico
      );

      expect(anomaly).toBeNull();
    });
  });

  describe('Detecção de Anomalias de Margem', () => {
    it('deve detectar margem anormalmente baixa', () => {
      const lowMarginSale = {
        ...mockSales[0],
        totalCost: 4800, // Muito próximo do preço (margem ~4%)
      };

      const anomaly = AnomalyDetectionService.detectMarginAnomaly(
        lowMarginSale,
        mockSales.slice(1)
      );

      expect(anomaly).not.toBeNull();
      expect(anomaly?.type).toBe('unusual_margin');
    });
  });

  describe('Detecção de Anomalias de Volume', () => {
    it('deve detectar spike de demanda', () => {
      const historicalData: DailySalesAggregate[] = Array.from({ length: 20 }, (_, i) => ({
        date: new Date(Date.now() - (20 - i) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        storeId: 'store-1',
        productId: 'prod-1',
        unitsSlod: 10, // Padrão
        totalRevenue: 5000,
        totalCost: 3000,
        totalProfit: 2000,
        profitMargin: 40,
        transactionCount: 5,
        avgTransactionValue: 1000,
        stockStart: 100,
        stockEnd: 90,
        stockTurnover: 0.1,
        createdAt: new Date().toISOString(),
      }));

      const anomaly = AnomalyDetectionService.detectVolumeAnomaly(
        new Date().toISOString().split('T')[0],
        50, // Spike: 5x do normal
        historicalData
      );

      expect(anomaly).not.toBeNull();
      expect(anomaly?.type).toBe('demand_spike');
      expect(anomaly?.severity).toBe('CRITICAL');
    });
  });
});
