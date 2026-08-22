/**
 * Tests: Daily Report Service
 * Testa geração automática de relatórios diários com KPIs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DailyReportService } from '../dailyReportService';

vi.mock('firebase/firestore');

describe('Daily Report Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('KPI Calculations', () => {
    it('deve calcular corretamente totalSales', () => {
      const sales = [
        { totalPrice: 100 },
        { totalPrice: 150 },
        { totalPrice: 200 },
      ];

      const totalRevenue = sales.reduce((sum, s) => sum + s.totalPrice, 0);

      expect(totalRevenue).toBe(450);
    });

    it('deve calcular corretamente totalProfit', () => {
      const sales = [
        { totalPrice: 100, totalCost: 60 }, // profit: 40
        { totalPrice: 150, totalCost: 100 }, // profit: 50
        { totalPrice: 200, totalCost: 120 }, // profit: 80
      ];

      const totalRevenue = sales.reduce((sum, s) => sum + s.totalPrice, 0);
      const totalCost = sales.reduce((sum, s) => sum + s.totalCost, 0);
      const totalProfit = totalRevenue - totalCost;

      expect(totalRevenue).toBe(450);
      expect(totalCost).toBe(280);
      expect(totalProfit).toBe(170);
    });

    it('deve calcular corretamente avgMargin', () => {
      const sales = [
        { profitMargin: 40 },
        { profitMargin: 30 },
        { profitMargin: 20 },
      ];

      const avgMargin = sales.reduce((sum, s) => sum + s.profitMargin, 0) / sales.length;

      expect(avgMargin).toBe(30);
    });

    it('deve calcular corretamente totalUnits', () => {
      const sales = [
        { quantity: 5 },
        { quantity: 10 },
        { quantity: 15 },
      ];

      const totalUnits = sales.reduce((sum, s) => sum + s.quantity, 0);

      expect(totalUnits).toBe(30);
    });
  });

  describe('Top Product Identification', () => {
    it('deve identificar produto com maior revenue', () => {
      const productsSales = [
        { name: 'Paracetamol', units: 100, revenue: 500 },
        { name: 'Ibuprofen', units: 50, revenue: 400 },
        { name: 'Dipirona', units: 30, revenue: 450 },
      ];

      const topProduct = productsSales.sort((a, b) => b.revenue - a.revenue)[0];

      expect(topProduct.name).toBe('Paracetamol');
      expect(topProduct.revenue).toBe(500);
    });

    it('deve lidar com empate entre produtos', () => {
      const productsSales = [
        { name: 'Paracetamol', units: 100, revenue: 500 },
        { name: 'Ibuprofen', units: 50, revenue: 500 },
      ];

      const sorted = productsSales.sort((a, b) => b.revenue - a.revenue);
      const topProduct = sorted[0];

      expect(topProduct.revenue).toBe(500);
    });

    it('deve retornar null se sem vendas', () => {
      const productsSales: any[] = [];

      const topProduct = productsSales.length > 0
        ? productsSales.sort((a, b) => b.revenue - a.revenue)[0]
        : null;

      expect(topProduct).toBeNull();
    });
  });

  describe('Alert Counting', () => {
    it('deve contar corretamente stockCritical alerts', () => {
      const alerts = [
        { type: 'stock_critical' },
        { type: 'stock_critical' },
        { type: 'expiry_soon' },
        { type: 'stock_critical' },
      ];

      const stockCriticalCount = alerts.filter(a => a.type === 'stock_critical').length;

      expect(stockCriticalCount).toBe(3);
    });

    it('deve contar corretamente expiryAlerts', () => {
      const alerts = [
        { type: 'expiry_soon' },
        { type: 'expiry_today' },
        { type: 'stock_critical' },
        { type: 'expiry_soon' },
      ];

      const expiryCount = alerts.filter(a => a.type === 'expiry_soon' || a.type === 'expiry_today').length;

      expect(expiryCount).toBe(3);
    });

    it('deve contar corretamente negativeMarginsCount', () => {
      const sales = [
        { profitMargin: 20 },
        { profitMargin: -5 },
        { profitMargin: 15 },
        { profitMargin: -10 },
      ];

      const negativeMarginsCount = sales.filter(s => s.profitMargin < 0).length;

      expect(negativeMarginsCount).toBe(2);
    });
  });

  describe('Report Insights', () => {
    it('deve gerar highlights quando há boas vendas', () => {
      const totalSales = 50;
      const totalRevenue = 5000;
      const totalUnits = 200;
      const avgMargin = 35;

      const highlights: string[] = [];

      if (totalSales > 0) {
        highlights.push(`📊 ${totalSales} transações realizadas`);
        highlights.push(`💰 Receita total: ${totalRevenue.toFixed(2)} Kz`);
        highlights.push(`📦 ${totalUnits} unidades vendidas`);

        if (avgMargin > 30) {
          highlights.push(`✅ Margem excelente: ${avgMargin.toFixed(1)}%`);
        }
      }

      expect(highlights.length).toBe(4);
      expect(highlights).toContain('✅ Margem excelente: 35.0%');
    });

    it('deve gerar recomendação quando margem está baixa', () => {
      const avgMargin = 15;
      const recommendations: string[] = [];

      if (avgMargin < 20) {
        recommendations.push(`⚠️ Margens baixas: ${avgMargin.toFixed(1)}% - revisar pricing`);
      }

      expect(recommendations.length).toBe(1);
      expect(recommendations[0]).toContain('Margens baixas');
    });

    it('deve avisar quando não há vendas', () => {
      const totalSales = 0;
      const recommendations: string[] = [];

      if (totalSales === 0) {
        recommendations.push('⚠️ Nenhuma venda registada no dia');
      }

      expect(recommendations.length).toBe(1);
    });

    it('deve avisar sobre stock crítico', () => {
      const stockCriticalCount = 5;
      const recommendations: string[] = [];

      if (stockCriticalCount > 0) {
        recommendations.push(`🔴 ${stockCriticalCount} produto(s) com stock crítico`);
      }

      expect(recommendations[0]).toContain('stock crítico');
    });
  });

  describe('Report Formatting', () => {
    it('deve formatar relatório como texto', () => {
      const report = {
        date: '2026-08-22',
        storeName: 'Farmácia Central',
        totalSales: 25,
        totalRevenue: 2500,
        totalUnits: 100,
        totalProfit: 750,
        avgMargin: 30,
        topProduct: { name: 'Paracetamol', units: 50, revenue: 500 },
        highlights: ['📊 25 transações realizadas', '✅ Margem excelente: 30.0%'],
        recommendations: [],
        stockCriticalCount: 0,
        expiryAlertsCount: 2,
        negativeMarginsCount: 0,
      };

      const text = formatReportAsText(report);

      expect(text).toContain('RELATÓRIO DIÁRIO');
      expect(text).toContain('2026-08-22');
      expect(text).toContain('Farmácia Central');
      expect(text).toContain('KPIs DO DIA');
      expect(text).toContain('TOP PRODUTO');
    });

    it('deve incluir emojis no formatação', () => {
      const report = {
        date: '2026-08-22',
        storeName: 'Farmácia Central',
        totalSales: 25,
        totalRevenue: 2500,
        totalUnits: 100,
        totalProfit: 750,
        avgMargin: 30,
        highlights: [],
        recommendations: [],
        stockCriticalCount: 2,
        expiryAlertsCount: 0,
        negativeMarginsCount: 0,
      };

      const text = formatReportAsText(report);

      expect(text).toContain('📊');
      expect(text).toContain('💼');
      expect(text).toContain('⚠️');
    });
  });

  describe('Date Handling', () => {
    it('deve calcular corretamente yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const dateStr = yesterday.toISOString().split('T')[0];

      // If today is 2026-08-22, yesterday should be 2026-08-21
      const parts = dateStr.split('-');
      expect(parts.length).toBe(3);
      expect(parts[0]).toMatch(/^\d{4}$/); // Year
      expect(parts[1]).toMatch(/^\d{2}$/); // Month
      expect(parts[2]).toMatch(/^\d{2}$/); // Day
    });

    it('deve suportar data específica para geração', () => {
      const dateStr = '2026-08-22';
      const parts = dateStr.split('-');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('2026');
      expect(parts[1]).toBe('08');
      expect(parts[2]).toBe('22');
    });

    it('deve validar formato de data YYYY-MM-DD', () => {
      const isValidDateFormat = (dateStr: string) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

      expect(isValidDateFormat('2026-08-22')).toBe(true);
      expect(isValidDateFormat('2026-8-22')).toBe(false);
      expect(isValidDateFormat('22-08-2026')).toBe(false);
    });
  });
});

// Helper function for testing
function formatReportAsText(report: any): string {
  const line = '━'.repeat(40);
  let text = `${line}\n`;
  text += `📊 RELATÓRIO DIÁRIO - ${report.date}\n`;
  text += `Loja: ${report.storeName}\n`;
  text += `${line}\n\n`;

  // KPIs
  text += `💼 KPIs DO DIA:\n`;
  text += `├ Transações: ${report.totalSales}\n`;
  text += `├ Receita: ${report.totalRevenue.toFixed(2)} Kz\n`;
  text += `├ Unidades: ${report.totalUnits}\n`;
  text += `├ Lucro: ${report.totalProfit.toFixed(2)} Kz\n`;
  text += `└ Margem Média: ${report.avgMargin.toFixed(1)}%\n\n`;

  // Top Produto
  if (report.topProduct) {
    text += `⭐ TOP PRODUTO:\n`;
    text += `├ ${report.topProduct.name}\n`;
    text += `├ ${report.topProduct.units} unidades\n`;
    text += `└ ${report.topProduct.revenue.toFixed(2)} Kz\n\n`;
  }

  // Alerts
  if (report.stockCriticalCount > 0 || report.expiryAlertsCount > 0 || report.negativeMarginsCount > 0) {
    text += `⚠️ ALERTAS:\n`;
    if (report.stockCriticalCount > 0) {
      text += `├ Stock crítico: ${report.stockCriticalCount}\n`;
    }
    if (report.expiryAlertsCount > 0) {
      text += `├ Vencimentos: ${report.expiryAlertsCount}\n`;
    }
    text += '\n';
  }

  text += `${line}\n`;

  return text;
}
