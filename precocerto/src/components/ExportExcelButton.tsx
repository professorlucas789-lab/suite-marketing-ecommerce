import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Product, BusinessSettings } from '../types';
import { exportSheetsToXlsx } from '../utils/excelExport';

interface ExportExcelButtonProps {
  products: Product[];
  settings: BusinessSettings | null;
  priceHistory?: Array<{
    productId: string;
    productName: string;
    precoAnterior: number;
    precoAtual: number;
    data: string;
  }>;
}

/**
 * Componente de exportação para Excel
 * Exporta produtos, histórico de preços e sumário em múltiplas abas
 */
export function ExportExcelButton({
  products,
  settings,
  priceHistory = [],
}: ExportExcelButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Formata dados de produtos para exportação
   */
  const formatProductsForExport = (): any[] => {
    return products.map((product) => ({
      'Nome': product.nome,
      'Categoria': product.categoria || '-',
      'Custo Compra': Number(product.custoCompra || 0).toFixed(2),
      'Custo Transporte': Number(product.custoTransporte || 0).toFixed(2),
      'Custo Embalagem': Number(product.custoEmbalagem || 0).toFixed(2),
      'Outros Custos': Number(product.outrosCustos || 0).toFixed(2),
      'Custo Total': Number(product.custoTotalReal || 0).toFixed(2),
      'Preço Venda': Number(product.precoVendaRecomendado || 0).toFixed(2),
      'Lucro Estimado': Number(product.lucroEstimado || 0).toFixed(2),
      'Margem Real %': Number(product.margemReal || 0).toFixed(2),
      'ROI %': Number(product.roi || 0).toFixed(2),
      'Data Criação': product.dataCriacao || '-',
    }));
  };

  /**
   * Formata histórico de preços para exportação
   */
  const formatHistoryForExport = (): any[] => {
    return priceHistory.map((entry) => ({
      'Produto': entry.productName,
      'Preço Anterior': Number(entry.precoAnterior).toFixed(2),
      'Preço Atual': Number(entry.precoAtual).toFixed(2),
      'Diferença': Number(entry.precoAtual - entry.precoAnterior).toFixed(2),
      'Variação %': Number(
        ((entry.precoAtual - entry.precoAnterior) / entry.precoAnterior) * 100
      ).toFixed(2),
      'Data Alteração': entry.data,
    }));
  };

  /**
   * Cria sumário executivo
   */
  const createSummary = (): any[] => {
    const totalProducts = products.length;
    const totalInvested = products.reduce(
      (sum, p) => sum + (p.custoTotalReal || 0),
      0
    );
    const totalRevenue = products.reduce(
      (sum, p) => sum + (p.precoVendaRecomendado || 0),
      0
    );
    const totalProfit = products.reduce(
      (sum, p) => sum + (p.lucroEstimado || 0),
      0
    );

    const byCategory: Record<string, any> = {};
    products.forEach((p) => {
      const cat = p.categoria || 'Sem Categoria';
      if (!byCategory[cat]) {
        byCategory[cat] = {
          quantidade: 0,
          custoTotal: 0,
          precoTotal: 0,
          lucroTotal: 0,
        };
      }
      byCategory[cat].quantidade += 1;
      byCategory[cat].custoTotal += p.custoTotalReal || 0;
      byCategory[cat].precoTotal += p.precoVendaRecomendado || 0;
      byCategory[cat].lucroTotal += p.lucroEstimado || 0;
    });

    const summary: any[] = [
      {
        'Métrica': 'Empresa',
        'Valor': settings?.companyName || 'PreçoCerto',
        'Detalhes': '',
      },
      {
        'Métrica': 'Moeda',
        'Valor': settings?.currency || 'Kz',
        'Detalhes': '',
      },
      { 'Métrica': '', 'Valor': '', 'Detalhes': '' }, // Linha vazia
      {
        'Métrica': 'Total de Produtos',
        'Valor': totalProducts,
        'Detalhes': '',
      },
      {
        'Métrica': 'Investimento Total',
        'Valor': Number(totalInvested).toFixed(2),
        'Detalhes': `${settings?.currency || 'Kz'}`,
      },
      {
        'Métrica': 'Receita Esperada',
        'Valor': Number(totalRevenue).toFixed(2),
        'Detalhes': `${settings?.currency || 'Kz'}`,
      },
      {
        'Métrica': 'Lucro Total Esperado',
        'Valor': Number(totalProfit).toFixed(2),
        'Detalhes': `${settings?.currency || 'Kz'}`,
      },
      {
        'Métrica': 'Margem Média',
        'Valor': Number(
          products.reduce((sum, p) => sum + (p.margemReal || 0), 0) /
            (products.length || 1)
        ).toFixed(2),
        'Detalhes': '%',
      },
      {
        'Métrica': 'ROI Médio',
        'Valor': Number(
          products.reduce((sum, p) => sum + (p.roi || 0), 0) /
            (products.length || 1)
        ).toFixed(2),
        'Detalhes': '%',
      },
    ];

    // Adicionar sumário por categoria
    summary.push({ 'Métrica': '', 'Valor': '', 'Detalhes': '' });
    summary.push({
      'Métrica': 'RESUMO POR CATEGORIA',
      'Valor': '',
      'Detalhes': '',
    });

    Object.entries(byCategory).forEach(([cat, data]) => {
      summary.push({
        'Métrica': cat,
        'Valor': `${data.quantidade} produtos`,
        'Detalhes': `Lucro: ${Number(data.lucroTotal).toFixed(2)} ${
          settings?.currency || 'Kz'
        }`,
      });
    });

    return summary;
  };

  /**
   * Exporta para Excel
   */
  const handleExport = async () => {
    try {
      setIsExporting(true);

      const productsData = formatProductsForExport();
      const productHeaders = Object.keys(productsData[0] || {});
      const productRows = productsData.map((row) => productHeaders.map((header) => row[header]));

      const sheets = [
        {
          name: 'Produtos',
          rows: [productHeaders, ...productRows],
          headerRow: 1,
        },
      ];

      if (priceHistory.length > 0) {
        const historyData = formatHistoryForExport();
        const historyHeaders = Object.keys(historyData[0] || {});
        const historyRows = historyData.map((row) => historyHeaders.map((header) => row[header]));

        sheets.push({
          name: 'Histórico de Preços',
          rows: [historyHeaders, ...historyRows],
          headerRow: 1,
        });
      }

      const summaryData = createSummary();
      const summaryHeaders = Object.keys(summaryData[0] || {});
      const summaryRows = summaryData.map((row) => summaryHeaders.map((header) => row[header]));

      sheets.push({
        name: 'Sumário',
        rows: [summaryHeaders, ...summaryRows],
        headerRow: 1,
      });

      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(now.getDate()).padStart(2, '0')}`;
      const filename = `PreçoCerto_Produtos_${dateStr}.xlsx`;

      await exportSheetsToXlsx(sheets, filename);

      console.log('✅ Arquivo exportado com sucesso:', filename);
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      alert('Erro ao exportar para Excel. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting || products.length === 0}
      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition"
      title={products.length === 0 ? 'Nenhum produto para exportar' : 'Exportar para Excel'}
    >
      {isExporting ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          Exportando...
        </>
      ) : (
        <>
          <Download size={18} />
          Exportar Excel
        </>
      )}
    </button>
  );
}
