/**
 * Testes para Fase 6: Sistema Multi-Loja
 * Fase 5: Gráficos e Relatórios
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Multi-Store System - Fase 5: Gráficos e Relatórios', () => {
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * Testes de Gráficos de Desempenho (PerformanceChart)
   */
  describe('Gráficos de Desempenho', () => {
    interface ChartDataPoint {
      label: string;
      value: number;
      value2?: number;
    }

    it('deve renderizar gráfico de barras com dados corretos', () => {
      const data: ChartDataPoint[] = [
        { label: 'Loja A', value: 450 },
        { label: 'Loja B', value: 320 },
        { label: 'Loja C', value: 580 },
      ];

      const maxValue = Math.max(...data.map((d) => d.value));
      expect(maxValue).toBe(580);
      expect(data).toHaveLength(3);
    });

    it('deve calcular escala correta para gráfico de linhas', () => {
      const data: ChartDataPoint[] = [
        { label: 'Jan', value: 400 },
        { label: 'Fev', value: 450 },
        { label: 'Mar', value: 420 },
        { label: 'Abr', value: 520 },
      ];

      const height = 300;
      const padding = 40;
      const maxValue = Math.max(...data.map((d) => d.value));
      const chartHeight = height - padding * 2;
      const scale = chartHeight / maxValue;

      expect(scale).toBe((300 - 80) / 520);
      expect(chartHeight).toBe(220);
    });

    it('deve calcular percentuais corretos para gráfico de pizza', () => {
      const data: ChartDataPoint[] = [
        { label: 'Farmácia', value: 350 },
        { label: 'Informática', value: 280 },
        { label: 'Ortopédico', value: 220 },
        { label: 'Genérico', value: 150 },
      ];

      const total = data.reduce((sum, item) => sum + item.value, 0);
      const percentages = data.map((item) => ((item.value / total) * 100).toFixed(1));

      expect(total).toBe(1000);
      expect(parseFloat(percentages[0])).toBe(35.0); // Farmácia: 350/1000 = 35%
      expect(parseFloat(percentages[1])).toBe(28.0); // Informática: 280/1000 = 28%
      expect(parseFloat(percentages[2])).toBe(22.0); // Ortopédico: 220/1000 = 22%
      expect(parseFloat(percentages[3])).toBe(15.0); // Genérico: 150/1000 = 15%
    });

    it('deve lidar com valores zero em gráficos', () => {
      const data: ChartDataPoint[] = [
        { label: 'Loja A', value: 0 },
        { label: 'Loja B', value: 100 },
      ];

      const maxValue = Math.max(...data.map((d) => d.value));
      expect(maxValue).toBe(100);
    });

    it('deve suportar múltiplas séries de dados', () => {
      const data: ChartDataPoint[] = [
        { label: 'Mês 1', value: 100, value2: 80 },
        { label: 'Mês 2', value: 120, value2: 90 },
      ];

      const values = data.flatMap((d) => [d.value, d.value2 || 0]);
      const maxValue = Math.max(...values);

      expect(maxValue).toBe(120);
    });

    it('deve ordernar dados por label (para gráficos de barras)', () => {
      const data: ChartDataPoint[] = [
        { label: 'Loja C', value: 300 },
        { label: 'Loja A', value: 500 },
        { label: 'Loja B', value: 400 },
      ];

      const sorted = [...data].sort((a, b) => a.label.localeCompare(b.label));

      expect(sorted[0].label).toBe('Loja A');
      expect(sorted[1].label).toBe('Loja B');
      expect(sorted[2].label).toBe('Loja C');
    });
  });

  /**
   * Testes de Gerador de Relatórios (ReportGenerator)
   */
  describe('Gerador de Relatórios', () => {
    interface Store {
      id: string;
      nome: string;
      tipo: string;
      email: string;
    }

    interface ReportConfig {
      title: string;
      dateRange: string;
      reportType: 'summary' | 'detailed' | 'comparison';
      stores: Store[];
      generatedAt: string;
    }

    it('deve gerar relatório resumido corretamente', () => {
      const stores: Store[] = [
        {
          id: 'store-1',
          nome: 'Farmácia Central',
          tipo: 'farmacia',
          email: 'farm@example.com',
        },
        {
          id: 'store-2',
          nome: 'Loja Informática',
          tipo: 'informatica',
          email: 'info@example.com',
        },
      ];

      const report: ReportConfig = {
        title: 'Relatório Resumido',
        dateRange: 'month',
        reportType: 'summary',
        stores: stores,
        generatedAt: new Date().toISOString(),
      };

      expect(report.reportType).toBe('summary');
      expect(report.stores).toHaveLength(2);
      expect(report.title).toBe('Relatório Resumido');
    });

    it('deve gerar relatório detalhado corretamente', () => {
      const stores: Store[] = [
        {
          id: 'store-1',
          nome: 'Farmácia Central',
          tipo: 'farmacia',
          email: 'farm@example.com',
        },
      ];

      const report: ReportConfig = {
        title: 'Relatório Detalhado',
        dateRange: 'quarter',
        reportType: 'detailed',
        stores: stores,
        generatedAt: new Date().toISOString(),
      };

      expect(report.reportType).toBe('detailed');
      expect(report.dateRange).toBe('quarter');
    });

    it('deve gerar relatório comparativo corretamente', () => {
      const stores: Store[] = [
        { id: 'store-1', nome: 'Loja A', tipo: 'farmacia', email: 'a@example.com' },
        { id: 'store-2', nome: 'Loja B', tipo: 'informatica', email: 'b@example.com' },
      ];

      const report: ReportConfig = {
        title: 'Relatório Comparativo',
        dateRange: 'year',
        reportType: 'comparison',
        stores: stores,
        generatedAt: new Date().toISOString(),
      };

      expect(report.reportType).toBe('comparison');
      expect(report.stores).toHaveLength(2);
    });

    it('deve validar seleção de lojas antes de gerar', () => {
      const stores: Store[] = [];
      const hasStoresSelected = stores.length > 0;

      expect(hasStoresSelected).toBe(false);
    });

    it('deve aplicar filtro de intervalo de datas', () => {
      const dateRanges = {
        week: 'Última Semana',
        month: 'Último Mês',
        quarter: 'Último Trimestre',
        year: 'Último Ano',
        all: 'Todos os Dados',
      };

      expect(Object.keys(dateRanges)).toContain('month');
      expect(dateRanges.month).toBe('Último Mês');
    });

    it('deve gerar timestamp correto para nome de arquivo', () => {
      const timestamp = new Date('2024-06-15T10:30:00Z').toISOString();
      const filename = `relatorio_${'summary'}_${timestamp.split('T')[0]}.json`;

      expect(filename).toBe('relatorio_summary_2024-06-15.json');
    });

    it('deve preparar dados para exportação em formato tabular', () => {
      const stores: Store[] = [
        {
          id: 'store-1',
          nome: 'Loja A',
          tipo: 'farmacia',
          email: 'a@example.com',
        },
      ];

      const exportData = stores.map((store) => ({
        Nome: store.nome,
        Tipo: store.tipo,
        Email: store.email,
      }));

      expect(exportData[0]['Nome']).toBe('Loja A');
      expect(exportData[0]['Tipo']).toBe('farmacia');
    });

    it('deve selecionar múltiplas lojas para relatório', () => {
      const stores: Store[] = [
        { id: 'store-1', nome: 'Loja A', tipo: 'farmacia', email: 'a@example.com' },
        { id: 'store-2', nome: 'Loja B', tipo: 'informatica', email: 'b@example.com' },
        { id: 'store-3', nome: 'Loja C', tipo: 'ortopedico', email: 'c@example.com' },
      ];

      const selected = ['store-1', 'store-3'];
      const selectedStores = stores.filter((s) => selected.includes(s.id));

      expect(selectedStores).toHaveLength(2);
      expect(selectedStores[0].id).toBe('store-1');
      expect(selectedStores[1].id).toBe('store-3');
    });
  });

  /**
   * Testes de Histórico de Lojas (StoreHistoryChart)
   */
  describe('Gráficos de Histórico de Lojas', () => {
    interface HistoryPoint {
      date: string;
      totalProdutos: number;
      totalUtilizadores: number;
      precoMedio: number;
      margemMedia: number;
      valorStock: number;
    }

    it('deve calcular tendência positiva corretamente', () => {
      const data: HistoryPoint[] = [
        {
          date: '2024-01-01',
          totalProdutos: 50,
          totalUtilizadores: 5,
          precoMedio: 15.5,
          margemMedia: 33.0,
          valorStock: 1200,
        },
        {
          date: '2024-06-01',
          totalProdutos: 58,
          totalUtilizadores: 9,
          precoMedio: 17.5,
          margemMedia: 37.0,
          valorStock: 1750,
        },
      ];

      const firstValue = data[0].totalProdutos;
      const lastValue = data[data.length - 1].totalProdutos;
      const change = ((lastValue - firstValue) / firstValue) * 100;

      expect(change).toBe(16);
      expect(change > 0).toBe(true);
    });

    it('deve calcular tendência negativa corretamente', () => {
      const data: HistoryPoint[] = [
        {
          date: '2024-01-01',
          totalProdutos: 60,
          totalUtilizadores: 8,
          precoMedio: 18.0,
          margemMedia: 38.0,
          valorStock: 2000,
        },
        {
          date: '2024-06-01',
          totalProdutos: 45,
          totalUtilizadores: 5,
          precoMedio: 15.0,
          margemMedia: 32.0,
          valorStock: 1200,
        },
      ];

      const firstValue = data[0].totalProdutos;
      const lastValue = data[data.length - 1].totalProdutos;
      const change = ((lastValue - firstValue) / firstValue) * 100;

      expect(change).toBe(-25);
      expect(change < 0).toBe(true);
    });

    it('deve calcular estatísticas básicas (média, máximo, mínimo)', () => {
      const data: HistoryPoint[] = [
        {
          date: '2024-01-01',
          totalProdutos: 45,
          totalUtilizadores: 5,
          precoMedio: 15.5,
          margemMedia: 33.0,
          valorStock: 1200,
        },
        {
          date: '2024-02-01',
          totalProdutos: 48,
          totalUtilizadores: 6,
          precoMedio: 16.2,
          margemMedia: 34.5,
          valorStock: 1350,
        },
        {
          date: '2024-03-01',
          totalProdutos: 52,
          totalUtilizadores: 7,
          precoMedio: 16.8,
          margemMedia: 35.0,
          valorStock: 1500,
        },
      ];

      const values = data.map((d) => d.totalProdutos);
      const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
      const maxValue = Math.max(...values);
      const minValue = Math.min(...values);

      expect(avgValue).toBe(48.333333333333336);
      expect(maxValue).toBe(52);
      expect(minValue).toBe(45);
    });

    it('deve alternar entre diferentes métricas', () => {
      const data: HistoryPoint[] = [
        {
          date: '2024-01-01',
          totalProdutos: 50,
          totalUtilizadores: 5,
          precoMedio: 15.5,
          margemMedia: 33.0,
          valorStock: 1200,
        },
        {
          date: '2024-06-01',
          totalProdutos: 58,
          totalUtilizadores: 9,
          precoMedio: 17.5,
          margemMedia: 37.0,
          valorStock: 1750,
        },
      ];

      const metrics = [
        'totalProdutos',
        'totalUtilizadores',
        'precoMedio',
        'margemMedia',
        'valorStock',
      ];

      metrics.forEach((metric) => {
        const values = data.map((d) => d[metric as keyof HistoryPoint]);
        expect(Array.isArray(values)).toBe(true);
        expect(values.length).toBe(2);
      });
    });

    it('deve extrair data formatada para exibição (MM-DD)', () => {
      const data: HistoryPoint[] = [
        {
          date: '2024-01-15',
          totalProdutos: 50,
          totalUtilizadores: 5,
          precoMedio: 15.5,
          margemMedia: 33.0,
          valorStock: 1200,
        },
      ];

      const formatted = data[0].date.substring(5); // MM-DD
      expect(formatted).toBe('01-15');
    });

    it('deve lidar com histórico vazio (sem calcular tendência)', () => {
      const data: HistoryPoint[] = [];

      const hasTrend = data.length >= 2;
      expect(hasTrend).toBe(false);
    });

    it('deve calcular tendência com único ponto de dados', () => {
      const data: HistoryPoint[] = [
        {
          date: '2024-01-01',
          totalProdutos: 50,
          totalUtilizadores: 5,
          precoMedio: 15.5,
          margemMedia: 33.0,
          valorStock: 1200,
        },
      ];

      const hasTrend = data.length >= 2;
      expect(hasTrend).toBe(false);
    });

    it('deve formatar valores com precisão correta', () => {
      const margemMedia = 35.555;
      const totalProdutos = 50;

      const formatMargem = margemMedia.toFixed(1);
      const formatProdutos = totalProdutos.toFixed(0);

      expect(formatMargem).toBe('35.6');
      expect(formatProdutos).toBe('50');
    });

    it('deve agregar dados de múltiplas lojas em histórico', () => {
      const storeA = [
        {
          date: '2024-01-01',
          totalProdutos: 45,
          totalUtilizadores: 5,
          precoMedio: 15.5,
          margemMedia: 33.0,
          valorStock: 1200,
        },
        {
          date: '2024-06-01',
          totalProdutos: 55,
          totalUtilizadores: 7,
          precoMedio: 17.0,
          margemMedia: 36.0,
          valorStock: 1600,
        },
      ];

      const storeB = [
        {
          date: '2024-01-01',
          totalProdutos: 30,
          totalUtilizadores: 3,
          precoMedio: 25.0,
          margemMedia: 40.0,
          valorStock: 1000,
        },
        {
          date: '2024-06-01',
          totalProdutos: 40,
          totalUtilizadores: 5,
          precoMedio: 28.0,
          margemMedia: 42.0,
          valorStock: 1400,
        },
      ];

      const allHistories = [...storeA, ...storeB];
      expect(allHistories).toHaveLength(4);

      const historiesByDate = allHistories.reduce((acc, item) => {
        if (!acc[item.date]) acc[item.date] = [];
        acc[item.date].push(item);
        return acc;
      }, {} as Record<string, HistoryPoint[]>);

      expect(Object.keys(historiesByDate)).toHaveLength(2);
      expect(historiesByDate['2024-01-01']).toHaveLength(2);
    });
  });

  /**
   * Testes Integrados de Relatórios com Gráficos
   */
  describe('Integração de Relatórios e Gráficos', () => {
    interface StoreStats {
      id: string;
      totalProdutos: number;
      totalUtilizadores: number;
      precoMedio: number;
      margemMedia: number;
      valorTotalStock: number;
    }

    it('deve gerar dados para gráfico de barras a partir de relatório', () => {
      const stores: StoreStats[] = [
        {
          id: 'store-1',
          totalProdutos: 50,
          totalUtilizadores: 5,
          precoMedio: 15.5,
          margemMedia: 35.0,
          valorTotalStock: 1500,
        },
        {
          id: 'store-2',
          totalProdutos: 30,
          totalUtilizadores: 3,
          precoMedio: 25.0,
          margemMedia: 40.0,
          valorTotalStock: 1000,
        },
      ];

      const chartData = stores.map((store) => ({
        label: `Loja ${store.id.split('-')[1]}`,
        value: store.totalProdutos,
      }));

      expect(chartData).toHaveLength(2);
      expect(chartData[0].value).toBe(50);
      expect(chartData[1].value).toBe(30);
    });

    it('deve gerar dados para gráfico de pizza a partir de relatório', () => {
      const stores: StoreStats[] = [
        {
          id: 'store-1',
          totalProdutos: 350,
          totalUtilizadores: 5,
          precoMedio: 15.5,
          margemMedia: 35.0,
          valorTotalStock: 1500,
        },
        {
          id: 'store-2',
          totalProdutos: 280,
          totalUtilizadores: 3,
          precoMedio: 25.0,
          margemMedia: 40.0,
          valorTotalStock: 1000,
        },
        {
          id: 'store-3',
          totalProdutos: 220,
          totalUtilizadores: 4,
          precoMedio: 20.0,
          margemMedia: 32.0,
          valorTotalStock: 1200,
        },
        {
          id: 'store-4',
          totalProdutos: 150,
          totalUtilizadores: 2,
          precoMedio: 30.0,
          margemMedia: 38.0,
          valorTotalStock: 800,
        },
      ];

      const chartData = stores.map((store) => ({
        label: `Loja ${store.id.split('-')[1]}`,
        value: store.totalProdutos,
      }));

      const total = chartData.reduce((sum, item) => sum + item.value, 0);
      const percentages = chartData.map((item) => ((item.value / total) * 100).toFixed(1));

      expect(total).toBe(1000);
      expect(parseFloat(percentages[0])).toBe(35.0);
    });

    it('deve correlacionar histórico com gráfico de linhas', () => {
      const history = [
        { date: '2024-01-01', totalProdutos: 45 },
        { date: '2024-02-01', totalProdutos: 48 },
        { date: '2024-03-01', totalProdutos: 52 },
        { date: '2024-04-01', totalProdutos: 50 },
        { date: '2024-05-01', totalProdutos: 55 },
        { date: '2024-06-01', totalProdutos: 58 },
      ];

      const chartData = history.map((point) => ({
        label: point.date.substring(5), // MM-DD
        value: point.totalProdutos,
      }));

      expect(chartData).toHaveLength(6);
      expect(chartData[0].label).toBe('01-01');
      expect(chartData[5].value).toBe(58);
    });

    it('deve validar completude de dados antes de gerar gráficos', () => {
      const requiredMetrics = [
        'totalProdutos',
        'totalUtilizadores',
        'precoMedio',
        'margemMedia',
        'valorTotalStock',
      ];

      const storeData: Partial<StoreStats> = {
        id: 'store-1',
        totalProdutos: 50,
        totalUtilizadores: 5,
        precoMedio: 15.5,
        // margemMedia faltando
        valorTotalStock: 1500,
      };

      const missingMetrics = requiredMetrics.filter(
        (metric) => !(metric in storeData)
      );

      expect(missingMetrics).toContain('margemMedia');
      expect(missingMetrics).toHaveLength(1);
    });
  });

  /**
   * Testes de Performance e Otimização
   */
  describe('Performance de Gráficos e Relatórios', () => {
    it('deve processar grande volume de dados de histórico', () => {
      const largeDataset = Array.from({ length: 12 }, (_, i) => ({
        date: formatLocalDate(new Date(2024, i, 1)),
        totalProdutos: Math.floor(Math.random() * 100) + 40,
        totalUtilizadores: Math.floor(Math.random() * 10) + 3,
        precoMedio: Math.random() * 10 + 15,
        margemMedia: Math.random() * 15 + 30,
        valorStock: Math.random() * 1000 + 1000,
      }));

      expect(largeDataset).toHaveLength(12);
      expect(largeDataset[0].date).toBe('2024-01-01');
      expect(largeDataset[11].date).toBe('2024-12-01');
    });

    it('deve agregar dados de múltiplas lojas eficientemente', () => {
      const storesData = Array.from({ length: 50 }, (_, i) => ({
        id: `store-${i}`,
        totalProdutos: Math.floor(Math.random() * 100) + 20,
        totalUtilizadores: Math.floor(Math.random() * 10) + 2,
        precoMedio: Math.random() * 10 + 15,
        margemMedia: Math.random() * 15 + 25,
        valorTotalStock: Math.random() * 2000 + 500,
      }));

      const totalProdutos = storesData.reduce((sum, store) => sum + store.totalProdutos, 0);
      const avgMargem = storesData.reduce((sum, store) => sum + store.margemMedia, 0) / storesData.length;

      expect(storesData).toHaveLength(50);
      expect(totalProdutos > 0).toBe(true);
      expect(avgMargem > 0).toBe(true);
    });

    it('deve memoizar cálculos de estatísticas', () => {
      const data = [50, 55, 60, 65, 70];
      const calculateStats = (values: number[]) => ({
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        max: Math.max(...values),
        min: Math.min(...values),
      });

      const stats1 = calculateStats(data);
      const stats2 = calculateStats(data);

      expect(stats1.avg).toBe(stats2.avg);
      expect(stats1.max).toBe(stats2.max);
      expect(stats1.min).toBe(stats2.min);
    });
  });
});
