/**
 * Report Export Service
 * Serviço para gerar e exportar relatórios consolidados
 * Fase 8: Exportação de Relatórios Consolidados
 */

import { SalesReport, SalesKPIs } from '../types/sales';
import { Product } from '../types';

export interface ConsolidatedReport {
  period: {
    from: string;
    to: string;
    label: string;
  };
  storeName: string;
  generatedAt: string;
  sales: SalesReport;
  inventory: {
    totalProducts: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  };
  topAlerts: Array<{
    type: 'expiry' | 'stock';
    product: string;
    message: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
  }>;
}

/**
 * Preparar dados consolidados para exportação
 */
export function prepareConsolidatedReport(
  salesReport: SalesReport,
  products: Product[],
  storeName: string,
  alerts: any[] = []
): ConsolidatedReport {
  // Calcular inventário
  const inventory = {
    totalProducts: products.length,
    inStock: products.filter((p) => (p.quantidadeDisponível || 0) >= 10).length,
    lowStock: products.filter(
      (p) => (p.quantidadeDisponível || 0) > 0 && (p.quantidadeDisponível || 0) < 10
    ).length,
    outOfStock: products.filter((p) => (p.quantidadeDisponível || 0) === 0).length,
    totalValue: products.reduce((sum, p) => sum + ((p.preco || 0) * (p.quantidadeDisponível || 0)), 0),
  };

  return {
    period: {
      ...salesReport.period,
      label: salesReport.period.label || `${salesReport.period.from} a ${salesReport.period.to}`,
    },
    storeName,
    generatedAt: new Date().toISOString(),
    sales: salesReport,
    inventory,
    topAlerts: alerts.slice(0, 10),
  };
}

/**
 * Converter relatório para CSV
 */
export function reportToCSV(report: ConsolidatedReport): string {
  const lines: string[] = [];

  // Header
  lines.push(`PreçoCerto - Relatório Consolidado`);
  lines.push(`Loja: ${report.storeName}`);
  lines.push(`Período: ${report.period.label} (${report.period.from} a ${report.period.to})`);
  lines.push(`Gerado em: ${new Date(report.generatedAt).toLocaleString('pt-PT')}`);
  lines.push('');

  // KPIs de Vendas
  lines.push('=== VENDAS ===');
  lines.push(`Transações,${report.sales.kpis.totalTransactions}`);
  lines.push(`Unidades Vendidas,${report.sales.kpis.totalUnits}`);
  lines.push(`Receita Total (Kz),${(report.sales.kpis.totalRevenue || 0).toFixed(2)}`);
  lines.push(`Custo Total (Kz),${(report.sales.kpis.totalCost || 0).toFixed(2)}`);
  lines.push(`Lucro Total (Kz),${(report.sales.kpis.totalProfit || 0).toFixed(2)}`);
  lines.push(`Ticket Médio (Kz),${(report.sales.kpis.avgTransactionValue || 0).toFixed(2)}`);
  lines.push(`Margem Média (%),${(report.sales.kpis.avgMargin || 0).toFixed(2)}`);
  lines.push(`Margem Mínima (%),${(report.sales.kpis.minMargin || 0).toFixed(2)}`);
  lines.push(`Margem Máxima (%),${(report.sales.kpis.maxMargin || 0).toFixed(2)}`);
  lines.push('');

  // Métodos de Pagamento
  if (report.sales.kpis.paymentMethods) {
    lines.push('=== MÉTODOS DE PAGAMENTO ===');
    lines.push(`Dinheiro,${report.sales.kpis.paymentMethods.cash || 0}`);
    lines.push(`Cartão,${report.sales.kpis.paymentMethods.card || 0}`);
    lines.push(`Transferência,${report.sales.kpis.paymentMethods.transfer || 0}`);
    lines.push(`Cheque,${report.sales.kpis.paymentMethods.cheque || 0}`);
    lines.push(`Outro,${report.sales.kpis.paymentMethods.other || 0}`);
    lines.push('');
  }

  // Inventário
  lines.push('=== INVENTÁRIO ===');
  lines.push(`Total de Produtos,${report.inventory.totalProducts}`);
  lines.push(`Em Stock (≥10),${report.inventory.inStock}`);
  lines.push(`Stock Baixo (<10),${report.inventory.lowStock}`);
  lines.push(`Sem Stock,${report.inventory.outOfStock}`);
  lines.push(`Valor Total Inventário (Kz),${report.inventory.totalValue.toFixed(2)}`);
  lines.push('');

  // Top Produtos
  if (report.sales.topProducts && report.sales.topProducts.length > 0) {
    lines.push('=== TOP 10 PRODUTOS ===');
    lines.push('Posição,Produto,Categoria,Quantidade,Receita (Kz),Lucro (Kz),Margem (%)');
    report.sales.topProducts.forEach((product, idx) => {
      lines.push(
        `${idx + 1},${product.productName},${product.category || 'N/A'},${product.quantity},${(product.totalRevenue || 0).toFixed(2)},${(product.totalProfit || 0).toFixed(2)},${(product.avgMargin || 0).toFixed(2)}`
      );
    });
    lines.push('');
  }

  // Top Categorias
  if (report.sales.topCategories && report.sales.topCategories.length > 0) {
    lines.push('=== TOP 5 CATEGORIAS ===');
    lines.push('Posição,Categoria,Produtos,Quantidade,Receita (Kz),Lucro (Kz),Margem (%)');
    report.sales.topCategories.forEach((category, idx) => {
      lines.push(
        `${idx + 1},${category.categoryName},${category.productsCount},${category.quantity},${(category.totalRevenue || 0).toFixed(2)},${(category.totalProfit || 0).toFixed(2)},${(category.avgMargin || 0).toFixed(2)}`
      );
    });
    lines.push('');
  }

  // Alertas
  if (report.topAlerts && report.topAlerts.length > 0) {
    lines.push('=== ALERTAS CRÍTICOS ===');
    lines.push('Tipo,Produto,Mensagem,Severidade');
    report.topAlerts.forEach((alert) => {
      lines.push(`${alert.type},${alert.product},"${alert.message}",${alert.severity}`);
    });
  }

  return lines.join('\n');
}

