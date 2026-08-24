/**
 * Imports for new types (Fase 1 - Categories)
 */
import type { CategoryMarginConfig } from './types/category';

export type CategoryScope = "segment" | "unit" | "global";
export type PricingPolicy = "regulated" | "cost_plus" | "service" | "admin";
export type StockPolicy = "expiry_controlled" | "serialized" | "standard" | "service" | "none";
export type SalesDocumentMode = "invoice_receipt" | "receipt" | "internal" | "none";

export interface BusinessSegmentConfig {
  categoryScope: CategoryScope;
  pricingPolicy: PricingPolicy;
  stockPolicy: StockPolicy;
  salesDocumentMode: SalesDocumentMode;
  defaultMargin: number;
  defaultTaxRate: number;
  allowNegativeStock: boolean;
  requiresExpiryControl: boolean;
  requiresSerialNumber: boolean;
  notes?: string;
}

export interface Product {
  id?: string;
  nome: string;
  categoria: string;
  fornecedor: string; // Obrigatório

  // FIX #3: Campos obrigatórios para cadastro de produtos
  numeroFatura: string; // Nº da Fatura (obrigatório)
  dataEmissaoFatura: string; // Data de emissão da fatura (obrigatório)

  // NOVO (Fase 1): Referência à categoria
  categoryId?: string; // FK para CategoryMarginConfig (opcional por compatibilidade)

  // NOVO (Fase 6): Multi-loja
  storeId: string; // ID da loja proprietária (obrigatório)
  storeName?: string; // Nome da loja (desnormalizado para queries)
  criadoPor?: string; // ID do utilizador que criou
  atualizadoPor?: string; // ID do último utilizador que editou
  dataAtualizacao?: string; // ISO 8601 do último update
  
  // Novas propriedades da Fase 3
  unidadeMedida?: string;
  modoCalculo?: "manual" | "lote";
  quantidade?: number; // Qtd comprada do lote
  quantidadeDisponivel?: number;
  quantidadeDisponível?: number; // Alias legado com acento usado por módulos antigos
  quantidadeVendida?: number;

  // Tipos de cálculo de custos adicionais ("unidade" | "lote")
  custoTransporteTipo?: "unidade" | "lote";
  custoEmbalagemTipo?: "unidade" | "lote";
  outrosCustosTipo?: "unidade" | "lote";
  comissaoVendaTipo?: "unidade" | "lote";
  taxaBancariaTipo?: "unidade" | "lote";
  taxaMarketplaceTipo?: "unidade" | "lote";
  custoPublicidadeTipo?: "unidade" | "lote";
  custoEntregaTipo?: "unidade" | "lote";
  combustivelTipo?: "unidade" | "lote";
  impostoTaxaTipo?: "unidade" | "lote";
  perdasDesperdiciosTipo?: "unidade" | "lote";
  energiaTipo?: "unidade" | "lote";
  internetTipo?: "unidade" | "lote";
  rendaTipo?: "unidade" | "lote";
  salarioTipo?: "unidade" | "lote";
  aguaTipo?: "unidade" | "lote";
  contabilidadeTipo?: "unidade" | "lote";
  segurancaTipo?: "unidade" | "lote";
  outrosCustosFixosTipo?: "unidade" | "lote";

  custoCompra: number;
  custoTransporte: number;
  custoEmbalagem: number;
  outrosCustos: number;

  // NOVO: Custo total real calculado (compra + transporte + embalagem + outros)
  custoTotalReal?: number; // Calculado dinamicamente

  // Novas variáveis Fase 2 (opcionais para compatibilidade)
  comissaoVenda?: number;
  taxaBancaria?: number;
  taxaMarketplace?: number;
  custoPublicidade?: number;
  custoEntrega?: number;
  combustivel?: number;
  impostoTaxa?: number;
  perdasDesperdicios?: number;

  energia?: number;
  internet?: number;
  renda?: number;
  salario?: number;
  agua?: number;
  contabilidade?: number;
  seguranca?: number;
  outrosCustosFixos?: number;

  margemDesejada: number; // in % - Agora herdada da categoria

  // NOVO (Fase 1): Override de margem (exceção quando justificada)
  margemOverride?: number; // Se null, usar da categoria
  margemOverrideReason?: string; // Por que é diferente da categoria

  // NOVO: Margem aplicada (para relatórios)
  margemAplicada?: number; // Margem efetivamente aplicada no produto

  // NOVO (Fase 1): Performance Metrics (será preenchido ao longo do tempo)
  performanceMetrics?: {
    unitsSoldLastMonth?: number;
    totalRevenueLastMonth?: number;
    observedMarginLastMonth?: number;
    turnoverRate?: number; // 0-1
    priceElasticity?: number;
    lastAnalyzedAt?: string; // ISO date
  };

  precoVendaRecomendado: number;
  preco?: number; // Alias legado para relatórios antigos
  lucroEstimado: number;
  margemReal: number; // in %
  roi?: number; // in %
  observacoes: string;
  userId: string;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
  dataCriacao?: string; // Alias legado usado em exportações

