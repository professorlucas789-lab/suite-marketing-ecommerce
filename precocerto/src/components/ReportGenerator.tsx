/**
 * Gerador de relatórios consolidados
 * Fase 6: Sistema Multi-Loja - Fase 5
 */

import React, { useState } from 'react';
import { Store } from '../types/store';
import { getAllStores } from '../utils/storeUtils';
import { useStoreStats } from '../hooks/useStoreData';
import { Loader2, AlertCircle, Download, FileText } from 'lucide-react';

interface ReportConfig {
  title: string;
  dateRange: string;
  stores: Store[];
  stats: Map<string, any>;
  generatedAt: string;
}

export function ReportGenerator() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'comparison'>(
    'summary'
  );
  const [dateRange, setDateRange] = useState('month');

  React.useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllStores();
      setStores(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar lojas';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStore = (storeId: string) => {
    setSelectedStores((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStores.length === stores.length) {
      setSelectedStores([]);
    } else {
      setSelectedStores(stores.map((s) => s.id));
    }
  };

  const generateReport = () => {
    if (selectedStores.length === 0) {
      setError('Selecione pelo menos uma loja');
      return;
    }

    const reportData = {
      title: `Relatório ${reportType === 'summary' ? 'Resumido' : reportType === 'detailed' ? 'Detalhado' : 'Comparativo'}`,
      dateRange,
      stores: stores.filter((s) => selectedStores.includes(s.id)),
      generatedAt: new Date().toISOString(),
    };

    // Simular download (em produção, seria PDF/Excel real)
    const reportContent = JSON.stringify(reportData, null, 2);
    const blob = new Blob([reportContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${reportType}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const dateRangeLabels = {
    week: 'Última Semana',
    month: 'Último Mês',
    quarter: 'Último Trimestre',
    year: 'Último Ano',
    all: 'Todos os Dados',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Gerador de Relatórios
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Gere relatórios consolidados das suas lojas
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 dark:text-red-200">Erro</p>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Configuração */}
        <div className="lg:col-span-1 space-y-6">
          {/* Tipo de Relatório */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
              Tipo de Relatório
            </h3>
            <div className="space-y-2">
              {[
                { value: 'summary', label: 'Resumido' },
                { value: 'detailed', label: 'Detalhado' },
                { value: 'comparison', label: 'Comparativo' },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reportType"
                    value={option.value}
                    checked={reportType === option.value}
                    onChange={(e) => setReportType(e.target.value as any)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Intervalo de Datas */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
              Intervalo de Datas
            </h3>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              {Object.entries(dateRangeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Gerar Relatório */}
          <button
            onClick={generateReport}
            disabled={loading || selectedStores.length === 0}
            className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Gerar Relatório
          </button>
        </div>

        {/* Seleção de Lojas */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Selecione as Lojas
              </h3>
              <button
                onClick={handleSelectAll}
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
              >
                {selectedStores.length === stores.length ? 'Desselecionar Tudo' : 'Selecionar Tudo'}
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-emerald-600 mr-2" />
                <span className="text-slate-600 dark:text-slate-400">A carregar...</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stores.map((store) => (
                  <label
                    key={store.id}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStores.includes(store.id)}
                      onChange={() => handleSelectStore(store.id)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600"
                    />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white text-sm">
                        {store.nome}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {store.email}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {selectedStores.length} de {stores.length} lojas selecionadas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Informações sobre Tipos de Relatório */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <div className="flex gap-3">
          <FileText size={20} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">
              Tipos de Relatório
            </p>
            <div className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
              <p>
                <strong>Resumido:</strong> KPIs principais e gráficos de tendências
              </p>
              <p>
                <strong>Detalhado:</strong> Análise completa com histórico e alertas
              </p>
              <p>
                <strong>Comparativo:</strong> Comparação entre lojas selecionadas
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
