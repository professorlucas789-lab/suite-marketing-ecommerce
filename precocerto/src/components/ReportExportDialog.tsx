/**
 * ReportExportDialog Component
 * Modal para exportar relatórios consolidados
 * Fase 8: Exportação de Relatórios
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Download, X, FileText, Sheet } from 'lucide-react';
import { SalesReport } from '../types/sales';
import { Product } from '../types';
import { useReportExport } from '../hooks/useReportExport';

interface ReportExportDialogProps {
  salesReport: SalesReport | null;
  products: Product[];
  storeName: string;
  alerts?: any[];
  onClose: () => void;
  isOpen: boolean;
}

export const ReportExportDialog: React.FC<ReportExportDialogProps> = ({
  salesReport,
  products,
  storeName,
  alerts = [],
  onClose,
  isOpen,
}) => {
  const { exporting, error, exportToCSV, exportToPDF, reset } = useReportExport();
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'pdf'>('pdf');

  const handleExport = () => {
    if (!salesReport) return;

    if (selectedFormat === 'csv') {
      exportToCSV(salesReport, products, storeName, alerts);
    } else {
      exportToPDF(salesReport, products, storeName, alerts);
    }

    // Fechar modal após 1.5 segundos
    setTimeout(() => {
      reset();
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            Exportar Relatório
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-6">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>📊 Período:</strong> {salesReport?.period.label}
          </p>
          <p className="text-sm text-blue-900 dark:text-blue-100 mt-1">
            <strong>🏪 Loja:</strong> {storeName}
          </p>
        </div>

        {/* Formato Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Selecionar Formato:
          </label>

          <div className="space-y-2">
            {/* PDF Option */}
            <button
              onClick={() => setSelectedFormat('pdf')}
              className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition ${
                selectedFormat === 'pdf'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <FileText className={`w-5 h-5 mt-0.5 flex-shrink-0 ${selectedFormat === 'pdf' ? 'text-blue-600' : 'text-slate-400'}`} />
              <div className="text-left">
                <p className={`font-medium ${selectedFormat === 'pdf' ? 'text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-white'}`}>
                  📄 PDF
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Profissional com gráficos e cores
                </p>
              </div>
            </button>

            {/* CSV Option */}
            <button
              onClick={() => setSelectedFormat('csv')}
              className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition ${
                selectedFormat === 'csv'
                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <Sheet className={`w-5 h-5 mt-0.5 flex-shrink-0 ${selectedFormat === 'csv' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <div className="text-left">
                <p className={`font-medium ${selectedFormat === 'csv' ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-900 dark:text-white'}`}>
                  📊 CSV
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Compatível com Excel e análise
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-6"
          >
            <p className="text-sm text-red-900 dark:text-red-200">❌ {error}</p>
          </motion.div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={exporting}
            className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-900 dark:text-white font-medium rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || !salesReport}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Exportar
              </>
            )}
          </button>
        </div>

        {/* Info Footer */}
        <p className="text-xs text-slate-600 dark:text-slate-400 text-center mt-4">
          O arquivo será guardado na pasta de descarregamento do seu navegador
        </p>
      </motion.div>
    </div>
  );
};

export default ReportExportDialog;
