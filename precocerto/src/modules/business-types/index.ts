import { BusinessModuleConfig } from "./types";
import { pharmacyModule } from "./pharmacy";
import { supermarketModule } from "./supermarket";
import { boutiqueModule } from "./boutique";
import { restaurantModule } from "./restaurant";
import { schoolSuppliesModule } from "./school-supplies";
import { defaultModule } from "./default";
import { exampleBusinessModule } from "./example-business";

// Export all types and modular configs
export * from "./types";
export {
  pharmacyModule,
  supermarketModule,
  boutiqueModule,
  restaurantModule,
  schoolSuppliesModule,
  defaultModule,
  exampleBusinessModule
};

// Other existing modules mapped as BusinessModuleConfig for maximum backward compatibility and zero regression
const merceariaModule: BusinessModuleConfig = {
  id: "mercearia",
  name: "Mercearia",
  icon: "Store",
  color: "amber-600",
  description: "Módulo para minimercados e pequenos comércios de conveniência de cesta básica.",
  categories: ["Farinhas", "Arroz & Grãos", "Óleos", "Lataria", "Higiene", "Limpeza", "Bebidas", "Snacks", "Outros"],
  purchaseUnits: ["unidade", "pacote", "caixa", "saco", "kg", "grama", "litro", "ml"],
  saleUnits: ["unidade", "pacote", "kg", "grama", "litro", "ml"],
  requiredFields: ["nome", "custoCompra", "quantidade", "margemDesejada"],
  optionalFields: ["fornecedor", "observacoes", "marca", "prazoValidadeGeral"],
  advancedFields: ["custoTransporte", "custoEmbalagem", "outrosCustos"],
  productExtraFields: [
    { key: "marca", label: "Marca", type: "text", placeholder: "Ex: Tio João" },
    { key: "prazoValidadeGeral", label: "Validade", type: "date" }
  ],
  dashboardCards: [],
  alerts: [
    {
      id: "vencimento_breve",
      title: "Vencimento Próximo",
      type: "warning",
      description: "Produtos com data de validade vencendo nos próximos 30 dias.",
      check: (products) => products.some(p => p.prazoValidadeGeral && (new Date(p.prazoValidadeGeral).getTime() - Date.now() < 30 * 24 * 3600 * 1000)),
      getAffectedCount: (products) => products.filter(p => p.prazoValidadeGeral && (new Date(p.prazoValidadeGeral).getTime() - Date.now() < 30 * 24 * 3600 * 1000)).length
    }
  ],
  calculationRules: { name: "Cálculo Mercearia", description: "Cálculo padrão comercial." },
  validationRules: { name: "Validação Mercearia", description: "Validações comerciais básicas." }
};

const papelariaModule: BusinessModuleConfig = {
  id: "papelaria",
  name: "Papelaria",
  icon: "Notebook",
  color: "teal-600",
  description: "Módulo para lojas de papel e insumos de escritório, com controlo de serviços de impressão.",
  categories: ["Papéis", "Canetas & Lápis", "Pastas", "Envelopes", "Organização", "Artesanato", "Serviços (Impressões)"],
  purchaseUnits: ["unidade", "resma", "folhas", "caixa", "pacote", "dúzia"],
  saleUnits: ["unidade", "resma", "folhas", "pacote"],
  requiredFields: ["nome", "custoCompra", "quantidade", "margemDesejada"],
  optionalFields: ["fornecedor", "observacoes", "gramagem", "marca"],
  advancedFields: ["custoTransporte", "custoEmbalagem", "outrosCustos"],
  productExtraFields: [
    { key: "gramagem", label: "Gramagem (papel)", type: "text", placeholder: "Ex: 75g, 80g, 120g" },
    { key: "marca", label: "Marca", type: "text", placeholder: "Ex: Chamex" }
  ],
  dashboardCards: [],
  alerts: [],
  calculationRules: { name: "Cálculo Papelaria", description: "Cálculo de custo por folha de papel mais insumo de impressão." },
  validationRules: { name: "Validação Papelaria", description: "Validações simples." }
};

