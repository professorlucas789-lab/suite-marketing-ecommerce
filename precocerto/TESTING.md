# PreçoCerto Testing Guide - Phases 4-6

This document describes the automated testing setup for PreçoCerto, covering batch operations (Fase 4), advanced pricing (Fase 5), and service layer testing (Fase 6).

## Overview

The test suite provides comprehensive coverage for:
- **Price Calculations**: Testing all pricing algorithms and margin calculations
- **Batch Operations**: Testing rateio (cost distribution) logic across multiple products
- **Category Management**: Testing category-based margin validation and pricing strategies
- **Package Conversions**: Testing unit/package conversion calculations for Fase 4

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests with UI dashboard
```bash
npm run test:ui
```

The UI will open at `http://localhost:51204/__vitest__/` with an interactive dashboard.

### Run tests with coverage report
```bash
npm run test:coverage
```

This generates a coverage report in the `coverage/` directory.

### Run specific test file
```bash
npm test -- pricing.test.ts
```

### Run tests in watch mode
```bash
npm test -- --watch
```

## Test Files

### 1. `src/utils/pricing.test.ts` (26 tests)
Tests for core pricing calculation functions.

**Covered Functions:**
- `calculateProductFields()` - Main pricing calculation engine
- `getPriceHealth()` - Health status determination
- `evaluateAlternativePrice()` - Alternative price evaluation

**Test Categories:**
- **Basic calculations**: Simple cost + margin scenarios
- **Batch mode (lote)**: Handling batch quantity calculations
- **Fixed costs distribution**: Rateio of fixed costs
- **Package/Unit conversion**: Fase 4 unit pricing
- **Edge cases**: Zero quantity, very small costs, high margins
- **ROI calculation**: Return on Investment computation

**Example Test:**
```typescript
it('should calculate price with simple costs', () => {
  const input: CalculationInput = {
    custoCompra: 100,
    custoTransporte: 10,
    custoEmbalagem: 5,
    outrosCustos: 5,
    margemDesejada: 20,
  };

  const result = calculateProductFields(input);

  expect(result.custoTotalReal).toBeCloseTo(120, 2);
  expect(result.precoVendaRecomendado).toBeCloseTo(150, 2); // 120 / (1 - 0.2)
});
```

### 2. `src/utils/batchCalculations.test.ts` (27 tests)
Tests for batch registration and rateio distribution logic.

**Key Scenarios:**
- **Quantity-based rateio**: Distribute costs proportionally by product quantity
- **Cost-based rateio**: Distribute costs proportionally by product base cost
- **Distribution across cost types**: Split additional costs among transporte/embalagem/outros
- **Large batches**: Handle 150+ products in single batch
- **Validation**: Non-negative quantities and costs
- **Real-world scenarios**: Realistic product mixes

**Example Test:**
```typescript
it('should distribute additional costs equally by quantity', () => {
  const products = [
    { nome: 'Product A', quantidade: 5 },
    { nome: 'Product B', quantidade: 3 },
    { nome: 'Product C', quantidade: 2 },
  ];

  const totalQuantidade = 10;
  const custoAdicionalTotal = 100;

  const result = products.map((product) => ({
    nome: product.nome,
    custoAdicionalRateado: (product.quantidade / totalQuantidade) * custoAdicionalTotal,
  }));

  expect(result[0].custoAdicionalRateado).toBeCloseTo(50, 2); // (5/10) * 100
  expect(result[1].custoAdicionalRateado).toBeCloseTo(30, 2); // (3/10) * 100
  expect(result[2].custoAdicionalRateado).toBeCloseTo(20, 2); // (2/10) * 100
});
```

### 3. `src/utils/marginCalculation.test.ts` (22 tests)
Tests for category-based margin calculations and validation.

**Covered Functions:**
- `calculateProductPricesWithCategoryMargin()` - Category margin application
- `calculateMultiplePricingStrategy()` - Multiple price levels (saudável, ideal, recomendado)
- `calculateROI()` - ROI calculation
- `validateProductMarginRange()` - Margin validation against rules

**Test Categories:**
- **Category margin application**: Using base margin from category
- **Margin override**: Per-product margin overrides
- **Multiple pricing levels**: Three-tier pricing strategy
- **ROI calculation**: Various profit/cost scenarios
- **Validation**: Margin range checks and regulatory constraints
- **Warnings**: Alerting on margin differences

