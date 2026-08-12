export interface DynamicField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "checkbox" | "textarea";
  placeholder?: string;
  options?: string[];
  required?: boolean;
  helpText?: string;
  visibleWhen?: {
    field: string;
    operator: "equals" | "notEquals" | "includes" | "exists";
    value: any;
  };
}

export interface DashboardCardConfig {
  id: string;
  title: string;
  description: string;
  bgGradient: string; // e.g., "from-emerald-50 to-teal-50"
  borderColor: string; // e.g., "border-emerald-100"
  textColor: string; // e.g., "text-emerald-600"
  type: "count" | "currency" | "percentage" | "text";
  getValue: (products: any[], formatFn: (v: number) => string) => string | number;
}

export interface ModuleAlert {
  id: string;
  title: string;
  type: "warning" | "danger" | "info" | "success";
  description: string;
  check: (products: any[]) => boolean;
  getAffectedCount?: (products: any[]) => number;
}

export interface CalculationRules {
  name: string;
  description: string;
  calculateBasePricing?: (product: any) => any;
  applyModuleSpecificRules?: (product: any, baseValues: any) => any;
  calculateFinalPricing?: (product: any, baseValues: any, specificValues: any) => any;
}

export interface ValidationRules {
  name: string;
  description: string;
  validate?: (product: any) => string | null;
}

export interface BusinessModuleConfig {
  id: string;
  name: string;
  icon: string; // Lucide icon name e.g. "Pill" | "ShoppingCart" | "Shirt"
  color: string; // Tailwind color e.g. "emerald-600"
  description: string;
  categories: string[];
  purchaseUnits: string[];
  saleUnits: string[];
  requiredFields: string[]; // Common fields required
  optionalFields: string[];
  advancedFields: string[];
  productExtraFields: DynamicField[];
  dashboardCards: DashboardCardConfig[];
  alerts: ModuleAlert[];
  calculationRules: CalculationRules;
  validationRules: ValidationRules;
}
