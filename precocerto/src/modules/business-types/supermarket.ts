import { BusinessModuleConfig } from "./types";

export const supermarketModule: BusinessModuleConfig = {
  id: "supermercado",
  name: "Supermercado",
  icon: "ShoppingCart",
  color: "blue-600",
  description: "Módulo para retalho de grande consumo, supermercados e mercearias com suporte para código de barras (EAN-13) e fracionamento de fardos.",
  categories: [
    "Bebidas",
    "Carnes",
    "Congelados",
    "Limpeza",
    "Higiene",
    "Mercearia",
    "Laticínios",
    "Hortícolas",
    "Frutas",
    "Enlatados"
  ],
  purchaseUnits: ["caixa", "fardo", "pacote", "unidade", "kg", "litro"],
  saleUnits: ["unidade", "pacote", "kg", "grama", "litro", "ml"],
  requiredFields: ["nome", "custoCompra", "quantidade", "margemDesejada"],
  optionalFields: ["fornecedor", "observacoes", "ean", "marca", "pesoLiquido"],
  advancedFields: ["custoTransporte", "custoEmbalagem", "outrosCustos"],
  productExtraFields: [
    {
      key: "ean",
      label: "Código de Barras (EAN-13)",
      type: "text",
      placeholder: "Ex: 7891234567890"
    },
    {
      key: "marca",
      label: "Marca do Produto",
      type: "text",
      placeholder: "Ex: Nestlé, Coca-Cola"
    },
    {
      key: "pesoLiquido",
      label: "Peso Líquido / Volume",
      type: "text",
      placeholder: "Ex: 1kg, 350ml"
    }
  ],
  dashboardCards: [
    {
      id: "barcode_control",
      title: "Cobertura EAN",
      description: "Percentagem de itens com código de barras ativo",
      bgGradient: "from-blue-50 to-indigo-50 dark:from-blue-950/10 dark:to-indigo-950/10",
      borderColor: "border-blue-100 dark:border-blue-900/20",
      textColor: "text-blue-600 dark:text-blue-400",
      type: "percentage",
      getValue: (products) => {
        if (products.length === 0) return 0;
        const withEan = products.filter((p) => p.ean).length;
        return Math.round((withEan / products.length) * 100);
      }
    },
    {
      id: "marcas_parceiras",
      title: "Marcas Parceiras",
      description: "Fabricantes registados no catálogo de stock",
      bgGradient: "from-amber-50 to-orange-50 dark:from-amber-950/10 dark:to-orange-950/10",
      borderColor: "border-amber-100 dark:border-amber-900/20",
      textColor: "text-amber-600 dark:text-amber-400",
      type: "count",
      getValue: (products) =>
        Array.from(new Set(products.map((p) => p.marca).filter(Boolean))).length
    },
    {
      id: "tipos_unidades",
      title: "Tipos de Unidade",
      description: "Formatos de unidades de medida em uso ativo",
      bgGradient: "from-emerald-50 to-teal-50 dark:from-emerald-950/10 dark:to-teal-950/10",
      borderColor: "border-emerald-100 dark:border-emerald-900/20",
      textColor: "text-emerald-600 dark:text-emerald-400",
      type: "count",
      getValue: (products) =>
        Array.from(new Set(products.map((p) => p.unidadeCompra).filter(Boolean))).length
    }
  ],
  alerts: [
    {
      id: "sem_ean",
      title: "Produtos sem EAN",
      type: "warning",
      description: "Itens sem código de barras (EAN-13). Recomenda-se registar para facilitar operações de caixa.",
      check: (products) => products.some((p) => !p.ean),
      getAffectedCount: (products) => products.filter((p) => !p.ean).length
    }
  ],
  calculationRules: {
    name: "Fracionamento do Retalho",
    description: "Conversão ágil de fardos ou caixas fechadas para venda unitária rápida ou pesagem de frescos."
  },
  validationRules: {
    name: "Estrutura Comercial EAN",
    description: "Valida opcionalmente o formato do código de barras EAN-13.",
    validate: (product) => {
      if (product.ean && product.ean.length !== 13 && product.ean.length !== 8) {
        return "O código de barras (EAN) deve conter exatamente 8 ou 13 dígitos numéricos.";
      }
      return null;
    }
  }
};
