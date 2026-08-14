/**
 * Serviço de Exportação Avançada
 * Fase 7: Exportação Avançada
 */

import type {
  ExportConfig,
  ExportData,
  ExportFormat,
  ExcelWorksheet,
  PDFLayout,
  EmailConfig,
  ScheduledExport,
} from '../types/export';

/**
 * Serviço de Exportação de Dados
 */
export class ExportService {
  /**
   * Gerar exportação em JSON
   */
  static generateJSON(data: ExportData): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Gerar exportação em CSV
   */
  static generateCSV(data: ExportData): string {
    const lines: string[] = [];

    // Header
    lines.push(`Relatório de Exportação: ${data.title}`);
    lines.push(`Gerado em: ${new Date(data.generatedAt).toLocaleString('pt-PT')}`);
    lines.push(`Por: ${data.generatedBy}`);
    lines.push(`Período: ${data.period.start} a ${data.period.end}`);
    lines.push('');

    // Sumário
    lines.push('=== SUMÁRIO ===');
    lines.push('Métrica,Valor');
    lines.push(`Total Lojas,${data.summary.totalStores}`);
    lines.push(`Total Produtos,${data.summary.totalProducts}`);
    lines.push(`Total Utilizadores,${data.summary.totalUsers}`);
    lines.push(`Margem Média,${data.summary.averageMargin.toFixed(2)}%`);
    lines.push(`Valor Stock,€${data.summary.totalStock.toFixed(2)}`);
    lines.push('');

    // Lojas
    lines.push('=== LOJAS ===');
    lines.push('Nome,Tipo,Email,Telefone,Endereço,Produtos,Utilizadores,Margem,Stock');
    data.stores.forEach((store) => {
      const row = [
        `"${store.name}"`,
        store.type,
        store.email,
        store.phone,
        `"${store.address}"`,
        store.metrics.totalProdutos || 0,
        store.metrics.totalUtilizadores || 0,
        `${(store.metrics.margemMedia || 0).toFixed(2)}%`,
        `€${(store.metrics.valorStock || 0).toFixed(2)}`,
      ];
      lines.push(row.join(','));
    });

    return lines.join('\n');
  }

  /**
   * Preparar dados para Excel (XLSX)
   */
  static prepareExcelWorksheets(data: ExportData): ExcelWorksheet[] {
    const worksheets: ExcelWorksheet[] = [];

    // Worksheet 1: Sumário
    worksheets.push({
      name: 'Sumário',
      headers: ['Métrica', 'Valor'],
      data: [
        ['Total Lojas', data.summary.totalStores],
        ['Total Produtos', data.summary.totalProducts],
        ['Total Utilizadores', data.summary.totalUsers],
        ['Margem Média (%)', data.summary.averageMargin.toFixed(2)],
        ['Valor Stock Total (€)', data.summary.totalStock.toFixed(2)],
        ['Loja com Melhor Desempenho', data.summary.topPerformingStore],
        ['Loja com Pior Desempenho', data.summary.bottomPerformingStore],
        ['Alertas Críticos', data.summary.criticalAlerts],
        ['Incidentes de Segurança', data.summary.securityIncidents],
      ],
      freezePane: 1,
      autoFilter: true,
      columnWidths: [30, 20],
    });

    // Worksheet 2: Lojas
    const storesData = data.stores.map((store) => [
      store.name,
      store.type,
      store.email,
      store.phone,
      store.address,
      store.metrics.totalProdutos || 0,
      store.metrics.totalUtilizadores || 0,
      `${(store.metrics.margemMedia || 0).toFixed(2)}%`,
      `€${(store.metrics.valorStock || 0).toFixed(2)}`,
      (store.alerts && store.alerts.length) || 0,
    ]);

    worksheets.push({
      name: 'Lojas',
      headers: [
        'Nome',
        'Tipo',
        'Email',
        'Telefone',
        'Endereço',
        'Produtos',
        'Utilizadores',
        'Margem Média',
        'Valor Stock',
        'Alertas',
      ],
      data: storesData,
      freezePane: 1,
      autoFilter: true,
      columnWidths: [20, 12, 20, 15, 25, 10, 12, 12, 12, 8],
    });

    // Worksheet 3: Histórico (se disponível)
    if (data.stores.some((s) => s.history && s.history.length > 0)) {
      const historyData: any[] = [];
      data.stores.forEach((store) => {
        if (store.history) {
          store.history.forEach((point) => {
            historyData.push([
              store.name,
              point.date,
              point.totalProdutos,
              point.totalUtilizadores,
              `€${point.precoMedio.toFixed(2)}`,
              `${point.margemMedia.toFixed(2)}%`,
              `€${point.valorStock.toFixed(2)}`,
            ]);
          });
        }
      });

      if (historyData.length > 0) {
        worksheets.push({
          name: 'Histórico',
          headers: [
            'Loja',
            'Data',
            'Produtos',
            'Utilizadores',
            'Preço Médio',
            'Margem Média',
            'Valor Stock',
          ],
          data: historyData,
          freezePane: 1,
          autoFilter: true,
          columnWidths: [20, 12, 10, 12, 12, 12, 12],
        });
      }
    }

    // Worksheet 4: Auditoria (se disponível)
    if (data.auditLog && data.auditLog.length > 0) {
      const auditData = data.auditLog.map((entry) => [
        new Date(entry.timestamp).toLocaleString('pt-PT'),
        entry.userName,
        entry.action,
        entry.storeName,
        entry.status,
        entry.severity,
      ]);

      worksheets.push({
        name: 'Auditoria',
        headers: ['Data/Hora', 'Utilizador', 'Ação', 'Loja', 'Status', 'Severidade'],
        data: auditData,
        freezePane: 1,
        autoFilter: true,
        columnWidths: [20, 15, 20, 15, 10, 10],
      });
    }

    // Worksheet 5: Informações
    worksheets.push({
      name: 'Informações',
      headers: ['Campo', 'Valor'],
      data: [
        ['Título do Relatório', data.title],
        ['Gerado em', new Date(data.generatedAt).toLocaleString('pt-PT')],
        ['Gerado por', data.generatedBy],
        ['Data Início', data.period.start],
        ['Data Fim', data.period.end],
        ['Total de Lojas', data.stores.length],
      ],
      freezePane: 1,
      columnWidths: [25, 40],
    });

    return worksheets;
  }

