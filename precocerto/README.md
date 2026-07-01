# PreçoCerto

Aplicação web pessoal para calcular e organizar a precificação de produtos.

## 🚀 Características

### Etapa 1 - Base Funcional

- **Autenticação**: Login e cadastro de usuários com Supabase
- **Proteção de rotas**: Apenas usuários autenticados podem acessar o dashboard e produtos
- **Dashboard**: Visualização de estatísticas consolidadas
  - Total de produtos cadastrados
  - Custo total estimado
  - Valor total de venda estimado
  - Lucro total estimado
  - Margem média dos produtos
- **CRUD de Produtos**: Criar, ler, atualizar e deletar produtos
- **Cálculos Automáticos**: Cálculo automático de preços baseado em custos e margem desejada
- **Validações**: Campos obrigatórios, valores positivos, margem máxima de 99.99%
- **Moeda Local**: Formatação em Kz (Kwanza angolano)

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 15+ com App Router
- **Linguagem**: TypeScript
- **Estilos**: Tailwind CSS
- **Componentes**: shadcn/ui + Lucide Icons
- **Formulários**: React Hook Form + Zod
- **Backend/Auth**: Supabase
- **Banco de Dados**: PostgreSQL (via Supabase)

## 📋 Requisitos

- Node.js 18+
- npm ou yarn
- Conta Supabase (gratuita)

## 🔧 Instalação

### 1. Clonar o repositório

```bash
git clone <repo-url>
cd precocerto
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha com suas credenciais Supabase:

```bash
cp .env.local.example .env.local
```

Adicione suas chaves:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Configurar Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute o script SQL em `supabase/migrations/001_create_products_table.sql` no SQL Editor do Supabase
3. Copie a URL e chave anônima do seu projeto para `.env.local`

### 5. Executar o desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:3000`

## 📱 Como Usar

### Primeiro Acesso

1. Acesse a página de login
2. Clique em "Cadastre-se"
3. Preencha email e senha (mínimo 6 caracteres)
4. Faça login com suas credenciais

### Cadastrar Produto

1. Acesse "Produtos" no menu
2. Clique em "Novo Produto"
3. Preencha os campos obrigatórios:
   - Nome do produto
   - Categoria
   - Custo de compra
   - Margem desejada (%)
4. Os demais custos (transporte, embalagem, outros) são opcionais
5. O sistema calcula automaticamente:
   - Custo total
   - Preço de venda recomendado
   - Lucro estimado
   - Margem real

### Fórmulas de Cálculo

```
Custo Total = Custo de Compra + Transporte + Embalagem + Outros

Preço Recomendado = Custo Total / (1 - Margem% / 100)

Lucro Estimado = Preço Recomendado - Custo Total

Margem Real = (Lucro Estimado / Preço Recomendado) × 100
```

## 📁 Estrutura do Projeto

```
precocerto/
├── src/
│   ├── app/              # Páginas do Next.js
│   │   ├── login/        # Página de login
│   │   ├── signup/       # Página de cadastro
│   │   ├── products/     # Páginas de produtos
│   │   └── page.tsx      # Dashboard
│   ├── components/
│   │   ├── ui/           # Componentes base (Button, Input, Form)
│   │   ├── layout/       # Componentes de layout (Nav, AuthLayout)
│   │   ├── products/     # Componentes de produtos (ProductForm, ProductList)
│   │   └── dashboard/    # Componentes do dashboard (StatCard)
│   ├── lib/
│   │   ├── supabase.ts   # Cliente Supabase
│   │   ├── calculations.ts # Funções de cálculo
│   │   └── schemas.ts    # Schemas Zod
│   ├── types/            # Tipos TypeScript
│   └── middleware.ts     # Middleware de autenticação
├── supabase/
│   └── migrations/       # Scripts SQL
├── public/               # Assets estáticos
└── package.json
```

## 🔒 Segurança

- **RLS (Row Level Security)**: Usuários só podem acessar seus próprios produtos
- **Autenticação**: Utiliza Supabase Auth
- **Validação**: Todos os dados são validados com Zod
- **HTTPS**: Recomenda-se usar em produção

## 🚀 Deploy

### Vercel (Recomendado)

1. Push do código para GitHub
2. Conecte seu repositório no [Vercel](https://vercel.com)
3. Configure as variáveis de ambiente
4. Deploy automático

### Outras plataformas

A aplicação é compatível com qualquer plataforma que suporte Node.js:
- Railway
- Render
- Netlify
- etc.

## 📝 Desenvolvido com

- Next.js
- TypeScript
- Tailwind CSS
- Supabase
- React Hook Form
- Zod

## 📄 Licença

Projeto pessoal - Uso livre.

---

**Versão**: 1.0.0 (Etapa 1 - Base Funcional)
