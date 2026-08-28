import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product } from '../types';
import { ReportConfig } from '../components/ReportBuilder';
import { exportSheetsToXlsx } from './excelExport';

/**
 * Utilitários para exportar relatórios gerados
 * Fase 5B Item 3: Custom Reports - Export
 */

interface ReportExportOptions {
  title: string;
  columns: Array<{ key: string; label: string }>;
  data: any[];
  generatedAt?: string;
  companyName?: string;
}

/**
 * Exporta relatório para Excel (.xlsx)
 */
export async function exportReportToExcel(options: ReportExportOptions): Promise<void> {
  try {
    const { title, columns, data, generatedAt, companyName } = options;

    const metadataRows = [
      [title],
      companyName ? [`Empresa: ${companyName}`] : null,
      generatedAt ? [`Gerado em: ${generatedAt}`] : null,
      [],
    ].filter(Boolean) as string[][];
    const headerRow = metadataRows.length + 1;

    const rows = data.map((row) =>
      columns.map((col) => {
        const value = row[col.key];

        if (typeof value === 'number') {
          if (col.key.includes('preco') || col.key.includes('custo') || col.key.includes('lucro')) {
            return value.toFixed(2);
          }

          if (col.key.includes('margem') || col.key.includes('roi')) {
            return `${value.toFixed(2)}%`;
          }
        }

        return value || '-';
      })
    );

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${title.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.xlsx`;

    await exportSheetsToXlsx(
      [
        {
          name: 'Relatório',
          rows: [
            ...metadataRows,
            columns.map((col) => col.label),
            ...rows,
          ],
          headerRow,
          columnWidths: columns.map((col) => Math.min(col.label.length + 4, 50)),
        },
      ],
      filename
    );
  } catch (error) {
    console.error('Erro ao exportar relatório para Excel:', error);
    throw new Error('Falha ao exportar relatório para Excel');
  }
}

/**
 * Exporta relatório para PDF
 */
export function exportReportToPDF(options: ReportExportOptions): void {
  try {
    const { title, columns, data, generatedAt, companyName } = options;

    const doc = new jsPDF({
      orientation: data.length > 5 ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Header
    doc.setFontSize(16);
    doc.text(title, 14, 15);

    // Subtítulo com empresa e data
    doc.setFontSize(10);
    doc.setTextColor(100);
    if (companyName) {
      doc.text(`Empresa: ${companyName}`, 14, 22);
    }
    if (generatedAt) {
      doc.text(`Gerado em: ${generatedAt}`, 14, 28);
    }

    // Tabela
    const tableData = data.map((row) =>
      columns.map((col) => {
        const value = row[col.key];
        if (typeof value === 'number') {
          if (col.key.includes('preco') || col.key.includes('custo') || col.key.includes('lucro')) {
            return value.toFixed(2);
          } else if (col.key.includes('margem') || col.key.includes('roi')) {
            return value.toFixed(2) + '%';
          }
        }
        return value || '-';
      })
    );

    autoTable(doc, {
      head: [columns.map((col) => col.label)],
      body: tableData,
      startY: companyName || generatedAt ? 35 : 25,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [5, 150, 105],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240],
      },
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
    });

    // Footer
    const pageCount = (doc as any).internal.pages.length - 1;
    if (pageCount > 0) {
      doc.setFontSize(8);
      doc.setTextColor(150);
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 5,
          { align: 'center' }
        );
      }
    }

    // Salvar
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${title.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.pdf`;
    doc.save(filename);
  } catch (error) {
    console.error('Erro ao exportar relatório para PDF:', error);
    throw new Error('Falha ao exportar relatório para PDF');
  }
}

/**
 * Filtra produtos baseado em configuração de relatório
 */
export function filterProductsByConfig(
  products: Product[],
  config: ReportConfig
): Product[] {
  let filtered = [...products];

  // Aplicar filtros
  if (config.filters && config.filters.length > 0) {
    filtered = filtered.filter((product) => {
      return config.filters!.every((filter) => {
        switch (filter.type) {
          case 'category':
            return product.categoria === filter.value;
          case 'priceRange':
            return (
              product.precoVendaRecomendado >= filter.value.min &&
              product.precoVendaRecomendado <= filter.value.max
            );
          case 'marginRange':
            return (
              (product.margemReal || 0) >= filter.value.min &&
              (product.margemReal || 0) <= filter.value.max
            );
          case 'roiRange':
            return (
              (product.roi || 0) >= filter.value.min &&
              (product.roi || 0) <= filter.value.max
            );
          default:
            return true;
        }
      });
    });
  }

  // Aplicar ordenação
  if (config.sortBy) {
    filtered.sort((a, b) => {
      const aValue = a[config.sortBy as keyof Product];
      const bValue = b[config.sortBy as keyof Product];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (typeof aValue === 'string') {
        const comparison = (aValue as string).localeCompare(bValue as string);
        return config.sortOrder === 'asc' ? comparison : -comparison;
      } else if (typeof aValue === 'number') {
        const diff = aValue - (bValue as number);
        return config.sortOrder === 'asc' ? diff : -diff;
      }

      return 0;
    });
  }

  return filtered;
}

/**
 * Prepara dados de produtos para exportação baseado na configuração
 */
export function prepareProductsForExport(
  products: Product[],
  columns: Array<{ key: string; label: string }>
): any[] {
  return products.map((product) => {
    const row: Record<string, any> = {};

    columns.forEach((col) => {
      if (col.key === 'custoTotal') {
        row[col.key] =
          (product.custoCompra || 0) +
          (product.custoTransporte || 0) +
          (product.custoEmbalagem || 0) +
          (product.outrosCustos || 0);
      } else {
        row[col.key] = product[col.key as keyof Product] || 0;
      }
    });

    return row;
  });
}
