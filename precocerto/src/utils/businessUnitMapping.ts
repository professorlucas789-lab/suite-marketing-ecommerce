import type { OperationalUnitType, Store, StoreType } from "../types/store";
import type {
  BusinessSegmentConfig,
  CategoryScope,
  PricingPolicy,
  SalesDocumentMode,
  StockPolicy,
} from "../types";

export type StoreTypeOption = {
  value: StoreType;
  label: string;
  descricao: string;
  defaultModuleId: string;
};

export type BusinessSegmentOption = {
  id: string;
  label: string;
  descricao: string;
  defaultStoreType: StoreType;
  defaultUnitType: OperationalUnitType;
  defaultModuleId: string;
};

export type OperationalUnitTypeOption = {
  value: OperationalUnitType;
  label: string;
  descricao: string;
};

export type OperationalUnitRules = {
  canSell: boolean;
  canIssueSalesDocuments: boolean;
  canManageProducts: boolean;
  canRegisterBatchProducts: boolean;
  canManageStock: boolean;
  canReceiveStock: boolean;
  canTransferStock: boolean;
  canConfigurePricing: boolean;
  canViewReports: boolean;
  canViewConsolidatedReports: boolean;
  requiresParentUnit: boolean;
  dashboardMode: "operational" | "stock" | "sales" | "administrative" | "service";
  summary: string;
};

export type BusinessSegmentConfigOption<T extends string> = {
  value: T;
  label: string;
  descricao: string;
};

export const DEFAULT_BUSINESS_GROUP_ID = "grupo-alberto";
export const DEFAULT_BUSINESS_GROUP_NAME = "Grupo Alberto";

export const STORE_TYPE_OPTIONS: StoreTypeOption[] = [
  {
    value: "farmacia",
    label: "Farmácia",
    descricao: "Medicamentos, validades, receitas e margens farmacêuticas",
    defaultModuleId: "farmacia",
  },
  {
    value: "colegio",
    label: "Escola / Colégio Privado",
    descricao: "Gestão escolar, mensalidades, material e serviços educacionais",
    defaultModuleId: "colegio",
  },
  {
    value: "papelaria_informatica",
    label: "Papelaria & Informática",
    descricao: "Material escolar, escritório, consumíveis e equipamentos informáticos",
    defaultModuleId: "papelaria_informatica",
  },
  {
    value: "informatica",
    label: "Informática",
    descricao: "Computadores, periféricos, acessórios, software e garantias",
    defaultModuleId: "informatica",
  },
  {
    value: "ortopedico_hospitalar",
    label: "Ortopédicos & Equip. Hospitalares",
    descricao: "Consumíveis ortopédicos, equipamentos hospitalares e dispositivos médicos",
    defaultModuleId: "ortopedico_hospitalar",
  },
  {
    value: "ortopedico",
    label: "Ortopédico",
    descricao: "Loja de material ortopédico",
    defaultModuleId: "ortopedico_hospitalar",
  },
  {
    value: "mobiliario_escolar_escritorio",
    label: "Mobiliário Escolar & Escritório",
    descricao: "Carteiras, cadeiras, armários, mesas e mobiliário administrativo",
    defaultModuleId: "mobiliario_escolar_escritorio",
  },
  {
    value: "escritorio_central",
    label: "Escritório Central",
    descricao: "Administração do grupo e visão consolidada dos negócios",
    defaultModuleId: "escritorio_central",
  },
  {
    value: "generico",
    label: "Genérico",
    descricao: "Outro tipo de loja ou negócio ainda não especializado",
    defaultModuleId: "outro",
  },
];