/**
 * Gerar HTML para PDF
 */
export function reportToHTML(report: ConsolidatedReport): string {
  const formatCurrency = (value: number) => `${value.toFixed(2)} Kz`;

  return `
<!DOCTYPE html>
<html lang="pt-PT">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório PreçoCerto</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { font-size: 14px; opacity: 0.9; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; }
    .info-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; }
    .info-card strong { display: block; font-size: 12px; color: #667eea; margin-bottom: 5px; }
    .info-card span { display: block; font-size: 16px; font-weight: bold; color: #333; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 18px; font-weight: bold; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    table th { background: #f8f9fa; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; font-size: 13px; }
    table td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
    table tr:hover { background: #f8f9fa; }
    .positive { color: #10b981; font-weight: 600; }
    .negative { color: #ef4444; font-weight: 600; }
    .warning { color: #f59e0b; font-weight: 600; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
    @media print {
      body { background: white; }
      .container { padding: 0; }
      page { page-break-after: always; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório PreçoCerto</h1>
      <p>Loja: ${report.storeName}</p>
      <p>Período: ${report.period.label} (${new Date(report.period.from).toLocaleDateString('pt-PT')} a ${new Date(report.period.to).toLocaleDateString('pt-PT')})</p>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <strong>💰 RECEITA TOTAL</strong>
        <span class="positive">${formatCurrency(report.sales.kpis.totalRevenue || 0)}</span>
      </div>
      <div class="info-card">
        <strong>📈 LUCRO TOTAL</strong>
        <span class="positive">${formatCurrency(report.sales.kpis.totalProfit || 0)}</span>
      </div>
      <div class="info-card">
        <strong>🛒 TRANSAÇÕES</strong>
        <span>${report.sales.kpis.totalTransactions}</span>
      </div>
      <div class="info-card">
        <strong>📊 MARGEM MÉDIA</strong>
        <span class="positive">${(report.sales.kpis.avgMargin || 0).toFixed(1)}%</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">📦 Status de Estoque</div>
      <table>
        <tr>
          <td><strong>Total de Produtos</strong></td>
          <td>${report.inventory.totalProducts}</td>
        </tr>
        <tr>
          <td><strong>Em Stock (≥10 unidades)</strong></td>
          <td class="positive">${report.inventory.inStock}</td>
        </tr>
        <tr>
          <td><strong>Stock Baixo (&lt;10 unidades)</strong></td>
          <td class="warning">${report.inventory.lowStock}</td>
        </tr>
        <tr>
          <td><strong>Sem Stock</strong></td>
          <td class="negative">${report.inventory.outOfStock}</td>
        </tr>
        <tr>
          <td><strong>Valor Total Inventário</strong></td>
          <td>${formatCurrency(report.inventory.totalValue)}</td>
        </tr>
      </table>
    </div>

    ${
      report.sales.topProducts && report.sales.topProducts.length > 0
        ? `
    <div class="section">
      <div class="section-title">🏆 Top 10 Produtos</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Produto</th>
            <th>Categoria</th>
            <th>Qty</th>
            <th>Receita</th>
            <th>Lucro</th>
            <th>Margem</th>
          </tr>
        </thead>
        <tbody>
          ${report.sales.topProducts
            .map(
              (p, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${p.productName}</td>
            <td>${p.category || 'N/A'}</td>
            <td>${p.quantity}</td>
            <td>${formatCurrency(p.totalRevenue || 0)}</td>
            <td class="positive">${formatCurrency(p.totalProfit || 0)}</td>
            <td class="positive">${(p.avgMargin || 0).toFixed(1)}%</td>
          </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    `
        : ''
    }

    ${
      report.sales.kpis.paymentMethods
        ? `
    <div class="section">
      <div class="section-title">💳 Métodos de Pagamento</div>
      <table>
        <tr>
          <td><strong>Dinheiro</strong></td>
          <td>${report.sales.kpis.paymentMethods.cash || 0}</td>
        </tr>
        <tr>
          <td><strong>Cartão</strong></td>
          <td>${report.sales.kpis.paymentMethods.card || 0}</td>
        </tr>
        <tr>
          <td><strong>Transferência</strong></td>
          <td>${report.sales.kpis.paymentMethods.transfer || 0}</td>
        </tr>
        <tr>
          <td><strong>Cheque</strong></td>
          <td>${report.sales.kpis.paymentMethods.cheque || 0}</td>
        </tr>
        <tr>
          <td><strong>Outro</strong></td>
          <td>${report.sales.kpis.paymentMethods.other || 0}</td>
        </tr>
      </table>
    </div>
    `
        : ''
    }

    <div class="footer">
      <p>Relatório gerado em ${new Date(report.generatedAt).toLocaleString('pt-PT')}</p>
      <p>PreçoCerto © 2024 - Sistema de Gestão de Farmácias</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Fazer download de arquivo
 */
export function downloadFile(content: string, filename: string, type: 'text/csv' | 'text/html') {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
