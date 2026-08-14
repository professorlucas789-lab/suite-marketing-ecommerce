import { describe, it, expect } from 'vitest';
import {
  calculatePackageConversion,
  PackageConversionData,
  getPackageOptions,
} from './packageConversionCalculator';

describe('Package Conversion Calculator - Fase 4', () => {
  describe('calculatePackageConversion - Selling whole package', () => {
    it('should calculate correctly when selling whole package', () => {
      const data: PackageConversionData = {
        custoCompra: 100, // Cost per package
        quantidade: 10, // 10 packages bought
        unidadeCompra: 'caixa',
        unidadeVenda: 'caixa',
        unidadesInternas: 50, // 50 units per package
        venderEmbalagemInteira: true, // Sell whole package
        margemDesejada: 20,
        precoVendaRecomendado: 120, // Already calculated price
      };

      const result = calculatePackageConversion(data);

      // Cost per unit: 100 / 50 = 2
      expect(result.custoRealUnidadeVenda).toBeCloseTo(2, 2);

      // Price per unit when selling whole: 120 / 50 = 2.4
      expect(result.precoRecomendadoUnidadeVenda).toBeCloseTo(2.4, 2);

      // Profit per unit: 2.4 - 2 = 0.4
      expect(result.lucroUnidadeVenda).toBeCloseTo(0.4, 2);

      // Total units: 10 packages * 50 units = 500 units
      expect(result.totalUnidadesVendaveis).toBe(500);

      // Total expected revenue: 2.4 * 500 = 1200
      expect(result.receitaTotalEsperada).toBeCloseTo(1200, 2);

      // Total expected profit: 1200 - (100 * 10) = 200
      expect(result.lucroTotalEsperado).toBeCloseTo(200, 2);

      expect(result.isValid).toBe(true);
    });
  });

  describe('calculatePackageConversion - Selling individual units', () => {
    it('should calculate correctly when selling individual units', () => {
      const data: PackageConversionData = {
        custoCompra: 100, // Cost per package
        quantidade: 1, // 1 package bought
        unidadeCompra: 'caixa',
        unidadeVenda: 'unidade',
        unidadesInternas: 50, // 50 units per package
        venderEmbalagemInteira: false, // Sell individual units
        margemDesejada: 20, // 20% margin per unit
        precoVendaRecomendado: 120, // Price calculated for whole package
      };

      const result = calculatePackageConversion(data);

      // Cost per unit: 100 / 50 = 2
      expect(result.custoRealUnidadeVenda).toBeCloseTo(2, 2);

      // Price per unit with 20% margin: 2 * 1.2 = 2.4
      expect(result.precoRecomendadoUnidadeVenda).toBeCloseTo(2.4, 2);

      // Total units available: 1 * 50 = 50
      expect(result.totalUnidadesVendaveis).toBe(50);

      // Total revenue: 2.4 * 50 = 120
      expect(result.receitaTotalEsperada).toBeCloseTo(120, 2);

      // Total profit: 120 - 100 = 20
      expect(result.lucroTotalEsperado).toBeCloseTo(20, 2);

      // Margin per unit: (0.4 / 2) * 100 = 20%
      expect(result.margemUnidadeVenda).toBeCloseTo(20, 1);

      expect(result.isValid).toBe(true);
    });

    it('should calculate margin correctly for individual units', () => {
      const data: PackageConversionData = {
        custoCompra: 100,
        quantidade: 1,
        unidadeCompra: 'caixa',
        unidadeVenda: 'unidade',
        unidadesInternas: 50,
        venderEmbalagemInteira: false,
        margemDesejada: 50, // 50% margin
        precoVendaRecomendado: 100,
      };

      const result = calculatePackageConversion(data);

      // Cost per unit: 2
      // Price per unit with 50% margin: 2 * 1.5 = 3
      expect(result.precoRecomendadoUnidadeVenda).toBeCloseTo(3, 2);

      // Margin: (1 / 2) * 100 = 50%
      expect(result.margemUnidadeVenda).toBeCloseTo(50, 1);

      // Total margin: (50 / 100) * 100 = 50%
      expect(result.margemTotalEsperada).toBeCloseTo(50, 1);
    });
  });

  describe('Input validation', () => {
    it('should validate positive quantity', () => {
      const data: PackageConversionData = {
        custoCompra: 100,
        quantidade: 0, // Invalid!
        unidadeCompra: 'caixa',
        unidadeVenda: 'unidade',
        unidadesInternas: 50,
        venderEmbalagemInteira: true,
        margemDesejada: 20,
        precoVendaRecomendado: 100,
      };

      const result = calculatePackageConversion(data);

      expect(result.isValid).toBe(false);
      expect(result.validationMessages).toContain('Quantidade deve ser maior que 0');
    });

    it('should validate positive unidadesInternas', () => {
      const data: PackageConversionData = {
        custoCompra: 100,
        quantidade: 1,
        unidadeCompra: 'caixa',
        unidadeVenda: 'unidade',
        unidadesInternas: 0, // Invalid!
        venderEmbalagemInteira: true,
        margemDesejada: 20,
        precoVendaRecomendado: 100,
      };

      const result = calculatePackageConversion(data);

      expect(result.isValid).toBe(false);
      expect(result.validationMessages).toContain('Unidades por embalagem deve ser maior que 0');
    });

    it('should validate non-negative cost', () => {
      const data: PackageConversionData = {
        custoCompra: -10, // Invalid!
        quantidade: 1,
        unidadeCompra: 'caixa',
        unidadeVenda: 'unidade',
        unidadesInternas: 50,
        venderEmbalagemInteira: true,
        margemDesejada: 20,
        precoVendaRecomendado: 100,
      };

      const result = calculatePackageConversion(data);

      expect(result.isValid).toBe(false);
      expect(result.validationMessages).toContain('Custo de compra não pode ser negativo');
    });

    it('should validate margin range (0-100%)', () => {
      const dataBelowZero: PackageConversionData = {
        custoCompra: 100,
        quantidade: 1,
        unidadeCompra: 'caixa',
        unidadeVenda: 'unidade',
        unidadesInternas: 50,
        venderEmbalagemInteira: true,
        margemDesejada: -10, // Invalid!
        precoVendaRecomendado: 100,
      };

      const resultBelowZero = calculatePackageConversion(dataBelowZero);
      expect(resultBelowZero.isValid).toBe(false);
      expect(resultBelowZero.validationMessages).toContain('Margem desejada deve estar entre 0% e 100%');

      const dataAbove100: PackageConversionData = {
        custoCompra: 100,
        quantidade: 1,
        unidadeCompra: 'caixa',
        unidadeVenda: 'unidade',
        unidadesInternas: 50,
        venderEmbalagemInteira: true,
        margemDesejada: 150, // Invalid!
        precoVendaRecomendado: 100,
      };

      const resultAbove100 = calculatePackageConversion(dataAbove100);
      expect(resultAbove100.isValid).toBe(false);
      expect(resultAbove100.validationMessages).toContain('Margem desejada deve estar entre 0% e 100%');
    });

    it('should report multiple validation errors', () => {
      const data: PackageConversionData = {
        custoCompra: -10,
        quantidade: 0,
        unidadeCompra: 'caixa',
        unidadeVenda: 'unidade',
        unidadesInternas: 0,
        venderEmbalagemInteira: true,
        margemDesejada: 150,
        precoVendaRecomendado: 100,
      };

      const result = calculatePackageConversion(data);

      expect(result.isValid).toBe(false);
      expect(result.validationMessages.length).toBeGreaterThan(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero margin', () => {
      const data: PackageConversionData = {
        custoCompra: 100,
        quantidade: 1,
        unidadeCompra: 'caixa',
        unidadeVenda: 'unidade',
        unidadesInternas: 50,
        venderEmbalagemInteira: false,
        margemDesejada: 0, // No margin
        precoVendaRecomendado: 100,
      };

      const result = calculatePackageConversion(data);

      // Cost per unit: 2
      // Price: 2 * 1 = 2
      expect(result.precoRecomendadoUnidadeVenda).toBeCloseTo(2, 2);
      expect(result.lucroUnidadeVenda).toBeCloseTo(0, 2);
      expect(result.margemUnidadeVenda).toBeCloseTo(0, 1);

      expect(result.isValid).toBe(true);
    });

    it('should handle 100% margin', () => {
      const data: PackageConversionData = {
        custoCompra: 100,
        quantidade: 1,
        unidadeCompra: 'caixa',
        unidadeVenda: 'unidade',
        unidadesInternas: 50,
        venderEmbalagemInteira: false,
        margemDesejada: 100, // 100% margin
        precoVendaRecomendado: 100,
      };

      const result = calculatePackageConversion(data);

      // Cost per unit: 2
      // Price: 2 * 2 = 4
      expect(result.precoRecomendadoUnidadeVenda).toBeCloseTo(4, 2);
      expect(result.lucroUnidadeVenda).toBeCloseTo(2, 2);
      expect(result.margemUnidadeVenda).toBeCloseTo(100, 1);

      expect(result.isValid).toBe(true);
    });

    it('should handle very small units per package', () => {
      const data: PackageConversionData = {
        custoCompra: 100,
        quantidade: 1,
        unidadeCompra: 'caixa',
        unidadeVenda: 'g',
        unidadesInternas: 1, // 1 unit per package
        venderEmbalagemInteira: false,
        margemDesejada: 20,
        precoVendaRecomendado: 100,
      };

      const result = calculatePackageConversion(data);

      // Cost per unit: 100 / 1 = 100
      expect(result.custoRealUnidadeVenda).toBeCloseTo(100, 2);
      // Price per unit: 100 * 1.2 = 120
      expect(result.precoRecomendadoUnidadeVenda).toBeCloseTo(120, 2);
      // Total units: 1
      expect(result.totalUnidadesVendaveis).toBe(1);

      expect(result.isValid).toBe(true);
    });

    it('should handle very large units per package', () => {
      const data: PackageConversionData = {
        custoCompra: 1000,
        quantidade: 1,
        unidadeCompra: 'saco',
        unidadeVenda: 'unidade',
        unidadesInternas: 10000, // 10,000 units per package
        venderEmbalagemInteira: false,
        margemDesejada: 20,
        precoVendaRecomendado: 1000,
      };

      const result = calculatePackageConversion(data);

      // Cost per unit: 1000 / 10000 = 0.1
      expect(result.custoRealUnidadeVenda).toBeCloseTo(0.1, 3);
      // Price per unit: 0.1 * 1.2 = 0.12
      expect(result.precoRecomendadoUnidadeVenda).toBeCloseTo(0.12, 3);
      // Total units: 10000
      expect(result.totalUnidadesVendaveis).toBe(10000);

      expect(result.isValid).toBe(true);
    });

    it('should handle small cost values (centavos)', () => {
      const data: PackageConversionData = {
        custoCompra: 0.50, // 50 centavos
        quantidade: 1,
        unidadeCompra: 'pacote',
        unidadeVenda: 'unidade',
        unidadesInternas: 10,
        venderEmbalagemInteira: false,
        margemDesejada: 50,
        precoVendaRecomendado: 0.50,
      };

      const result = calculatePackageConversion(data);

      // Cost per unit: 0.50 / 10 = 0.05
      expect(result.custoRealUnidadeVenda).toBeCloseTo(0.05, 2);
      // Price per unit: 0.05 * 1.5 = 0.075 (but rounded to 0.08)
      expect(result.precoRecomendadoUnidadeVenda).toBeCloseTo(0.08, 2);

      expect(result.isValid).toBe(true);
    });

    it('should handle multiple packages', () => {
      const data: PackageConversionData = {
        custoCompra: 100,
        quantidade: 100, // 100 packages
        unidadeCompra: 'caixa',
        unidadeVenda: 'unidade',
        unidadesInternas: 50,
        venderEmbalagemInteira: false,
        margemDesejada: 20,
        precoVendaRecomendado: 120,
      };

      const result = calculatePackageConversion(data);

      // Cost per unit: 2
      // Total units: 100 * 50 = 5000
      expect(result.totalUnidadesVendaveis).toBe(5000);
      // Total cost: 100 * 100 = 10000
      // Total revenue: 2.4 * 5000 = 12000
      expect(result.receitaTotalEsperada).toBeCloseTo(12000, 2);
      // Total profit: 12000 - 10000 = 2000
      expect(result.lucroTotalEsperado).toBeCloseTo(2000, 2);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle pharmacy product (selling by unit)', () => {
      /**
       * Scenario: Buy 5 boxes of medicine
       * - Cost per box: 50
       * - Units per box: 30 tablets
       * - Want to sell individual tablets with 40% margin
       */
      const data: PackageConversionData = {
        custoCompra: 50,
        quantidade: 5,
        unidadeCompra: 'caixa',
        unidadeVenda: 'comprimido',
        unidadesInternas: 30,
        venderEmbalagemInteira: false,
        margemDesejada: 40,
        precoVendaRecomendado: 50,
      };

      const result = calculatePackageConversion(data);

      // Cost per tablet: 50 / 30 = 1.67
      expect(result.custoRealUnidadeVenda).toBeCloseTo(1.67, 2);
      // Price per tablet: 1.67 * 1.4 = 2.33
      expect(result.precoRecomendadoUnidadeVenda).toBeCloseTo(2.33, 2);
      // Total tablets: 5 * 30 = 150
      expect(result.totalUnidadesVendaveis).toBe(150);
      // Total revenue: 2.33 * 150 ≈ 350
      expect(result.receitaTotalEsperada).toBeCloseTo(350, 0);

      expect(result.isValid).toBe(true);
    });

    it('should handle food product (selling by unit)', () => {
      /**
       * Scenario: Buy 10 sacks of rice
       * - Cost per sack: 200
       * - Weight per sack: 25 kg
       * - Sell individual units (kg) with 25% margin
       */
      const data: PackageConversionData = {
        custoCompra: 200,
        quantidade: 10,
        unidadeCompra: 'saco',
        unidadeVenda: 'kg',
        unidadesInternas: 25,
        venderEmbalagemInteira: false,
        margemDesejada: 25,
        precoVendaRecomendado: 200,
      };

      const result = calculatePackageConversion(data);

      // Cost per kg: 200 / 25 = 8
      expect(result.custoRealUnidadeVenda).toBeCloseTo(8, 2);
      // Price per kg: 8 * 1.25 = 10
      expect(result.precoRecomendadoUnidadeVenda).toBeCloseTo(10, 2);
      // Total kg: 10 * 25 = 250 kg
      expect(result.totalUnidadesVendaveis).toBe(250);
      // Total revenue: 10 * 250 = 2500
      expect(result.receitaTotalEsperada).toBeCloseTo(2500, 2);
      // Total profit: 2500 - 2000 = 500
      expect(result.lucroTotalEsperado).toBeCloseTo(500, 2);

      expect(result.isValid).toBe(true);
    });
  });

  describe('getPackageOptions', () => {
    it('should return pharmacy options for pharmacy products', () => {
      const options = getPackageOptions('farmácia');

      expect(options.compra).toContain('caixa');
      expect(options.compra).toContain('blister');
      expect(options.venda).toContain('comprimido');
      expect(options.venda).toContain('cápsula');
    });

    it('should return food options for food products', () => {
      const options = getPackageOptions('alimentos');

      expect(options.compra).toContain('caixa');
      expect(options.compra).toContain('kg');
      expect(options.venda).toContain('unidade');
      expect(options.venda).toContain('g');
    });

    it('should return cosmetic options for cosmetic products', () => {
      const options = getPackageOptions('cosméticos');

      expect(options.compra).toContain('caixa');
      expect(options.compra).toContain('frasco');
      expect(options.venda).toContain('ml');
    });

    it('should return common options for unknown products', () => {
      const options = getPackageOptions('unknown');

      expect(options.compra).toContain('unidade');
      expect(options.compra).toContain('caixa');
      expect(options.venda).toContain('unidade');
    });

    it('should be case-insensitive', () => {
      const options1 = getPackageOptions('FARMÁCIA');
      const options2 = getPackageOptions('farmácia');
      const options3 = getPackageOptions('FaRmÁcIa');

      expect(options1.compra).toEqual(options2.compra);
      expect(options2.compra).toEqual(options3.compra);
    });
  });
});