export const BUSINESS_SEGMENT_OPTIONS: BusinessSegmentOption[] = [
  {
    id: "farmacias",
    label: "Farmácias",
    descricao: "Farmácias, postos farmacêuticos, armazéns e unidades de apoio",
    defaultStoreType: "farmacia",
    defaultUnitType: "farmacia",
    defaultModuleId: "farmacia",
  },
  {
    id: "escola_colegio",
    label: "Escola / Colégio Privado",
    descricao: "Unidades escolares, secretaria, tesouraria e serviços educacionais",
    defaultStoreType: "colegio",
    defaultUnitType: "escola",
    defaultModuleId: "colegio",
  },
  {
    id: "papelaria_informatica",
    label: "Papelaria & Informática",
    descricao: "Lojas, postos de venda e armazéns de material escolar, escritório e informática",
    defaultStoreType: "papelaria_informatica",
    defaultUnitType: "loja",
    defaultModuleId: "papelaria_informatica",
  },
  {
    id: "ortopedico_hospitalar",
    label: "Consumíveis Ortopédicos & Equipamentos Hospitalares",
    descricao: "Produtos ortopédicos, equipamentos hospitalares e dispositivos médicos",
    defaultStoreType: "ortopedico_hospitalar",
    defaultUnitType: "loja",
    defaultModuleId: "ortopedico_hospitalar",
  },
  {
    id: "mobiliario_escolar_escritorio",
    label: "Mobiliário Escolar & Escritório",
    descricao: "Mobiliário administrativo, escolar e comercial",
    defaultStoreType: "mobiliario_escolar_escritorio",
    defaultUnitType: "loja",
    defaultModuleId: "mobiliario_escolar_escritorio",
  },
  {
    id: "escritorio_central",
    label: "Escritório Central",
    descricao: "Administração geral, gestão consolidada e controlo do grupo",
    defaultStoreType: "escritorio_central",
    defaultUnitType: "escritorio_central",
    defaultModuleId: "escritorio_central",
  },
  {
    id: "generico",
    label: "Outro Negócio",
    descricao: "Segmento ainda sem módulo especializado",
    defaultStoreType: "generico",
    defaultUnitType: "generico",
    defaultModuleId: "outro",
  },
];

export const OPERATIONAL_UNIT_TYPE_OPTIONS: OperationalUnitTypeOption[] = [
  {
    value: "loja",
    label: "Loja",
    descricao: "Unidade que vende, fatura e movimenta stock próprio",
  },
  {
    value: "farmacia",
    label: "Farmácia",
    descricao: "Unidade farmacêutica com produtos, margens e regras de farmácia",
  },
  {
    value: "armazem",
    label: "Armazém",
    descricao: "Recebe, guarda e transfere stock; normalmente não vende ao público",
  },
  {
    value: "posto_venda",
    label: "Posto de Venda",
    descricao: "Ponto de venda dependente de uma loja ou armazém",
  },
  {
    value: "escritorio_central",
    label: "Escritório Central",
    descricao: "Unidade administrativa para gestão e relatórios consolidados",
  },
  {
    value: "escola",
    label: "Escola / Colégio",
    descricao: "Unidade escolar com lógica própria de serviços e operações",
  },
  {
    value: "servico",
    label: "Unidade de Serviço",
    descricao: "Área operacional sem venda direta de produto físico",
  },
  {
    value: "generico",
    label: "Unidade Genérica",
    descricao: "Unidade operacional ainda sem classificação específica",
  },
];

export const OPERATIONAL_UNIT_RULES: Record<OperationalUnitType, OperationalUnitRules> = {
  loja: {
    canSell: true,
    canIssueSalesDocuments: true,
    canManageProducts: true,
    canRegisterBatchProducts: true,
    canManageStock: true,
    canReceiveStock: true,
    canTransferStock: true,
    canConfigurePricing: true,
    canViewReports: true,
    canViewConsolidatedReports: false,
    requiresParentUnit: false,
    dashboardMode: "operational",
    summary: "Vende, fatura, gere produtos e movimenta stock próprio.",
  },
  farmacia: {
    canSell: true,
    canIssueSalesDocuments: true,
    canManageProducts: true,
    canRegisterBatchProducts: true,
    canManageStock: true,
    canReceiveStock: true,
    canTransferStock: true,
    canConfigurePricing: true,
    canViewReports: true,
    canViewConsolidatedReports: false,
    requiresParentUnit: false,
    dashboardMode: "operational",
    summary: "Vende, fatura, gere produtos farmacêuticos, margens e validade.",
  },
  armazem: {
    canSell: false,
    canIssueSalesDocuments: false,
    canManageProducts: true,
    canRegisterBatchProducts: true,
    canManageStock: true,
    canReceiveStock: true,
    canTransferStock: true,
    canConfigurePricing: false,
    canViewReports: true,
    canViewConsolidatedReports: false,
    requiresParentUnit: false,
    dashboardMode: "stock",
    summary: "Recebe, guarda e transfere stock; não vende ao público.",
  },
  posto_venda: {
    canSell: true,
    canIssueSalesDocuments: true,
    canManageProducts: false,
    canRegisterBatchProducts: false,
    canManageStock: true,
    canReceiveStock: false,
    canTransferStock: false,
    canConfigurePricing: false,
    canViewReports: true,
    canViewConsolidatedReports: false,
    requiresParentUnit: true,
    dashboardMode: "sales",
    summary: "Vende ao público usando stock próprio ou vinculado a uma unidade principal.",
  },
  escritorio_central: {
    canSell: false,
    canIssueSalesDocuments: false,
    canManageProducts: false,
    canRegisterBatchProducts: false,
    canManageStock: false,
    canReceiveStock: false,
    canTransferStock: false,
    canConfigurePricing: true,
    canViewReports: true,
    canViewConsolidatedReports: true,
    requiresParentUnit: false,
    dashboardMode: "administrative",
    summary: "Administra o grupo, utilizadores, configurações e relatórios consolidados.",
  },
  escola: {
    canSell: false,
    canIssueSalesDocuments: false,
    canManageProducts: false,
    canRegisterBatchProducts: false,
    canManageStock: false,
    canReceiveStock: false,
    canTransferStock: false,
    canConfigurePricing: true,
    canViewReports: true,
    canViewConsolidatedReports: false,
    requiresParentUnit: false,
    dashboardMode: "service",
    summary: "Unidade educacional; usa regras próprias fora do fluxo comercial comum.",
  },
  servico: {
    canSell: false,
    canIssueSalesDocuments: false,
    canManageProducts: false,
    canRegisterBatchProducts: false,
    canManageStock: false,
    canReceiveStock: false,
    canTransferStock: false,
    canConfigurePricing: true,
    canViewReports: true,
    canViewConsolidatedReports: false,
    requiresParentUnit: false,
    dashboardMode: "service",
    summary: "Unidade de serviço sem venda direta de produto físico.",
  },
  generico: {
    canSell: true,
    canIssueSalesDocuments: true,
    canManageProducts: true,
    canRegisterBatchProducts: true,
    canManageStock: true,
    canReceiveStock: true,
    canTransferStock: true,
    canConfigurePricing: true,
    canViewReports: true,
    canViewConsolidatedReports: false,
    requiresParentUnit: false,
    dashboardMode: "operational",
    summary: "Unidade comercial genérica com vendas, produtos e stock ativos.",
  },
};

