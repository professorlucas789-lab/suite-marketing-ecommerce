/**
 * Gráficos de desempenho de lojas
 * Fase 6: Sistema Multi-Loja - Fase 5
 */

import React, { useMemo } from 'react';
import { BarChart3, LineChart, PieChart } from 'lucide-react';

interface ChartDataPoint {
  label: string;
  value: number;
  value2?: number;
}

interface PerformanceChartProps {
  type: 'bar' | 'line' | 'pie';
  title: string;
  data: ChartDataPoint[];
  yAxisLabel?: string;
  colors?: string[];
  height?: number;
}

/**
 * Componente para renderizar gráficos de desempenho
 * Nota: Implementação com SVG para compatibilidade sem dependências externas
 */
export function PerformanceChart({
  type,
  title,
  data,
  yAxisLabel = '',
  colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
  height = 300,
}: PerformanceChartProps) {
  // Encontrar valor máximo para escala
  const maxValue = useMemo(() => {
    const values = data.flatMap((d) => [d.value, d.value2 || 0]);
    return Math.max(...values);
  }, [data]);

  // Renderizar gráfico de barras
  const renderBarChart = () => {
    const barWidth = 100 / data.length / 1.5;
    const padding = 40;
    const chartHeight = height - padding * 2;
    const scale = chartHeight / maxValue;

    return (
      <svg width="100%" height={height} className="bg-white dark:bg-slate-800 rounded-lg p-4">
        {/* Título */}
        <text
          x="50%"
          y="20"
          textAnchor="middle"
          className="text-sm font-bold fill-slate-900 dark:fill-white"
        >
          {title}
        </text>

        {/* Eixo Y */}
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="#94a3b8"
          strokeWidth="2"
        />

        {/* Eixo X */}
        <line
          x1={padding}
          y1={height - padding}
          x2="100%"
          y2={height - padding}
          stroke="#94a3b8"
          strokeWidth="2"
        />

        {/* Labels do Eixo X */}
        {data.map((item, idx) => (
          <g key={idx}>
            <text
              x={padding + ((idx + 0.5) / data.length) * (100 - padding * 2) + '%'}
              y={height - padding + 20}
              textAnchor="middle"
              className="text-xs fill-slate-600 dark:fill-slate-400"
            >
              {item.label}
            </text>
          </g>
        ))}

        {/* Barras */}
        {data.map((item, idx) => (
          <rect
            key={idx}
            x={padding + ((idx + 0.3) / data.length) * (100 - padding * 2) + '%'}
            y={height - padding - item.value * scale}
            width={`${barWidth}%`}
            height={item.value * scale}
            fill={colors[idx % colors.length]}
            className="hover:opacity-80"
          />
        ))}

        {/* Valores nas barras */}
        {data.map((item, idx) => (
          <text
            key={`text-${idx}`}
            x={padding + ((idx + 0.5) / data.length) * (100 - padding * 2) + '%'}
            y={height - padding - item.value * scale - 5}
            textAnchor="middle"
            className="text-xs font-semibold fill-slate-900 dark:fill-white"
          >
            {Math.round(item.value)}
          </text>
        ))}
      </svg>
    );
  };

  // Renderizar gráfico de linhas
  const renderLineChart = () => {
    const padding = 40;
    const chartWidth = 100 - padding * 2;
    const chartHeight = height - padding * 2;
    const scale = chartHeight / maxValue;

    let pathData = `M ${padding}% ${height - padding}`;

    data.forEach((item, idx) => {
      const x = padding + (idx / (data.length - 1 || 1)) * chartWidth;
      const y = height - padding - item.value * scale;
      pathData += ` L ${x}% ${y}`;
    });

    return (
      <svg width="100%" height={height} className="bg-white dark:bg-slate-800 rounded-lg p-4">
        {/* Título */}
        <text
          x="50%"
          y="20"
          textAnchor="middle"
          className="text-sm font-bold fill-slate-900 dark:fill-white"
        >
          {title}
        </text>

        {/* Grid */}
        {Array.from({ length: 5 }).map((_, i) => (
          <line
            key={`grid-${i}`}
            x1="40%"
            y1={height - 40 - (i * (height - 80)) / 4}
            x2="100%"
            y2={height - 40 - (i * (height - 80)) / 4}
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray="5,5"
            className="dark:stroke-slate-700"
          />
        ))}

        {/* Eixo Y */}
        <line
          x1="40%"
          y1="40"
          x2="40%"
          y2={height - 40}
          stroke="#94a3b8"
          strokeWidth="2"
        />

        {/* Eixo X */}
        <line
          x1="40%"
          y1={height - 40}
          x2="100%"
          y2={height - 40}
          stroke="#94a3b8"
          strokeWidth="2"
        />

        {/* Linha */}
        <polyline
          points={data
            .map((item, idx) => {
              const x = 40 + (idx / (data.length - 1 || 1)) * 60;
              const y = height - 40 - item.value * scale;
              return `${x}%,${y}`;
            })
            .join(' ')}
          fill="none"
          stroke={colors[0]}
          strokeWidth="2"
        />

        {/* Pontos */}
        {data.map((item, idx) => (
          <circle
            key={idx}
            cx={`${40 + (idx / (data.length - 1 || 1)) * 60}%`}
            cy={height - 40 - item.value * scale}
            r="4"
            fill={colors[0]}
            className="hover:r-6"
          />
        ))}

        {/* Labels */}
        {data.map((item, idx) => (
          <text
            key={idx}
            x={`${40 + (idx / (data.length - 1 || 1)) * 60}%`}
            y={height - 20}
            textAnchor="middle"
            className="text-xs fill-slate-600 dark:fill-slate-400"
          >
            {item.label}
          </text>
        ))}
      </svg>
    );
  };

  // Renderizar gráfico de pizza
  const renderPieChart = () => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const cx = 55;
    const cy = 50;
    const radius = 40;

    let currentAngle = -90;
    const slices: React.ReactElement[] = [];
    const labels: React.ReactElement[] = [];

    data.forEach((item, idx) => {
      const sliceAngle = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

      const start = {
        x: cx + radius * Math.cos((startAngle * Math.PI) / 180),
        y: cy + radius * Math.sin((startAngle * Math.PI) / 180),
      };

      const end = {
        x: cx + radius * Math.cos((endAngle * Math.PI) / 180),
        y: cy + radius * Math.sin((endAngle * Math.PI) / 180),
      };

      const largeArc = sliceAngle > 180 ? 1 : 0;

      const pathData = [
        `M ${cx} ${cy}`,
        `L ${start.x} ${start.y}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
        'Z',
      ].join(' ');

      slices.push(
        <path
          key={`slice-${idx}`}
          d={pathData}
          fill={colors[idx % colors.length]}
          className="hover:opacity-80"
        />
      );

      // Label do slice
      const labelAngle = startAngle + sliceAngle / 2;
      const labelRadius = radius * 0.7;
      const labelX = cx + labelRadius * Math.cos((labelAngle * Math.PI) / 180);
      const labelY = cy + labelRadius * Math.sin((labelAngle * Math.PI) / 180);

      const percentage = ((item.value / total) * 100).toFixed(1);
      labels.push(
        <text
          key={`label-${idx}`}
          x={labelX}
          y={labelY}
          textAnchor="middle"
          className="text-xs font-bold fill-white"
        >
          {percentage}%
        </text>
      );

      currentAngle = endAngle;
    });

    return (
      <svg width="100%" height={height} className="bg-white dark:bg-slate-800 rounded-lg p-4">
        {/* Título */}
        <text
          x="50%"
          y="20"
          textAnchor="middle"
          className="text-sm font-bold fill-slate-900 dark:fill-white"
        >
          {title}
        </text>

        {/* Pizza */}
        {slices}
        {labels}

        {/* Legenda */}
        {data.map((item, idx) => (
          <g key={`legend-${idx}`}>
            <rect
              x="5%"
              y={`${30 + idx * 8}%`}
              width="15"
              height="15"
              fill={colors[idx % colors.length]}
            />
            <text
              x="8%"
              y={`${38 + idx * 8}%`}
              className="text-xs fill-slate-600 dark:fill-slate-400"
            >
              {item.label} ({Math.round(item.value)})
            </text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="w-full">
      {type === 'bar' && renderBarChart()}
      {type === 'line' && renderLineChart()}
      {type === 'pie' && renderPieChart()}
    </div>
  );
}

// Componente com dados de exemplo para testes
export function SamplePerformanceChart() {
  const storePerformanceData: ChartDataPoint[] = [
    { label: 'Loja A', value: 450 },
    { label: 'Loja B', value: 320 },
    { label: 'Loja C', value: 580 },
    { label: 'Loja D', value: 410 },
  ];

  const trendData: ChartDataPoint[] = [
    { label: 'Jan', value: 400 },
    { label: 'Fev', value: 450 },
    { label: 'Mar', value: 420 },
    { label: 'Abr', value: 520 },
    { label: 'Mai', value: 480 },
    { label: 'Jun', value: 610 },
  ];

  const categoryData: ChartDataPoint[] = [
    { label: 'Farmácia', value: 350 },
    { label: 'Informática', value: 280 },
    { label: 'Ortopédico', value: 220 },
    { label: 'Genérico', value: 150 },
  ];

  return (
    <div className="space-y-6">
      <PerformanceChart
        type="bar"
        title="Desempenho por Loja (Produtos)"
        data={storePerformanceData}
      />
      <PerformanceChart
        type="line"
        title="Tendência de Produtos (6 Meses)"
        data={trendData}
        colors={['#10b981']}
      />
      <PerformanceChart
        type="pie"
        title="Distribuição por Tipo de Loja"
        data={categoryData}
      />
    </div>
  );
}
