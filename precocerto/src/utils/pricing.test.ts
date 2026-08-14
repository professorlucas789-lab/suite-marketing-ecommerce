import { describe, it, expect } from 'vitest';
import {
  calculateProductFields,
  getPriceHealth,
  evaluateAlternativePrice,
  CalculationInput,
} from './pricing';

describe('Pricing Utils - calculateProductFields', () => {
  describe('Basic calculation with default quantity=1', () => {
    it('should calculate price with simple costs', () => {
      const input: CalculationInput = {
        custoCompra: 100,
        custoTransporte: 10,
        custoEmbalagem: 5,
        outrosCustos: 5,
        margemDesejada: 20,
      };

      const result = calculateProductFields(input);

      expect(result.custoBase).toBeCloseTo(120, 2);
      expect(result.custoTotalReal).toBeCloseTo(120, 2);
      expect(result.precoVendaRecomendado).toBeCloseTo(150, 2); // 120 / (1 - 0.2)
      expect(result.lucroEstimado).toBeCloseTo(30, 2); // 150 - 120
      expect(result.margemReal).toBeCloseTo(20, 1);
    });

    it('should handle margin of 0% (no profit)', () => {
      const input: CalculationInput = {
        custoCompra: 100,
        custoTransporte: 0,
        custoEmbalagem: 0,
        outrosCustos: 0,
        margemDesejada: 0,
      };

      const result = calculateProductFields(input);

      expect(result.precoVendaRecomendado).toBeCloseTo(100, 2);
      expect(result.lucroEstimado).toBeCloseTo(0, 2);
      expect(result.margemReal).toBeCloseTo(0, 1);
    });

    it('should handle high margin (50%)', () => {
      const input: CalculationInput = {
        custoCompra: 100,
        custoTransporte: 0,
        custoEmbalagem: 0,
        outrosCustos: 0,
        margemDesejada: 50,
      };

      const result = calculateProductFields(input);

      expect(result.precoVendaRecomendado).toBeCloseTo(200, 2); // 100 / 0.5
      expect(result.lucroEstimado).toBeCloseTo(100, 2);
      expect(result.margemReal).toBeCloseTo(50, 1);
    });

    it('should calculate with variable costs', () => {
      const input: CalculationInput = {
        custoCompra: 100,
        custoTransporte: 10,
        custoEmbalagem: 5,
        outrosCustos: 5,
        comissaoVenda: 10,
        taxaBancaria: 5,
        margemDesejada: 20,
      };

      const result = calculateProductFields(input);

      // Total cost = 100 + 10 + 5 + 5 + 10 + 5 = 135
      expect(result.custoTotalReal).toBeCloseTo(135, 2);
      expect(result.precoVendaRecomendado).toBeCloseTo(168.75, 2); // 135 / 0.8
    });
  });

  describe('Batch mode (lote) calculations', () => {
    it('should distribute batch costs equally across units', () => {
      const input: CalculationInput = {
        quantidade: 10,
        modoCalculo: 'lote',
        custoCompra: 1000, // 100 per unit
        custoTransporte: 100, // 10 per unit
        custoEmbalagem: 50, // 5 per unit
        outrosCustos: 50, // 5 per unit
        custoTransporteTipo: 'lote',
        custoEmbalagemTipo: 'lote',
        outrosCustosTipo: 'lote',
        margemDesejada: 20,
      };

      const result = calculateProductFields(input);

      // Per unit: 100 + 10 + 5 + 5 = 120
      expect(result.custoTotalReal).toBeCloseTo(120, 2);
      expect(result.loteCustoTotal).toBeCloseTo(1200, 2); // 120 * 10
    });

    it('should handle per-unit (unidade) costs in batch mode', () => {
      const input: CalculationInput = {
        quantidade: 10,
        modoCalculo: 'lote',
        custoCompra: 1000, // 100 per unit
        custoTransporte: 5, // 5 per unit (per-unit type)
        custoEmbalagem: 0,
        outrosCustos: 0,
        custoTransporteTipo: 'unidade',
        margemDesejada: 20,
      };

      const result = calculateProductFields(input);

      // Per unit: 100 + 5 = 105
      expect(result.custoTotalReal).toBeCloseTo(105, 2);
      expect(result.loteCustoTotal).toBeCloseTo(1050, 2);
    });
  });

  describe('Fixed costs distribution', () => {
    it('should distribute fixed costs across batch units', () => {
      const input: CalculationInput = {
        quantidade: 5,
        modoCalculo: 'lote',
        custoCompra: 500,
        custoTransporte: 0,
        custoEmbalagem: 0,
        outrosCustos: 0,
        energia: 100, // Fixed cost for batch
        internet: 50,
        energiaTipo: 'lote',
        internetTipo: 'lote',
        margemDesejada: 20,
      };

      const result = calculateProductFields(input);

      // Per unit: 100 + (100/5) + (50/5) = 100 + 20 + 10 = 130
      expect(result.custoTotalReal).toBeCloseTo(130, 2);
      expect(result.custosFixosRateados).toBeCloseTo(30, 2); // 100/5 + 50/5
    });
  });

  describe('Package/Unit conversion (Fase 4)', () => {
    it('should handle selling whole package', () => {
      const input: CalculationInput = {
        quantidade: 10, // 10 packages bought
        unidadesInternas: 50, // 50 units per package
        venderEmbalagemInteira: true, // Sell by package
        custoCompra: 100,
        custoTransporte: 0,
        custoEmbalagem: 0,
        outrosCustos: 0,
        margemDesejada: 20,
      };

      const result = calculateProductFields(input);

      expect(result.totalUnidadesVendaveis).toBeCloseTo(10, 2); // Sell as 10 packages
      expect(result.custoRealUnidadeVenda).toBeCloseTo(100, 2); // Cost per package
    });

    it('should handle selling individual units', () => {
      const input: CalculationInput = {
        quantidade: 1,
        unidadesInternas: 50, // 50 units per package
        venderEmbalagemInteira: false, // Sell individual units
        custoCompra: 100,
        custoTransporte: 0,
        custoEmbalagem: 0,
        outrosCustos: 0,
        margemDesejada: 20,
      };

      const result = calculateProductFields(input);

      expect(result.totalUnidadesVendaveis).toBeCloseTo(50, 2); // Sell as 50 units
      expect(result.custoRealUnidadeVenda).toBeCloseTo(2, 2); // 100 / 50 per unit
      expect(result.precoRecomendadoUnidadeVenda).toBeCloseTo(2.5, 2); // 2 / (1 - 0.2) = 2.5
    });
  });

  describe('Edge cases', () => {
    it('should handle zero quantity (default to 1)', () => {
      const input: CalculationInput = {
        quantidade: 0,
        custoCompra: 100,
        custoTransporte: 0,
        custoEmbalagem: 0,
        outrosCustos: 0,
        margemDesejada: 20,
      };

      const result = calculateProductFields(input);

      expect(result.custoTotalReal).toBeCloseTo(100, 2);
    });

    it('should handle undefined quantity (default to 1)', () => {
      const input: CalculationInput = {
        custoCompra: 100,
        custoTransporte: 0,
        custoEmbalagem: 0,
        outrosCustos: 0,
        margemDesejada: 20,
      };

      const result = calculateProductFields(input);

      expect(result.custoTotalReal).toBeCloseTo(100, 2);
    });

    it('should handle very small costs', () => {
      const input: CalculationInput = {
        custoCompra: 0.01,
        custoTransporte: 0,
        custoEmbalagem: 0,
        outrosCustos: 0,
        margemDesejada: 50, // Use 50% instead of 100%
      };

      const result = calculateProductFields(input);

      expect(result.precoVendaRecomendado).toBeCloseTo(0.02, 3); // 0.01 / 0.5
      expect(result.lucroEstimado).toBeCloseTo(0.01, 3);
    });

    it('should handle very large margins', () => {
      const input: CalculationInput = {
        custoCompra: 100,
        custoTransporte: 0,
        custoEmbalagem: 0,
        outrosCustos: 0,
        margemDesejada: 99,
      };

      const result = calculateProductFields(input);

      expect(result.precoVendaRecomendado).toBeCloseTo(10000, 2);
      expect(result.margemReal).toBeLessThanOrEqual(99.01);
    });

    it('should handle margin >= 100 (invalid but graceful)', () => {
      const input: CalculationInput = {
        custoCompra: 100,
        custoTransporte: 0,
        custoEmbalagem: 0,
        outrosCustos: 0,
        margemDesejada: 100,
      };

      const result = calculateProductFields(input);

      // When margin is 100%, factor becomes 0, so price should be 0 or equal to cost
      expect(result.precoVendaRecomendado).toBe(100);
    });
  });

  describe('ROI calculation', () => {
    it('should calculate ROI correctly', () => {
      const input: CalculationInput = {
        custoCompra: 100,
        custoTransporte: 0,
        custoEmbalagem: 0,
        outrosCustos: 0,
        margemDesejada: 50,
      };

      const result = calculateProductFields(input);

      // Cost: 100, Price: 200, Profit: 100
      // ROI = (100 / 100) * 100 = 100%
      expect(result.roi).toBeCloseTo(100, 1);
    });

    it('should handle zero cost ROI', () => {
      const input: CalculationInput = {
        custoCompra: 0,
        custoTransporte: 0,
        custoEmbalagem: 0,
        outrosCustos: 0,
        margemDesejada: 20,
      };

      const result = calculateProductFields(input);

      expect(result.roi).toBe(0);
    });
  });
});

