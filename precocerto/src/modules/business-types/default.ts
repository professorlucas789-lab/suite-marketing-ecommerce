import { BusinessModuleConfig } from "./types";

export const defaultModule: BusinessModuleConfig = {
  id: "outro",
  name: "Outro (Geral)",
  icon: "Briefcase",
  color: "slate-600",
  description: "Módulo geral com regras clássicas de precificação comercial e rateio básico de custos fixos.",
  categories: ["Geral", "Serviços", "Projetos", "Especiais"],
  purchaseUnits: ["caixa", "fardo", "pacote", "unidade", "kg", "litro", "outro"],
  saleUnits: ["unidade", "pacote", "serviço", "hora", "kg", "litro", "outro"],
  requiredFields: ["nome", "custoCompra", "quantidade", "margemDesejada"],
  optionalFields: ["fornecedor", "observacoes"],
  advancedFields: ["custoTransporte", "custoEmbalagem", "outrosCustos"],
  productExtraFields: [
    {
      key: "ean",
      label: "Código de Barras / SKU",
      type: "text",
      placeholder: "Código interno ou EAN-13"
    },
    {
      key: "marca",
      label: "Marca / Fabricante",
      type: "text",
      placeholder: "Ex: Geral"
    }
  ],
  dashboardCards: [
    {
      id: "itens_gerais",
      title: "Itens Gerais",
      description: "Número total de itens registados sob este módulo",
      bgGradient: "from-slate-50 to-zinc-50 dark:from-slate-900/40 dark:to-zinc-900/40",
      borderColor: "border-slate-100 dark:border-slate-800",
      textColor: "text-slate-600 dark:text-slate-400",
      type: "count",
      getValue: (products) => products.length
    }
  ],
  alerts: [
    {
      id: "lucro_baixo",
      title: "Margem Crítica",
      type: "warning",
      description: "Produtos com margem real calculada abaixo de 10%",
      check: (products) => products.some((p) => p.margemReal < 10),
      getAffectedCount: (products) => products.filter((p) => p.margemReal < 10).length
    }
  ],
  calculationRules: {
    name: "Cálculo Geral",
    description: "Rateio padrão clássico de custos operacionais fixos e impostos sobre o preço sugerido.",
    calculateBasePricing: (product) => {
      return { baseCost: product.custoCompra };
    }
  },
  validationRules: {
    name: "Validação Geral",
    description: "Verifica se a margem desejada está positiva.",
    validate: (product) => {
      if (product.margemDesejada < 0) return "A margem desejada não pode ser negativa.";
      return null;
    }
  }
};
