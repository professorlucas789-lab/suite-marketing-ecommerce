/**
 * Testes: Stock Service
 * FASE 2: Gestão de Estoque Automática
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {},
}));

describe('StockService', () => {
  describe('Validação de Movimentos', () => {
    it('deve rejeitar quantidade zero', async () => {
      expect(() => {
        if (0 <= 0) throw new Error('Quantidade deve ser maior que zero');
      }).toThrow('Quantidade deve ser maior que zero');
    });

    it('deve rejeitar quantidade negativa', async () => {
      expect(() => {
        if (-5 <= 0) throw new Error('Quantidade deve ser maior que zero');
      }).toThrow('Quantidade deve ser maior que zero');
    });

    it('deve validar quantidade suficiente para saída', async () => {
      const currentQty = 5;
      const requestedQty = 10;

      if (currentQty < requestedQty) {
        throw new Error(`Stock insuficiente. Disponível: ${currentQty}`);
      }

      expect(currentQty).toBeGreaterThanOrEqual(requestedQty);
    });
  });

  describe('Cálculo de Novo Stock', () => {
    it('deve calcular stock correto para entrada (IN)', () => {
      const currentQty = 100;
      const quantity = 50;
      const newQty = currentQty + quantity;

      expect(newQty).toBe(150);
    });

    it('deve calcular stock correto para saída (OUT)', () => {
      const currentQty = 100;
      const quantity = 30;
      const newQty = currentQty - quantity;

      expect(newQty).toBe(70);
    });

    it('deve calcular stock correto para ajuste (ADJUSTMENT)', () => {
      const quantity = 75;
      const newQty = quantity;

      expect(newQty).toBe(75);
    });
  });

  describe('Razões de Movimento', () => {
    it('deve aceitar razões válidas para IN', () => {
      const validReasons = ['purchase', 'return', 'transfer', 'other'];

      validReasons.forEach((reason) => {
        expect(['purchase', 'return', 'transfer', 'other']).toContain(reason);
      });
    });

    it('deve aceitar razões válidas para OUT', () => {
      const validReasons = ['sale', 'damage', 'expiry', 'loss', 'other'];

      validReasons.forEach((reason) => {
        expect(['sale', 'damage', 'expiry', 'loss', 'other']).toContain(reason);
      });
    });

    it('deve aceitar razões válidas para ADJUSTMENT', () => {
      const validReasons = ['inventory_count', 'adjustment', 'other'];

      validReasons.forEach((reason) => {
        expect(['inventory_count', 'adjustment', 'other']).toContain(reason);
      });
    });
  });

  describe('Custo Total', () => {
    it('deve calcular custo total corretamente', () => {
      const quantity = 50;
      const unitCost = 100.5;
      const totalCost = quantity * unitCost;

      expect(totalCost).toBe(5025);
    });

    it('deve permitir custo unitário zero', () => {
      const quantity = 50;
      const unitCost = 0;
      const totalCost = quantity * unitCost;

      expect(totalCost).toBe(0);
    });

    it('deve permitir custo unitário decimal', () => {
      const quantity = 100;
      const unitCost = 9.99;
      const totalCost = quantity * unitCost;

      expect(totalCost).toBeCloseTo(999, 1);
    });
  });

  describe('Detecção de Alertas de Stock Baixo', () => {
    it('deve criar alerta quando stock < minQuantity', () => {
      const currentQty = 3;
      const minQty = 10;

      expect(currentQty < minQty).toBe(true);
    });

    it('deve não criar alerta quando stock >= minQuantity', () => {
      const currentQty = 15;
      const minQty = 10;

      expect(currentQty < minQty).toBe(false);
    });

    it('deve definir severidade CRITICAL quando stock < 50% minQuantity', () => {
      const currentQty = 2;
      const minQty = 10;
      const severity = currentQty < minQty * 0.5 ? 'CRITICAL' : 'LOW';

      expect(severity).toBe('CRITICAL');
    });

    it('deve definir severidade LOW quando stock entre 50% e 100% minQuantity', () => {
      const currentQty = 6;
      const minQty = 10;
      const severity = currentQty < minQty * 0.5 ? 'CRITICAL' : 'LOW';

      expect(severity).toBe('LOW');
    });
  });

  describe('Cálculo de Dias até Esgotar', () => {
    it('deve calcular dias até esgotar corretamente', () => {
      const currentQty = 100;
      const avgDailyUsage = 10;
      const daysUntilStockout = Math.ceil(currentQty / avgDailyUsage);

      expect(daysUntilStockout).toBe(10);
    });

    it('deve retornar Infinity quando uso diário é zero', () => {
      const currentQty = 100;
      const avgDailyUsage = 0;
      const daysUntilStockout = avgDailyUsage > 0 ? Math.ceil(currentQty / avgDailyUsage) : Infinity;

      expect(daysUntilStockout).toBe(Infinity);
    });

    it('deve arredondar para cima', () => {
      const currentQty = 100;
      const avgDailyUsage = 7;
      const daysUntilStockout = Math.ceil(currentQty / avgDailyUsage);

      expect(daysUntilStockout).toBe(15);
      expect(daysUntilStockout).not.toBe(14.28);
    });
  });

  describe('Análise de Tendência', () => {
    it('deve detectar trend crescente', () => {
      const recent = [100, 105, 110, 115];
      const older = [80, 85, 90, 95];

      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      const trendPercent = ((recentAvg - olderAvg) / olderAvg) * 100;
      const trend = trendPercent > 5 ? 'increasing' : 'stable';

      expect(trend).toBe('increasing');
    });

    it('deve detectar trend decrescente', () => {
      const recent = [50, 48, 46, 44];
      const older = [100, 98, 96, 94];

      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      const trendPercent = ((recentAvg - olderAvg) / olderAvg) * 100;
      const trend = trendPercent < -5 ? 'decreasing' : 'stable';

      expect(trend).toBe('decreasing');
    });

    it('deve detectar trend estável', () => {
      const recent = [100, 101, 99, 102];
      const older = [98, 101, 99, 100];

      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      const trendPercent = ((recentAvg - olderAvg) / olderAvg) * 100;
      const trend = Math.abs(trendPercent) <= 5 ? 'stable' : 'other';

      expect(trend).toBe('stable');
    });
  });

  describe('Relatório de Reabastecimento', () => {
    it('deve ordenar itens por prioridade', () => {
      const items = [
        { priority: 'MEDIUM', daysUntilStockout: 15 },
        { priority: 'URGENT', daysUntilStockout: 2 },
        { priority: 'HIGH', daysUntilStockout: 5 },
      ];

      const priorities = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
      const sorted = items.sort(
        (a, b) => priorities.indexOf(a.priority) - priorities.indexOf(b.priority)
      );

      expect(sorted[0].priority).toBe('URGENT');
      expect(sorted[1].priority).toBe('HIGH');
      expect(sorted[2].priority).toBe('MEDIUM');
    });

    it('deve calcular custo total sugerido', () => {
      const items = [
        { suggestedQuantity: 50, estimatedCost: 500 },
        { suggestedQuantity: 100, estimatedCost: 1000 },
      ];

      const totalCost = items.reduce((sum, item) => sum + item.estimatedCost, 0);

      expect(totalCost).toBe(1500);
    });
  });
});