describe('Pricing Utils - getPriceHealth', () => {
  it('should return "excelente" for margin >= 35%', () => {
    const health = getPriceHealth(100, 40);
    expect(health.status).toBe('excelente');
    expect(health.label).toBe('Excelente');
  });

  it('should return "saudavel" for margin 25-34.99%', () => {
    const health = getPriceHealth(50, 30);
    expect(health.status).toBe('saudavel');
    expect(health.label).toBe('Saudável');
  });

  it('should return "atencao" for margin 15-24.99%', () => {
    const health = getPriceHealth(30, 20);
    expect(health.status).toBe('atencao');
    expect(health.label).toBe('Atenção');
  });

  it('should return "baixo" for margin < 15%', () => {
    const health = getPriceHealth(10, 10);
    expect(health.status).toBe('baixo');
    expect(health.label).toBe('Margem baixa');
  });

  it('should return "prejuizo" for negative profit', () => {
    const health = getPriceHealth(-50, 20);
    expect(health.status).toBe('prejuizo');
    expect(health.label).toBe('Prejuízo');
  });

  it('should return "prejuizo" for zero profit', () => {
    const health = getPriceHealth(0, 0);
    expect(health.status).toBe('prejuizo');
    expect(health.label).toBe('Prejuízo');
  });
});

describe('Pricing Utils - evaluateAlternativePrice', () => {
  it('should evaluate alternative price correctly', () => {
    const result = evaluateAlternativePrice(100, 150);

    expect(result.lucro).toBeCloseTo(50, 2);
    expect(result.margemReal).toBeCloseTo(33.33, 1);
    expect(result.roi).toBeCloseTo(50, 1);
  });

  it('should handle price equal to cost', () => {
    const result = evaluateAlternativePrice(100, 100);

    expect(result.lucro).toBeCloseTo(0, 2);
    expect(result.margemReal).toBeCloseTo(0, 1);
    expect(result.roi).toBeCloseTo(0, 1);
  });

  it('should handle price below cost', () => {
    const result = evaluateAlternativePrice(100, 80);

    expect(result.lucro).toBeCloseTo(-20, 2);
    expect(result.margemReal).toBeCloseTo(-25, 1);
    expect(result.health.status).toBe('prejuizo');
  });

  it('should handle zero cost', () => {
    const result = evaluateAlternativePrice(0, 100);

    expect(result.lucro).toBeCloseTo(100, 2);
    expect(result.roi).toBe(0); // Implementation returns 0 when cost is 0
  });
});
