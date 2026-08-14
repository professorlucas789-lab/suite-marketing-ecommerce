/**
 * Testes para Fase 6: Sistema Multi-Loja
 * Fase 7: Exportação Avançada
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  ExportConfig,
  ExportData,
  ExportFormat,
  ExcelWorksheet,
} from '../types/export';
import { ExportService } from '../services/exportService';

describe('Multi-Store System - Fase 7: Exportação Avançada', () => {
  /**
   * Testes de Geração de JSON
   */
  describe('Exportação JSON', () => {
    let exportData: ExportData;

    beforeEach(() => {
      exportData = {
        title: 'Relatório Trimestral',
        generatedAt: new Date().toISOString(),
        generatedBy: 'admin@example.com',
        period: {
          start: '2024-01-01',
          end: '2024-03-31',
        },
        summary: {
          totalStores: 3,
          totalProducts: 250,
          totalUsers: 25,
          averageMargin: 35.5,
          totalStock: 5000,
          topPerformingStore: 'Farmácia Central',
          bottomPerformingStore: 'Loja Pequena',
          criticalAlerts: 0,
          securityIncidents: 2,
        },
        stores: [
          {
            id: 'store-1',
            name: 'Farmácia Central',
            type: 'farmacia',
            email: 'farm@example.com',
            phone: '212345678',
            address: 'Rua A, Lisboa',
            metrics: {
              totalProdutos: 150,
              totalUtilizadores: 15,
              precoMedio: 15.5,
              margemMedia: 38.0,
              valorStock: 3000,
            },
          },
        ],
      };
    });

    it('deve gerar JSON válido', () => {
      const json = ExportService.generateJSON(exportData);
      const parsed = JSON.parse(json);

      expect(parsed.title).toBe(exportData.title);
      expect(parsed.stores).toHaveLength(1);
    });

    it('deve incluir todas as seções', () => {
      const json = ExportService.generateJSON(exportData);
      expect(json).toContain('title');
      expect(json).toContain('summary');
      expect(json).toContain('stores');
      expect(json).toContain('generatedAt');
    });

    it('deve manter formatação correta', () => {
      const json = ExportService.generateJSON(exportData);
      const lines = json.split('\n');
      expect(lines.length).toBeGreaterThan(10);
    });
  });

  /**
   * Testes de Geração de CSV
   */
  describe('Exportação CSV', () => {
    let exportData: ExportData;

    beforeEach(() => {
      exportData = {
        title: 'Relatório Mensal',
        generatedAt: new Date().toISOString(),
        generatedBy: 'admin@example.com',
        period: {
          start: '2024-06-01',
          end: '2024-06-30',
        },
        summary: {
          totalStores: 2,
          totalProducts: 150,
          totalUsers: 20,
          averageMargin: 33.0,
          totalStock: 4000,
          topPerformingStore: 'Farmácia A',
          bottomPerformingStore: 'Loja B',
          criticalAlerts: 1,
          securityIncidents: 1,
        },
        stores: [
          {
            id: 'store-1',
            name: 'Farmácia Central',
            type: 'farmacia',
            email: 'farm@example.com',
            phone: '212345678',
            address: 'Rua A, Lisboa',
            metrics: {
              totalProdutos: 100,
              totalUtilizadores: 10,
              precoMedio: 15.0,
              margemMedia: 35.0,
              valorStock: 2500,
            },
          },
          {
            id: 'store-2',
            name: 'Loja Informática',
            type: 'informatica',
            email: 'info@example.com',
            phone: '212345679',
            address: 'Rua B, Lisboa',
            metrics: {
              totalProdutos: 50,
              totalUtilizadores: 10,
              precoMedio: 45.0,
              margemMedia: 31.0,
              valorStock: 1500,
            },
          },
        ],
      };
    });

    it('deve gerar CSV válido', () => {
      const csv = ExportService.generateCSV(exportData);
      const lines = csv.split('\n');

      expect(lines.length).toBeGreaterThan(5);
      expect(csv).toContain('Relatório Mensal');
    });

    it('deve incluir cabeçalhos e dados', () => {
      const csv = ExportService.generateCSV(exportData);
      expect(csv).toContain('Relatório Mensal');
      expect(csv).toContain('Nome,Tipo,Email');
    });

    it('deve escapar aspas corretamente', () => {
      const csv = ExportService.generateCSV(exportData);
      expect(csv).toContain('"');
    });
  });

  /**
   * Testes de Preparação Excel
   */
  describe('Exportação Excel (XLSX)', () => {
    let exportData: ExportData;

    beforeEach(() => {
      exportData = {
        title: 'Relatório Anual',
        generatedAt: new Date().toISOString(),
        generatedBy: 'admin@example.com',
        period: {
          start: '2024-01-01',
          end: '2024-12-31',
        },
        summary: {
          totalStores: 5,
          totalProducts: 500,
          totalUsers: 50,
          averageMargin: 36.0,
          totalStock: 10000,
          topPerformingStore: 'Loja Premium',
          bottomPerformingStore: 'Loja Pequena',
          criticalAlerts: 0,
          securityIncidents: 0,
        },
        stores: Array.from({ length: 5 }, (_, i) => ({
          id: `store-${i}`,
          name: `Loja ${i}`,
          type: 'farmacia',
          email: `loja${i}@example.com`,
          phone: '212345678',
          address: `Rua ${i}`,
          metrics: {
            totalProdutos: 100 + i * 10,
            totalUtilizadores: 10,
            precoMedio: 15.0,
            margemMedia: 35.0 + i,
            valorStock: 2000 + i * 100,
          },
          history: [
            {
              date: '2024-01-01',
              totalProdutos: 100,
              totalUtilizadores: 8,
              precoMedio: 14.5,
              margemMedia: 34.0,
              valorStock: 1800,
            },
            {
              date: '2024-12-31',
              totalProdutos: 100 + i * 10,
              totalUtilizadores: 10,
              precoMedio: 15.0,
              margemMedia: 35.0 + i,
              valorStock: 2000 + i * 100,
            },
          ],
        })),
      };
    });

    it('deve preparar worksheets para Excel', () => {
      const worksheets = ExportService.prepareExcelWorksheets(exportData);

      expect(worksheets.length).toBeGreaterThanOrEqual(3);
      expect(worksheets.some((w) => w.name === 'Sumário')).toBe(true);
      expect(worksheets.some((w) => w.name === 'Lojas')).toBe(true);
    });

    it('deve criar worksheet de sumário', () => {
      const worksheets = ExportService.prepareExcelWorksheets(exportData);
      const summary = worksheets.find((w) => w.name === 'Sumário');

      expect(summary).toBeDefined();
      expect(summary!.headers).toContain('Métrica');
      expect(summary!.data.length).toBeGreaterThan(5);
    });

    it('deve criar worksheet de lojas', () => {
      const worksheets = ExportService.prepareExcelWorksheets(exportData);
      const stores = worksheets.find((w) => w.name === 'Lojas');

      expect(stores).toBeDefined();
      expect(stores!.headers).toContain('Nome');
      expect(stores!.data.length).toBe(exportData.stores.length);
    });

    it('deve incluir freeze pane e autofilter', () => {
      const worksheets = ExportService.prepareExcelWorksheets(exportData);
      const stores = worksheets.find((w) => w.name === 'Lojas');

      expect(stores!.freezePane).toBe(1);
      expect(stores!.autoFilter).toBe(true);
    });
  });

  /**
   * Testes de Geração HTML/PDF
   */
  describe('Exportação PDF', () => {
    let exportData: ExportData;

    beforeEach(() => {
      exportData = {
        title: 'Relatório PDF',
        generatedAt: new Date().toISOString(),
        generatedBy: 'admin@example.com',
        period: {
          start: '2024-06-01',
          end: '2024-06-30',
        },
        summary: {
          totalStores: 1,
          totalProducts: 100,
          totalUsers: 10,
          averageMargin: 35.0,
          totalStock: 2500,
          topPerformingStore: 'Única Loja',
          bottomPerformingStore: 'Única Loja',
          criticalAlerts: 0,
          securityIncidents: 0,
        },
        stores: [
          {
            id: 'store-1',
            name: 'Farmácia Central',
            type: 'farmacia',
            email: 'farm@example.com',
            phone: '212345678',
            address: 'Rua A, Lisboa',
            metrics: {
              totalProdutos: 100,
              totalUtilizadores: 10,
              precoMedio: 15.0,
              margemMedia: 35.0,
              valorStock: 2500,
            },
          },
        ],
      };
    });

    it('deve gerar HTML para PDF', () => {
      const html = ExportService.generateHTMLForPDF(exportData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain(exportData.title);
      expect(html).toContain('<table>');
    });

    it('deve incluir CSS styling', () => {
      const html = ExportService.generateHTMLForPDF(exportData);

      expect(html).toContain('<style>');
      expect(html).toContain('font-family');
      expect(html).toContain('page-break-after');
    });

    it('deve formatar dados corretamente em HTML', () => {
      const html = ExportService.generateHTMLForPDF(exportData);

      expect(html).toContain('Sumário Executivo');
      expect(html).toContain('Lojas');
      expect(html).toContain(exportData.stores[0].name);
    });

    it('deve incluir alertas quando necessário', () => {
      const dataWithAlert = {
        ...exportData,
        summary: { ...exportData.summary, criticalAlerts: 5 },
      };

      const html = ExportService.generateHTMLForPDF(dataWithAlert);
      expect(html).toContain('Alertas Críticos');
      expect(html).toContain('5');
    });
  });

  /**
   * Testes de Configuração de Email
   */
  describe('Email com Anexos', () => {
    it('deve preparar email config', () => {
      const data: ExportData = {
        title: 'Relatório',
        generatedAt: new Date().toISOString(),
        generatedBy: 'admin@example.com',
        period: { start: '2024-01-01', end: '2024-12-31' },
        summary: {
          totalStores: 1,
          totalProducts: 100,
          totalUsers: 10,
          averageMargin: 35.0,
          totalStock: 2500,
          topPerformingStore: 'Loja',
          bottomPerformingStore: 'Loja',
          criticalAlerts: 0,
          securityIncidents: 0,
        },
        stores: [],
      };

      const email = ExportService.prepareEmailConfig(
        data,
        ['user@example.com'],
        'PDF',
        'relatorio.pdf'
      );

      expect(email.to).toContain('user@example.com');
      expect(email.subject).toContain(data.title);
      expect(email.attachments).toHaveLength(1);
    });

    it('deve suportar múltiplos destinatários', () => {
      const data: ExportData = {
        title: 'Relatório',
        generatedAt: new Date().toISOString(),
        generatedBy: 'admin@example.com',
        period: { start: '2024-01-01', end: '2024-12-31' },
        summary: {
          totalStores: 1,
          totalProducts: 100,
          totalUsers: 10,
          averageMargin: 35.0,
          totalStock: 2500,
          topPerformingStore: 'Loja',
          bottomPerformingStore: 'Loja',
          criticalAlerts: 0,
          securityIncidents: 0,
        },
        stores: [],
      };

      const recipients = ['user1@example.com', 'user2@example.com'];
      const email = ExportService.prepareEmailConfig(
        data,
        recipients,
        'XLSX',
        'relatorio.xlsx'
      );

      expect(email.to).toEqual(recipients);
    });
  });

  /**
   * Testes de Nomes de Arquivo
   */
  describe('Geração de Nomes de Arquivo', () => {
    it('deve gerar nome de arquivo válido', () => {
      const fileName = ExportService.generateFileName('Relatório Mensal', 'PDF');

      expect(fileName).toContain('mensal');
      expect(fileName).toContain('.pdf');
      expect(fileName).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('deve remover caracteres especiais', () => {
      const fileName = ExportService.generateFileName('Relatório @#$% Especial!', 'CSV');

      expect(fileName).not.toContain('@');
      expect(fileName).not.toContain('#');
      expect(fileName).not.toContain('$');
    });

    it('deve converter para minúsculas', () => {
      const fileName = ExportService.generateFileName('RELATÓRIO MAIÚSCULA', 'JSON');

      expect(fileName).toBe(fileName.toLowerCase());
    });
  });

  /**
   * Testes de Validação
   */
  describe('Validação de Configuração', () => {
    it('deve validar nome obrigatório', () => {
      const config: ExportConfig = {
        id: 'export-1',
        name: '',
        format: 'PDF',
        title: 'Título',
        storeIds: ['store-1'],
        dateRange: { startDate: '2024-01-01', endDate: '2024-12-31' },
        metrics: ['totalProdutos'],
        includeCharts: true,
        includeTimeline: true,
        fileName: 'test.pdf',
        createdAt: new Date().toISOString(),
        createdBy: 'admin',
        status: 'PENDING',
      };

      const errors = ExportService.validateExportConfig(config);
      expect(errors).toContain('Nome da exportação é obrigatório');
    });

    it('deve validar formato válido', () => {
      const config: ExportConfig = {
        id: 'export-1',
        name: 'Test',
        format: 'INVALID' as ExportFormat,
        title: 'Título',
        storeIds: ['store-1'],
        dateRange: { startDate: '2024-01-01', endDate: '2024-12-31' },
        metrics: ['totalProdutos'],
        includeCharts: true,
        includeTimeline: true,
        fileName: 'test.pdf',
        createdAt: new Date().toISOString(),
        createdBy: 'admin',
        status: 'PENDING',
      };

      const errors = ExportService.validateExportConfig(config);
      expect(errors.some((e) => e.includes('Formato'))).toBe(true);
    });

    it('deve validar seleção de lojas', () => {
      const config: ExportConfig = {
        id: 'export-1',
        name: 'Test',
        format: 'PDF',
        title: 'Título',
        storeIds: [],
        dateRange: { startDate: '2024-01-01', endDate: '2024-12-31' },
        metrics: ['totalProdutos'],
        includeCharts: true,
        includeTimeline: true,
        fileName: 'test.pdf',
        createdAt: new Date().toISOString(),
        createdBy: 'admin',
        status: 'PENDING',
      };

      const errors = ExportService.validateExportConfig(config);
      expect(errors).toContain('Selecione pelo menos uma loja');
    });

    it('deve validar intervalo de datas', () => {
      const config: ExportConfig = {
        id: 'export-1',
        name: 'Test',
        format: 'PDF',
        title: 'Título',
        storeIds: ['store-1'],
        dateRange: { startDate: '2024-12-31', endDate: '2024-01-01' },
        metrics: ['totalProdutos'],
        includeCharts: true,
        includeTimeline: true,
        fileName: 'test.pdf',
        createdAt: new Date().toISOString(),
        createdBy: 'admin',
        status: 'PENDING',
      };

      const errors = ExportService.validateExportConfig(config);
      expect(errors).toContain('Data de início não pode ser maior que data de fim');
    });
  });

  /**
   * Testes de Estimativa de Tamanho
   */
  describe('Estimativa de Tamanho de Arquivo', () => {
    let exportData: ExportData;

    beforeEach(() => {
      exportData = {
        title: 'Relatório',
        generatedAt: new Date().toISOString(),
        generatedBy: 'admin@example.com',
        period: { start: '2024-01-01', end: '2024-12-31' },
        summary: {
          totalStores: 10,
          totalProducts: 1000,
          totalUsers: 100,
          averageMargin: 35.0,
          totalStock: 50000,
          topPerformingStore: 'Loja A',
          bottomPerformingStore: 'Loja Z',
          criticalAlerts: 0,
          securityIncidents: 0,
        },
        stores: Array.from({ length: 10 }, (_, i) => ({
          id: `store-${i}`,
          name: `Loja ${i}`,
          type: 'farmacia',
          email: `loja${i}@example.com`,
          phone: '212345678',
          address: `Rua ${i}`,
          metrics: {
            totalProdutos: 100,
            totalUtilizadores: 10,
            precoMedio: 15.0,
            margemMedia: 35.0,
            valorStock: 5000,
          },
        })),
      };
    });

    it('deve estimar tamanho para JSON', () => {
      const size = ExportService.estimateFileSize(exportData, 'JSON');
      expect(size).toBeGreaterThan(0);
    });

    it('deve estimar CSV menor que JSON', () => {
      const jsonSize = ExportService.estimateFileSize(exportData, 'JSON');
      const csvSize = ExportService.estimateFileSize(exportData, 'CSV');

      expect(csvSize).toBeLessThan(jsonSize);
    });

    it('deve estimar XLSX comprimido', () => {
      const jsonSize = ExportService.estimateFileSize(exportData, 'JSON');
      const xlsxSize = ExportService.estimateFileSize(exportData, 'XLSX');

      expect(xlsxSize).toBeLessThan(jsonSize);
    });

    it('deve estimar PDF maior que JSON (com formatação)', () => {
      const jsonSize = ExportService.estimateFileSize(exportData, 'JSON');
      const pdfSize = ExportService.estimateFileSize(exportData, 'PDF');

      expect(pdfSize).toBeGreaterThan(jsonSize);
    });
  });

  /**
   * Testes de Content-Type
   */
  describe('Content-Type Correto', () => {
    it('deve retornar content-type para PDF', () => {
      const type = ExportService.getContentType('PDF');
      expect(type).toBe('application/pdf');
    });

    it('deve retornar content-type para XLSX', () => {
      const type = ExportService.getContentType('XLSX');
      expect(type).toContain('spreadsheetml');
    });

    it('deve retornar content-type para CSV', () => {
      const type = ExportService.getContentType('CSV');
      expect(type).toBe('text/csv');
    });

    it('deve retornar content-type para JSON', () => {
      const type = ExportService.getContentType('JSON');
      expect(type).toBe('application/json');
    });
  });
});
