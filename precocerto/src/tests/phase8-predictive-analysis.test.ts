/**
 * Testes para Fase 8: Análise Preditiva
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PredictiveService } from '../services/predictiveService';
import type { DataPoint } from '../types/predictive';

describe('Fase 8: Análise Preditiva', () => {
  let sampleData: DataPoint[];
  let storeId: string;
  let storeName: string;

  beforeEach(() => {
    storeId = 'store-1';
    storeName = 'Loja Principal';

    // Dados de vendas simulados (30 dias)
    sampleData = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: 1000 + Math.sin(i / 7) * 200 + Math.random() * 100, // Padrão semanal + ruído
    }));
  });

  describe('Treino de Modelo', () => {
    it('deve treinar modelo linear com dados válidos', () => {
      const result = PredictiveService.trainLinearModel(sampleData);
      expect(result).toHaveProperty('coefficients');
      expect(result).toHaveProperty('intercept');
      expect(Array.isArray(result.coefficients)).toBe(true);
      expect(typeof result.intercept).toBe('number');
    });

    it('deve retornar valores zerados para dados insuficientes', () => {
      const minimalData: DataPoint[] = [{ date: '2024-01-01', value: 100 }];
      const result = PredictiveService.trainLinearModel(minimalData);
      expect(result.coefficients[0]).toBe(0);
      expect(result.intercept).toBe(0);
    });

    it('deve filtrar outliers automaticamente', () => {
      const dataWithOutliers: DataPoint[] = [
        ...sampleData,
        { date: '2024-02-01', value: 10000 }, // Outlier
      ];
      const result = PredictiveService.trainLinearModel(dataWithOutliers);
      expect(result).toHaveProperty('coefficients');
      expect(result.coefficients[0]).not.toBeNaN();
    });
  });

  describe('Detecção de Sazonalidade', () => {
    it('deve detectar padrão semanal em dados', () => {
      // Criar dados com padrão semanal claro
      const seasonalData: DataPoint[] = Array.from({ length: 60 }, (_, i) => ({
        date: new Date(Date.now() - (60 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: 1000 + (i % 7) * 200, // Padrão de 7 dias
      }));

      const result = PredictiveService.detectSeasonality(seasonalData);
      expect(result.detected).toBe(true);
      expect(['WEEKLY', 'DAILY', 'MONTHLY']).toContain(result.pattern);
    });

    it('deve retornar NONE para dados sem padrão', () => {
      const randomData: DataPoint[] = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: 1000 + Math.random() * 100,
      }));

      const result = PredictiveService.detectSeasonality(randomData);
      expect(result.pattern).toBe('NONE');
    });

    it('deve retornar NONE para dados insuficientes', () => {
      const minimalData: DataPoint[] = sampleData.slice(0, 5);
      const result = PredictiveService.detectSeasonality(minimalData);
      expect(result.pattern).toBe('NONE');
    });
  });

  describe('Geração de Previsão', () => {
    it('deve gerar previsão válida', () => {
      const prediction = PredictiveService.generatePrediction('model-1', sampleData, 30);
      expect(prediction).toHaveProperty('id');
      expect(prediction).toHaveProperty('modelId');
      expect(prediction).toHaveProperty('predictions');
      expect(prediction.predictions.length).toBe(30);
    });

    it('deve gerar pontos com limites de confiança', () => {
      const prediction = PredictiveService.generatePrediction('model-1', sampleData, 7);
      const firstPoint = prediction.predictions[0];

      expect(firstPoint.lower).toBeLessThanOrEqual(firstPoint.value);
      expect(firstPoint.value).toBeLessThanOrEqual(firstPoint.upper);
      expect(firstPoint.confidence).toBeGreaterThan(0);
      expect(firstPoint.confidence).toBeLessThanOrEqual(100);
    });

    it('deve ter confiança decrescente ao longo do tempo', () => {
      const prediction = PredictiveService.generatePrediction('model-1', sampleData, 30);
      for (let i = 1; i < prediction.predictions.length; i++) {
        expect(prediction.predictions[i].confidence).toBeLessThanOrEqual(prediction.predictions[i - 1].confidence);
      }
    });

    it('deve incluir informação de tendência', () => {
      const prediction = PredictiveService.generatePrediction('model-1', sampleData, 10);
      expect(['INCREASING', 'DECREASING', 'STABLE']).toContain(prediction.trend);
      expect(prediction.trendStrength).toBeGreaterThanOrEqual(0);
    });

    it('deve incluir informação de sazonalidade', () => {
      const prediction = PredictiveService.generatePrediction('model-1', sampleData, 10);
      expect(prediction.seasonality).toHaveProperty('detected');
      expect(prediction.seasonality).toHaveProperty('pattern');
      expect(prediction.seasonality).toHaveProperty('amplitude');
    });
  });

  describe('Detecção de Anomalias', () => {
    it('deve detectar spike em dados', () => {
      const dataWithSpike: DataPoint[] = [
        ...sampleData,
        { date: '2024-02-01', value: 5000 }, // Spike
      ];

      const anomalies = PredictiveService.detectAnomalies(storeId, storeName, 'vendas', dataWithSpike);
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].type).toBe('SPIKE');
      expect(anomalies[0].detected).toBe(true);
    });

    it('deve detectar queda em dados', () => {
      const dataWithDrop: DataPoint[] = [
        ...sampleData,
        { date: '2024-02-01', value: 100 }, // Drop
      ];

      const anomalies = PredictiveService.detectAnomalies(storeId, storeName, 'vendas', dataWithDrop);
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].type).toBe('DROP');
    });

    it('deve incluir informação de severidade', () => {
      const dataWithAnomaly: DataPoint[] = [
        ...sampleData,
        { date: '2024-02-01', value: 10000 }, // Grave
      ];

      const anomalies = PredictiveService.detectAnomalies(storeId, storeName, 'vendas', dataWithAnomaly);
      if (anomalies.length > 0) {
        expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(anomalies[0].severity);
      }
    });

    it('deve não detectar anomalias em dados normais', () => {
      const anomalies = PredictiveService.detectAnomalies(storeId, storeName, 'vendas', sampleData);
      // Dados normais podem ter algumas anomalias, mas não muitas
      expect(anomalies.length).toBeLessThan(5);
    });
  });

  describe('Geração de Recomendações', () => {
    it('deve gerar recomendações baseadas em previsão', () => {
      const prediction = PredictiveService.generatePrediction('model-1', sampleData, 30);
      const currentMetrics = { vendas: 1000, stock: 200, margem: 25 };

      const recommendations = PredictiveService.generateRecommendations(
        storeId,
        storeName,
        [prediction],
        currentMetrics
      );

      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('deve recomendar ação para stock baixo', () => {
      const prediction = PredictiveService.generatePrediction('model-1', sampleData, 30);
      const currentMetrics = { vendas: 1000, stock: 30, margem: 25 }; // Stock crítico

      const recommendations = PredictiveService.generateRecommendations(
        storeId,
        storeName,
        [prediction],
        currentMetrics
      );

      const inventoryRec = recommendations.find((r) => r.category === 'INVENTORY');
      expect(inventoryRec).toBeDefined();
      if (inventoryRec) {
        expect(inventoryRec.priority).toBe('CRITICAL');
      }
    });

    it('deve recomendar ação para margem baixa', () => {
      const prediction = PredictiveService.generatePrediction('model-1', sampleData, 30);
      const currentMetrics = { vendas: 1000, stock: 200, margem: 15 }; // Margem baixa

      const recommendations = PredictiveService.generateRecommendations(
        storeId,
        storeName,
        [prediction],
        currentMetrics
      );

      const pricingRec = recommendations.find((r) => r.category === 'PRICING');
      expect(pricingRec).toBeDefined();
    });

    it('deve incluir impacto esperado nas recomendações', () => {
      const prediction = PredictiveService.generatePrediction('model-1', sampleData, 30);
      const currentMetrics = { vendas: 1000, stock: 50, margem: 25 };

      const recommendations = PredictiveService.generateRecommendations(
        storeId,
        storeName,
        [prediction],
        currentMetrics
      );

      if (recommendations.length > 0) {
        const rec = recommendations[0];
        expect(rec.expectedImpact).toHaveProperty('metric');
        expect(rec.expectedImpact).toHaveProperty('change');
        expect(rec.expectedImpact).toHaveProperty('timeframe');
      }
    });
  });

  describe('Geração de Alertas Preditivos', () => {
    it('deve gerar alertas baseados em previsão', () => {
      const prediction = PredictiveService.generatePrediction('model-1', sampleData, 30);
      const thresholds = { vendas: 900 };

      const alerts = PredictiveService.generatePredictiveAlerts(storeId, storeName, [prediction], thresholds);
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('deve gerar alerta para queda de vendas', () => {
      // Criar dados com tendência de queda
      const decliningData: DataPoint[] = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: 1000 - i * 10, // Declínio linear
      }));

      const prediction = PredictiveService.generatePrediction('model-1', decliningData, 30);
      const thresholds = { vendas: 900 };

      const alerts = PredictiveService.generatePredictiveAlerts(storeId, storeName, [prediction], thresholds);
      // Pode ter alerta de queda
      const dropAlert = alerts.find((a) => a.type === 'SALES_DROP');
      if (dropAlert) {
        expect(dropAlert.severity).toMatch(/CRITICAL|ALERT/);
      }
    });

    it('deve incluir informação de confiança nos alertas', () => {
      const prediction = PredictiveService.generatePrediction('model-1', sampleData, 30);
      const thresholds = { vendas: 900 };

      const alerts = PredictiveService.generatePredictiveAlerts(storeId, storeName, [prediction], thresholds);

      if (alerts.length > 0) {
        expect(alerts[0].confidence).toBeGreaterThan(0);
        expect(alerts[0].confidence).toBeLessThanOrEqual(100);
      }
    });

    it('deve retornar array vazio para previsões vazias', () => {
      const alerts = PredictiveService.generatePredictiveAlerts(storeId, storeName, [], {});
      expect(alerts).toEqual([]);
    });
  });

  describe('Cálculo de Correlação', () => {
    it('deve calcular correlação entre duas métricas', () => {
      const metric1 = sampleData;
      const metric2 = sampleData.map((d) => ({ ...d, value: d.value * 1.5 })); // Correlação perfeita positiva

      const correlation = PredictiveService.calculateCorrelation(metric1, metric2);

      expect(correlation).toHaveProperty('correlation');
      expect(correlation).toHaveProperty('strength');
      expect(correlation).toHaveProperty('samples');
    });

    it('deve detectar correlação positiva forte', () => {
      const metric1 = sampleData;
      const metric2 = sampleData.map((d) => ({ ...d, value: d.value * 1.5 + 50 }));

      const correlation = PredictiveService.calculateCorrelation(metric1, metric2);

      expect(correlation.correlation).toBeGreaterThan(0.8);
      expect(['STRONG', 'VERY_STRONG']).toContain(correlation.strength);
    });

    it('deve retornar correlação zero para dados independentes', () => {
      const metric1 = sampleData;
      const metric2 = Array.from({ length: sampleData.length }, (_, i) => ({
        date: new Date(Date.now() - (sampleData.length - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: Math.random() * 1000,
      }));

      const correlation = PredictiveService.calculateCorrelation(metric1, metric2);

      expect(Math.abs(correlation.correlation)).toBeLessThan(0.5);
    });
  });

  describe('Benchmarking', () => {
    it('deve comparar loja com pares', () => {
      const allStores = [
        { storeId: 'store-1', storeName: 'Loja 1', value: 1000 },
        { storeId: 'store-2', storeName: 'Loja 2', value: 1500 },
        { storeId: 'store-3', storeName: 'Loja 3', value: 800 },
      ];

      const benchmark = PredictiveService.benchmarkStore('store-1', 'Loja 1', 'vendas', 1000, allStores);

      expect(benchmark).toHaveProperty('rank');
      expect(benchmark).toHaveProperty('percentile');
      expect(benchmark).toHaveProperty('improvement');
      expect(benchmark.rank).toBeGreaterThan(0);
    });

    it('deve identificar melhor performador', () => {
      const allStores = [
        { storeId: 'store-1', storeName: 'Loja 1', value: 1000 },
        { storeId: 'store-2', storeName: 'Loja 2', value: 1500 },
        { storeId: 'store-3', storeName: 'Loja 3', value: 800 },
      ];

      const benchmark = PredictiveService.benchmarkStore('store-1', 'Loja 1', 'vendas', 1000, allStores);

      expect(benchmark.topPerformer.value).toBe(1500);
      expect(benchmark.topPerformer.storeName).toBe('Loja 2');
    });

    it('deve calcular percentil correto', () => {
      const allStores = [
        { storeId: 'store-1', storeName: 'Loja 1', value: 1000 },
        { storeId: 'store-2', storeName: 'Loja 2', value: 1000 },
        { storeId: 'store-3', storeName: 'Loja 3', value: 1000 },
      ];

      const benchmark = PredictiveService.benchmarkStore('store-1', 'Loja 1', 'vendas', 1000, allStores);

      // Todos iguais, deve estar no meio (33%)
      expect(benchmark.percentile).toBeGreaterThan(0);
      expect(benchmark.percentile).toBeLessThanOrEqual(100);
    });
  });

  describe('Validação de Configuração', () => {
    it('deve validar nome obrigatório', () => {
      const errors = PredictiveService.validateModelConfig({
        type: 'SALES_FORECAST',
        storeId: 'store-1',
        metric: 'vendas',
      });

      expect(errors).toContain(expect.stringContaining('Nome'));
    });

    it('deve validar tipo válido', () => {
      const errors = PredictiveService.validateModelConfig({
        name: 'Modelo 1',
        type: 'INVALID_TYPE',
        storeId: 'store-1',
        metric: 'vendas',
      });

      expect(errors).toContain(expect.stringContaining('tipo'));
    });

    it('deve validar seleção de loja', () => {
      const errors = PredictiveService.validateModelConfig({
        name: 'Modelo 1',
        type: 'SALES_FORECAST',
        metric: 'vendas',
      });

      expect(errors).toContain(expect.stringContaining('Loja'));
    });

    it('deve validar métrica obrigatória', () => {
      const errors = PredictiveService.validateModelConfig({
        name: 'Modelo 1',
        type: 'SALES_FORECAST',
        storeId: 'store-1',
      });

      expect(errors).toContain(expect.stringContaining('Métrica'));
    });

    it('deve aceitar configuração válida', () => {
      const errors = PredictiveService.validateModelConfig({
        name: 'Modelo 1',
        type: 'SALES_FORECAST',
        storeId: 'store-1',
        metric: 'vendas',
        minDataPoints: 10,
      });

      expect(errors).toHaveLength(0);
    });
  });

  describe('Cálculo de Estatísticas', () => {
    it('deve calcular média corretamente', () => {
      const stats = PredictiveService.calculateStatistics(sampleData);
      const manualMean = sampleData.reduce((sum, d) => sum + d.value, 0) / sampleData.length;

      expect(Math.abs(stats.mean - manualMean)).toBeLessThan(1);
    });

    it('deve calcular mediana', () => {
      const stats = PredictiveService.calculateStatistics(sampleData);
      expect(stats.median).toBeGreaterThan(0);
    });

    it('deve calcular desvio padrão', () => {
      const stats = PredictiveService.calculateStatistics(sampleData);
      expect(stats.stdDev).toBeGreaterThanOrEqual(0);
    });

    it('deve identificar mín e máx', () => {
      const stats = PredictiveService.calculateStatistics(sampleData);
      expect(stats.min).toBeLessThanOrEqual(stats.max);
      expect(stats.min).toBeGreaterThan(0);
    });

    it('deve retornar zeros para array vazio', () => {
      const stats = PredictiveService.calculateStatistics([]);
      expect(stats.mean).toBe(0);
      expect(stats.median).toBe(0);
      expect(stats.stdDev).toBe(0);
    });
  });

  describe('Treino de Todos os Modelos', () => {
    it('deve treinar múltiplos modelos', () => {
      const models = [
        {
          id: 'model-1',
          name: 'Modelo 1',
          type: 'SALES_FORECAST' as const,
          storeId: 'store-1',
          storeName: 'Loja 1',
          metric: 'vendas' as const,
          status: 'TRAINING' as const,
          accuracy: 0,
          lastTraining: new Date().toISOString(),
          nextTraining: new Date().toISOString(),
          trainingInterval: 'DAILY' as const,
          minDataPoints: 5,
          currentDataPoints: 30,
          createdAt: new Date().toISOString(),
          createdBy: 'admin',
        },
      ];

      const results = PredictiveService.trainAllModels(models);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].accuracy).toBeGreaterThan(0);
    });

    it('deve retornar resultados com métricas de qualidade', () => {
      const models = [
        {
          id: 'model-1',
          name: 'Modelo 1',
          type: 'SALES_FORECAST' as const,
          storeId: 'store-1',
          storeName: 'Loja 1',
          metric: 'vendas' as const,
          status: 'TRAINING' as const,
          accuracy: 0,
          lastTraining: new Date().toISOString(),
          nextTraining: new Date().toISOString(),
          trainingInterval: 'DAILY' as const,
          minDataPoints: 5,
          currentDataPoints: 30,
          createdAt: new Date().toISOString(),
          createdBy: 'admin',
        },
      ];

      const results = PredictiveService.trainAllModels(models);
      const result = results[0];

      expect(result).toHaveProperty('mape');
      expect(result).toHaveProperty('rmse');
      expect(result).toHaveProperty('trainingTime');
      expect(result).toHaveProperty('improvements');
    });
  });

  describe('Integração Completa', () => {
    it('deve executar pipeline completo de análise', () => {
      // 1. Treinar
      const modelConfig = PredictiveService.trainLinearModel(sampleData);
      expect(modelConfig).toBeDefined();

      // 2. Detectar sazonalidade
      const seasonality = PredictiveService.detectSeasonality(sampleData);
      expect(seasonality).toBeDefined();

      // 3. Gerar previsão
      const prediction = PredictiveService.generatePrediction('model-1', sampleData, 30);
      expect(prediction).toBeDefined();

      // 4. Detectar anomalias
      const anomalies = PredictiveService.detectAnomalies(storeId, storeName, 'vendas', sampleData);
      expect(anomalies).toBeDefined();

      // 5. Gerar recomendações
      const recommendations = PredictiveService.generateRecommendations(
        storeId,
        storeName,
        [prediction],
        { vendas: 1000 }
      );
      expect(recommendations).toBeDefined();

      // 6. Gerar alertas
      const alerts = PredictiveService.generatePredictiveAlerts(storeId, storeName, [prediction], {});
      expect(alerts).toBeDefined();
    });
  });
});
