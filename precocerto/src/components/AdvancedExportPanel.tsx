/**
 * Painel de Exportação Avançada
 * Fase 7: Exportação Avançada
 */

import React, { useState } from 'react';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader,
  Trash2,
} from 'lucide-react';
import type { ExportConfig, ExportJob, ExportHistory } from '../types/export';

interface AdvancedExportPanelProps {
  jobs: ExportJob[];
  history: ExportHistory[];
  onStartExport?: (config: ExportConfig) => void;
  onCancelJob?: (jobId: string) => void;
  onDownload?: (jobId: string, fileName: string) => void;
  onSendEmail?: (jobId: string) => void;
  onDelete?: (historyId: string) => void;
}

export function AdvancedExportPanel({
  jobs,
  history,
  onStartExport,
  onCancelJob,
  onDownload,
  onSendEmail,
  onDelete,
}: AdvancedExportPanelProps) {
  const [activeTab, setActiveTab] = useState<'jobs' | 'history' | 'schedule'>('jobs');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'PDF':
        return <FileText className="text-red-600 dark:text-red-400" size={20} />;
      case 'XLSX':
        return <FileSpreadsheet className="text-green-600 dark:text-green-400" size={20} />;
      case 'CSV':
        return <FileSpreadsheet className="text-blue-600 dark:text-blue-400" size={20} />;
      case 'JSON':
        return <FileJson className="text-yellow-600 dark:text-yellow-400" size={20} />;
      default:
        return <Download size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-200';
      case 'PROCESSING':
        return 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200';
      case 'FAILED':
        return 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-200';
      case 'PENDING':
        return 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-gray-100 dark:bg-gray-950/30 text-gray-800 dark:text-gray-200';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'jobs'
              ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          Tarefas ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'history'
              ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          Histórico ({history.length})
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'schedule'
              ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          Agendado
        </button>
      </div>

      {/* Tarefas */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <Download size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-600 dark:text-slate-400">Nenhuma tarefa de exportação em progresso</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getFormatIcon(job.config.format)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {job.config.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Formato: {job.config.format}
                        </span>
                      </div>

                      {job.status === 'PROCESSING' && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-600 dark:text-slate-400">Progresso</span>
                            <span className="text-xs font-medium text-slate-900 dark:text-white">
                              {job.progress}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-emerald-600 h-2 rounded-full transition-all"
                              style={{ width: `${job.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {job.status === 'FAILED' && job.errorMessage && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-sm text-red-700 dark:text-red-300">
                          <AlertCircle size={14} className="inline mr-1" />
                          {job.errorMessage}
                        </div>
                      )}

                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                        {new Date(job.startTime).toLocaleString('pt-PT')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {job.status === 'COMPLETED' && (
                      <>
                        <button
                          onClick={() =>
                            onDownload?.(
                              job.id,
                              `${job.config.title}_${new Date().toISOString().split('T')[0]}.${job.config.format.toLowerCase()}`
                            )
                          }
                          className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded transition-colors"
                          title="Download"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => onSendEmail?.(job.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded transition-colors"
                          title="Enviar por email"
                        >
                          <Mail size={18} />
                        </button>
                      </>
                    )}

                    {job.status === 'PROCESSING' && (
                      <button
                        onClick={() => onCancelJob?.(job.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                        title="Cancelar"
                      >
                        <AlertCircle size={18} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Detalhes Expandidos */}
                {expandedJob === job.id && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">ID da Tarefa</p>
                        <p className="text-slate-900 dark:text-white font-mono">{job.id}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Criado por</p>
                        <p className="text-slate-900 dark:text-white">{job.config.createdBy}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Tamanho</p>
                        <p className="text-slate-900 dark:text-white">
                          {job.resultSize ? formatFileSize(job.resultSize) : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Lojas</p>
                        <p className="text-slate-900 dark:text-white">{job.config.storeIds.length}</p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                  className="mt-3 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
                >
                  {expandedJob === job.id ? 'Ocultar' : 'Ver'} Detalhes
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Histórico */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-600 dark:text-slate-400">Nenhuma exportação no histórico</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getFormatIcon(item.format)}
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 dark:text-white">{item.fileName}</h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-600 dark:text-slate-400">
                      <span>{formatFileSize(item.fileSize)}</span>
                      <span>•</span>
                      <span>Downloads: {item.downloadCount}</span>
                      <span>•</span>
                      <span>{new Date(item.createdAt).toLocaleString('pt-PT')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded transition-colors"
                    title="Download"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    onClick={() => onDelete?.(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                    title="Apagar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Agendado */}
      {activeTab === 'schedule' && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
          <Clock className="mx-auto text-blue-600 dark:text-blue-400 mb-3" size={40} />
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Exportações Agendadas
          </h3>
          <p className="text-blue-700 dark:text-blue-300 text-sm mb-4">
            Configure exportações recorrentes para serem geradas automaticamente
          </p>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            Nova Exportação Agendada
          </button>
        </div>
      )}
    </div>
  );
}