export const CATEGORY_SCOPE_OPTIONS: BusinessSegmentConfigOption<CategoryScope>[] = [
  {
    value: "segment",
    label: "Por segmento",
    descricao: "As categorias e margens são partilhadas por unidades do mesmo negócio.",
  },
  {
    value: "unit",
    label: "Por unidade",
    descricao: "Cada loja, farmácia ou unidade pode ter categorias e margens próprias.",
  },
  {
    value: "global",
    label: "Global do grupo",
    descricao: "As categorias e margens são administradas de forma centralizada.",
  },
];

export const PRICING_POLICY_OPTIONS: BusinessSegmentConfigOption<PricingPolicy>[] = [
  {
    value: "regulated",
    label: "Regulada",
    descricao: "Usa margens controladas e atenção a limites do setor.",
  },
  {
    value: "cost_plus",
    label: "Custo + margem",
    descricao: "Calcula preço pelo custo real de entrada mais margem definida.",
  },
  {
    value: "service",
    label: "Serviço",
    descricao: "Usa preços por serviços, mensalidades ou pacotes.",
  },
  {
    value: "admin",
    label: "Administrativa",
    descricao: "Usada para centros de gestão, sem venda direta.",
  },
];

export const STOCK_POLICY_OPTIONS: BusinessSegmentConfigOption<StockPolicy>[] = [
  {
    value: "expiry_controlled",
    label: "Com validade",
    descricao: "Exige controlo de lote, validade e alertas de vencimento.",
  },
  {
    value: "serialized",
    label: "Com série/garantia",
    descricao: "Permite controlar número de série, garantia e assistência.",
  },
  {
    value: "standard",
    label: "Stock padrão",
    descricao: "Movimenta entradas, saídas, mínimo e transferências normais.",
  },
  {
    value: "service",
    label: "Serviço",
    descricao: "Sem stock comercial principal, mas pode suportar materiais internos.",
  },
  {
    value: "none",
    label: "Sem stock",
    descricao: "Unidade administrativa ou serviço sem inventário próprio.",
  },
];

export const SALES_DOCUMENT_MODE_OPTIONS: BusinessSegmentConfigOption<SalesDocumentMode>[] = [
  {
    value: "invoice_receipt",
    label: "Fatura-recibo",
    descricao: "Documento de venda completo para recebimento imediato.",
  },
  {
    value: "receipt",
    label: "Recibo",
    descricao: "Comprovativo simples de pagamento ou serviço.",
  },
  {
    value: "internal",
    label: "Documento interno",
    descricao: "Usado em transferências, requisições ou controlo interno.",
  },
  {
    value: "none",
    label: "Sem documento de venda",
    descricao: "Unidade sem venda direta ao cliente.",
  },
];

