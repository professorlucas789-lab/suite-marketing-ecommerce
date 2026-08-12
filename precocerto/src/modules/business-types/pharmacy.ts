import { BusinessModuleConfig } from "./types";

export const pharmacyModule: BusinessModuleConfig = {
  id: "farmacia",
  name: "Farmácia",
  icon: "Pill",
  color: "emerald-600",
  description: "Módulo especializado para farmácias com controle sanitário, validades críticas de lotes e produtos de receita obrigatória.",
  categories: [
    "Medicamentos",
    "Genéricos",
    "Controlados",
    "Vitaminas",
    "Suplementos",
    "Cosméticos",
    "Materiais Hospitalares",
    "Primeiros Socorros",
    "Higiene",
    "Infantil"
  ],
  purchaseUnits: ["caixa", "frasco", "pote", "unidade", "fardo", "pacote"],
  saleUnits: ["comprimido", "ampola", "frasco", "sachê", "unidade", "cartela", "blister", "lâmina"],
  requiredFields: ["nome", "custoCompra", "quantidade", "margemDesejada", "farmaciaPrincipioAtivo", "farmaciaDosagem", "farmaciaDataValidade"],
  optionalFields: ["fornecedor", "observacoes", "farmaciaNomeComercial", "farmaciaLaboratorio", "farmaciaLote", "farmaciaNecessitaReceita", "ean"],
  advancedFields: ["custoTransporte", "custoEmbalagem", "outrosCustos"],
  productExtraFields: [
    {
      key: "farmaciaNomeComercial",
      label: "Nome Comercial",
      type: "text",
      placeholder: "Ex: Tylenol, Voltaren"
    },
    {
      key: "farmaciaPrincipioAtivo",
      label: "Princípio Ativo",
      type: "text",
      placeholder: "Ex: Paracetamol, Ibuprofeno",
      required: true
    },
    {
      key: "farmaciaDosagem",
      label: "Dosagem",
      type: "text",
      placeholder: "Ex: 500mg, 10ml",
      required: true
    },
    {
      key: "farmaciaFormaFarmaceutica",
      label: "Forma Farmacêutica",
      type: "select",
      options: ["comprimido", "cápsula", "ampola", "frasco", "sachê", "xarope", "creme/pomada", "colírio", "outro"]
    },
    {
      key: "farmaciaLaboratorio",
      label: "Laboratório / Fabricante",
      type: "text",
      placeholder: "Ex: Medley, EMS"
    },
    {
      key: "farmaciaLote",
      label: "Lote",
      type: "text",
      placeholder: "Ex: LOT12345"
    },
    {
      key: "farmaciaDataValidade",
      label: "Data de Validade",
      type: "date",
      required: true
    },
    {
      key: "farmaciaNecessitaReceita",
      label: "Necessita Receita?",
      type: "select",
      options: ["não", "sim", "não informado"]
    },
    {
      key: "ean",
      label: "Código de Barras (EAN)",
      type: "text",
      placeholder: "Código EAN-13"
    }
  ],
  dashboardCards: [
    {
      id: "produtos_controlados",
      title: "Produtos Controlados",
      description: "Medicamentos que exigem apresentação de receita",
      bgGradient: "from-emerald-50 to-teal-50 dark:from-emerald-950/10 dark:to-teal-950/10",
      borderColor: "border-emerald-100 dark:border-emerald-900/20",
      textColor: "text-emerald-700 dark:text-emerald-400",
      type: "count",
      getValue: (products) => products.filter((p) => p.farmaciaNecessitaReceita === "sim").length
    },
    {
      id: "validades_criticas",
      title: "Validades Críticas",
      description: "Lotes vencendo nos próximos 90 dias",
      bgGradient: "from-rose-50 to-red-50 dark:from-rose-950/10 dark:to-red-950/10",
      borderColor: "border-rose-100 dark:border-rose-900/20",
      textColor: "text-rose-600 dark:text-rose-400",
      type: "count",
      getValue: (products) =>
        products.filter((p) => {
          if (!p.farmaciaDataValidade) return false;
          const expiryDate = new Date(p.farmaciaDataValidade).getTime();
          const ninetyDaysInMs = 90 * 24 * 3600 * 1000;
          return expiryDate - Date.now() < ninetyDaysInMs;
        }).length
    },
    {
      id: "formas_farmaceuticas",
      title: "Formatos Ativos",
      description: "Formas farmacêuticas distintas no catálogo",
      bgGradient: "from-indigo-50 to-blue-50 dark:from-indigo-950/10 dark:to-blue-950/10",
      borderColor: "border-indigo-100 dark:border-indigo-900/20",
      textColor: "text-indigo-600 dark:text-indigo-400",
      type: "count",
      getValue: (products) =>
        Array.from(new Set(products.map((p) => p.farmaciaFormaFarmaceutica).filter(Boolean))).length
    }
  ],
  alerts: [
    {
      id: "vencidos",
      title: "Produtos Vencidos",
      type: "danger",
      description: "Medicamentos que atingiram a data limite de validade e devem ser retirados de stock.",
      check: (products) =>
        products.some((p) => {
          if (!p.farmaciaDataValidade) return false;
          return new Date(p.farmaciaDataValidade).getTime() < Date.now();
        }),
      getAffectedCount: (products) =>
        products.filter((p) => {
          if (!p.farmaciaDataValidade) return false;
          return new Date(p.farmaciaDataValidade).getTime() < Date.now();
        }).length
    },
    {
      id: "validades_proximas",
      title: "Lotes Próximos do Fim",
      type: "warning",
      description: "Medicamentos com menos de 90 dias restantes para o vencimento.",
      check: (products) =>
        products.some((p) => {
          if (!p.farmaciaDataValidade) return false;
          const expiry = new Date(p.farmaciaDataValidade).getTime();
          return expiry > Date.now() && expiry - Date.now() < 90 * 24 * 3600 * 1000;
        }),
      getAffectedCount: (products) =>
        products.filter((p) => {
          if (!p.farmaciaDataValidade) return false;
          const expiry = new Date(p.farmaciaDataValidade).getTime();
          return expiry > Date.now() && expiry - Date.now() < 90 * 24 * 3600 * 1000;
        }).length
    }
  ],
  calculationRules: {
    name: "Fracionamento Farmacêutico",
    description: "Cálculo especializado de preço de retalho por comprimido ou ampola baseado na divisão de caixas fechadas.",
    applyModuleSpecificRules: (product, baseValues) => {
      // Pharmacy specific: compute fractions if fracionado/retalho is used
      return { ...baseValues };
    }
  },
  validationRules: {
    name: "Regulação Sanitária",
    description: "Garante o registo de Princípio Ativo e Data de Validade obrigatórios.",
    validate: (product) => {
      if (!product.farmaciaPrincipioAtivo?.trim()) {
        return "Para medicamentos, o Princípio Ativo é de preenchimento estritamente obrigatório.";
      }
      if (!product.farmaciaDataValidade) {
        return "Para medicamentos, a Data de Validade é obrigatória para controle de segurança.";
      }
      return null;
    }
  }
};
