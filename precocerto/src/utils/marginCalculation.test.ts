import { describe, it, expect } from 'vitest';
import {
  calculateProductPricesWithCategoryMargin,
  calculateMultiplePricingStrategy,
  calculateROI,
  validateProductMarginRange,
} from './marginCalculation';
import { Product } from '../types';
import { CategoryMarginConfig } from '../types/category';

// Helper to create valid Product objects for testing
const createTestProduct = (overrides?: Partial<Product>): Product => ({
  id: 'test-1',
  nome: 'Test Product',
  categoria: 'Test Category',
  custoCompra: 100,
  custoTransporte: 0,
  custoEmbalagem: 0,
  outrosCustos: 0,
  margemDesejada: 20,
  precoVendaRecomendado: 120,
  lucroEstimado: 20,
  margemReal: 20,
  margemAplicada: 20,
  roi: 20,
  ...overrides,
} as Product);

describe('Margin Calculation Utils', () => {
  const mockCategory: CategoryMarginConfig = {
    id: 'test-cat',
    userId: 'test-user',
    name: 'Test Category',
    businessType: 'test',
    marginRules: {
      baseMargin: 30,
      minMargin: 15,
      maxMargin: 50,
    },
    regulatoryConstraints: {
      maxMarginPercentage: 100,
      restrictionBody: 'Government',
      lastUpdated: new Date().toISOString(),
    },
  } as CategoryMarginConfig;

  describe('calculateProductPricesWithCategoryMargin', () => {
    it('should calculate prices using category base margin', () => {
      const product = createTestProduct({
        custoCompra: 100,
        custoTransporte: 10,
        custoEmbalagem: 5,
        outrosCustos: 5,
      });

      const result = calculateProductPricesWithCategoryMargin(product, mockCategory);

      // Total cost: 100 + 10 + 5 + 5 = 120
      // Price with 30% margin: 120 * 1.3 = 156
      expect(result.precoVendaRecomendado).toBeCloseTo(156, 2);
      expect(result.lucroEstimado).toBeCloseTo(36, 2); // 156 - 120
      expect(result.margemAplicada).toBe(30);
    });

    it('should use product margin override when set', () => {
      const product = createTestProduct({
        custoCompra: 100,
        margemOverride: 50,
      });

      const result = calculateProductPricesWithCategoryMargin(product, mockCategory);

      // Price with 50% margin: 100 * 1.5 = 150
      expect(result.precoVendaRecomendado).toBeCloseTo(150, 2);
      expect(result.margemAplicada).toBe(50);
    });

    it('should handle zero additional costs', () => {
      const product = createTestProduct({
        custoCompra: 100,
      });

      const result = calculateProductPricesWithCategoryMargin(product, mockCategory);

      expect(result.precoVendaRecomendado).toBeCloseTo(130, 2); // 100 * 1.3
      expect(result.lucroEstimado).toBeCloseTo(30, 2);
    });

    it('should calculate real margin correctly', () => {
      const product = createTestProduct({
        custoCompra: 100,
      });

      const result = calculateProductPricesWithCategoryMargin(product, mockCategory);

      // Price: 130, Cost: 100, Profit: 30
      // Margin: (30 / 100) * 100 = 30%
      expect(result.margemReal).toBeCloseTo(30, 1);
    });
  });

  describe('calculateMultiplePricingStrategy', () => {
    it('should calculate three price levels correctly', () => {
      const product = createTestProduct({
        custoCompra: 100,
      });

      const result = calculateMultiplePricingStrategy(product, mockCategory);

      // Saudável: 20% margin = 120
      expect(result.precoSaudavel).toBeCloseTo(120, 2);
      // Ideal: 70% of 30% = 21% margin = 121
      expect(result.precoIdeal).toBeCloseTo(121, 2);
      // Recomendado: 30% margin = 130
      expect(result.precoRecomendado).toBeCloseTo(130, 2);
    });

    it('should respect product margin override in ideal price', () => {
      const product = createTestProduct({
        custoCompra: 100,
        margemOverride: 50,
      });

      const result = calculateMultiplePricingStrategy(product, mockCategory);

      // Ideal: 70% of 50% = 35% margin = 135
      expect(result.precoIdeal).toBeCloseTo(135, 2);
      // Recomendado: 50% margin = 150
      expect(result.precoRecomendado).toBeCloseTo(150, 2);
    });
  });

  describe('calculateROI', () => {
    it('should calculate ROI correctly', () => {
      const roi = calculateROI(50, 100);
      // ROI = (50 / 100) * 100 = 50%
      expect(roi).toBeCloseTo(50, 1);
    });

    it('should return 0 for zero cost', () => {
      const roi = calculateROI(50, 0);
      expect(roi).toBe(0);
    });

    it('should handle negative profit', () => {
      const roi = calculateROI(-50, 100);
      // ROI = (-50 / 100) * 100 = -50%
      expect(roi).toBeCloseTo(-50, 1);
    });

    it('should handle large profits', () => {
      const roi = calculateROI(1000, 100);
      // ROI = (1000 / 100) * 100 = 1000%
      expect(roi).toBeCloseTo(1000, 1);
    });
  });

  describe('validateProductMarginRange', () => {
    it('should accept margin within valid range', () => {
      const product = createTestProduct({
        margemOverride: 30, // Within 15-50 range
      });

      const result = validateProductMarginRange(product, mockCategory);

      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should reject margin below minimum', () => {
      const product = createTestProduct({
        margemOverride: 10, // Below 15 minimum
      });

      const result = validateProductMarginRange(product, mockCategory);

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('fora do range permitido');
    });

    it('should reject margin above maximum', () => {
      const product = createTestProduct({
        margemOverride: 60, // Above 50 maximum
      });

      const result = validateProductMarginRange(product, mockCategory);

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('fora do range permitido');
    });

    it('should reject margin exceeding regulatory limit', () => {
      const restrictedCategory: CategoryMarginConfig = {
        ...mockCategory,
        regulatoryConstraints: {
          maxMarginPercentage: 40, // Max allowed by regulation
          restrictionBody: 'Government Agency',
          lastUpdated: new Date().toISOString(),
        },
      };

      const product = createTestProduct({
        margemOverride: 45, // Above regulatory limit
      });

      const result = validateProductMarginRange(product, restrictedCategory);

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('excede limite regulatório');
    });

    it('should warn when using margin override', () => {
      const product = createTestProduct({
        margemOverride: 35, // Different from base 30
      });

      const result = validateProductMarginRange(product, mockCategory);

      expect(result.isValid).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('margem diferente da categoria');
    });

    it('should not warn when no override is set', () => {
      const product = createTestProduct();

      const result = validateProductMarginRange(product, mockCategory);

      expect(result.isValid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should accept margin at boundaries', () => {
      // Test minimum boundary
      const productMin = createTestProduct({
        margemOverride: 15, // Exactly at minimum
      });

      const resultMin = validateProductMarginRange(productMin, mockCategory);
      expect(resultMin.isValid).toBe(true);

      // Test maximum boundary
      const productMax = createTestProduct({
        margemOverride: 50, // Exactly at maximum
      });

      const resultMax = validateProductMarginRange(productMax, mockCategory);
      expect(resultMax.isValid).toBe(true);
    });
  });

  describe('Edge cases and special scenarios', () => {
    it('should handle product with no additional costs', () => {
      const product = createTestProduct({
        custoCompra: 100,
      });

      const result = calculateProductPricesWithCategoryMargin(product, mockCategory);

      expect(result.precoVendaRecomendado).toBeCloseTo(130, 2);
      expect(result.lucroEstimado).toBeCloseTo(30, 2);
      expect(result.margemReal).toBeCloseTo(30, 1);
    });

    it('should handle very low cost products', () => {
      const product = createTestProduct({
        custoCompra: 0.01,
      });

      const result = calculateProductPricesWithCategoryMargin(product, mockCategory);

      // 0.01 * 1.3 = 0.013, but rounding may affect precision
      expect(result.precoVendaRecomendado).toBeCloseTo(0.013, 2);
      expect(result.lucroEstimado).toBeCloseTo(0.003, 2);
    });

    it('should handle very high margin requests', () => {
      const product = createTestProduct({
        custoCompra: 100,
        margemOverride: 50, // 50% margin
      });

      const result = calculateProductPricesWithCategoryMargin(product, mockCategory);

      expect(result.precoVendaRecomendado).toBeCloseTo(150, 2);
      expect(result.lucroEstimado).toBeCloseTo(50, 2);
      expect(result.margemAplicada).toBe(50);
    });

    it('should handle zero margin (cost-plus)', () => {
      const product = createTestProduct({
        custoCompra: 100,
        margemOverride: 0, // No margin
      });

      const result = calculateProductPricesWithCategoryMargin(product, mockCategory);

      expect(result.precoVendaRecomendado).toBeCloseTo(100, 2);
      expect(result.lucroEstimado).toBeCloseTo(0, 2);
      expect(result.margemReal).toBeCloseTo(0, 1);
    });
  });
});