export const BUSINESS_SEGMENT_CONFIG_DEFAULTS: Record<string, BusinessSegmentConfig> = {
  farmacias: {
    categoryScope: "segment",
    pricingPolicy: "regulated",
    stockPolicy: "expiry_controlled",
    salesDocumentMode: "invoice_receipt",
    defaultMargin: 32,
    defaultTaxRate: 0,
    allowNegativeStock: false,
    requiresExpiryControl: true,
    requiresSerialNumber: false,
    notes: "Margens farmacêuticas, validade, lote e alertas regulatórios ativos.",
  },
  escola_colegio: {
    categoryScope: "segment",
    pricingPolicy: "service",
    stockPolicy: "service",
    salesDocumentMode: "receipt",
    defaultMargin: 0,
    defaultTaxRate: 0,
    allowNegativeStock: false,
    requiresExpiryControl: false,
    requiresSerialNumber: false,
    notes: "Serviços escolares, mensalidades e itens internos fora do fluxo comercial comum.",
  },
  papelaria_informatica: {
    categoryScope: "segment",
    pricingPolicy: "cost_plus",
    stockPolicy: "serialized",
    salesDocumentMode: "invoice_receipt",
    defaultMargin: 35,
    defaultTaxRate: 0,
    allowNegativeStock: false,
    requiresExpiryControl: false,
    requiresSerialNumber: true,
    notes: "Papelaria usa stock padrão; informática pode exigir série, garantia e assistência.",
  },
  ortopedico_hospitalar: {
    categoryScope: "segment",
    pricingPolicy: "cost_plus",
    stockPolicy: "expiry_controlled",
    salesDocumentMode: "invoice_receipt",
    defaultMargin: 35,
    defaultTaxRate: 0,
    allowNegativeStock: false,
    requiresExpiryControl: true,
    requiresSerialNumber: true,
    notes: "Controla validade para consumíveis e número de série para equipamentos hospitalares.",
  },
  mobiliario_escolar_escritorio: {
    categoryScope: "segment",
    pricingPolicy: "cost_plus",
    stockPolicy: "standard",
    salesDocumentMode: "invoice_receipt",
    defaultMargin: 30,
    defaultTaxRate: 0,
    allowNegativeStock: false,
    requiresExpiryControl: false,
    requiresSerialNumber: false,
    notes: "Stock físico padrão para mobiliário escolar, escritório e entregas.",
  },
  escritorio_central: {
    categoryScope: "global",
    pricingPolicy: "admin",
    stockPolicy: "none",
    salesDocumentMode: "none",
    defaultMargin: 0,
    defaultTaxRate: 0,
    allowNegativeStock: false,
    requiresExpiryControl: false,
    requiresSerialNumber: false,
    notes: "Gestão central sem venda direta, com visão consolidada e políticas do grupo.",
  },
  generico: {
    categoryScope: "unit",
    pricingPolicy: "cost_plus",
    stockPolicy: "standard",
    salesDocumentMode: "receipt",
    defaultMargin: 25,
    defaultTaxRate: 0,
    allowNegativeStock: false,
    requiresExpiryControl: false,
    requiresSerialNumber: false,
    notes: "Configuração comercial padrão para negócios ainda não especializados.",
  },
};

export function getDefaultModuleForStoreType(type?: string): string {
  return STORE_TYPE_OPTIONS.find((option) => option.value === type)?.defaultModuleId || "outro";
}

export function getStoreTypeLabel(type?: string): string {
  return STORE_TYPE_OPTIONS.find((option) => option.value === type)?.label || type || "Genérico";
}

export function getStoreModuleId(store?: Pick<Store, "tipo" | "moduleId"> | null): string {
  return store?.moduleId || getDefaultModuleForStoreType(store?.tipo);
}

export function getBusinessSegmentById(segmentId?: string): BusinessSegmentOption {
  return (
    BUSINESS_SEGMENT_OPTIONS.find((segment) => segment.id === segmentId) ||
    BUSINESS_SEGMENT_OPTIONS.find((segment) => segment.id === "generico") ||
    BUSINESS_SEGMENT_OPTIONS[0]
  );
}

export function getDefaultBusinessSegmentForStoreType(type?: string): BusinessSegmentOption {
  return (
    BUSINESS_SEGMENT_OPTIONS.find((segment) => segment.defaultStoreType === type) ||
    BUSINESS_SEGMENT_OPTIONS.find((segment) => segment.id === "generico") ||
    BUSINESS_SEGMENT_OPTIONS[0]
  );
}

