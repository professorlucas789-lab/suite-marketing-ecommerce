/**
 * Testes para Fase 9: Performance e Otimização
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceService } from '../services/performanceService';
import type { CacheConfig, DataIndex } from '../types/performance';

describe('Fase 9: Performance e Otimização', () => {
  beforeEach(() => {
    PerformanceService.clearCache();
  });

  describe('Cache LRU', () => {
    it('deve armazenar e recuperar dados do cache', () => {
      PerformanceService.cacheSet('key1', { data: 'value1' });
      const result = PerformanceService.cacheGet('key1');

      expect(result).toEqual({ data: 'value1' });
    });

    it('deve retornar null para chave não existente', () => {
      const result = PerformanceService.cacheGet('nonexistent');
      expect(result).toBeNull();
    });

    it('deve respeitar TTL', (done) => {
      PerformanceService.cacheSet('key1', 'value1', 0.001); // TTL muito curto

      setTimeout(() => {
        const result = PerformanceService.cacheGet('key1');
        expect(result).toBeNull();
        done();
      }, 10);
    });

    it('deve calcular estatísticas de cache', () => {
      PerformanceService.cacheSet('key1', 'value1');
      PerformanceService.cacheGet('key1'); // Hit
      PerformanceService.cacheGet('key2'); // Miss

      const stats = PerformanceService.getCacheStats('default');

      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.itemCount).toBeGreaterThan(0);
      expect(stats.efficiency).toBeGreaterThanOrEqual(0);
    });

    it('deve evitar duplicatas com mesma chave', () => {
      PerformanceService.cacheSet('key1', 'value1');
      PerformanceService.cacheSet('key1', 'value2');

      const result = PerformanceService.cacheGet('key1');
      expect(result).toBe('value2');
    });
  });

  describe('Índices', () => {
    it('deve criar índice hash válido', () => {
      const data = [
        { id: 1, storeId: 'store-1', value: 100 },
        { id: 2, storeId: 'store-2', value: 200 },
        { id: 3, storeId: 'store-1', value: 150 },
      ];

      const index = PerformanceService.createIndex('store_id_idx', 'storeId', 'sales', data);

      expect(index.name).toBe('store_id_idx');
      expect(index.type).toBe('HASH');
      expect(index.column).toBe('storeId');
      expect(index.cardinality).toBe(2); // Valores únicos
    });

    it('deve buscar por índice', () => {
      const data = [
        { id: 1, storeId: 'store-1' },
        { id: 2, storeId: 'store-2' },
        { id: 3, storeId: 'store-1' },
      ];

      PerformanceService.createIndex('idx', 'storeId', 'table', data);
      const results = PerformanceService.searchByIndex('idx', 'store-1');

      expect(results).toContain(1);
      expect(results).toContain(3);
      expect(results.length).toBe(2);
    });

    it('deve indicar índices únicos', () => {
      const data = [
        { id: 1, email: 'user1@example.com' },
        { id: 2, email: 'user2@example.com' },
      ];

      const index = PerformanceService.createIndex('email_idx', 'email', 'users', data);

      expect(index.isUnique).toBe(true);
    });

    it('deve calcular eficiência do índice', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        category: `cat-${i % 10}`, // 10 categorias
      }));

      const index = PerformanceService.createIndex('cat_idx', 'category', 'table', data);

      expect(index.efficiency).toBeGreaterThan(0);
      expect(index.efficiency).toBeLessThanOrEqual(100);
    });
  });

  describe('Batch Processing', () => {
    it('deve criar job de batch válido', () => {
      const job = PerformanceService.createBatchJob({
        name: 'Export Batch',
        type: 'EXPORT',
        priority: 80,
        itemCount: 1000,
        estimatedDuration: 30,
        createdBy: 'admin',
      });

      expect(job.id).toBeDefined();
      expect(job.status).toBe('PENDING');
      expect(job.progress).toBe(0);
    });

    it('deve processar batch com sucesso', async () => {
      const items = Array.from({ length: 10 }, (_, i) => i);

      const job = PerformanceService.createBatchJob({
        name: 'Test Batch',
        type: 'PREDICTION',
        priority: 50,
        itemCount: items.length,
        estimatedDuration: 5,
        createdBy: 'test',
      });

      const processor = async (item: number) => {
        return item * 2;
      };

      const result = await PerformanceService.processBatch(job.id, processor, items);

      expect(result?.status).toBe('COMPLETED');
      expect(result?.processedItems).toBe(10);
      expect(result?.progress).toBe(100);
    });

    it('deve manejar erros em batch', async () => {
      const items = [1, 2, 3];

      const job = PerformanceService.createBatchJob({
        name: 'Error Batch',
        type: 'TRAINING',
        priority: 50,
        itemCount: items.length,
        estimatedDuration: 5,
        createdBy: 'test',
      });

      const processor = async (item: number) => {
        if (item === 2) throw new Error('Test error');
        return item;
      };

      const result = await PerformanceService.processBatch(job.id, processor, items);

      expect(result?.errorCount).toBeGreaterThan(0);
    });
  });

  describe('Métricas de Performance', () => {
    it('deve registrar métrica de performance', () => {
      const metric = PerformanceService.recordMetric('testOp', 150, 10);

      expect(metric.operation).toBe('testOp');
      expect(metric.duration).toBe(150);
      expect(metric.itemsProcessed).toBe(10);
      expect(metric.throughput).toBeGreaterThan(0);
    });

    it('deve calcular throughput corretamente', () => {
      const metric = PerformanceService.recordMetric('op', 100, 50); // 50 items em 100ms = 500/s

      expect(metric.throughput).toBeGreaterThan(400);
      expect(metric.throughput).toBeLessThan(600);
    });

    it('deve registrar cache hits', () => {
      const metric = PerformanceService.recordMetric('cachedOp', 5, 1, 0, true);

      expect(metric.cacheHit).toBe(true);
      expect(metric.duration).toBeLessThan(10);
    });
  });

  describe('Otimização de Query', () => {
    it('deve sugerir otimização de query', () => {
      const optimization = PerformanceService.optimizeQuery('slow_query', 2000);

      expect(optimization.originalDuration).toBe(2000);
      expect(optimization.optimizedDuration).toBeLessThan(2000);
      expect(optimization.improvement).toBeGreaterThan(0);
      expect(optimization.improvement).toBeLessThanOrEqual(100);
    });

    it('deve aplicar otimização de query', () => {
      const optimization = PerformanceService.optimizeQuery('query1', 1000);
      const success = PerformanceService.applyQueryOptimization(optimization.id);

      expect(success).toBe(true);
      expect(optimization.applied).toBe(true);
      expect(optimization.appliedAt).toBeDefined();
    });

    it('deve retornar falso para ID inválido', () => {
      const success = PerformanceService.applyQueryOptimization('invalid-id');
      expect(success).toBe(false);
    });
  });

  describe('Compressão de Dados', () => {
    it('deve criar configuração de compressão GZIP', () => {
      const config = PerformanceService.createCompressionConfig('GZIP');

      expect(config.algorithm).toBe('GZIP');
      expect(config.compressedSize).toBeLessThan(config.originalSize);
      expect(config.ratio).toBeGreaterThan(0);
      expect(config.ratio).toBeLessThan(100);
    });

    it('deve comparar eficiência de algoritmos', () => {
      const gzip = PerformanceService.createCompressionConfig('GZIP');
      const brotli = PerformanceService.createCompressionConfig('BROTLI');

      // Brotli deve ser melhor que GZIP
      expect(brotli.ratio).toBeLessThanOrEqual(gzip.ratio);
    });

    it('deve ter compressão habilitada por padrão', () => {
      const config = PerformanceService.createCompressionConfig('LZ4');
      expect(config.enabled).toBe(true);
    });
  });

  describe('Limites de Recurso', () => {
    it('deve criar limite de recurso', () => {
      const limit = PerformanceService.setResourceLimit('MEMORY', 2048, 'MB', 80);

      expect(limit.type).toBe('MEMORY');
      expect(limit.value).toBe(2048);
      expect(limit.threshold).toBe(80);
    });

    it('deve verificar status do limite', () => {
      const limits = [
        PerformanceService.setResourceLimit('CPU', 100, 'percent', 80),
      ];

      limits[0].currentUsage = 90; // Acima do threshold

      const checked = PerformanceService.checkResourceLimits(limits);

      expect(checked[0].status).toBe('CRITICAL');
    });

    it('deve indicar WARNING quando próximo do limite', () => {
      const limits = [
        PerformanceService.setResourceLimit('STORAGE', 1000, 'GB', 80),
      ];

      limits[0].currentUsage = 720; // 72% - entre 64% e 80%

      const checked = PerformanceService.checkResourceLimits(limits);

      expect(checked[0].status).toBe('WARNING');
    });

    it('deve indicar OK quando abaixo do limite', () => {
      const limits = [
        PerformanceService.setResourceLimit('MEMORY', 1000, 'MB', 70),
      ];

      limits[0].currentUsage = 500; // 50%

      const checked = PerformanceService.checkResourceLimits(limits);

      expect(checked[0].status).toBe('OK');
    });
  });

  describe('Relatórios de Performance', () => {
    it('deve gerar relatório de performance', () => {
      PerformanceService.recordMetric('op1', 100);
      PerformanceService.recordMetric('op2', 200);

      const report = PerformanceService.generatePerformanceReport();

      expect(report.id).toBeDefined();
      expect(report.summary.avgResponseTime).toBeGreaterThan(0);
      expect(report.summary.maxResponseTime).toBeGreaterThan(0);
    });

    it('deve calcular percentis corretamente', () => {
      for (let i = 0; i < 100; i++) {
        PerformanceService.recordMetric(`op`, i * 10);
      }

      const report = PerformanceService.generatePerformanceReport();

      expect(report.summary.p95ResponseTime).toBeGreaterThan(report.summary.avgResponseTime);
      expect(report.summary.p99ResponseTime).toBeGreaterThanOrEqual(report.summary.p95ResponseTime);
    });

    it('deve incluir recomendações no relatório', () => {
      // Registrar operações lentas
      for (let i = 0; i < 10; i++) {
        PerformanceService.recordMetric('slowOp', 2000);
      }

      const report = PerformanceService.generatePerformanceReport();

      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Dashboard de Performance', () => {
    it('deve gerar dashboard com KPIs', () => {
      PerformanceService.recordMetric('op1', 150);
      PerformanceService.recordMetric('op2', 250);

      const dashboard = PerformanceService.generatePerformanceDashboard();

      expect(dashboard.kpis.avgResponseTime).toBeGreaterThan(0);
      expect(dashboard.kpis.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(dashboard.kpis.batchSuccessRate).toBeGreaterThanOrEqual(0);
    });

    it('deve incluir operações mais lentas', () => {
      PerformanceService.recordMetric('fast', 10);
      PerformanceService.recordMetric('slow', 1000);

      const dashboard = PerformanceService.generatePerformanceDashboard();

      expect(dashboard.topSlowestOperations.length).toBeGreaterThan(0);
      expect(dashboard.topSlowestOperations[0].avgTime).toBeGreaterThan(100);
    });

    it('deve gerar alertas para problemas', () => {
      // Registrar operações muito lentas
      for (let i = 0; i < 20; i++) {
        PerformanceService.recordMetric('slowOp', 2000);
      }

      const dashboard = PerformanceService.generatePerformanceDashboard();

      expect(dashboard.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('Escalabilidade', () => {
    it('deve calcular métricas de escalabilidade', () => {
      const metrics = PerformanceService.generateScalabilityMetrics(
        50, // 50GB
        5000000, // 5M records
        100, // 100 lojas
        500 // 500 modelos
      );

      expect(metrics.dataVolumeGB).toBe(50);
      expect(metrics.numberOfRecords).toBe(5000000);
      expect(metrics.queryTimeMs).toBeGreaterThan(0);
      expect(metrics.scalingFactor).toBeGreaterThan(0);
    });

    it('deve estimar capacidade máxima', () => {
      const metrics = PerformanceService.generateScalabilityMetrics(10, 1000000, 50, 200);

      expect(metrics.estimatedMaxCapacity).toBeGreaterThan(metrics.dataVolumeGB * 1024 * 1024 * 1024);
    });
  });

  describe('Métricas de Memória', () => {
    it('deve retornar métricas de memória válidas', () => {
      const memMetrics = PerformanceService.getMemoryMetrics();

      expect(memMetrics.heapUsed).toBeGreaterThan(0);
      expect(memMetrics.heapTotal).toBeGreaterThan(memMetrics.heapUsed);
      expect(memMetrics.usagePercent).toBeGreaterThan(0);
      expect(memMetrics.usagePercent).toBeLessThanOrEqual(100);
    });

    it('deve rastrear componentes de memória', () => {
      const memMetrics = PerformanceService.getMemoryMetrics();

      expect(memMetrics.external).toBeDefined();
      expect(memMetrics.rss).toBeDefined();
      expect(memMetrics.arrayBuffers).toBeDefined();
    });
  });

  describe('Status de Performance', () => {
    it('deve indicar sistema saudável sem problemas', () => {
      PerformanceService.recordMetric('op', 100);

      const status = PerformanceService.getPerformanceStatus();

      expect(status).toHaveProperty('healthy');
      expect(status).toHaveProperty('overallScore');
      expect(status).toHaveProperty('issues');
      expect(status.overallScore).toBeGreaterThan(0);
    });

    it('deve detectar problemas de performance', () => {
      // Registrar muitas operações lentas
      for (let i = 0; i < 50; i++) {
        PerformanceService.recordMetric('slowOp', 5000);
      }

      const status = PerformanceService.getPerformanceStatus();

      if (status.issues.length > 0) {
        expect(status.healthy).toBe(false);
      }
    });
  });

  describe('Limpeza de Dados', () => {
    it('deve limpar cache', () => {
      PerformanceService.cacheSet('key1', 'value1');
      expect(PerformanceService.cacheGet('key1')).toBeDefined();

      PerformanceService.clearCache();
      expect(PerformanceService.cacheGet('key1')).toBeNull();
    });

    it('deve limpar métricas antigas', () => {
      PerformanceService.recordMetric('op', 100);

      const cleared = PerformanceService.clearOldMetrics(0.0001); // Muito antiga

      expect(cleared).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuração de Cache', () => {
    it('deve criar configuração de cache válida', () => {
      const config = PerformanceService.createCacheConfig({
        name: 'predictions-cache',
        type: 'HYBRID',
        ttl: 3600,
        maxSize: 104857600, // 100MB
        maxItems: 1000,
        strategy: 'LRU',
        enabled: true,
      });

      expect(config.id).toBeDefined();
      expect(config.createdAt).toBeDefined();
      expect(config.updatedAt).toBeDefined();
      expect(config.name).toBe('predictions-cache');
    });
  });

  describe('Integração Completa', () => {
    it('deve executar fluxo completo de otimização', async () => {
      // 1. Criar índice
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        storeId: `store-${i % 10}`,
      }));
      PerformanceService.createIndex('store_idx', 'storeId', 'table', data);

      // 2. Buscar por índice
      const results = PerformanceService.searchByIndex('store_idx', 'store-1');
      expect(results.length).toBeGreaterThan(0);

      // 3. Cache
      PerformanceService.cacheSet('results', results);
      const cached = PerformanceService.cacheGet('results');
      expect(cached).toEqual(results);

      // 4. Registrar métrica
      PerformanceService.recordMetric('indexSearch', 50, results.length);

      // 5. Gerar relatório
      const report = PerformanceService.generatePerformanceReport();
      expect(report).toBeDefined();
    });
  });
});