const informaticaModule: BusinessModuleConfig = {
  id: "informatica",
  name: "Informática",
  icon: "Laptop",
  color: "cyan-600",
  description: "Módulo para lojas de hardware, computadores e periféricos com registo de números de série e garantias.",
  categories: ["Computadores", "Acessórios", "Componentes", "Monitores", "Redes", "Armazenamento", "Software"],
  purchaseUnits: ["unidade", "kit", "caixa", "licença"],
  saleUnits: ["unidade", "kit", "licença"],
  requiredFields: ["nome", "custoCompra", "quantidade", "margemDesejada", "marca", "modelo"],
  optionalFields: ["fornecedor", "observacoes", "especificacoes", "numSerie", "prazoGarantia"],
  advancedFields: ["custoTransporte", "custoEmbalagem", "outrosCustos"],
  productExtraFields: [
    { key: "marca", label: "Marca / Fabricante", type: "text", placeholder: "Ex: ASUS, HP, Dell", required: true },
    { key: "modelo", label: "Modelo Exato", type: "text", placeholder: "Ex: G15 5511", required: true },
    { key: "especificacoes", label: "Especificações Técnicas", type: "textarea", placeholder: "Ex: Core i7, 16GB RAM, 512GB SSD" },
    { key: "numSerie", label: "Número de Série", type: "text", placeholder: "Registo de garantia" },
    { key: "prazoGarantia", label: "Garantia (Meses)", type: "number", placeholder: "Ex: 12, 24" }
  ],
  dashboardCards: [],
  alerts: [
    {
      id: "garantia_vencendo",
      title: "Garantia Expirando",
      type: "info",
      description: "Produtos com prazo de garantia curto registado.",
      check: (products) => products.some(p => p.prazoGarantia && p.prazoGarantia < 3),
      getAffectedCount: (products) => products.filter(p => p.prazoGarantia && p.prazoGarantia < 3).length
    }
  ],
  calculationRules: { name: "Cálculo Informática", description: "Cálculo com incidência de custos de importação e taxas alfandegárias." },
  validationRules: { name: "Validação Informática", description: "Marca e modelo são obrigatórios." }
};

const ferragensModule: BusinessModuleConfig = {
  id: "ferragens",
  name: "Ferragens",
  icon: "Wrench",
  color: "slate-700",
  description: "Módulo especializado para ferragens, materiais elétricos e conexões de construção civil.",
  categories: ["Ferramentas", "Parafusos & Pregos", "Material Elétrico", "Canos & Conexões", "Pintura", "Segurança", "Químicos"],
  purchaseUnits: ["unidade", "cento", "caixa", "kg", "metro", "rolo", "lata", "saco"],
  saleUnits: ["unidade", "cento", "kg", "metro", "lata"],
  requiredFields: ["nome", "custoCompra", "quantidade", "margemDesejada"],
  optionalFields: ["fornecedor", "observacoes", "marca", "modelo", "material"],
  advancedFields: ["custoTransporte", "custoEmbalagem", "outrosCustos"],
  productExtraFields: [
    { key: "marca", label: "Marca", type: "text", placeholder: "Ex: Bosch, Tramontina" },
    { key: "modelo", label: "Referência / Medidas", type: "text", placeholder: "Ex: M8 50mm, 3/4 polegadas" },
    { key: "material", label: "Material / Acabamento", type: "text", placeholder: "Ex: Aço Inox, PVC" }
  ],
  dashboardCards: [],
  alerts: [],
  calculationRules: { name: "Cálculo Ferragens", description: "Conversão de rolos e fardos em metros lineares ou peças fracionadas." },
  validationRules: { name: "Validação Ferragens", description: "Validações simples de stock." }
};

const padariaModule: BusinessModuleConfig = {
  id: "padaria",
  name: "Padaria",
  icon: "Cookie",
  color: "yellow-700",
  description: "Módulo focado na panificação com rateio de desperdício diário médio e custos de forno.",
  categories: ["Pães", "Bolos", "Salgados", "Doces", "Bebidas", "Cafetaria"],
  purchaseUnits: ["unidade", "kg", "grama", "cento"],
  saleUnits: ["unidade", "kg", "grama", "porção"],
  requiredFields: ["nome", "custoCompra", "quantidade", "margemDesejada"],
  optionalFields: ["fornecedor", "observacoes", "ingredientesPrincipais", "tempoPreparo"],
  advancedFields: ["custoTransporte", "custoEmbalagem", "outrosCustos"],
  productExtraFields: [
    { key: "ingredientesPrincipais", label: "Ingredientes Principais", type: "textarea", placeholder: "Ex: Farinha, Fermento, Manteiga" },
    { key: "tempoPreparo", label: "Tempo de Preparo (min)", type: "number", placeholder: "Ex: 45" }
  ],
  dashboardCards: [],
  alerts: [],
  calculationRules: { name: "Cálculo Padaria", description: "Rateio de custos fixos de fornos mais provisão de 15% de quebra por perdas." },
  validationRules: { name: "Validação Padaria", description: "Validações financeiras gerais." }
};

