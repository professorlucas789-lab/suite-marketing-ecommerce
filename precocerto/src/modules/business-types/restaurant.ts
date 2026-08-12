import { BusinessModuleConfig } from "./types";

export const restaurantModule: BusinessModuleConfig = {
  id: "restaurante",
  name: "Restaurante",
  icon: "Utensils",
  color: "orange-600",
  description: "Módulo para negócios de alimentação, restaurantes e cafés. Focado na elaboração de receitas, fichas técnicas e análise do CMV (Custo de Mercadoria Vendida).",
  categories: [
    "Pratos",
    "Bebidas",
    "Sobremesas",
    "Entradas",
    "Ingredientes"
  ],
  purchaseUnits: ["unidade", "kg", "grama", "litro", "ml", "caixa", "fardo"],
  saleUnits: ["prato", "dose", "porção", "unidade", "garrafa", "lata", "litro", "ml"],
  requiredFields: ["nome", "custoCompra", "quantidade", "margemDesejada", "restauranteIngredientes", "restauranteRendimento"],
  optionalFields: ["fornecedor", "observacoes", "restauranteReceita", "restaurantePeso"],
  advancedFields: ["custoTransporte", "custoEmbalagem", "outrosCustos"],
  productExtraFields: [
    {
      key: "restauranteReceita",
      label: "Ficha Técnica n.º / Referência",
      type: "text",
      placeholder: "Ex: Ficha Técnica n.º 4"
    },
    {
      key: "restauranteIngredientes",
      label: "Ingredientes / Composição",
      type: "textarea",
      placeholder: "Ex: 200g Carne, 150g Batata, Molho",
      required: true
    },
    {
      key: "restaurantePeso",
      label: "Peso Estimado do Prato (g)",
      type: "number",
      placeholder: "Ex: 450"
    },
    {
      key: "restauranteRendimento",
      label: "Rendimento / Doses por Receita",
      type: "number",
      placeholder: "Ex: 1 dose, 5 porções",
      required: true
    }
  ],
  dashboardCards: [
    {
      id: "custo_medio_prato",
      title: "Custo Médio por Prato",
      description: "Média investida por ficha técnica de receita ativa",
      bgGradient: "from-orange-50 to-red-50 dark:from-orange-950/10 dark:to-red-950/10",
      borderColor: "border-orange-100 dark:border-orange-900/20",
      textColor: "text-orange-600 dark:text-orange-400",
      type: "currency",
      getValue: (products, formatFn) => {
        if (products.length === 0) return formatFn(0);
        const totalCusto = products.reduce((sum, p) => sum + (p.custoCompra || 0), 0);
        return formatFn(totalCusto / products.length);
      }
    },
    {
      id: "cmv_eficiencia",
      title: "Eficiência do CMV",
      description: "Relação percentual do custo do ingrediente face à venda recomendada",
      bgGradient: "from-emerald-50 to-teal-50 dark:from-emerald-950/10 dark:to-teal-950/10",
      borderColor: "border-emerald-100 dark:border-emerald-900/20",
      textColor: "text-emerald-600 dark:text-emerald-400",
      type: "percentage",
      getValue: (products) => {
        const totalCusto = products.reduce((sum, p) => sum + (p.custoCompra || 0), 0);
        const totalVenda = products.reduce((sum, p) => sum + (p.precoVendaRecomendado || 0), 0);
        if (totalVenda === 0) return 0;
        return Math.round((totalCusto / totalVenda) * 100);
      }
    },
    {
      id: "receitas_ativas",
      title: "Receitas Ativas",
      description: "Composições detalhadas registadas",
      bgGradient: "from-yellow-50 to-amber-50 dark:from-yellow-950/10 dark:to-amber-950/10",
      borderColor: "border-yellow-100 dark:border-yellow-900/20",
      textColor: "text-yellow-700 dark:text-yellow-600",
      type: "count",
      getValue: (products) =>
        products.filter((p) => p.restauranteIngredientes || p.ingredientesPrincipais).length
    }
  ],
  alerts: [
    {
      id: "cmv_alto",
      title: "CMV Alerta Crítico",
      type: "danger",
      description: "Pratos cujo custo de ingredientes ultrapassa 40% da facturação prevista.",
      check: (products) => {
        return products.some((p) => {
          const custo = p.custoCompra || 0;
          const venda = p.precoVendaRecomendado || 1;
          return (custo / venda) > 0.4;
        });
      },
      getAffectedCount: (products) => {
        return products.filter((p) => {
          const custo = p.custoCompra || 0;
          const venda = p.precoVendaRecomendado || 1;
          return (custo / venda) > 0.4;
        }).length;
      }
    }
  ],
  calculationRules: {
    name: "Cálculo de Ficha Técnica",
    description: "Determinação do custo unitário dividindo o custo do ingrediente pelo rendimento da porção ou prato.",
    applyModuleSpecificRules: (product, baseValues) => {
      // Return modified baseValues if needed
      return { ...baseValues };
    }
  },
  validationRules: {
    name: "Consistência de Composição",
    description: "Requer composição e rendimento maior que zero.",
    validate: (product) => {
      if (!product.restauranteIngredientes?.trim()) {
        return "A composição de ingredientes é obrigatória para precificar uma receita.";
      }
      if (!product.restauranteRendimento || product.restauranteRendimento <= 0) {
        return "O rendimento da porção/dose deve ser maior do que zero.";
      }
      return null;
    }
  }
};
