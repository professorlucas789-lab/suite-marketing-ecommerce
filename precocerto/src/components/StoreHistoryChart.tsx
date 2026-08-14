/**
 * Gráficos de histórico de loja
 * Fase 6: Sistema Multi-Loja - Fase 5
 */

import React, { useState } from 'react';
import { PerformanceChart } from './PerformanceChart';
import { TrendingUp, Calendar } from 'lucide-react';

interface HistoryPoint {
  date: string;
  totalProdutos: number;
  totalUtilizadores: number;
  precoMedio: number;
  margemMedia: number;
  valorStock: number;
}

interface StoreHistoryChartProps {
  storeName: string;
  data: HistoryPoint[];
}

export function StoreHistoryChart({ storeName, data }: StoreHistoryChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<
    'totalProdutos' | 'totalUtilizadores' | 'precoMedio' | 'margemMedia' | 'valorStock'
  >('totalProdutos');

  const metricLabels = {
    totalProdutos: 'Total de Produtos',
    totalUtilizadores: 'Total de Utilizadores',
    precoMedio: 'Preço Médio (€)',
    margemMedia: 'Margem Média (%)',
    valorStock: 'Valor Stock (€)',
  };

  const metricColors = {
    totalProdutos: ['#3b82f6'],
    totalUtilizadores: ['#8b5cf6'],
    precoMedio: ['#f59e0b'],
    margemMedia: ['#10b981'],
    valorStock: ['#ef4444'],
  };

  // Calcular tendência
  const calculateTrend = () => {
    if (data.length < 2) return null;

    const firstValue = data[0][selectedMetric];
    const lastValue = data[data.length - 1][selectedMetric];
    const change = ((lastValue - firstValue) / firstValue) * 100;

    return {
      change,
      isPositive: change > 0,
      text: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
    };
  };

  const trend = calculateTrend();

  // Preparar dados para gráfico
  const chartData = data.map((point) => ({
    label: point.date.substring(5), // Mostrar MM-DD
    value: point[selectedMetric],
  }));

  // Calcular estatísticas
  const values = data.map((d) => d[selectedMetric]);
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Histórico de {storeName}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Análise de tendências histórica
            </p>
          </div>
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/30 rounded-lg">
            <TrendingUp size={24} className="text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Seletor de Métrica */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Selecione a Métrica
        </label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.entries(metricLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedMetric(key as any)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedMetric === key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico */}
      <PerformanceChart
        type="line"
        title={metricLabels[selectedMetric]}
        data={chartData}
        colors={metricColors[selectedMetric]}
        height={350}
      />

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Média */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">Média</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {avgValue.toFixed(selectedMetric === 'margemMedia' ? 1 : 0)}
          </p>
        </div>

        {/* Máximo */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">Máximo</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {maxValue.toFixed(selectedMetric === 'margemMedia' ? 1 : 0)}
          </p>
        </div>

        {/* Mínimo */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">Mínimo</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {minValue.toFixed(selectedMetric === 'margemMedia' ? 1 : 0)}
          </p>
        </div>

        {/* Tendência */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">Tendência</p>
          {trend && (
            <p
              className={`text-2xl font-bold mt-1 ${
                trend.isPositive
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {trend.text}
            </p>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar size={18} />
          Timeline de Dados
        </h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {data.map((point, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded">
              <span className="text-slate-600 dark:text-slate-400">{point.date}</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {point[selectedMetric].toFixed(selectedMetric === 'margemMedia' ? 1 : 0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Componente com dados de exemplo
export function SampleStoreHistoryChart() {
  const sampleData: HistoryPoint[] = [
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
    {
      date: '2024-04-01',
      totalProdutos: 50,
      totalUtilizadores: 6,
      precoMedio: 16.5,
      margemMedia: 34.0,
      valorStock: 1400,
    },
    {
      date: '2024-05-01',
      totalProdutos: 55,
      totalUtilizadores: 8,
      precoMedio: 17.0,
      margemMedia: 36.5,
      valorStock: 1600,
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

  return <StoreHistoryChart storeName="Farmácia Central" data={sampleData} />;
}
