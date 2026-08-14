import { describe, it, expect } from 'vitest';

/**
 * Batch Calculations Tests - Fase 3: Cadastro em Lote
 * Tests for rateio (cost distribution) logic across multiple products
 */

describe('Batch Calculations - Rateio Distribution', () => {
  describe('Quantity-based rateio (rateio por quantidade)', () => {
    it('should distribute additional costs equally by quantity', () => {
      /**
       * Cenário:
       * - 3 products with total quantity 10
       * - Product 1: qty=5, Product 2: qty=3, Product 3: qty=2
       * - Additional cost (transporte+embalagem+outros) = 100
       * - Should distribute proportionally by quantity
       */

      const products = [
        { nome: 'Product A', quantidade: 5, basePrice: 10 },
        { nome: 'Product B', quantidade: 3, basePrice: 20 },
        { nome: 'Product C', quantidade: 2, basePrice: 15 },
      ];

      const totalQuantidade = products.reduce((sum, p) => sum + p.quantidade, 0);
      const custoAdicionalTotal = 100;

      const result = products.map((product) => {
        const rateioPorQuantidade = (product.quantidade / totalQuantidade) * custoAdicionalTotal;
        return {
          nome: product.nome,
          quantidade: product.quantidade,
          custoAdicionalRateado: rateioPorQuantidade,
        };
      });

      // Product A: (5/10) * 100 = 50
      expect(result[0].custoAdicionalRateado).toBeCloseTo(50, 2);
      // Product B: (3/10) * 100 = 30
      expect(result[1].custoAdicionalRateado).toBeCloseTo(30, 2);
      // Product C: (2/10) * 100 = 20
      expect(result[2].custoAdicionalRateado).toBeCloseTo(20, 2);

      // Total should equal the original
      const totalRateado = result.reduce((sum, r) => sum + r.custoAdicionalRateado, 0);
      expect(totalRateado).toBeCloseTo(custoAdicionalTotal, 2);
    });

    it('should handle single product', () => {
      const product = { quantidade: 1 };
      const custoAdicional = 50;

      const rateio = (product.quantidade / product.quantidade) * custoAdicional;

      expect(rateio).toBeCloseTo(50, 2);
    });

    it('should handle unequal quantities', () => {
      const products = [
        { quantidade: 1 },
        { quantidade: 10 },
        { quantidade: 100 },
      ];

      const totalQuantidade = 111;
      const custoAdicional = 333; // Interesting number for testing

      const result = products.map((p) => ({
        quantidade: p.quantidade,
        rateio: (p.quantidade / totalQuantidade) * custoAdicional,
      }));

      expect(result[0].rateio).toBeCloseTo(3, 2);
      expect(result[1].rateio).toBeCloseTo(30, 2);
      expect(result[2].rateio).toBeCloseTo(300, 2);

      const total = result.reduce((sum, r) => sum + r.rateio, 0);
      expect(total).toBeCloseTo(333, 2);
    });
  });

  describe('Cost-based rateio (rateio por custo)', () => {
    it('should distribute additional costs proportionally by product cost', () => {
      /**
       * Cenário:
       * - 3 products with different costs
       * - Product 1: cost=100, Product 2: cost=200, Product 3: cost=300
       * - Total cost = 600
       * - Additional cost = 60 (10% of total)
       * - Should distribute proportionally
       */

      const products = [
        { nome: 'Product A', custoBase: 100 },
        { nome: 'Product B', custoBase: 200 },
        { nome: 'Product C', custoBase: 300 },
      ];

      const custoBaseTotal = products.reduce((sum, p) => sum + p.custoBase, 0);
      const custoAdicionalTotal = 60;

      const result = products.map((product) => {
        const rateioPorCusto = (product.custoBase / custoBaseTotal) * custoAdicionalTotal;
        return {
          nome: product.nome,
          custoBase: product.custoBase,
          custoAdicionalRateado: rateioPorCusto,
        };
      });

      // Product A: (100/600) * 60 = 10
      expect(result[0].custoAdicionalRateado).toBeCloseTo(10, 2);
      // Product B: (200/600) * 60 = 20
      expect(result[1].custoAdicionalRateado).toBeCloseTo(20, 2);
      // Product C: (300/600) * 60 = 30
      expect(result[2].custoAdicionalRateado).toBeCloseTo(30, 2);

      const totalRateado = result.reduce((sum, r) => sum + r.custoAdicionalRateado, 0);
      expect(totalRateado).toBeCloseTo(custoAdicionalTotal, 2);
    });

    it('should handle equal costs', () => {
      const products = [
        { custoBase: 100 },
        { custoBase: 100 },
        { custoBase: 100 },
      ];

      const custoBaseTotal = 300;
      const custoAdicional = 30;

      const result = products.map((p) => ({
        custoBase: p.custoBase,
        rateio: (p.custoBase / custoBaseTotal) * custoAdicional,
      }));

      // Each should get 10
      result.forEach((r) => {
        expect(r.rateio).toBeCloseTo(10, 2);
      });

      const total = result.reduce((sum, r) => sum + r.rateio, 0);
      expect(total).toBeCloseTo(30, 2);
    });

    it('should handle zero cost product', () => {
      const products = [
        { custoBase: 0 },
        { custoBase: 100 },
      ];

      const custoBaseTotal = 100;
      const custoAdicional = 50;

      const result = products.map((p) => ({
        custoBase: p.custoBase,
        rateio: custoBaseTotal > 0 ? (p.custoBase / custoBaseTotal) * custoAdicional : 0,
      }));

      expect(result[0].rateio).toBeCloseTo(0, 2);
      expect(result[1].rateio).toBeCloseTo(50, 2);
    });
  });

  describe('Distribution across multiple cost types', () => {
    it('should split additional costs equally across three cost types', () => {
      /**
       * Cenário (from BatchProductForm):
       * - custoAdicionalRateado = 100
       * - Should distribute equally to: transporte, embalagem, outros
       */

      const custoAdicionalRateado = 100;

      const custoTransporteUnit = custoAdicionalRateado / 3;
      const custoEmbalagemUnit = custoAdicionalRateado / 3;
      const outrosCustosUnit = custoAdicionalRateado / 3;

      expect(custoTransporteUnit).toBeCloseTo(33.33, 2);
      expect(custoEmbalagemUnit).toBeCloseTo(33.33, 2);
      expect(outrosCustosUnit).toBeCloseTo(33.33, 2);

      const total = custoTransporteUnit + custoEmbalagemUnit + outrosCustosUnit;
      expect(total).toBeCloseTo(100, 2);
    });

    it('should handle odd distribution values', () => {
      const custoAdicionalRateado = 100;

      const custoTransporteUnit = Math.round((custoAdicionalRateado / 3) * 100) / 100;
      const custoEmbalagemUnit = Math.round((custoAdicionalRateado / 3) * 100) / 100;
      const outrosCustosUnit = custoAdicionalRateado - custoTransporteUnit - custoEmbalagemUnit;

      expect(custoTransporteUnit).toBeCloseTo(33.33, 2);
      expect(custoEmbalagemUnit).toBeCloseTo(33.33, 2);
      expect(outrosCustosUnit).toBeCloseTo(33.34, 2);

      const total = custoTransporteUnit + custoEmbalagemUnit + outrosCustosUnit;
      expect(total).toBeCloseTo(100, 2);
    });
  });

  describe('Validation and edge cases', () => {
    it('should validate non-negative quantities', () => {
      const validateQuantities = (products: any[]) => {
        return products.every((p) => p.quantidade > 0);
      };

      const validProducts = [
        { quantidade: 1 },
        { quantidade: 10 },
      ];

      const invalidProducts = [
        { quantidade: 0 },
        { quantidade: 10 },
      ];

      expect(validateQuantities(validProducts)).toBe(true);
      expect(validateQuantities(invalidProducts)).toBe(false);
    });

    it('should validate non-negative costs', () => {
      const validateCosts = (products: any[]) => {
        return products.every((p) => p.custoBase >= 0);
      };

      const validProducts = [
        { custoBase: 0 },
        { custoBase: 100 },
      ];

      const invalidProducts = [
        { custoBase: -10 },
        { custoBase: 100 },
      ];

      expect(validateCosts(validProducts)).toBe(true);
      expect(validateCosts(invalidProducts)).toBe(false);
    });

    it('should validate non-negative additional costs', () => {
      const validateAdditionalCosts = (custo: number) => {
        return custo >= 0;
      };

      expect(validateAdditionalCosts(0)).toBe(true);
      expect(validateAdditionalCosts(100)).toBe(true);
      expect(validateAdditionalCosts(-10)).toBe(false);
    });

    it('should handle large batch (100+ products)', () => {
      const productCount = 150;
      const products = Array.from({ length: productCount }, (_, i) => ({
        quantidade: Math.floor(Math.random() * 100) + 1,
        custoBase: Math.floor(Math.random() * 1000) + 10,
      }));

      const totalQuantidade = products.reduce((sum, p) => sum + p.quantidade, 0);
      const custoAdicional = 5000;

      const result = products.map((p) => ({
        quantidade: p.quantidade,
        rateio: (p.quantidade / totalQuantidade) * custoAdicional,
      }));

      const totalRateio = result.reduce((sum, r) => sum + r.rateio, 0);

      expect(result.length).toBe(productCount);
      expect(totalRateio).toBeCloseTo(custoAdicional, 1);
    });

    it('should handle very small costs (centavos)', () => {
      const products = [
        { quantidade: 5 },
        { quantidade: 5 },
      ];

      const custoAdicional = 0.01; // 1 centavo

      const result = products.map((p) => ({
        quantidade: p.quantidade,
        rateio: (p.quantidade / 10) * custoAdicional,
      }));

      expect(result[0].rateio).toBeCloseTo(0.005, 4);
      expect(result[1].rateio).toBeCloseTo(0.005, 4);

      const total = result.reduce((sum, r) => sum + r.rateio, 0);
      expect(total).toBeCloseTo(0.01, 4);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle typical batch registration scenario', () => {
      /**
       * Realistic scenario:
       * - Buy 10 boxes of Product A (qty 5 per box = 50 units)
       * - Buy 5 boxes of Product B (qty 10 per box = 50 units)
       * - Buy 3 boxes of Product C (qty 20 per box = 60 units)
       * - Total: 160 units
       * - Transporte total: R$ 500
       * - Embalagem total: R$ 200
       * - Outros: R$ 100
       * - Total adicional: R$ 800
       */

      const products = [
        { nome: 'Product A', quantidade: 50 },
        { nome: 'Product B', quantidade: 50 },
        { nome: 'Product C', quantidade: 60 },
      ];

      const totalQty = 160;
      const custoAdicional = 800;

      const result = products.map((p) => ({
        nome: p.nome,
        quantidade: p.quantidade,
        rateio: (p.quantidade / totalQty) * custoAdicional,
        pctDistribuicao: (p.quantidade / totalQty) * 100,
      }));

      // Product A: 50/160 * 800 = 250
      expect(result[0].rateio).toBeCloseTo(250, 2);
      // Product B: 50/160 * 800 = 250
      expect(result[1].rateio).toBeCloseTo(250, 2);
      // Product C: 60/160 * 800 = 300
      expect(result[2].rateio).toBeCloseTo(300, 2);

      const total = result.reduce((sum, r) => sum + r.rateio, 0);
      expect(total).toBeCloseTo(800, 2);
    });

    it('should calculate final product costs with rateio', () => {
      /**
       * Scenario:
       * Product data with rateio application
       * - Base cost: 100
       * - Rateio share: 50
       * - Total: 150
       */

      const product = {
        nome: 'Test Product',
        custoBase: 100,
        custoAdicionalRateado: 50,
        margemDesejada: 20,
      };

      const custoTotal = product.custoBase + product.custoAdicionalRateado;
      const precoRecomendado = custoTotal / (1 - product.margemDesejada / 100);
      const lucroEstimado = precoRecomendado - custoTotal;

      expect(custoTotal).toBeCloseTo(150, 2);
      expect(precoRecomendado).toBeCloseTo(187.5, 2); // 150 / 0.8
      expect(lucroEstimado).toBeCloseTo(37.5, 2);
    });
  });
});
