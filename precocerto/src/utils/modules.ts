export interface ModuleConfig {
  id: string;
  nome: string;
  icone: string;
  corPrincipal: string; // Tailwind color class e.g. "emerald-600"
  bgGradient: string; // Tailwind bg gradient e.g. "from-emerald-500 to-teal-600"
  categorias: string[];
  unidadesPermitidas: string[];
  camposAdicionais: {
    key: string;
    label: string;
    placeholder?: string;
    type: "text" | "number" | "select" | "date" | "textarea";
    options?: string[];
    required?: boolean;
  }[];
  alertasDescricao: string;
  regrasCalculo: string;
  regrasValidacao: string;
}

export const BUSINESS_MODULES: Record<string, ModuleConfig> = {
  "farmacia": {
    id: "farmacia",
    nome: "Farmácia",
    icone: "Pill",
    corPrincipal: "emerald-600",
    bgGradient: "from-emerald-500 to-teal-600",
    categorias: [
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
    unidadesPermitidas: ["caixa", "cartela", "blister", "lâmina", "comprimido", "ampola", "frasco", "sachê", "unidade"],
    camposAdicionais: [
      { key: "farmaciaNomeComercial", label: "Nome Comercial", placeholder: "Ex: Tylenol, Voltaren", type: "text" },
      { key: "farmaciaPrincipioAtivo", label: "Princípio Ativo", placeholder: "Ex: Paracetamol, Ibuprofeno", type: "text", required: true },
      { key: "farmaciaDosagem", label: "Dosagem", placeholder: "Ex: 500mg, 10ml", type: "text", required: true },
      { key: "farmaciaFormaFarmaceutica", label: "Forma Farmacêutica", type: "select", options: ["", "comprimido", "cápsula", "ampola", "frasco", "sachê", "xarope", "creme/pomada", "colírio", "outro"] },
      { key: "farmaciaLaboratorio", label: "Laboratório / Fabricante", placeholder: "Ex: Medley, EMS", type: "text" },
      { key: "farmaciaLote", label: "Lote", placeholder: "Ex: LOT12345", type: "text" },
      { key: "farmaciaDataValidade", label: "Data de Validade", type: "date", required: true },
      { key: "farmaciaNecessitaReceita", label: "Necessita Receita?", type: "select", options: ["não", "sim", "não informado"] },
      { key: "ean", label: "Código de Barras (EAN)", placeholder: "Código EAN-13", type: "text" }
    ],
    alertasDescricao: "Alerta de medicamentos controlados e proximidade da validade de lotes ativos.",
    regrasCalculo: "Conversão automática de caixas fechadas para venda fracionada (retalho) por comprimido ou ampola.",
    regrasValidacao: "Validade e Princípio Ativo são obrigatórios para a segurança regulatória."
  },
  "supermercado": {
    id: "supermercado",
    nome: "Supermercado",
    icone: "ShoppingCart",
    corPrincipal: "blue-600",
    bgGradient: "from-blue-500 to-indigo-600",
    categorias: [
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
    unidadesPermitidas: ["caixa", "fardo", "pacote", "unidade", "kg", "grama", "litro", "ml"],
    camposAdicionais: [
      { key: "ean", label: "Código de Barras (EAN)", placeholder: "Código EAN-13", type: "text" },
      { key: "marca", label: "Marca", placeholder: "Ex: Nestlé, Coca-Cola", type: "text" },
      { key: "pesoLiquido", label: "Peso Líquido / Volume", placeholder: "Ex: 1kg, 350ml", type: "text" }
    ],
    alertasDescricao: "Monitorização de stock de alta rotação e perdas por quebra física.",
    regrasCalculo: "Suporte a venda fracionada por peso (kg/grama) ou volume líquido.",
    regrasValidacao: "Controle estrito de código de barras para integração com o ponto de venda."
  },
  "mercearia": {
    id: "mercearia",
    nome: "Mercearia",
    icone: "Store",
    corPrincipal: "amber-600",
    bgGradient: "from-amber-500 to-orange-600",
    categorias: [
      "Farinhas",
      "Arroz & Grãos",
      "Óleos",
      "Lataria",
      "Higiene",
      "Limpeza",
      "Bebidas",
      "Snacks",
      "Outros"
    ],
    unidadesPermitidas: ["unidade", "pacote", "caixa", "saco", "kg", "grama", "litro", "ml"],
    camposAdicionais: [
      { key: "marca", label: "Marca", placeholder: "Ex: Tio João", type: "text" },
      { key: "prazoValidadeGeral", label: "Validade", type: "date" }
    ],
    alertasDescricao: "Alertas de reabastecimento de itens de cesta básica.",
    regrasCalculo: "Conversão de fardos grandes para sacos individuais de retalho simples.",
    regrasValidacao: "Confrontação entre custos de fardo e margem unitária sugerida."
  },
  "boutique": {
    id: "boutique",
    nome: "Boutique",
    icone: "Shirt",
    corPrincipal: "pink-600",
    bgGradient: "from-pink-500 to-rose-600",
    categorias: [
      "Calças",
      "Vestidos",
      "Camisas",
      "Sapatos",
      "Malas",
      "Relógios",
      "Acessórios"
    ],
    unidadesPermitidas: ["unidade", "par", "conjunto", "peça", "caixa"],
    camposAdicionais: [
      { key: "marca", label: "Marca / Designer", placeholder: "Ex: Zara, Gucci", type: "text", required: true },
      { key: "modelo", label: "Modelo / Referência", placeholder: "Ex: Skinny Fit, Casual Premium", type: "text" },
      { key: "cor", label: "Cor", placeholder: "Ex: Preto, Azul Indigo", type: "text" },
      { key: "tamanho", label: "Tamanho", placeholder: "Ex: M, L, XL, 38, 40", type: "text", required: true },
      { key: "colecao", label: "Coleção / Estação", placeholder: "Ex: Outono/Inverno 2026", type: "text" },
      { key: "genero", label: "Género", type: "select", options: ["unissexo", "masculino", "feminino", "infantil"] }
    ],
    alertasDescricao: "Alertas de produtos parados na coleção passada (liquidação recomendada).",
    regrasCalculo: "Cálculo de margens com base na exclusividade da marca e custos de embalagem de luxo.",
    regrasValidacao: "Marca e Tamanho são campos cruciais para organização do catálogo de vestuário."
  },
  "material-escolar": {
    id: "material-escolar",
    nome: "Loja de Material Escolar",
    icone: "BookOpen",
    corPrincipal: "purple-600",
    bgGradient: "from-purple-500 to-indigo-600",
    categorias: [
      "Cadernos",
      "Canetas",
      "Lápis",
      "Marcadores",
      "Livros",
      "Pastas",
      "Calculadoras",
      "Mochilas"
    ],
    unidadesPermitidas: ["unidade", "caixa", "pacote", "dúzia", "kit"],
    camposAdicionais: [
      { key: "marca", label: "Marca", placeholder: "Ex: Faber-Castell, Bic", type: "text" },
      { key: "modelo", label: "Referência / Modelo", placeholder: "Ex: Esferográfica 1.0mm", type: "text" },
      { key: "cor", label: "Cor de Escrita / Detalhes", placeholder: "Ex: Azul, Preto, Vermelho", type: "text" }
    ],
    alertasDescricao: "Alertas de stock em períodos de regresso às aulas.",
    regrasCalculo: "Divisão de caixas de canetas/lápis em unidades individuais com acréscimo de margem de retalho.",
    regrasValidacao: "Controle simples de stock por pacotes ou caixas fracionadas."
  },
  "papelaria": {
    id: "papelaria",
    nome: "Papelaria",
    icone: "Notebook",
    corPrincipal: "teal-600",
    bgGradient: "from-teal-500 to-emerald-600",
    categorias: [
      "Papéis",
      "Canetas & Lápis",
      "Pastas",
      "Envelopes",
      "Organização",
      "Artesanato",
      "Serviços (Impressões)"
    ],
    unidadesPermitidas: ["unidade", "resma", "folhas", "caixa", "pacote", "dúzia"],
    camposAdicionais: [
      { key: "gramagem", label: "Gramagem (papel)", placeholder: "Ex: 75g, 80g, 120g", type: "text" },
      { key: "marca", label: "Marca", placeholder: "Ex: Chamex", type: "text" }
    ],
    alertasDescricao: "Rendimento de resmas de papel e níveis de tinta para impressões.",
    regrasCalculo: "Cálculo do custo por folha de papel mais tinta para serviços de fotocópia e encadernação.",
    regrasValidacao: "Precificação deve levar em conta taxas fixas de energia e desgaste de consumíveis."
  },
  "informatica": {
    id: "informatica",
    nome: "Loja de Informática",
    icone: "Laptop",
    corPrincipal: "cyan-600",
    bgGradient: "from-cyan-500 to-blue-600",
    categorias: [
      "Computadores",
      "Acessórios",
      "Componentes",
      "Monitores",
      "Redes",
      "Armazenamento",
      "Software"
    ],
    unidadesPermitidas: ["unidade", "kit", "caixa", "licença"],
    camposAdicionais: [
      { key: "marca", label: "Marca / Fabricante", placeholder: "Ex: ASUS, HP, Dell", type: "text", required: true },
      { key: "modelo", label: "Modelo Exato", placeholder: "Ex: G15 5511, Inspiron 15", type: "text", required: true },
      { key: "especificacoes", label: "Especificações Técnicas", placeholder: "Ex: Core i7, 16GB RAM, 512GB SSD", type: "textarea" },
      { key: "numSerie", label: "Número de Série", placeholder: "Registo de garantia", type: "text" },
      { key: "prazoGarantia", label: "Garantia (Meses)", placeholder: "Ex: 12, 24", type: "number" }
    ],
    alertasDescricao: "Alertas de garantia de fornecedor a vencer e produtos obsoletos tecnologicamente.",
    regrasCalculo: "Soma de impostos alfandegários (se importado) ao custo de aquisição final do lote.",
    regrasValidacao: "Marca e Modelo são estritamente obrigatórios para rastreio de garantia."
  },
  "ferragens": {
    id: "ferragens",
    nome: "Loja de Ferragens",
    icone: "Wrench",
    corPrincipal: "slate-700",
    bgGradient: "from-slate-600 to-zinc-700",
    categorias: [
      "Ferramentas",
      "Parafusos & Pregos",
      "Material Elétrico",
      "Canos & Conexões",
      "Pintura",
      "Segurança",
      "Químicos"
    ],
    unidadesPermitidas: ["unidade", "cento", "caixa", "kg", "metro", "rolo", "lata", "saco"],
    camposAdicionais: [
      { key: "marca", label: "Marca", placeholder: "Ex: Bosch, Tramontina", type: "text" },
      { key: "modelo", label: "Referência / Medidas", placeholder: "Ex: M8 50mm, 3/4 polegadas", type: "text" },
      { key: "material", label: "Material / Acabamento", placeholder: "Ex: Aço Inox, PVC, Latão", type: "text" }
    ],
    alertasDescricao: "Monitoramento de itens pesados ou volumosos em stock e reposições.",
    regrasCalculo: "Divisão de rolos de fios ou tubos em metros lineares com margem de retalho diferenciada.",
    regrasValidacao: "Ajustes de preços por flutuações de mercado em metais ou químicos."
  },
  "restaurante": {
    id: "restaurante",
    nome: "Restaurante",
    icone: "Utensils",
    corPrincipal: "orange-600",
    bgGradient: "from-orange-500 to-red-600",
    categorias: [
      "Pratos",
      "Bebidas",
      "Sobremesas",
      "Entradas",
      "Ingredientes"
    ],
    unidadesPermitidas: ["prato", "dose", "porção", "unidade", "litro", "ml", "kg", "grama", "garrafa", "lata"],
    camposAdicionais: [
      { key: "restauranteReceita", label: "Nome da Receita / Modo", placeholder: "Ex: Ficha Técnica n.º 4", type: "text" },
      { key: "restauranteIngredientes", label: "Ingredientes / Composição", placeholder: "Ex: 200g Carne, 150g Batata, Molho", type: "textarea", required: true },
      { key: "restaurantePeso", label: "Peso Estimado do Prato (g)", placeholder: "Ex: 450", type: "number" },
      { key: "restauranteRendimento", label: "Rendimento / Dose por Receita", placeholder: "Ex: 1 dose, 5 porções", type: "number", required: true }
    ],
    alertasDescricao: "Alerta de flutuação de preços de matérias-primas frescas (hortaliças, carnes) e margem líquida crítica.",
    regrasCalculo: "Cálculo do Custo de Mercadoria Vendida (CMV) dividindo o custo total da receita pelo número de porções geradas.",
    regrasValidacao: "A receita de composição e o rendimento são obrigatórios para determinar o preço da porção."
  },
  "padaria": {
    id: "padaria",
    nome: "Padaria",
    icone: "Cookie",
    corPrincipal: "yellow-700",
    bgGradient: "from-amber-600 to-yellow-800",
    categorias: [
      "Pães",
      "Bolos",
      "Salgados",
      "Doces",
      "Bebidas",
      "Cafetaria"
    ],
    unidadesPermitidas: ["unidade", "kg", "grama", "cento", "dose", "porção"],
    camposAdicionais: [
      { key: "ingredientesPrincipais", label: "Ingredientes Principais", placeholder: "Ex: Farinha de Trigo, Fermento, Manteiga", type: "textarea" },
      { key: "tempoPreparo", label: "Tempo de Preparo (min)", placeholder: "Ex: 45", type: "number" }
    ],
    alertasDescricao: "Perdas de produção diária e desperdício de itens perecíveis.",
    regrasCalculo: "Rateio dos custos de gás e forno elétrico sobre a fornada diária de pães.",
    regrasValidacao: "Precificação deve garantir cobertura integral de desperdício diário (média de 15%)."
  },
  "cosmeticos": {
    id: "cosmeticos",
    nome: "Cosméticos",
    icone: "Sparkles",
    corPrincipal: "purple-500",
    bgGradient: "from-purple-400 to-pink-600",
    categorias: [
      "Maquilhagem",
      "Cabelos",
      "Pele",
      "Unhas",
      "Acessórios"
    ],
    unidadesPermitidas: ["unidade", "kit", "frasco", "pote", "paleta", "caixa"],
    camposAdicionais: [
      { key: "marca", label: "Marca / Fabricante", placeholder: "Ex: L'Oréal, Ruby Rose", type: "text", required: true },
      { key: "modelo", label: "Linha / Coleção", placeholder: "Ex: Linha Matte, Cachos Definidos", type: "text" },
      { key: "cor", label: "Tom / Cor / Fragrância", placeholder: "Ex: Base Tom 3, Lavanda", type: "text" },
      { key: "validadeCosmetico", label: "Validade", type: "date" }
    ],
    alertasDescricao: "Avisos de validade para cremes orgânicos e maquilhagem de alta performance.",
    regrasCalculo: "Margens elevadas baseadas no posicionamento de marca e custos de mostruários/testers.",
    regrasValidacao: "Marca e Linha do produto devem ser preenchidas para diferenciação de marcas concorrentes."
  },
  "perfumaria": {
    id: "perfumaria",
    nome: "Perfumaria",
    icone: "SprayCan",
    corPrincipal: "fuchsia-600",
    bgGradient: "from-fuchsia-500 to-pink-700",
    categorias: [
      "Perfumes Masculinos",
      "Perfumes Femininos",
      "Infantil",
      "Kits & Presentes",
      "Desodorizantes"
    ],
    unidadesPermitidas: ["unidade", "frasco", "ml", "kit"],
    camposAdicionais: [
      { key: "marca", label: "Grife / Marca", placeholder: "Ex: Chanel, Dior, Natura", type: "text", required: true },
      { key: "tipoConcentracao", label: "Concentração", type: "select", options: ["EDP (Eau de Parfum)", "EDT (Eau de Toilette)", "EDC (Eau de Cologne)", "Splash", "Óleo / Extrato", "outro"] },
      { key: "volumeMl", label: "Volume (ml)", placeholder: "Ex: 100, 50, 200", type: "number" }
    ],
    alertasDescricao: "Alertas de stock reduzido de itens importados de alta sazonalidade (ex: Dia dos Namorados).",
    regrasCalculo: "Incidência de custos de importação e impostos sobre artigos de perfumaria fina.",
    regrasValidacao: "O volume em ml e a marca da grife são requeridos para a correta avaliação de mercado."
  },
  "bebidas": {
    id: "bebidas",
    nome: "Loja de Bebidas",
    icone: "Wine",
    corPrincipal: "red-700",
    bgGradient: "from-red-600 to-rose-800",
    categorias: [
      "Cervejas",
      "Vinhos",
      "Espirituosas",
      "Refrigerantes",
      "Águas",
      "Sucos"
    ],
    unidadesPermitidas: ["caixa", "fardo", "pacote", "unidade", "garrafa", "lata", "barril", "litro", "ml"],
    camposAdicionais: [
      { key: "marca", label: "Marca / Fabricante", placeholder: "Ex: Super Bock, Cuca", type: "text", required: true },
      { key: "volumeMl", label: "Volume Unitário (ml)", placeholder: "Ex: 330, 750, 1000", type: "number" },
      { key: "teorAlcoolico", label: "Teor Alcoólico (%)", placeholder: "Ex: 5.2", type: "text" }
    ],
    alertasDescricao: "Gerenciamento de depósitos de garrafas retornáveis e datas de vencimento de lotes de cerveja fresca.",
    regrasCalculo: "Cálculo de custo de fardo e sua quebra em grades de garrafas individuais ou latas.",
    regrasValidacao: "Marca e Volume Unitário são vitais para a tabela de equivalência de preços."
  },
  "distribuidor": {
    id: "distribuidor",
    nome: "Distribuidor",
    icone: "Truck",
    corPrincipal: "indigo-600",
    bgGradient: "from-indigo-500 to-blue-700",
    categorias: [
      "Importados",
      "Nacionais",
      "Revenda",
      "Atacado"
    ],
    unidadesPermitidas: ["palete", "contentor", "fardo", "caixa", "pacote", "lote", "unidade", "kg", "litro"],
    camposAdicionais: [
      { key: "quantidadeMinima", label: "Quantidade Mínima de Venda (MOQ)", placeholder: "Ex: 50 unidades", type: "number", required: true },
      { key: "precoAtacado", label: "Preço de Atacado (Kz)", placeholder: "Preço para volumes grandes", type: "number", required: true },
      { key: "precoRetalho", label: "Preço Unitário Sugerido (Kz)", placeholder: "Preço sugerido ao consumidor", type: "number" },
      { key: "prazoEntrega", label: "Prazo de Entrega do Fornecedor", placeholder: "Ex: 15 dias", type: "text" }
    ],
    alertasDescricao: "Ruptura de stock em grandes distribuidores e atrasos previstos na alfândega ou porto.",
    regrasCalculo: "Aplica tabelas de desconto por escala (rapel/desconto de quantidade) baseadas no volume de compra do lote.",
    regrasValidacao: "A quantidade mínima de venda (MOQ) e o preço de atacado são campos obrigatórios."
  },
  "armazem": {
    id: "armazem",
    nome: "Armazém",
    icone: "Warehouse",
    corPrincipal: "orange-700",
    bgGradient: "from-amber-700 to-orange-800",
    categorias: [
      "Carga Geral",
      "Paletes",
      "Fardos",
      "Lotes Atacado",
      "Matérias-Primas"
    ],
    unidadesPermitidas: ["palete", "caixa", "fardo", "tonelada", "kg", "unidade", "saco"],
    camposAdicionais: [
      { key: "localizacaoArmazem", label: "Corredor / Prateleira", placeholder: "Ex: Corredor B, Nível 3", type: "text" },
      { key: "condicaoConservacao", label: "Condições de Armazenamento", placeholder: "Ex: Fresco < 20°C", type: "text" }
    ],
    alertasDescricao: "Superlotação de posições de paletes e bens próximos do limite de conservação.",
    regrasCalculo: "Acréscimo automático dos custos fixos de manutenção de frio e armazenagem espacial por metro cúbico.",
    regrasValidacao: "Registo da localização física do lote para inventário dinâmico."
  },
  "outro": {
    id: "outro",
    nome: "Outro",
    icone: "Briefcase",
    corPrincipal: "slate-600",
    bgGradient: "from-slate-500 to-zinc-600",
    categorias: ["Geral", "Serviços", "Projetos", "Especiais"],
    unidadesPermitidas: ["unidade", "caixa", "pacote", "serviço", "hora", "kg", "litro", "outro"],
    camposAdicionais: [
      { key: "ean", label: "Código de Barras / SKU", placeholder: "Código interno ou EAN", type: "text" },
      { key: "marca", label: "Marca / Fabricante", placeholder: "Ex: Geral", type: "text" }
    ],
    alertasDescricao: "Alertas gerais de stock mínimo e margem líquida recomendada.",
    regrasCalculo: "Cálculo padrão baseado na divisão clássica de custos fixos e variáveis por unidade vendável.",
    regrasValidacao: "Validações financeiras gerais garantindo que a margem seja positiva."
  }
};