  // Novas propriedades da Fase 4: Conversão de Embalagem / Retalho
  tipoProduto?: string; // "produto comum" | "medicamento/farmácia" | "cosmético" | "alimentar" | "material escolar/escritório" | "outro"
  unidadeCompra?: string;
  unidadeVenda?: string;
  unidadesInternas?: number;
  venderEmbalagemInteira?: boolean;
  totalUnidadesVendaveis?: number;
  custoRealUnidadeVenda?: number;
  precoRecomendadoUnidadeVenda?: number;
  lucroUnidadeVenda?: number;
  receitaTotalEsperada?: number;
  lucroTotalEsperado?: number;
  loteCustoTotal?: number;
  loteVendaTotal?: number;
  loteLucroTotal?: number;

  // Propriedades específicas de Farmácia
  farmaciaNomeComercial?: string;
  farmaciaPrincipioAtivo?: string;
  farmaciaDosagem?: string;
  farmaciaFormaFarmaceutica?: string;
  farmaciaLaboratorio?: string;
  farmaciaLote?: string;
  farmaciaDataValidade?: string; // YYYY-MM-DD (específico de farmácia)
  farmaciaRegistroRegulatorio?: string;
  farmaciaNecessitaReceita?: "sim" | "não" | "não informado";

  // NOVO (Fase 1): Data de validade genérica (aplicável a todos módulos)
  expiryDate?: string; // YYYY-MM-DD - Data de expiração/vencimento
  lote?: string; // Número de lote (genérico, não apenas farmácia)
  condicaoArmazenamento?: string; // Condições de armazenamento (genérico)

  // Outros Módulos
  marca?: string;
  modelo?: string;
  cor?: string;
  tamanho?: string;
  colecao?: string;
  genero?: string;
  ean?: string;
  pesoLiquido?: string;
  gramagem?: string;
  especificacoes?: string;
  numSerie?: string;
  prazoGarantia?: number;
  material?: string;
  restauranteReceita?: string;
  restauranteIngredientes?: string;
  restaurantePeso?: number;
  restauranteRendimento?: number;
  ingredientesPrincipais?: string;
  tempoPreparo?: number;
  validadeCosmetico?: string;
  tipoConcentracao?: string;
  volumeMl?: number;
  teorAlcoolico?: string;
  quantidadeMinima?: number;
  precoAtacado?: number;
  precoRetalho?: number;
  prazoEntrega?: string;
  localizacaoArmazem?: string;
  condicaoConservacao?: string;
  prazoValidadeGeral?: string;
  migratedToGlobalCategories?: boolean;
}

export interface BusinessSettings {
  id?: string;
  userId: string;
  storeId?: string;
  storeName?: string;
  businessGroupId?: string;
  businessGroupName?: string;
  businessSegmentId?: string;
  businessSegmentName?: string;
  unitType?: string;
  companyName: string;
  businessType: string; // One of the options e.g. "farmacia", "supermercado", "outro"
  currency: string;
  country: string;
  language: string;
  logoUrl?: string;
  primaryColor: string;
  dateFormat: string;
  numberFormat: string;
  customCategories?: string[]; // user custom categories (Fase 12)
  segmentConfig?: BusinessSegmentConfig;

  // NOVO: Margem padrão da empresa
  defaultMargin?: number; // Margem padrão para novos produtos (%)
  taxRate?: number; // Alias legado para taxa/imposto padrão

  // NOVO (Fase 1): Framework regulatório (referência global)
  regulatoryFramework?: {
    businessType: string;
    maxMargins?: Record<string, number>; // "pharmacy" -> 35
    restrictionBodies?: string[];
    lastUpdated?: string;
  };

  createdAt?: string;
  updatedAt?: string;
}

export type ActiveTab = "dashboard" | "products" | "add-product" | "batch-products" | "categories" | "edit-product" | "reverse-calculator" | "alertas" | "estoque" | "vendas" | "clientes" | "fornecedores" | "financeiro" | "multi-loja" | "notificacoes" | "automacao" | "twilio-config" | "settings" | "history" | "reports" | "backup" | "users" | "stores" | "user-profile" | "diagnostics"; // NOVO (Fase 4 - Alertas) | NOVO (Fase 5 - Estoque) | NOVO (Fase 6 - Vendas/Clientes) | NOVO (Fase 7 - Fornecedores/Compras) | NOVO (Fase 8 - Financeiro) | NOVO (Fase 9 - Multi-Loja) | NOVO (Fase 10 - Notificações/Automação) | NOVO (Fase 11 - Integração Twilio) | NOVO (Fase 11 - User Profile) | NOVO: diagnostics

export interface PriceHistory {
  id?: string;
  productId: string;
  productName?: string; // Cache the name for general history listing
  productCategory?: string; // Cache category for filtering
  userId: string;
  previousPrice: number;
  newPrice: number;
  previousCost: number;
  newCost: number;
  previousMargin: number;
  newMargin: number;
  previousROI: number;
  newROI: number;
  previousProfit: number;
  newProfit: number;
  changeReason?: string;
  createdAt: string; // ISO string
}
