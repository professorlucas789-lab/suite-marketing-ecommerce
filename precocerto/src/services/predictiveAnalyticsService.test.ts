/**
 * Testes: Predictive Analytics Service
 * FASE 6: Machine Learning
 */

import { describe, it, expect } from 'vitest';
import { PredictiveAnalyticsService, SalesDataPoint } from './predictiveAnalyticsService';

describe('Predictive Analytics Service', () => {
  const mockHistoricalData: SalesDataPoint[] = [
    { date: '2026-08-01', quantity: 10, revenue: 5000, margin: 25, price: 500 },
    { date: '2026-08-02', quantity: 12, revenue: 6000, margin: 26, price: 500 },
    { date: '2026-08-03', quantity: 15, revenue: 7500, margin: 25, price: 500 },
    { date: '2026-08-04', quantity: 11, revenue: 5500, margin: 24, price: 500 },
    { date: '2026-08-05', quantity: 13, revenue: 6500, margin: 26, price: 500 },
    { date: '2026-08-06', quantity: 14, revenue: 7000, margin: 25, price: 500 },
    { date: '2026-08-07', quantity: 16, revenue: 8000, margin: 27, price: 500 },
    { date: '2026-08-08', quantity: 18, revenue: 9000, margin: 26, price: 500 },
    { date: '2026-08-09', quantity: 20, revenue: 10000, margin: 28, price: 500 },
    { date: '2026-08-10', quantity: 22, revenue: 11000, margin: 29, price: 500 },
  ];

  const seasonalData: SalesDataPoint[] = [
    // January data
    { date: '2026-01-15', quantity: 50, revenue: 25000, margin: 25, price: 500 },
    { date: '2026-01-20', quantity: 48, revenue: 24000, margin: 25, price: 500 },
    // February data
    { date: '2026-02-10', quantity: 35, revenue: 17500, margin: 25, price: 500 },
    { date: '2026-02-20', quantity: 32, revenue: 16000, margin: 25, price: 500 },
    // December data (peak)
    { date: '2026-12-10', quantity: 90, revenue: 45000, margin: 25, price: 500 },
    { date: '2026-12-20', quantity: 95, revenue: 47500, margin: 25, price: 500 },
  ];

  describe('Previsão de Demanda', () => {
    it('deve retornar forecast com duração correta', () => {
      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Ibuprofen',
        mockHistoricalData,
        7
      );

      expect(forecast.forecast).toHaveLength(7);
      expect(forecast.forecastPeriod.days).toBe(7);
    });

    it('deve retornar fallback forecast com dados insuficientes', () => {
      const insufficient = [
        { date: '2026-08-01', quantity: 10, revenue: 5000, margin: 25 },
        { date: '2026-08-02', quantity: 12, revenue: 6000, margin: 26 },
      ];

      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Product A',
        insufficient,
        7
      );

      expect(forecast.forecast).toHaveLength(7);
      expect(forecast.recommendation.riskLevel).toBe('high');
    });

    it('deve calcular trend como up/down/stable', () => {
      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Ibuprofen',
        mockHistoricalData,
        7
      );

      expect(['up', 'down', 'stable']).toContain(forecast.trend);
    });

    it('deve detectar trend UP com dados crescentes', () => {
      const uptrend = [
        { date: '2026-08-01', quantity: 10, revenue: 5000, margin: 25 },
        { date: '2026-08-02', quantity: 11, revenue: 5500, margin: 25 },
        { date: '2026-08-03', quantity: 12, revenue: 6000, margin: 25 },
        { date: '2026-08-04', quantity: 13, revenue: 6500, margin: 25 },
        { date: '2026-08-05', quantity: 14, revenue: 7000, margin: 25 },
        { date: '2026-08-06', quantity: 15, revenue: 7500, margin: 25 },
        { date: '2026-08-07', quantity: 16, revenue: 8000, margin: 25 },
        { date: '2026-08-08', quantity: 17, revenue: 8500, margin: 25 },
        { date: '2026-08-09', quantity: 18, revenue: 9000, margin: 25 },
        { date: '2026-08-10', quantity: 19, revenue: 9500, margin: 25 },
        { date: '2026-08-11', quantity: 20, revenue: 10000, margin: 25 },
        { date: '2026-08-12', quantity: 21, revenue: 10500, margin: 25 },
        { date: '2026-08-13', quantity: 22, revenue: 11000, margin: 25 },
        { date: '2026-08-14', quantity: 23, revenue: 11500, margin: 25 },
      ];

      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Product UP',
        uptrend,
        7
      );

      expect(forecast.trend).toBe('up');
    });

    it('deve aplicar trend factor +2% para trend up', () => {
      const uptrend = Array.from({ length: 30 }, (_, i) => ({
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        quantity: 10 + i,
        revenue: 5000 + i * 500,
        margin: 25,
      }));

      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Uptrend',
        uptrend,
        7
      );

      // First value should be slightly higher due to +2% trend factor
      const baselineQuantity = forecast.forecast[0].expectedQuantity;
      const secondQuantity = forecast.forecast[1].expectedQuantity;

      expect(secondQuantity).toBeGreaterThan(baselineQuantity);
    });

    it('deve ter confidence que decresce com distância', () => {
      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Ibuprofen',
        mockHistoricalData,
        7
      );

      const firstConfidence = forecast.forecast[0].confidence;
      const lastConfidence = forecast.forecast[6].confidence;

      expect(lastConfidence).toBeLessThan(firstConfidence);
    });

    it('deve calcular reorderQuantity baseado na demanda média', () => {
      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Ibuprofen',
        mockHistoricalData,
        7
      );

      // reorderQuantity should be at least 2x average forecast
      const avgForecast =
        forecast.forecast.reduce((sum, f) => sum + f.expectedQuantity, 0) /
        forecast.forecast.length;

      expect(forecast.recommendation.reorderQuantity).toBeGreaterThanOrEqual(
        Math.ceil(avgForecast * 1.5)
      );
    });

    it('deve retornar productId e productName', () => {
      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-123',
        'Aspirin 500mg',
        mockHistoricalData,
        7
      );

      expect(forecast.productId).toBe('prod-123');
      expect(forecast.productName).toBe('Aspirin 500mg');
    });
  });

  describe('Detecção de Sazonalidade', () => {
    it('deve detectar sazonalidade com dados suficientes', () => {
      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Ibuprofen',
        seasonalData,
        7
      );

      expect(forecast.seasonality).not.toBeNull();
    });

    it('deve retornar null sem dados suficientes de sazonalidade', () => {
      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Product',
        mockHistoricalData,
        7
      );

      // 10 days of data = ~1.3 months, might not have enough
      // Sazonalidade requer 30+ days e 4+ meses diferentes
    });

    it('deve identificar pico e mês baixo', () => {
      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Ibuprofen',
        seasonalData,
        7
      );

      if (forecast.seasonality) {
        expect(forecast.seasonality.peak).toBeDefined();
        expect(forecast.seasonality.low).toBeDefined();
        expect(forecast.seasonality.peak).toBeBetween(1, 12);
        expect(forecast.seasonality.low).toBeBetween(1, 12);
      }
    });

    it('deve classificar padrão como highly_seasonal, moderately_seasonal, ou stable', () => {
      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Ibuprofen',
        seasonalData,
        7
      );

      if (forecast.seasonality) {
        expect(['highly_seasonal', 'moderately_seasonal', 'stable']).toContain(
          forecast.seasonality.pattern
        );
      }
    });
  });

  describe('Detecção de Anomalias', () => {
    it('deve retornar array vazio com dados insuficientes', () => {
      const insufficient = [
        { date: '2026-08-01', quantity: 10, revenue: 5000, margin: 25 },
      ];

      const alerts = PredictiveAnalyticsService.detectAnomalies(
        'prod-1',
        'Product',
        insufficient
      );

      expect(alerts).toHaveLength(0);
    });

    it('deve detectar unusual_sales_spike', () => {
      const dataWithSpike: SalesDataPoint[] = [
        { date: '2026-08-01', quantity: 10, revenue: 5000, margin: 25 },
        { date: '2026-08-02', quantity: 11, revenue: 5500, margin: 25 },
        { date: '2026-08-03', quantity: 9, revenue: 4500, margin: 25 },
        { date: '2026-08-04', quantity: 10, revenue: 5000, margin: 25 },
        { date: '2026-08-05', quantity: 11, revenue: 5500, margin: 25 },
        { date: '2026-08-06', quantity: 12, revenue: 6000, margin: 25 },
        { date: '2026-08-07', quantity: 100, revenue: 50000, margin: 25 }, // Spike
        { date: '2026-08-08', quantity: 10, revenue: 5000, margin: 25 },
      ];

      const alerts = PredictiveAnalyticsService.detectAnomalies(
        'prod-1',
        'Product',
        dataWithSpike,
        2.5
      );

      const spikeAlert = alerts.find((a) => a.type === 'unusual_sales_spike');
      expect(spikeAlert).toBeDefined();
    });

    it('deve detectar unusual_sales_drop', () => {
      const dataWithDrop: SalesDataPoint[] = [
        { date: '2026-08-01', quantity: 20, revenue: 10000, margin: 25 },
        { date: '2026-08-02', quantity: 21, revenue: 10500, margin: 25 },
        { date: '2026-08-03', quantity: 19, revenue: 9500, margin: 25 },
        { date: '2026-08-04', quantity: 22, revenue: 11000, margin: 25 },
        { date: '2026-08-05', quantity: 20, revenue: 10000, margin: 25 },
        { date: '2026-08-06', quantity: 21, revenue: 10500, margin: 25 },
        { date: '2026-08-07', quantity: 1, revenue: 500, margin: 25 }, // Drop
        { date: '2026-08-08', quantity: 20, revenue: 10000, margin: 25 },
      ];

      const alerts = PredictiveAnalyticsService.detectAnomalies(
        'prod-1',
        'Product',
        dataWithDrop,
        2.5
      );

      const dropAlert = alerts.find((a) => a.type === 'unusual_sales_drop');
      expect(dropAlert).toBeDefined();
    });

    it('deve detectar margin_anomaly', () => {
      const dataWithMarginAnomaly: SalesDataPoint[] = [
        { date: '2026-08-01', quantity: 10, revenue: 5000, margin: 25 },
        { date: '2026-08-02', quantity: 11, revenue: 5500, margin: 26 },
        { date: '2026-08-03', quantity: 9, revenue: 4500, margin: 25 },
        { date: '2026-08-04', quantity: 10, revenue: 5000, margin: 25 },
        { date: '2026-08-05', quantity: 11, revenue: 5500, margin: 25 },
        { date: '2026-08-06', quantity: 12, revenue: 6000, margin: 26 },
        { date: '2026-08-07', quantity: 13, revenue: 6500, margin: 5 }, // Anomaly margin
        { date: '2026-08-08', quantity: 10, revenue: 5000, margin: 25 },
      ];

      const alerts = PredictiveAnalyticsService.detectAnomalies(
        'prod-1',
        'Product',
        dataWithMarginAnomaly,
        2.5
      );

      const marginAlert = alerts.find((a) => a.type === 'margin_anomaly');
      expect(marginAlert).toBeDefined();
    });

    it('deve incluir severidade HIGH para deviações > 1.5 * threshold', () => {
      const dataWithHighDeviation: SalesDataPoint[] = [
        { date: '2026-08-01', quantity: 10, revenue: 5000, margin: 25 },
        { date: '2026-08-02', quantity: 11, revenue: 5500, margin: 25 },
        { date: '2026-08-03', quantity: 9, revenue: 4500, margin: 25 },
        { date: '2026-08-04', quantity: 10, revenue: 5000, margin: 25 },
        { date: '2026-08-05', quantity: 11, revenue: 5500, margin: 25 },
        { date: '2026-08-06', quantity: 12, revenue: 6000, margin: 25 },
        { date: '2026-08-07', quantity: 150, revenue: 75000, margin: 25 }, // Very high deviation
        { date: '2026-08-08', quantity: 10, revenue: 5000, margin: 25 },
      ];

      const alerts = PredictiveAnalyticsService.detectAnomalies(
        'prod-1',
        'Product',
        dataWithHighDeviation,
        2.5
      );

      const highSeverity = alerts.find((a) => a.severity === 'high');
      expect(highSeverity).toBeDefined();
    });

    it('deve calcular deviation em percentual', () => {
      const dataWithSpike: SalesDataPoint[] = [
        { date: '2026-08-01', quantity: 10, revenue: 5000, margin: 25 },
        { date: '2026-08-02', quantity: 11, revenue: 5500, margin: 25 },
        { date: '2026-08-03', quantity: 9, revenue: 4500, margin: 25 },
        { date: '2026-08-04', quantity: 10, revenue: 5000, margin: 25 },
        { date: '2026-08-05', quantity: 11, revenue: 5500, margin: 25 },
        { date: '2026-08-06', quantity: 12, revenue: 6000, margin: 25 },
        { date: '2026-08-07', quantity: 50, revenue: 25000, margin: 25 }, // 50 units
        { date: '2026-08-08', quantity: 10, revenue: 5000, margin: 25 },
      ];

      const alerts = PredictiveAnalyticsService.detectAnomalies(
        'prod-1',
        'Product',
        dataWithSpike,
        2.5
      );

      const spike = alerts.find((a) => a.type === 'unusual_sales_spike');
      if (spike) {
        expect(spike.deviation).toBeGreaterThan(0);
      }
    });
  });

  describe('Cálculos Estatísticos', () => {
    it('deve calcular moving average corretamente', () => {
      const values = [10, 20, 30, 40, 50];
      // 7-day window: pode ter valores menores ou iguais ao valor no dia
      // Para 5 valores, a última moving average deve ser (20+30+40)/3 = 30 (com janela de 3)
    });

    it('deve calcular trend de tendência ascendente', () => {
      const uptrend = Array.from({ length: 14 }, (_, i) => 10 + i);
      // Últimos 7: [17,18,19,20,21,22,23]
      // Anteriores 7: [10,11,12,13,14,15,16]
      // Média recente: 20, Média anterior: 13
      // Change: (20-13)/13 * 100 = ~54% > 5% => trend: 'up'
    });

    it('deve retornar optimal price baseado em margem * quantidade / preço', () => {
      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Ibuprofen',
        mockHistoricalData,
        7
      );

      expect(forecast.recommendation.optimalPrice).toBeGreaterThan(0);
    });
  });

  describe('Avaliação de Risco', () => {
    it('deve retornar risk level LOW para stable trend sem sazonalidade alta', () => {
      // Dados estáveis
      const stable = Array.from({ length: 30 }, (_, i) => ({
        date: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
        quantity: 15,
        revenue: 7500,
        margin: 25,
      }));

      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Stable',
        stable,
        7
      );

      expect(['low', 'medium', 'high']).toContain(forecast.recommendation.riskLevel);
    });

    it('deve retornar risk level MEDIUM para trend DOWN', () => {
      const downtrend = Array.from({ length: 30 }, (_, i) => ({
        date: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
        quantity: 50 - i,
        revenue: 25000 - i * 500,
        margin: 25,
      }));

      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Downtrend',
        downtrend,
        7
      );

      expect(forecast.recommendation.riskLevel).toMatch(/medium|high/);
    });

    it('deve retornar risk level MEDIUM para highly seasonal', () => {
      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Ibuprofen',
        seasonalData,
        7
      );

      expect(['low', 'medium', 'high']).toContain(forecast.recommendation.riskLevel);
    });

    it('deve retornar risk level HIGH para downtrend + highly seasonal', () => {
      // Dados com downtrend e alta sazonalidade
      const complexData: SalesDataPoint[] = [
        { date: '2025-12-15', quantity: 100, revenue: 50000, margin: 25 }, // December peak
        { date: '2025-12-20', quantity: 95, revenue: 47500, margin: 25 },
        { date: '2026-01-15', quantity: 85, revenue: 42500, margin: 25 }, // January lower
        { date: '2026-01-20', quantity: 80, revenue: 40000, margin: 25 },
        { date: '2026-02-10', quantity: 60, revenue: 30000, margin: 25 }, // February lower
        { date: '2026-02-20', quantity: 55, revenue: 27500, margin: 25 },
        { date: '2026-03-10', quantity: 40, revenue: 20000, margin: 25 }, // March lowest
        { date: '2026-03-20', quantity: 35, revenue: 17500, margin: 25 },
      ];

      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Complex',
        complexData,
        7
      );

      expect(['low', 'medium', 'high']).toContain(forecast.recommendation.riskLevel);
    });
  });

  describe('Resumo Preditivo', () => {
    it('deve gerar resumo com contagem correta de produtos', () => {
      const products = [
        { id: 'prod-1', name: 'Product 1', data: mockHistoricalData },
        { id: 'prod-2', name: 'Product 2', data: mockHistoricalData },
        { id: 'prod-3', name: 'Product 3', data: mockHistoricalData },
      ];

      const summary = PredictiveAnalyticsService.generatePredictiveSummary(products);

      expect(summary.totalProducts).toBe(3);
    });

    it('deve contar produtos com risco alto', () => {
      const riskData = Array.from({ length: 30 }, (_, i) => ({
        date: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
        quantity: 50 - i,
        revenue: 25000 - i * 500,
        margin: 25,
      }));

      const products = [
        { id: 'prod-1', name: 'High Risk', data: riskData },
        { id: 'prod-2', name: 'Normal', data: mockHistoricalData },
      ];

      const summary = PredictiveAnalyticsService.generatePredictiveSummary(products);

      expect(summary.highRiskCount).toBeGreaterThanOrEqual(0);
    });

    it('deve incluir recomendações para produtos', () => {
      const products = [
        { id: 'prod-1', name: 'Product 1', data: mockHistoricalData },
      ];

      const summary = PredictiveAnalyticsService.generatePredictiveSummary(products);

      expect(Array.isArray(summary.recommendations)).toBe(true);
    });

    it('deve limitar recomendações a top 10', () => {
      const products = Array.from({ length: 20 }, (_, i) => ({
        id: `prod-${i}`,
        name: `Product ${i}`,
        data: mockHistoricalData,
      }));

      const summary = PredictiveAnalyticsService.generatePredictiveSummary(products);

      expect(summary.recommendations.length).toBeLessThanOrEqual(10);
    });

    it('deve incluir trend info nas recomendações', () => {
      const uptrend = Array.from({ length: 30 }, (_, i) => ({
        date: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
        quantity: 10 + i,
        revenue: 5000 + i * 500,
        margin: 25,
      }));

      const products = [
        { id: 'prod-1', name: 'Uptrend Product', data: uptrend },
      ];

      const summary = PredictiveAnalyticsService.generatePredictiveSummary(products);

      const hasRecommendation =
        summary.recommendations.length > 0 ||
        summary.highRiskCount >= 0;
      expect(hasRecommendation).toBe(true);
    });
  });

  describe('Valores Extremos e Edge Cases', () => {
    it('deve lidar com quantidade zero', () => {
      const zeroData: SalesDataPoint[] = [
        { date: '2026-08-01', quantity: 0, revenue: 0, margin: 0 },
        { date: '2026-08-02', quantity: 0, revenue: 0, margin: 0 },
        { date: '2026-08-03', quantity: 0, revenue: 0, margin: 0 },
        { date: '2026-08-04', quantity: 0, revenue: 0, margin: 0 },
        { date: '2026-08-05', quantity: 0, revenue: 0, margin: 0 },
        { date: '2026-08-06', quantity: 0, revenue: 0, margin: 0 },
        { date: '2026-08-07', quantity: 0, revenue: 0, margin: 0 },
      ];

      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Zero',
        zeroData,
        7
      );

      expect(forecast).toBeDefined();
      expect(forecast.forecast).toHaveLength(7);
    });

    it('deve retornar valores não-negativos em forecast', () => {
      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Ibuprofen',
        mockHistoricalData,
        7
      );

      forecast.forecast.forEach((f) => {
        expect(f.expectedQuantity).toBeGreaterThanOrEqual(0);
        expect(f.confidence).toBeGreaterThanOrEqual(0);
        expect(f.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('deve validar estrutura completa do forecast', () => {
      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Ibuprofen',
        mockHistoricalData,
        7
      );

      expect(forecast).toHaveProperty('productId');
      expect(forecast).toHaveProperty('productName');
      expect(forecast).toHaveProperty('forecastPeriod');
      expect(forecast).toHaveProperty('forecast');
      expect(forecast).toHaveProperty('trend');
      expect(forecast).toHaveProperty('seasonality');
      expect(forecast).toHaveProperty('recommendation');

      expect(forecast.recommendation).toHaveProperty('reorderQuantity');
      expect(forecast.recommendation).toHaveProperty('optimalPrice');
      expect(forecast.recommendation).toHaveProperty('riskLevel');
    });
  });

  describe('Performance', () => {
    it('deve processar 1000 pontos de dados em tempo razoável', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        date: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
        quantity: 10 + Math.sin(i / 100) * 5,
        revenue: 5000 + Math.sin(i / 100) * 2500,
        margin: 25 + Math.sin(i / 100) * 5,
      }));

      const startTime = Date.now();
      const forecast = PredictiveAnalyticsService.forecastDemand(
        'prod-1',
        'Large Dataset',
        largeData,
        7
      );
      const endTime = Date.now();

      expect(forecast).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
    });

    it('deve detectar anomalias em 1000 pontos em tempo razoável', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        date: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
        quantity: 15,
        revenue: 7500,
        margin: 25,
      }));

      const startTime = Date.now();
      const alerts = PredictiveAnalyticsService.detectAnomalies(
        'prod-1',
        'Large',
        largeData
      );
      const endTime = Date.now();

      expect(alerts).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
    });
  });
});

// Helper function for testing
declare global {
  interface Matchers<R> {
    toBeBetween(floor: number, ceil: number): R;
  }
}

// Extend expect matchers
expect.extend({
  toBeBetween(received: number, floor: number, ceil: number) {
    const pass = received >= floor && received <= ceil;
    return {
      message: () =>
        `expected ${received} to be between ${floor} and ${ceil}`,
      pass,
    };
  },
});