export function getOperationalUnitLabel(unitType?: string): string {
  return OPERATIONAL_UNIT_TYPE_OPTIONS.find((option) => option.value === unitType)?.label || "Unidade";
}

export function getStoreBusinessSegmentLabel(store?: Pick<Store, "tipo" | "businessSegmentId" | "businessSegmentName"> | null): string {
  if (store?.businessSegmentName) return store.businessSegmentName;
  if (store?.businessSegmentId) return getBusinessSegmentById(store.businessSegmentId).label;
  return getDefaultBusinessSegmentForStoreType(store?.tipo).label;
}

export function getStoreOperationalUnitLabel(store?: Pick<Store, "tipo" | "unitType"> | null): string {
  if (store?.unitType) return getOperationalUnitLabel(store.unitType);
  return getOperationalUnitLabel(getDefaultBusinessSegmentForStoreType(store?.tipo).defaultUnitType);
}

export function getOperationalUnitRules(unitType?: string): OperationalUnitRules {
  const normalizedUnitType = OPERATIONAL_UNIT_TYPE_OPTIONS.some((option) => option.value === unitType)
    ? (unitType as OperationalUnitType)
    : "generico";

  return OPERATIONAL_UNIT_RULES[normalizedUnitType];
}

export function getBusinessSegmentConfigDefaults(segmentId?: string): BusinessSegmentConfig {
  return BUSINESS_SEGMENT_CONFIG_DEFAULTS[segmentId || ""] || BUSINESS_SEGMENT_CONFIG_DEFAULTS.generico;
}

export function mergeBusinessSegmentConfig(
  segmentId?: string,
  config?: Partial<BusinessSegmentConfig> | null
): BusinessSegmentConfig {
  return {
    ...getBusinessSegmentConfigDefaults(segmentId),
    ...(config || {}),
  };
}

export function getBusinessSegmentConfigSummary(config: BusinessSegmentConfig): string {
  const pricing = PRICING_POLICY_OPTIONS.find((option) => option.value === config.pricingPolicy)?.label || "Preço";
  const stock = STOCK_POLICY_OPTIONS.find((option) => option.value === config.stockPolicy)?.label || "Stock";
  const documentMode =
    SALES_DOCUMENT_MODE_OPTIONS.find((option) => option.value === config.salesDocumentMode)?.label || "Documento";

  return `${pricing} · ${stock} · ${documentMode} · Margem base ${config.defaultMargin}%`;
}

export function getStoreOperationalRules(store?: Pick<Store, "tipo" | "unitType"> | null): OperationalUnitRules {
  const unitType = store?.unitType || getDefaultBusinessSegmentForStoreType(store?.tipo).defaultUnitType;
  return getOperationalUnitRules(unitType);
}

export function isNavigationAllowedForUnit(itemId: string, unitType?: string): boolean {
  const rules = getOperationalUnitRules(unitType);

  if (["vendas"].includes(itemId)) return rules.canSell;
  if (["add-product", "edit-product", "batch-products"].includes(itemId)) {
    return rules.canManageProducts;
  }
  if (["products", "reverse-calculator", "alertas"].includes(itemId)) {
    return rules.canManageProducts || rules.canManageStock;
  }
  if (["categories"].includes(itemId)) return rules.canConfigurePricing || rules.canManageProducts;
  if (["reports", "history"].includes(itemId)) return rules.canViewReports;

  return true;
}

export function normalizeStoreBusinessScope<T extends Partial<Store>>(store: T): T & Pick<
  Store,
  "businessGroupId" | "businessGroupName" | "businessSegmentId" | "businessSegmentName" | "unitType" | "moduleId"
> {
  const segment = store.businessSegmentId
    ? getBusinessSegmentById(store.businessSegmentId)
    : getDefaultBusinessSegmentForStoreType(store.tipo);

  return {
    ...store,
    businessGroupId: store.businessGroupId || DEFAULT_BUSINESS_GROUP_ID,
    businessGroupName: store.businessGroupName || DEFAULT_BUSINESS_GROUP_NAME,
    businessSegmentId: store.businessSegmentId || segment.id,
    businessSegmentName: store.businessSegmentName || segment.label,
    unitType: store.unitType || segment.defaultUnitType,
    moduleId: store.moduleId || segment.defaultModuleId || getDefaultModuleForStoreType(store.tipo),
  } as T & Pick<
    Store,
    "businessGroupId" | "businessGroupName" | "businessSegmentId" | "businessSegmentName" | "unitType" | "moduleId"
  >;
}