const cosmeticosModule: BusinessModuleConfig = {
  id: "cosmeticos",
  name: "Cosméticos",
  icon: "Sparkles",
  color: "purple-500",
  description: "Módulo de beleza com foco em marcas e validades de cremes ou maquilhagem de alta rotação.",
  categories: ["Maquilhagem", "Cabelos", "Pele", "Unhas", "Acessórios"],
  purchaseUnits: ["unidade", "kit", "frasco", "pote", "caixa"],
  saleUnits: ["unidade", "kit", "frasco", "pote"],
  requiredFields: ["nome", "custoCompra", "quantidade", "margemDesejada", "marca"],
  optionalFields: ["fornecedor", "observacoes", "modelo", "cor", "validadeCosmetico"],
  advancedFields: ["custoTransporte", "custoEmbalagem", "outrosCustos"],
  productExtraFields: [
    { key: "marca", label: "Marca / Fabricante", type: "text", placeholder: "Ex: L'Oréal, Ruby Rose", required: true },
    { key: "modelo", label: "Linha / Coleção", type: "text", placeholder: "Ex: Linha Matte" },
    { key: "cor", label: "Tom / Cor / Fragrância", type: "text", placeholder: "Ex: Tom 3" },
    { key: "validadeCosmetico", label: "Validade", type: "date" }
  ],
  dashboardCards: [],
  alerts: [],
  calculationRules: { name: "Cálculo Cosméticos", description: "Margem baseada no posicionamento premium." },
  validationRules: { name: "Validação Cosméticos", description: "A marca é estritamente obrigatória." }
};

const perfumariaModule: BusinessModuleConfig = {
  id: "perfumaria",
  name: "Perfumaria",
  icon: "SprayCan",
  color: "fuchsia-600",
  description: "Módulo para fragrâncias, com classificação por concentração de fragrância e volumes.",
  categories: ["Perfumes Masculinos", "Perfumes Femininos", "Infantil", "Kits & Presentes", "Desodorizantes"],
  purchaseUnits: ["unidade", "frasco", "ml", "kit"],
  saleUnits: ["unidade", "frasco", "ml", "kit"],
  requiredFields: ["nome", "custoCompra", "quantidade", "margemDesejada", "marca"],
  optionalFields: ["fornecedor", "observacoes", "tipoConcentracao", "volumeMl"],
  advancedFields: ["custoTransporte", "custoEmbalagem", "outrosCustos"],
  productExtraFields: [
    { key: "marca", label: "Grife / Marca", type: "text", placeholder: "Ex: Chanel, Dior", required: true },
    { key: "tipoConcentracao", label: "Concentração", type: "select", options: ["EDP (Eau de Parfum)", "EDT (Eau de Toilette)", "EDC (Eau de Cologne)", "Splash", "outro"] },
    { key: "volumeMl", label: "Volume (ml)", type: "number", placeholder: "Ex: 100" }
  ],
  dashboardCards: [],
  alerts: [],
  calculationRules: { name: "Cálculo Perfumaria", description: "Aplica taxas adicionais sobre perfumaria de luxo." },
  validationRules: { name: "Validação Perfumaria", description: "Volume e marca são recomendados." }
};

const bebidasModule: BusinessModuleConfig = {
  id: "bebidas",
  name: "Loja de Bebidas",
  icon: "Wine",
  color: "red-700",
  description: "Módulo para bebidas alcoólicas e refrigerantes com controle de vasilhames e tara.",
  categories: ["Cervejas", "Vinhos", "Espirituosas", "Refrigerantes", "Águas", "Sucos"],
  purchaseUnits: ["caixa", "fardo", "pacote", "unidade", "garrafa", "lata"],
  saleUnits: ["unidade", "garrafa", "lata", "ml"],
  requiredFields: ["nome", "custoCompra", "quantidade", "margemDesejada", "marca"],
  optionalFields: ["fornecedor", "observacoes", "volumeMl", "teorAlcoolico"],
  advancedFields: ["custoTransporte", "custoEmbalagem", "outrosCustos"],
  productExtraFields: [
    { key: "marca", label: "Marca / Fabricante", type: "text", placeholder: "Ex: Super Bock", required: true },
    { key: "volumeMl", label: "Volume Unitário (ml)", type: "number", placeholder: "Ex: 330" },
    { key: "teorAlcoolico", label: "Teor Alcoólico (%)", type: "text", placeholder: "Ex: 5.2" }
  ],
  dashboardCards: [],
  alerts: [],
  calculationRules: { name: "Cálculo Bebidas", description: "Controlo de grade e vasilhames recicláveis." },
  validationRules: { name: "Validação Bebidas", description: "Validações simples." }
};

