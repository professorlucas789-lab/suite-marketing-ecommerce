/**
 * Painel de Análise Preditiva
 * Fase 8: Análise Preditiva e Alertas Inteligentes
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Brain,
  CheckCircle2,
  Clock,
  Zap,
  Target,
  BarChart3,
  AlertTriangle,
  Activity,
  Lightbulb,
} from 'lucide-react';
import type {
  Prediction,
  AnomalyDetection,
  SmartRecommendation,
  PredictiveAlert,
  StoreBenchmark,
} from '../types/predictive';

interface PredictiveAnalysisPanelProps {
  predictions: Prediction[];
  anomalies: AnomalyDetection[];
  recommendations: SmartRecommendation[];
  alerts: PredictiveAlert[];
  benchmarks?: StoreBenchmark[];
  onAcknowledgeAlert?: (alertId: string) => void;
  onResolveAlert?: (alertId: string) => void;
  onImplementRecommendation?: (recId: string) => void;
  onIgnoreRecommendation?: (recId: string) => void;
}

export function PredictiveAnalysisPanel({
  predictions,
  anomalies,
  recommendations,
  alerts,
  benchmarks = [],
  onAcknowledgeAlert,
  onResolveAlert,
  onImplementRecommendation,
  onIgnoreRecommendation,
}: PredictiveAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<'alerts' | 'predictions' | 'anomalies' | 'recommendations' | 'benchmarks'>('alerts');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-200';
      case 'HIGH':
        return 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-200';
      case 'WARNING':
        return 'bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200';
      case 'ALERT':
        return 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200';
      case 'LOW':
        return 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-200';
      default:
        return 'bg-gray-100 dark:bg-gray-950/30 text-gray-800 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-200';
      case 'HIGH':
        return 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-200';
      case 'LOW':
        return 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-200';
      default:
        return 'bg-gray-100 dark:bg-gray-950/30 text-gray-800 dark:text-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'INCREASING') return <TrendingUp className="text-green-600 dark:text-green-400" size={20} />;
    if (trend === 'DECREASING') return <TrendingDown className="text-red-600 dark:text-red-400" size={20} />;
    return <Activity className="text-blue-600 dark:text-blue-400" size={20} />;
  };

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'SPIKE':
        return <TrendingUp className="text-orange-600 dark:text-orange-400" size={18} />;
      case 'DROP':
        return <TrendingDown className="text-red-600 dark:text-red-400" size={18} />;
      case 'TREND_CHANGE':
        return <Zap className="text-yellow-600 dark:text-yellow-400" size={18} />;
      case 'PATTERN_BREAK':
        return <AlertCircle className="text-purple-600 dark:text-purple-400" size={18} />;
      default:
        return <AlertTriangle size={18} />;
    }
  };

  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');
  const newRecommendations = recommendations.filter((r) => r.status === 'NEW');

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Alertas Ativos</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{activeAlerts.length}</p>
            </div>
            <AlertCircle className="text-red-600 dark:text-red-400" size={32} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Previsões Ativas</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {predictions.filter((p) => new Date(p.validUntil) > new Date()).length}
              </p>
            </div>
            <Brain className="text-blue-600 dark:text-blue-400" size={32} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Anomalias</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{anomalies.length}</p>
            </div>
            <AlertTriangle className="text-orange-600 dark:text-orange-400" size={32} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Recomendações</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{newRecommendations.length}</p>
            </div>
            <Lightbulb className="text-yellow-600 dark:text-yellow-400" size={32} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'alerts'
              ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          Alertas ({activeAlerts.length})
        </button>
        <button
          onClick={() => setActiveTab('predictions')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'predictions'
              ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          Previsões ({predictions.length})
        </button>
        <button
          onClick={() => setActiveTab('anomalies')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'anomalies'
              ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          Anomalias ({anomalies.length})
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'recommendations'
              ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          Recomendações ({newRecommendations.length})
        </button>
        {benchmarks.length > 0 && (
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'benchmarks'
                ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            Benchmarks ({benchmarks.length})
          </button>
        )}
      </div>

      {/* Alertas */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          {activeAlerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 size={40} className="mx-auto text-green-300 dark:text-green-600 mb-3" />
              <p className="text-slate-600 dark:text-slate-400">Nenhum alerta ativo</p>
            </div>
          ) : (
            activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg p-4 border border-slate-200 dark:border-slate-700 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold">{alert.title}</h4>
                      <p className="text-sm mt-1 opacity-90">{alert.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs font-medium">
                        <span>Confiança: {alert.confidence}%</span>
                        <span>Métrica: {alert.metric}</span>
                        <span>Prazo: {alert.timeframe}</span>
                      </div>
                      <p className="text-xs mt-2 opacity-75">{alert.recommendation}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => onAcknowledgeAlert?.(alert.id)}
                      className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
                      title="Confirmar"
                    >
                      <Clock size={18} />
                    </button>
                    <button
                      onClick={() => onResolveAlert?.(alert.id)}
                      className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
                      title="Resolver"
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  </div>
                </div>

                {expandedItem === alert.id && (
                  <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="opacity-75">Valor Atual:</span> {alert.currentValue.toFixed(2)}
                      </div>
                      <div>
                        <span className="opacity-75">Valor Previsto:</span> {alert.predictedValue.toFixed(2)}
                      </div>
                      <div>
                        <span className="opacity-75">Mudança:</span> {alert.changePercent.toFixed(1)}%
                      </div>
                      <div>
                        <span className="opacity-75">Tipo:</span> {alert.type}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setExpandedItem(expandedItem === alert.id ? null : alert.id)}
                  className="mt-2 text-xs font-medium opacity-75 hover:opacity-100 transition-opacity"
                >
                  {expandedItem === alert.id ? 'Ocultar' : 'Ver'} Detalhes
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Previsões */}
      {activeTab === 'predictions' && (
        <div className="space-y-3">
          {predictions.length === 0 ? (
            <div className="text-center py-12">
              <Brain size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-600 dark:text-slate-400">Nenhuma previsão gerada</p>
            </div>
          ) : (
            predictions.map((pred) => (
              <div key={pred.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {getTrendIcon(pred.trend)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900 dark:text-white">Previsão #{pred.modelId.substring(0, 8)}</h4>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                          {pred.trend}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-slate-600 dark:text-slate-400">Confiança</p>
                          <p className="font-semibold text-slate-900 dark:text-white">{pred.confidence.toFixed(0)}%</p>
                        </div>
                        <div>
                          <p className="text-slate-600 dark:text-slate-400">Força Tendência</p>
                          <p className="font-semibold text-slate-900 dark:text-white">{pred.trendStrength.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-slate-600 dark:text-slate-400">Período</p>
                          <p className="font-semibold text-slate-900 dark:text-white">{pred.predictions.length} dias</p>
                        </div>
                      </div>
                      {pred.seasonality.detected && (
                        <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-xs text-amber-800 dark:text-amber-200">
                          📊 Sazonalidade detectada: {pred.seasonality.pattern.toLowerCase()} (amplitude: {pred.seasonality.amplitude.toFixed(2)})
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {expandedItem === pred.id && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-xs space-y-1">
                      <p className="font-medium text-slate-900 dark:text-white">Primeiros 5 dias da previsão:</p>
                      {pred.predictions.slice(0, 5).map((point, idx) => (
                        <div key={idx} className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>{point.date}</span>
                          <span>
                            {point.value.toFixed(2)} (Intervalo: {point.lower.toFixed(2)} - {point.upper.toFixed(2)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setExpandedItem(expandedItem === pred.id ? null : pred.id)}
                  className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  {expandedItem === pred.id ? 'Ocultar' : 'Ver'} Detalhes
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Anomalias */}
      {activeTab === 'anomalies' && (
        <div className="space-y-3">
          {anomalies.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 size={40} className="mx-auto text-green-300 dark:text-green-600 mb-3" />
              <p className="text-slate-600 dark:text-slate-400">Nenhuma anomalia detectada</p>
            </div>
          ) : (
            anomalies.map((anom) => (
              <div key={anom.id} className={`rounded-lg p-4 border border-slate-200 dark:border-slate-700 ${getSeverityColor(anom.severity)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {getAnomalyIcon(anom.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{anom.storeName}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(anom.severity)}`}>
                          {anom.severity}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{anom.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span>Métrica: {anom.metric}</span>
                        <span>Desvio: {anom.deviation.toFixed(2)}σ</span>
                        <span>Valor: {anom.value.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Recomendações */}
      {activeTab === 'recommendations' && (
        <div className="space-y-3">
          {recommendations.length === 0 ? (
            <div className="text-center py-12">
              <Lightbulb size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-600 dark:text-slate-400">Nenhuma recomendação disponível</p>
            </div>
          ) : (
            recommendations.map((rec) => (
              <div key={rec.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Target className="text-amber-600 dark:text-amber-400 mt-0.5" size={20} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900 dark:text-white">{rec.title}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                          {rec.priority}
                        </span>
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded text-xs font-medium">
                          {rec.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{rec.description}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-600 dark:text-slate-400">Categoria:</span> {rec.category}
                        </div>
                        <div>
                          <span className="text-slate-600 dark:text-slate-400">Confiança:</span> {rec.confidence}%
                        </div>
                        <div>
                          <span className="text-slate-600 dark:text-slate-400">Impacto esperado:</span> {rec.expectedImpact.change.toFixed(1)}% em {rec.expectedImpact.timeframe}
                        </div>
                        <div>
                          <span className="text-slate-600 dark:text-slate-400">Ação:</span> {rec.action}
                        </div>
                      </div>
                    </div>
                  </div>

                  {rec.status === 'NEW' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => onImplementRecommendation?.(rec.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors"
                      >
                        Implementar
                      </button>
                      <button
                        onClick={() => onIgnoreRecommendation?.(rec.id)}
                        className="px-3 py-1 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded text-xs font-medium transition-colors"
                      >
                        Ignorar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Benchmarks */}
      {activeTab === 'benchmarks' && benchmarks.length > 0 && (
        <div className="space-y-3">
          {benchmarks.map((bench) => (
            <div key={`${bench.storeId}-${bench.metric}`} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <BarChart3 className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 dark:text-white">{bench.storeName}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Métrica: {bench.metric}</p>
                    <div className="mt-3 grid grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">Valor Atual</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{bench.value.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">Percentil</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{bench.percentile}º</p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">Posição</p>
                        <p className="font-semibold text-slate-900 dark:text-white">#{bench.rank}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">Melhora Necessária</p>
                        <p className="font-semibold text-red-600 dark:text-red-400">{bench.improvement.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
