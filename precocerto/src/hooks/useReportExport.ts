/**
 * useReportExport Hook
 * Hook para exportar relatórios consolidados
 * Fase 8: Exportação de Relatórios
 */

import { useState } from 'react';
import { SalesReport } from '../types/sales';
import { Product } from '../types';
import {
  prepareConsolidatedReport,
  reportToCSV,
  reportToHTML,
  downloadFile,
  ConsolidatedReport,
} from '../services/reportExportService';

export interface UseReportExportReturn {
  exporting: boolean;
  error: string | null;
  exportToCSV: (
    salesReport: SalesReport,
    products: Product[],
    storeName: string,
    alerts?: any[]
  ) => void;
  exportToPDF: (
    salesReport: SalesReport,
    products: Product[],
    storeName: string,
    alerts?: any[]
  ) => void;
  reset: () => void;
}

export function useReportExport(): UseReportExportReturn {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExportToCSV = (
    salesReport: SalesReport,
    products: Product[],
    storeName: string,
    alerts: any[] = []
  ) => {
    try {
      setExporting(true);
      setError(null);

      const consolidatedReport = prepareConsolidatedReport(
        salesReport,
        products,
        storeName,
        alerts
      );

      const csv = reportToCSV(consolidatedReport);
      const filename = `relatorio_${storeName}_${new Date().toISOString().split('T')[0]}.csv`;

      downloadFile(csv, filename, 'text/csv');

      console.log('✅ [useReportExport] CSV exportado com sucesso:', filename);
      setExporting(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao exportar CSV';
      setError(errorMessage);
      console.error('❌ [useReportExport] Erro ao exportar CSV:', err);
      setExporting(false);
    }
  };

  const handleExportToPDF = (
    salesReport: SalesReport,
    products: Product[],
    storeName: string,
    alerts: any[] = []
  ) => {
    try {
      setExporting(true);
      setError(null);

      const consolidatedReport = prepareConsolidatedReport(
        salesReport,
        products,
        storeName,
        alerts
      );

      const html = reportToHTML(consolidatedReport);

      // Se tiver acesso a html2pdf, usar; caso contrário, fazer download como HTML
      if (typeof window !== 'undefined' && (window as any).html2pdf) {
        const element = document.createElement('div');
        element.innerHTML = html;
        const opt = {
          margin: 10,
          filename: `relatorio_${storeName}_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
        };

        (window as any).html2pdf().set(opt).from(element).save();
      } else {
        // Fallback: fazer download como HTML
        const filename = `relatorio_${storeName}_${new Date().toISOString().split('T')[0]}.html`;
        downloadFile(html, filename, 'text/html');
        console.log('⚠️ [useReportExport] PDF não disponível, exportado como HTML');
      }

      console.log('✅ [useReportExport] Relatório exportado com sucesso');
      setExporting(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao exportar PDF';
      setError(errorMessage);
      console.error('❌ [useReportExport] Erro ao exportar PDF:', err);
      setExporting(false);
    }
  };

  const reset = () => {
    setError(null);
  };

  return {
    exporting,
    error,
    exportToCSV: handleExportToCSV,
    exportToPDF: handleExportToPDF,
    reset,
  };
}