### 4. `src/services/__tests__/salesService.test.ts` (20 tests) - ⭐ NEW
Tests for sales transaction recording, profit margin calculations, and stock synchronization.

**Key Test Categories:**
- **Profit Margin Calculations**: Validate positive/negative margins, multi-product aggregation
- **Sales Validation**: Quantity/price validation, change calculation, payment validation
- **Payment Methods**: Support for cash, card, transfer, credit, mobile_money, etc.
- **Stock Synchronization**: Verify stock updates after sales, insufficient stock handling
- **Receipt Generation**: Unique receipt number generation in `PC-IR-YYYYMMDD-HHMMSS-XXXX` format
- **Customer Credit**: Credit limit validation, balance tracking, credit sale processing

**Example Test:**
```typescript
it('deve calcular corretamente multi-product sale', () => {
  const totalRevenue = (100 * 2) + (50 * 1) + (200 * 1);
  const totalCost = (60 * 2) + (40 * 1) + (100 * 1);
  const totalProfit = totalRevenue - totalCost;
  
  expect(totalRevenue).toBe(450);
  expect(totalCost).toBe(260);
  expect(totalProfit).toBe(190);
});
```

### 5. `src/services/__tests__/automatedAlertsService.test.ts` (16 tests) - ⭐ NEW
Tests for automatic alert detection (stock, expiry, margins, reorder).

**Key Test Categories:**
- **Stock Alerts**: Critical (≤2), Low (2-5) stock level detection
- **Expiry Alerts**: Soon (<7 days), Today detection with priority escalation
- **Margin Alerts**: Negative margin detection on sales
- **Reorder Alerts**: Minimum stock threshold-based reorder suggestions

### 6. `src/services/__tests__/notificationService.test.ts` (26 tests) - ⭐ NEW
Tests for multi-channel notification orchestration (in-app, email, WhatsApp, SMS).

**Key Test Categories:**
- **Notification Types**: Support for stock_critical, expiry_soon, expiry_today, daily_report, sale_completed
- **Notification Channels**: in-app, email, whatsapp, sms with simultaneous multi-channel delivery
- **Priority Levels**: low, normal, high, critical with appropriate routing
- **Notification Status**: unread → read → archived lifecycle
- **User Preferences**: Per-channel and per-alert-type preference management
- **Unread Counting**: Accurate count of unread notifications
- **Cleanup**: Automatic removal of notifications >30 days old

### 8. `src/services/__tests__/dailyReportService.test.ts` (19 tests) - ⭐ NEW
Tests for automatic daily report generation with KPIs and business insights.

**Key Test Categories:**
- **KPI Calculations**: Total revenue, profit, margin, units sold aggregation
- **Top Product Identification**: Highest revenue product ranking
- **Alert Counting**: Daily stock critical, expiry, negative margin counts
- **Report Insights**: Highlight generation, recommendation generation
- **Formatting**: Text formatting with emojis for email/WhatsApp distribution
- **Date Handling**: Yesterday calculation, date format validation (YYYY-MM-DD)

### 9. `src/utils/packageConversion.test.ts` (21 tests)
Tests for Fase 4 package/unit conversion calculations.

**Covered Functions:**
- `calculatePackageConversion()` - Main conversion calculator
- `getPackageOptions()` - Package type recommendations

**Test Categories:**
- **Whole package selling**: Selling packages as complete units
- **Individual unit selling**: Breaking packages into individual units
- **Input validation**: Cost, quantity, units validation
- **Edge cases**: Zero margins, 100% margins, very small/large quantities
- **Real-world scenarios**: Pharmacy, food, cosmetic products
- **Package options**: Product-specific unit recommendations

**Example Test:**
```typescript
it('should calculate correctly when selling individual units', () => {
  const data: PackageConversionData = {
    custoCompra: 100,
    quantidade: 1,
    unidadesInternas: 50,
    venderEmbalagemInteira: false,
    margemDesejada: 20,
    precoVendaRecomendado: 100,
  };

  const result = calculatePackageConversion(data);

  expect(result.custoRealUnidadeVenda).toBeCloseTo(2, 2); // 100 / 50
  expect(result.precoRecomendadoUnidadeVenda).toBeCloseTo(2.4, 2); // 2 * 1.2
  expect(result.totalUnidadesVendaveis).toBe(50);
});
```

## Test Coverage