const distribuidorModule: BusinessModuleConfig = {
  id: "distribuidor",
  name: "Distribuidor",
  icon: "Truck",
  color: "indigo-600",
  description: "Módulo para venda por atacado com cálculo de quantidade mínima de compra (MOQ) e descontos escalonados.",
  categories: ["Importados", "Nacionais", "Revenda", "Atacado"],
  purchaseUnits: ["palete", "contentor", "fardo", "caixa", "lote", "unidade"],
  saleUnits: ["fardo", "caixa", "unidade"],
  requiredFields: ["nome", "custoCompra", "quantidade", "margemDesejada", "quantidadeMinima", "precoAtacado"],
  optionalFields: ["fornecedor", "observacoes", "precoRetalho", "prazoEntrega"],
  advancedFields: ["custoTransporte", "custoEmbalagem", "outrosCustos"],
  productExtraFields: [
    { key: "quantidadeMinima", label: "Quantidade Mínima de Venda (MOQ)", type: "number", placeholder: "Ex: 50", required: true },
    { key: "precoAtacado", label: "Preço de Atacado (Kz)", type: "number", placeholder: "Preço para volumes", required: true },
    { key: "precoRetalho", label: "Preço Unitário Sugerido (Kz)", type: "number", placeholder: "Preço consumidor final" },
    { key: "prazoEntrega", label: "Prazo de Entrega do Fornecedor", type: "text", placeholder: "Ex: 15 dias" }
  ],
  dashboardCards: [],
  alerts: [],
  calculationRules: { name: "Cálculo Distribuidor", description: "Margem diferenciada e tabela rapel de volume." },
  validationRules: { name: "Validação Distribuidor", description: "MOQ e Preço de atacado são obrigatórios." }
};

const armazemModule: BusinessModuleConfig = {
  id: "armazem",
  name: "Armazém",
  icon: "Warehouse",
  color: "orange-700",
  description: "Módulo focado no controlo de stock espacial (corredores) e conservação de carga geral.",
  categories: ["Carga Geral", "Paletes", "Fardos", "Lotes Atacado", "Matérias-Primas"],
  purchaseUnits: ["palete", "caixa", "fardo", "tonelada", "kg", "unidade", "saco"],
  saleUnits: ["palete", "caixa", "fardo", "unidade"],
  requiredFields: ["nome", "custoCompra", "quantidade", "margemDesejada"],
  optionalFields: ["fornecedor", "observacoes", "localizacaoArmazem", "condicaoConservacao"],
  advancedFields: ["custoTransporte", "custoEmbalagem", "outrosCustos"],
  productExtraFields: [
    { key: "localizacaoArmazem", label: "Corredor / Prateleira", type: "text", placeholder: "Ex: Corredor B, Nível 3" },
    { key: "condicaoConservacao", label: "Condições de Armazenamento", type: "text", placeholder: "Ex: Fresco < 20°C" }
  ],
  dashboardCards: [],
  alerts: [],
  calculationRules: { name: "Cálculo Armazém", description: "Acréscimo de taxas de preservação por m³." },
  validationRules: { name: "Validação Armazém", description: "Registo de prateleira recomendado." }
};

const ALL_MODULES_RECORD: Record<string, BusinessModuleConfig> = {
  farmacia: pharmacyModule,
  supermercado: supermarketModule,
  boutique: boutiqueModule,
  restaurante: restaurantModule,
  "material-escolar": schoolSuppliesModule,
  mercearia: merceariaModule,
  papelaria: papelariaModule,
  informatica: informaticaModule,
  ferragens: ferragensModule,
  padaria: padariaModule,
  cosmeticos: cosmeticosModule,
  perfumaria: perfumariaModule,
  bebidas: bebidasModule,
  distribuidor: distribuidorModule,
  armazem: armazemModule,
  exemplo: exampleBusinessModule,
  outro: defaultModule
};

export const businessModuleRegistry = {
  /**
   * List all available modules.
   */
  getAllModules(): BusinessModuleConfig[] {
    return Object.values(ALL_MODULES_RECORD);
  },

  /**
   * Get module by id. Falls back to default module if not found.
   */
  getModuleById(id: string): BusinessModuleConfig {
    return ALL_MODULES_RECORD[id] || ALL_MODULES_RECORD.outro;
  },

  /**
   * Get default fallback module.
   */
  getDefaultModule(): BusinessModuleConfig {
    return ALL_MODULES_RECORD.outro;
  }
};
