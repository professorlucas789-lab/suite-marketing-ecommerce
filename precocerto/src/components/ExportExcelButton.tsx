import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, BusinessSettings } from '../types';

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

      // Criar workbook com múltiplas abas
      const wb = XLSX.utils.book_new();

      // Aba 1: Produtos
      const productsData = formatProductsForExport();
      const wsProducts = XLSX.utils.json_to_sheet(productsData);
      XLSX.utils.book_append_sheet(wb, wsProducts, 'Produtos');

      // Aba 2: Histórico (se houver dados)
      if (priceHistory.length > 0) {
        const historyData = formatHistoryForExport();
        const wsHistory = XLSX.utils.json_to_sheet(historyData);
        XLSX.utils.book_append_sheet(wb, wsHistory, 'Histórico de Preços');
      }

      // Aba 3: Sumário
      const summaryData = createSummary();
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Sumário');

      // Ajustar largura das colunas automaticamente
      Object.keys(wb.Sheets).forEach((sheetName) => {
        const sheet = wb.Sheets[sheetName];
        const maxWidth: Record<string, number> = {};

        Object.keys(sheet).forEach((cell) => {
          if (cell !== '!ref' && cell !== '!merges') {
            const colName = cell.replace(/\d/g, '');
            const cellValue = sheet[cell]?.v ? String(sheet[cell].v) : '';
            maxWidth[colName] = Math.max(
              maxWidth[colName] || 10,
              cellValue.length + 2
            );
          }
        });

        const wscols = Object.entries(maxWidth).map(([, width]) => ({
          wch: Math.min(width, 50), // Máximo de 50
        }));

        if (wscols.length > 0) {
          sheet['!cols'] = wscols;
        }
      });

      // Gerar nome do arquivo com data
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(now.getDate()).padStart(2, '0')}`;
      const filename = `PreçoCerto_Produtos_${dateStr}.xlsx`;

      // Salvar arquivo
      XLSX.writeFile(wb, filename);

      // Sucesso
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