  /**
   * Gerar layout PDF
   */
  static getDefaultPDFLayout(): PDFLayout {
    return {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margins: {
        top: 20,
        right: 15,
        bottom: 20,
        left: 15,
      },
      headerHeight: 30,
      footerHeight: 20,
    };
  }

  /**
   * Preparar conteúdo HTML para PDF
   */
  static generateHTMLForPDF(data: ExportData): string {
    const html = `
      <!DOCTYPE html>
      <html lang="pt-PT">
      <head>
        <meta charset="UTF-8">
        <title>${data.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { color: #2d3748; text-align: center; margin-bottom: 5px; }
          .subtitle { text-align: center; color: #718096; margin-bottom: 20px; }
          .info-box { background: #f7fafc; border-left: 4px solid #4299e1; padding: 15px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #4299e1; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f7fafc; }
          .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .summary-card { background: #f7fafc; border: 1px solid #cbd5e0; padding: 15px; }
          .summary-label { font-size: 12px; color: #718096; }
          .summary-value { font-size: 24px; font-weight: bold; color: #2d3748; }
          .alert { background: #fed7d7; border-left: 4px solid #fc8181; padding: 10px; margin: 10px 0; }
          .success { background: #c6f6d5; border-left: 4px solid #68d391; padding: 10px; margin: 10px 0; }
          .page-break { page-break-after: always; margin-top: 20px; }
          footer { margin-top: 40px; text-align: center; font-size: 10px; color: #a0aec0; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>${data.title}</h1>
        <div class="subtitle">
          Gerado em ${new Date(data.generatedAt).toLocaleString('pt-PT')} por ${data.generatedBy}
        </div>

        <div class="info-box">
          <strong>Período:</strong> ${data.period.start} a ${data.period.end}
        </div>

        <h2>Sumário Executivo</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Total de Lojas</div>
            <div class="summary-value">${data.summary.totalStores}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total de Produtos</div>
            <div class="summary-value">${data.summary.totalProducts}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total de Utilizadores</div>
            <div class="summary-value">${data.summary.totalUsers}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Margem Média</div>
            <div class="summary-value">${data.summary.averageMargin.toFixed(2)}%</div>
          </div>
        </div>

        ${
          data.summary.criticalAlerts > 0
            ? `<div class="alert"><strong>⚠️ Alertas Críticos:</strong> ${data.summary.criticalAlerts} alerta(s) crítico(s) detectado(s)</div>`
            : `<div class="success">✓ Nenhum alerta crítico detectado</div>`
        }

        <div class="page-break"></div>

        <h2>Lojas</h2>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Email</th>
              <th>Produtos</th>
              <th>Utilizadores</th>
              <th>Margem</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            ${data.stores
              .map(
                (store) => `
              <tr>
                <td>${store.name}</td>
                <td>${store.type}</td>
                <td>${store.email}</td>
                <td>${store.metrics.totalProdutos || 0}</td>
                <td>${store.metrics.totalUtilizadores || 0}</td>
                <td>${(store.metrics.margemMedia || 0).toFixed(2)}%</td>
                <td>€${(store.metrics.valorStock || 0).toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <footer>
          <p>Este documento foi gerado automaticamente pelo sistema de relatórios Precocerto.</p>
          <p>Para mais informações, contacte o suporte técnico.</p>
        </footer>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Preparar email com anexos
   */
  static prepareEmailConfig(
    data: ExportData,
    recipients: string[],
    format: string,
    fileName: string
  ): EmailConfig {
    return {
      to: recipients,
      subject: `Relatório de Exportação: ${data.title}`,
      body: `Olá,\n\nEm anexo encontra o relatório de exportação: ${data.title}\n\nPeríodo: ${data.period.start} a ${data.period.end}\n\nGerado por: ${data.generatedBy}\nData: ${new Date(data.generatedAt).toLocaleString('pt-PT')}\n\nCumprimentos,\nSistema de Relatórios Precocerto`,
      htmlBody: `
        <h2>Relatório de Exportação</h2>
        <p>Olá,</p>
        <p>Em anexo encontra o relatório de exportação: <strong>${data.title}</strong></p>
        <div style="background: #f7fafc; padding: 15px; border-left: 4px solid #4299e1; margin: 15px 0;">
          <p><strong>Período:</strong> ${data.period.start} a ${data.period.end}</p>
          <p><strong>Formato:</strong> ${format}</p>
          <p><strong>Gerado por:</strong> ${data.generatedBy}</p>
          <p><strong>Data:</strong> ${new Date(data.generatedAt).toLocaleString('pt-PT')}</p>
        </div>
        <p>Cumprimentos,<br/>Sistema de Relatórios Precocerto</p>
      `,
      attachments: [
        {
          filename: fileName,
          content: '', // Preenchido com conteúdo real
          contentType: this.getContentType(format),
        },
      ],
    };
  }

  /**
   * Obter Content-Type por formato
   */
  static getContentType(format: string): string {
    const types: Record<string, string> = {
      PDF: 'application/pdf',
      XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      CSV: 'text/csv',
      JSON: 'application/json',
    };
    return types[format] || 'application/octet-stream';
  }

  /**
   * Gerar nome de arquivo
   */
  static generateFileName(title: string, format: ExportFormat, date?: Date): string {
    const sanitized = title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const timestamp = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const ext = format.toLowerCase();
    return `${sanitized}_${timestamp}.${ext}`;
  }

  /**
   * Calcular tamanho estimado do arquivo
   */
  static estimateFileSize(data: ExportData, format: ExportFormat): number {
    const baseSize = JSON.stringify(data).length;

    switch (format) {
      case 'JSON':
        return baseSize;
      case 'CSV':
        return Math.floor(baseSize * 0.7); // CSV geralmente é menor que JSON
      case 'XLSX':
        return Math.floor(baseSize * 0.5); // Excel é mais comprimido
      case 'PDF':
        return Math.floor(baseSize * 2); // PDF pode ser maior com formatação
      default:
        return baseSize;
    }
  }

  /**
   * Validar configuração de exportação
   */
  static validateExportConfig(config: ExportConfig): string[] {
    const errors: string[] = [];

    if (!config.name || config.name.trim() === '') {
      errors.push('Nome da exportação é obrigatório');
    }

    if (!config.format || !['PDF', 'XLSX', 'CSV', 'JSON'].includes(config.format)) {
      errors.push('Formato de exportação inválido');
    }

    if (!config.storeIds || config.storeIds.length === 0) {
      errors.push('Selecione pelo menos uma loja');
    }

    if (!config.metrics || config.metrics.length === 0) {
      errors.push('Selecione pelo menos uma métrica');
    }

    if (new Date(config.dateRange.startDate) > new Date(config.dateRange.endDate)) {
      errors.push('Data de início não pode ser maior que data de fim');
    }

    if (!config.createdBy || config.createdBy.trim() === '') {
      errors.push('Identificação do utilizador é obrigatória');
    }

    return errors;
  }

  /**
   * Preparar dados para agendamento
   */
  static prepareScheduledExport(config: ExportConfig, schedule: ScheduledExport): void {
    // Calcular próxima execução
    const now = new Date();
    const next = new Date(now);

    switch (schedule.schedule) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + (schedule.scheduleDay || 0) - next.getDay() + 7);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        if (schedule.scheduleDay) {
          next.setDate(schedule.scheduleDay);
        }
        break;
      case 'QUARTERLY':
        next.setMonth(next.getMonth() + 3);
        break;
    }

    // Set time
    if (schedule.scheduleTime) {
      const [hours, minutes] = schedule.scheduleTime.split(':');
      next.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    }

    schedule.nextRun = next.toISOString();
  }
}

/**
 * Serviço de Cache de Exportação
 */
export class ExportCacheService {
  private static cache = new Map<string, { data: ExportData; timestamp: number }>();
  private static TTL = 3600000; // 1 hora

  static set(key: string, data: ExportData): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  static get(key: string): ExportData | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  static clear(): void {
    this.cache.clear();
  }

  static invalidate(key: string): void {
    this.cache.delete(key);
  }
}
