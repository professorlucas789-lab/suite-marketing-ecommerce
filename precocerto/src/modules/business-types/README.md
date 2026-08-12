# Arquitetura de Módulos Dinâmicos — PreçoCerto

Esta diretoria contém a arquitetura modular baseada em configurações que permite adicionar novas verticais de negócio à aplicação PreçoCerto de forma ágil, sem reescrever ou alterar o formulário ou o dashboard principal.

## Como adicionar um novo tipo de negócio (ex: Pet Shop, Livraria, etc.)

Para adicionar um novo negócio em apenas 3 passos simples:

### Passo 1: Criar o ficheiro de configuração do negócio

Crie um novo ficheiro na diretoria `src/modules/business-types/` (ex: `petshop.ts`) que implemente o contrato `BusinessModuleConfig`:

```typescript
import { BusinessModuleConfig } from "./types";

export const petshopModule: BusinessModuleConfig = {
  id: "petshop",
  name: "Pet Shop",
  icon: "Dog", // Nome de ícone Lucide válido
  color: "amber-500",
  description: "Módulo especializado para lojas de animais, rações e acessórios com controlo de vacinas e raças.",
  categories: ["Rações", "Brinquedos", "Higiene", "Medicamentos Vet", "Acessórios", "Serviços (Banho & Tosa)"],
  purchaseUnits: ["caixa", "fardo", "saco", "unidade", "kg"],
  saleUnits: ["unidade", "pacote", "kg", "grama"],
  requiredFields: ["nome", "custoCompra", "quantidade", "margemDesejada"],
  optionalFields: ["fornecedor", "observacoes", "marca", "petVacinaObrigatoria"],
  advancedFields: ["custoTransporte", "custoEmbalagem", "outrosCustos"],
  productExtraFields: [
    {
      key: "marca",
      label: "Marca",
      type: "text",
      placeholder: "Ex: Royal Canin, Pedigree"
    },
    {
      key: "petVacinaObrigatoria",
      label: "Requer Vacinação em dia?",
      type: "select",
      options: ["não", "sim"]
    }
  ],
  dashboardCards: [
    {
      id: "total_pet_itens",
      title: "Itens de Pet Shop",
      description: "Número total de itens registados sob o módulo de Pet Shop",
      bgGradient: "from-amber-50 to-orange-50 dark:from-amber-950/10 dark:to-orange-950/10",
      borderColor: "border-amber-100 dark:border-amber-900/20",
      textColor: "text-amber-600 dark:text-amber-400",
      type: "count",
      getValue: (products) => products.length
    }
  ],
  alerts: [
    {
      id: "alerta_medicamentos",
      title: "Medicamentos de Risco",
      type: "warning",
      description: "Existem produtos na categoria Medicamentos Vet que necessitam de receita.",
      check: (products) => products.some(p => p.categoria === "Medicamentos Vet"),
      getAffectedCount: (products) => products.filter(p => p.categoria === "Medicamentos Vet").length
    }
  ],
  calculationRules: {
    name: "Cálculo Pet Shop",
    description: "Determinação padrão comercial."
  },
  validationRules: {
    name: "Validação Pet Shop",
    description: "Garante integridade de dados do Pet Shop.",
    validate: (product) => null
  }
};
```

### Passo 2: Registar no `index.ts` central

Abra `/src/modules/business-types/index.ts` e:

1. Importe o novo módulo:
   ```typescript
   import { petshopModule } from "./petshop";
   ```
2. Registe o novo módulo no mapa `ALL_MODULES_RECORD`:
   ```typescript
   const ALL_MODULES_RECORD: Record<string, BusinessModuleConfig> = {
     // ... outros módulos ...
     petshop: petshopModule,
     outro: defaultModule
   };
   ```

### Passo 3: Feito!

A aplicação irá carregar automaticamente o Pet Shop em:
- Tela de Configuração (tipo de negócio ativo)
- Categorias e Unidades dinâmicas no Formulário
- Campos Extras específicos da categoria renderizados de forma dinâmica
- Alertas específicos e novos Cards dinâmicos do dashboard

---

## Contrato de Configuração (`BusinessModuleConfig`)

- `id`: string única identificadora.
- `name`: Nome legível por humanos exibido em selects e banners.
- `icon`: Ícone da biblioteca lucide (ex: `"Pill"`, `"ShoppingCart"`, `"Shirt"`, `"Utensils"`).
- `color`: Cor principal em Tailwind para botões e detalhes visuais.
- `description`: Breve descrição do objetivo do negócio.
- `categories`: Lista de categorias padrão pré-configuradas.
- `purchaseUnits`: Unidades permitidas para compra.
- `saleUnits`: Unidades permitidas para venda.
- `productExtraFields`: Lista de campos extras que serão renderizados dinamicamente pelo `DynamicFieldRenderer`.
- `dashboardCards`: Cards analíticos adicionados ao dashboard principal quando este módulo estiver ativo.
- `alerts`: Alertas personalizados gerados a partir do stock do módulo ativo.
- `calculationRules` / `validationRules`: Motores de cálculo e validação integrados sem quebrar o fluxo principal.
