/**
 * Package Conversion Calculator - Fase 3
 * Handles calculations for products sold in multiple units (e.g., sold by unit but bought in boxes)
 */

export interface PackageConversionData {
  // Purchase information
  custoCompra: number; // Cost per package/box
  quantidade: number; // Number of packages bought

  // Unit configuration
  unidadeCompra: string; // Purchase unit (e.g., "caixa")
  unidadeVenda: string; // Sales unit (e.g., "unidade")
  unidadesInternas: number; // Units per package (e.g., 50 unidades per caixa)

  // Sales mode
  venderEmbalagemInteira: boolean; // true = sell whole package, false = sell individual units

  // Margin
  margemDesejada: number; // Desired margin %

  // Already calculated price (from phase 2)
  precoVendaRecomendado: number;
}

export interface PackageConversionResult {
  // Per-unit calculations
  custoRealUnidadeVenda: number; // Cost per individual unit
  precoRecomendadoUnidadeVenda: number; // Recommended price per individual unit
  lucroUnidadeVenda: number; // Profit per individual unit
  margemUnidadeVenda: number; // Margin % per unit

  // Total calculations (for entire package/batch)
  totalUnidadesVendaveis: number; // Total units available for sale
  receitaTotalEsperada: number; // Expected revenue from entire batch
  lucroTotalEsperado: number; // Expected profit from entire batch
  margemTotalEsperada: number; // Margin % for entire batch

  // Validation
  isValid: boolean;
  validationMessages: string[];
}

/**
 * Calculate package/unit conversion metrics
 */
export function calculatePackageConversion(data: PackageConversionData): PackageConversionResult {
  const messages: string[] = [];
  let isValid = true;

  // Input validation
  if (data.quantidade <= 0) {
    messages.push("Quantidade deve ser maior que 0");
    isValid = false;
  }
  if (data.unidadesInternas <= 0) {
    messages.push("Unidades por embalagem deve ser maior que 0");
    isValid = false;
  }
  if (data.custoCompra < 0) {
    messages.push("Custo de compra não pode ser negativo");
    isValid = false;
  }
  if (data.margemDesejada < 0 || data.margemDesejada > 100) {
    messages.push("Margem desejada deve estar entre 0% e 100%");
    isValid = false;
  }

  // Calculate cost per individual unit
  const custoRealUnidadeVenda = data.custoCompra / data.unidadesInternas;

  // Calculate total units available for sale
  const totalUnidadesVendaveis = data.quantidade * data.unidadesInternas;

  // Determine selling price per unit
  // If we can sell the package price divided by units, use that
  // Otherwise calculate based on desired margin
  let precoRecomendadoUnidadeVenda: number;

  if (data.venderEmbalagemInteira) {
    // Selling whole package at calculated price
    precoRecomendadoUnidadeVenda = data.precoVendaRecomendado / data.unidadesInternas;
  } else {
    // Selling individual units - calculate from margin
    const margemFator = 1 + (data.margemDesejada / 100);
    precoRecomendadoUnidadeVenda = custoRealUnidadeVenda * margemFator;
  }

  // Calculate profit per unit
  const lucroUnidadeVenda = precoRecomendadoUnidadeVenda - custoRealUnidadeVenda;

  // Calculate margin % per unit
  const margemUnidadeVenda = custoRealUnidadeVenda > 0
    ? (lucroUnidadeVenda / custoRealUnidadeVenda) * 100
    : 0;

  // Calculate total expected revenue
  const receitaTotalEsperada = precoRecomendadoUnidadeVenda * totalUnidadesVendaveis;

  // Calculate total expected profit
  const custoTotalReal = data.custoCompra * data.quantidade;
  const lucroTotalEsperado = receitaTotalEsperada - custoTotalReal;

  // Calculate total margin %
  const margemTotalEsperada = custoTotalReal > 0
    ? (lucroTotalEsperado / custoTotalReal) * 100
    : 0;

  return {
    custoRealUnidadeVenda: Math.round(custoRealUnidadeVenda * 100) / 100,
    precoRecomendadoUnidadeVenda: Math.round(precoRecomendadoUnidadeVenda * 100) / 100,
    lucroUnidadeVenda: Math.round(lucroUnidadeVenda * 100) / 100,
    margemUnidadeVenda: Math.round(margemUnidadeVenda * 100) / 100,
    totalUnidadesVendaveis,
    receitaTotalEsperada: Math.round(receitaTotalEsperada * 100) / 100,
    lucroTotalEsperado: Math.round(lucroTotalEsperado * 100) / 100,
    margemTotalEsperada: Math.round(margemTotalEsperada * 100) / 100,
    isValid,
    validationMessages: messages,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
  }).format(value);
}

/**
 * Get common package options based on product type
 */
export function getPackageOptions(productType: string): { compra: string[]; venda: string[] } {
  const commonOptions = {
    compra: ["unidade", "caixa", "pacote", "kg", "litro", "saco", "dúzia"],
    venda: ["unidade", "caixa", "pacote", "kg", "litro"],
  };

  // Pharmacy products
  if (productType === "medicamento/farmácia") {
    return {
      compra: ["caixa", "blister", "frasco", "tubo"],
      venda: ["unidade", "blister", "comprimido", "cápsula"],
    };
  }

  // Food products
  if (productType === "alimentar") {
    return {
      compra: ["caixa", "kg", "litro", "saco"],
      venda: ["unidade", "kg", "litro", "g", "ml"],
    };
  }

  // Cosmetics
  if (productType === "cosmético") {
    return {
      compra: ["caixa", "frasco"],
      venda: ["unidade", "ml", "g"],
    };
  }

  return commonOptions;
}
