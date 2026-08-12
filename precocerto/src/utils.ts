/**
 * Helper to format numbers into Kwanza (Kz) currency style.
 * E.g., 1500 -> "Kz 1.500,00"
 */
export function formatKz(value: number): string {
  if (isNaN(value) || value === null || value === undefined) {
    return "Kz 0,00";
  }
  return formatCurrency(value, "Kz", "1.234,56");
}

import {
  CalculationInput,
  HealthStatus,
  calculateProductFields,
  getPriceHealth,
  evaluateAlternativePrice,
  formatCurrency,
  formatDate
} from "./utils/pricing";

export type { CalculationInput, HealthStatus };
export { calculateProductFields, getPriceHealth, evaluateAlternativePrice, formatCurrency, formatDate };


/**
 * Common category presets for products
 */
export const CATEGORY_PRESETS = [
  "Medicamentos",
  "Alimentos e Bebidas",
  "Cosméticos",
  "Higiene Pessoal",
  "Material Escolar",
  "Material de Escritório",
  "Eletrónicos",
  "Vestuário",
  "Ferramentas",
  "Limpeza",
  "Outros"
];
