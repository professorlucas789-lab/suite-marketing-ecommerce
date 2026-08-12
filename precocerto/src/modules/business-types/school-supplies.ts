import { BusinessModuleConfig } from "./types";

export const schoolSuppliesModule: BusinessModuleConfig = {
  id: "material-escolar",
  name: "Material Escolar",
  icon: "BookOpen",
  color: "purple-600",
  description: "Módulo para papelarias, livrarias e lojas de material de escritório com suporte para kits escolares e unidades fracionadas.",
  categories: [
    "Cadernos",
    "Canetas",
    "Lápis",
    "Marcadores",
    "Livros",
    "Pastas",
    "Calculadoras",
    "Mochilas"
  ],
  purchaseUnits: ["unidade", "caixa", "pacote", "dúzia", "kit"],
  saleUnits: ["unidade", "caixa", "pacote", "dúzia", "kit"],
  requiredFields: ["nome", "custoCompra", "quantidade", "margemDesejada"],
  optionalFields: ["fornecedor", "observacoes", "marca", "modelo", "cor"],
  advancedFields: ["custoTransporte", "custoEmbalagem", "outrosCustos"],
  productExtraFields: [
    {
      key: "marca",
      label: "Marca",
      type: "text",
      placeholder: "Ex: Faber-Castell, Bic"
    },
    {
      key: "modelo",
      label: "Referência / Modelo",
      type: "text",
      placeholder: "Ex: Esferográfica 1.0mm"
    },
    {
      key: "cor",
      label: "Cor de Escrita / Detalhes",
      type: "text",
      placeholder: "Ex: Azul, Preto, Vermelho"
    }
  ],
  dashboardCards: [
    {
      id: "variedade_marcas",
      title: "Variedade de Marcas",
      description: "Número total de fabricantes registados",
      bgGradient: "from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10",
      borderColor: "border-purple-100 dark:border-purple-900/20",
      textColor: "text-purple-600 dark:text-purple-400",
      type: "count",
      getValue: (products) =>
        Array.from(new Set(products.map((p) => p.marca).filter(Boolean))).length
    }
  ],
  alerts: [
    {
      id: "baixo_stock",
      title: "Stock Sazonal Crítico",
      type: "warning",
      description: "Itens com menos de 5 unidades em stock durante regresso às aulas.",
      check: (products) => products.some((p) => p.quantidadeDisponivel !== undefined && p.quantidadeDisponivel < 5),
      getAffectedCount: (products) => products.filter((p) => p.quantidadeDisponivel !== undefined && p.quantidadeDisponivel < 5).length
    }
  ],
  calculationRules: {
    name: "Cálculo Escolar",
    description: "Divisão de caixas de canetas ou lápis em unidades individuais com margem ajustada de retalho."
  },
  validationRules: {
    name: "Registo Simples",
    description: "Permite registo simplificado de material escolar.",
    validate: () => null
  }
};