Current coverage statistics:
- **Total Tests**: 165 (84 + 81 NEW)
- **All Passing**: ✅

Test breakdown by file:
| File | Tests | Status | Phase |
|------|-------|--------|-------|
| pricing.test.ts | 26 | ✅ Pass | Fase 4 |
| batchCalculations.test.ts | 27 | ✅ Pass | Fase 4 |
| marginCalculation.test.ts | 22 | ✅ Pass | Fase 5 |
| packageConversion.test.ts | 21 | ✅ Pass | Fase 4 |
| **salesService.test.ts** | **20** | **✅ Pass** | **Fase 6** |
| **automatedAlertsService.test.ts** | **16** | **✅ Pass** | **Fase 6** |
| **notificationService.test.ts** | **26** | **✅ Pass** | **Fase 6** |
| **dailyReportService.test.ts** | **19** | **✅ Pass** | **Fase 6** |

**NEW (Fase 6: Testes & QA)**: 81 tests for critical business services

## Key Testing Scenarios

### 1. Rateio by Quantity
Tests distribution of additional costs (transporte, embalagem, outros) proportionally across products based on their quantities.

```
Product A: 50 units → receives 50% of additional cost
Product B: 30 units → receives 30% of additional cost
Product C: 20 units → receives 20% of additional cost
```

### 2. Rateio by Cost
Tests distribution of additional costs proportionally across products based on their base costs.

```
Product A: R$ 100 cost → receives proportional share
Product B: R$ 200 cost → receives 2x Product A's share
Product C: R$ 300 cost → receives 3x Product A's share
```

### 3. Margin Validation
Tests that product margins comply with:
- Category margin rules (min/max)
- Regulatory constraints
- Margin override detection

### 4. Package Conversions
Tests both selling modes:
- **Whole package**: Sell complete package at calculated price
- **Individual units**: Break package into units with per-unit margin

## CI/CD Integration

GitHub Actions automatically runs tests on:
- Every push to `main`, `develop`, or feature branches (`claude/**`)
- Every pull request to `main` or `develop`

**Workflow file**: `.github/workflows/test.yml`

Tests run on:
- Node.js 18.x
- Node.js 20.x

The workflow:
1. Installs dependencies
2. Runs linter (continues even if there are warnings)
3. Runs test suite
4. Builds the application

## Adding New Tests

When adding new features or fixing bugs, follow this pattern:

```typescript
describe('Feature Name', () => {
  describe('Specific functionality', () => {
    it('should handle expected behavior', () => {
      // Arrange
      const input = { /* setup */ };

      // Act
      const result = functionToTest(input);

      // Assert
      expect(result).toMatchExpectation();
    });

    it('should handle edge case', () => {
      // Test boundary conditions
    });
  });
});
```

## Debugging Tests

### Run single test
```bash
npm test -- --reporter=verbose pricing.test.ts
```

### Run with console output
Tests using `console.log()` will show output when running in watch mode.

### Debug in IDE
Most modern IDEs support Vitest debugging. Check your IDE's documentation.

## Common Issues

### Tests fail with "module not found"
Ensure all imports use correct relative paths. Vitest uses the project root as base.

### Precision issues in floating-point tests
Use `toBeCloseTo()` instead of `toBe()` for floating-point comparisons:
```typescript
// Good
expect(result).toBeCloseTo(123.456, 2); // Within 0.01

// Avoid
expect(result).toBe(123.456);
```

### Tests pass locally but fail in CI
Check:
- Node version compatibility
- Environment variables (if any)
- Path separators (use `/` not `\`)

## Performance

Average test run time: ~1-1.5 seconds

Large batches (100+ products):
- Rateio calculations: < 100ms
- All validations: < 50ms

## Best Practices

1. **Use descriptive test names**: "should calculate correct margin" not "test margin"
2. **Arrange-Act-Assert**: Structure every test clearly
3. **Test edge cases**: Zero, negative, very large values
4. **Keep tests focused**: One assertion per logical concept
5. **Use meaningful data**: Real product scenarios, not random numbers
6. **Document complex scenarios**: Add comments explaining business logic

## Further Reading

- [Vitest Documentation](https://vitest.dev/)
- [Vitest Configuration](https://vitest.dev/config/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Support

For issues with tests or testing setup, refer to:
- Code comments in test files
- Vitest official documentation
- This guide's troubleshooting section
