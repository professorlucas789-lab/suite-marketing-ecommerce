import { BusinessModuleConfig } from "./types";

/**
 * Exemplo de Módulo de Negócio Exemplo (Template)
 * Use este ficheiro como referência para criar novos módulos de negócio.
 * Para registar um novo negócio, basta:
 * 1. Copiar este ficheiro para um novo (ex: petshop.ts)
 * 2. Atualizar as configurações
 * 3. Importar e adicionar no registry central em `/src/modules/business-types/index.ts`
 */
export const exampleBusinessModule: BusinessModuleConfig = {
  id: "exemplo",
  name: "Negócio Exemplo",
  icon: "HelpCircle", // Nome do ícone da biblioteca Lucide
  color: "violet-600", // Cor de destaque para o módulo
  description: "Módulo modelo para exemplificar a criação ágil de novas verticais de negócio.",
  categories: [
    "Categoria Exemplo A",
    "Categoria Exemplo B",
    "Categoria Exemplo C"
  ],
  purchaseUnits: ["caixa", "fardo", "pacote", "unidade"],
  saleUnits: ["unidade", "pacote"],
  requiredFields: ["nome", "custoCompra", "quantidade", "margemDesejada", "campoExemploObrigatorio"],
  optionalFields: ["fornecedor", "observacoes", "campoExemploOpcional"],
  advancedFields: ["custoTransporte", "custoEmbalagem", "outrosCustos"],
  productExtraFields: [
    {
      key: "campoExemploObrigatorio",
      label: "Campo Obrigatório Exemplo",
      type: "text",
      placeholder: "Ex: Valor Exemplo",
      required: true,
      helpText: "Este campo serve como exemplo de campo obrigatório para a nova vertical."
    },
    {
      key: "campoExemploOpcional",
      label: "Campo Opcional Exemplo",
      type: "text",
      placeholder: "Ex: Alguma informação opcional",
      required: false,
      helpText: "Este campo é opcional."
    },
    {
      key: "tipoDeEmbalagem",
      label: "Tipo de Embalagem",
      type: "select",
      options: ["Plástico", "Vidro", "Papelão", "Metal", "Outro"],
      helpText: "Selecione o tipo de embalagem padrão utilizada."
    }
  ],
  dashboardCards: [
    {
      id: "total_itens_exemplo",
      title: "Itens de Exemplo",
      description: "Contador de produtos criados no módulo exemplo",
      bgGradient: "from-violet-50 to-purple-50 dark:from-violet-950/10 dark:to-purple-950/10",
      borderColor: "border-violet-100 dark:border-violet-900/20",
      textColor: "text-violet-600 dark:text-violet-400",
      type: "count",
      getValue: (products) => products.length
    }
  ],
  alerts: [
    {
      id: "alerta_exemplo",
      title: "Alerta Exemplo",
      type: "info",
      description: "Informa se existem produtos registados.",
      check: (products) => products.length > 0,
      getAffectedCount: (products) => products.length
    }
  ],
  calculationRules: {
    name: "Regra Exemplo",
    description: "Multiplica ou ajusta taxas adicionais fictícias sobre o preço final."
  },
  validationRules: {
    name: "Validação Exemplo",
    description: "Valida se o campo obrigatório contém caracteres válidos.",
    validate: (product) => {
      if (!product.campoExemploObrigatorio?.trim()) {
        return "O 'Campo Obrigatório Exemplo' deve estar preenchido.";
      }
      return null;
    }
  }
};
