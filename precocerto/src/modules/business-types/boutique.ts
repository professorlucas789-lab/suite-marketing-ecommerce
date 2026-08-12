import { BusinessModuleConfig } from "./types";

export const boutiqueModule: BusinessModuleConfig = {
  id: "boutique",
  name: "Boutique / Vestuário",
  icon: "Shirt",
  color: "pink-600",
  description: "Módulo voltado para lojas de roupas, sapatos e acessórios com gestão por tamanhos, marcas, coleções e controlo de liquidações.",
  categories: [
    "Calças",
    "Vestidos",
    "Camisas",
    "Sapatos",
    "Malas",
    "Relógios",
    "Acessórios"
  ],
  purchaseUnits: ["peça", "par", "conjunto", "unidade", "caixa"],
  saleUnits: ["peça", "par", "conjunto", "unidade"],
  requiredFields: ["nome", "custoCompra", "quantidade", "margemDesejada", "marca", "tamanho"],
  optionalFields: ["fornecedor", "observacoes", "modelo", "cor", "colecao", "genero"],
  advancedFields: ["custoTransporte", "custoEmbalagem", "outrosCustos"],
  productExtraFields: [
    {
      key: "marca",
      label: "Marca / Designer",
      type: "text",
      placeholder: "Ex: Zara, Gucci",
      required: true
    },
    {
      key: "modelo",
      label: "Modelo / Referência",
      type: "text",
      placeholder: "Ex: Skinny Fit, Casual Premium"
    },
    {
      key: "cor",
      label: "Cor",
      type: "text",
      placeholder: "Ex: Preto, Azul Indigo"
    },
    {
      key: "tamanho",
      label: "Tamanho",
      type: "text",
      placeholder: "Ex: M, L, XL, 38, 40",
      required: true
    },
    {
      key: "colecao",
      label: "Coleção / Estação",
      type: "text",
      placeholder: "Ex: Outono/Inverno 2026"
    },
    {
      key: "genero",
      label: "Género",
      type: "select",
      options: ["unissexo", "masculino", "feminino", "infantil"]
    }
  ],
  dashboardCards: [
    {
      id: "grifes_marcas",
      title: "Marcas / Grifes",
      description: "Número total de marcas registadas",
      bgGradient: "from-pink-50 to-rose-50 dark:from-pink-950/10 dark:to-rose-950/10",
      borderColor: "border-pink-100 dark:border-pink-900/20",
      textColor: "text-pink-600 dark:text-pink-400",
      type: "count",
      getValue: (products) =>
        Array.from(new Set(products.map((p) => p.marca).filter(Boolean))).length
    },
    {
      id: "modelos_boutique",
      title: "Modelos Registados",
      description: "Variedade de referências em catálogo",
      bgGradient: "from-purple-50 to-fuchsia-50 dark:from-purple-950/10 dark:to-fuchsia-950/10",
      borderColor: "border-purple-100 dark:border-purple-900/20",
      textColor: "text-purple-600 dark:text-purple-400",
      type: "count",
      getValue: (products) => products.filter((p) => p.modelo).length
    },
    {
      id: "tamanhos_ativos",
      title: "Grade de Tamanhos",
      description: "Número de tamanhos/numerações distintas",
      bgGradient: "from-indigo-50 to-blue-50 dark:from-indigo-950/10 dark:to-blue-950/10",
      borderColor: "border-indigo-100 dark:border-indigo-900/20",
      textColor: "text-indigo-600 dark:text-indigo-400",
      type: "count",
      getValue: (products) =>
        Array.from(new Set(products.map((p) => p.tamanho).filter(Boolean))).length
    }
  ],
  alerts: [
    {
      id: "grade_incompleta",
      title: "Poucas Unidades",
      type: "warning",
      description: "Modelos de roupa com stock muito reduzido (menos de 2 unidades). Risco de perder venda por tamanho.",
      check: (products) => products.some((p) => p.quantidadeDisponivel !== undefined && p.quantidadeDisponivel < 2),
      getAffectedCount: (products) => products.filter((p) => p.quantidadeDisponivel !== undefined && p.quantidadeDisponivel < 2).length
    }
  ],
  calculationRules: {
    name: "Precificação de Moda",
    description: "Cálculo baseado no posicionamento de marca premium e cobertura de custo de embalagens de luxo."
  },
  validationRules: {
    name: "Organização da Grade",
    description: "Exige o preenchimento de marca e tamanho.",
    validate: (product) => {
      if (!product.marca?.trim()) return "O campo 'Marca / Designer' é obrigatório para roupas.";
      if (!product.tamanho?.trim()) return "O tamanho do produto é obrigatório para roupas.";
      return null;
    }
  }
};
