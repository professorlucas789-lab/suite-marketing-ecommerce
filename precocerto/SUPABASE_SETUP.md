# Guia de Configuração Supabase - PreçoCerto

## 📋 Pré-requisitos

- Conta Supabase criada em [supabase.com](https://supabase.com)
- Projeto Supabase criado

## 🔧 Passo a Passo

### 1. Acessar o Dashboard Supabase

1. Faça login em [app.supabase.com](https://app.supabase.com)
2. Selecione seu projeto

### 2. Obter as Credenciais

1. Vá para **Settings** > **API**
2. Copie:
   - **Project URL** (vai para `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public** (vai para `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

3. Salve em `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://seu-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

### 3. Criar a Tabela de Produtos

1. Vá para **SQL Editor**
2. Clique em **New Query**
3. Cole o conteúdo de `supabase/migrations/001_create_products_table.sql`
4. Clique em **Run**

Ou execute através do terminal (se tiver Supabase CLI instalado):
```bash
supabase db push
```

### 4. Verificar a Configuração

Na seção **Tables** do dashboard, você deve ver:
- Tabela `products` com as colunas configuradas
- Políticas de RLS ativas

## 🔑 Configurar Autenticação

### Ativar Email/Senha

1. Vá para **Authentication** > **Providers**
2. Certifique-se que **Email** está habilitado
3. Configure em **Email** > **Confirm email** (se desejar)

### Configurar Email de Confirmação (Opcional)

1. Vá para **Authentication** > **Email Templates**
2. Customize se necessário (padrão é suficiente para desenvolvimento)

## 🗂️ Estrutura de Dados

### Tabela `products`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único do produto |
| user_id | UUID | ID do usuário (referencia auth.users) |
| name | VARCHAR(255) | Nome do produto |
| category | VARCHAR(100) | Categoria |
| supplier | VARCHAR(255) | Fornecedor (opcional) |
| cost_of_purchase | DECIMAL(12, 2) | Custo de compra |
| transport_cost | DECIMAL(12, 2) | Custo de transporte |
| packaging_cost | DECIMAL(12, 2) | Custo de embalagem |
| other_costs | DECIMAL(12, 2) | Outros custos |
| desired_margin | DECIMAL(5, 2) | Margem desejada em % |
| notes | TEXT | Observações |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

## 🔒 Políticas de RLS (Row Level Security)

As políticas garantem que:
- Usuários só visualizem seus próprios produtos
- Usuários só possam inserir produtos em seu nome
- Usuários só possam atualizar/deletar seus produtos

Essas políticas já estão configuradas no script SQL.

## 🧪 Testar a Configuração

1. Inicie o servidor:
```bash
npm run dev
```

2. Acesse `http://localhost:3000`

3. Cadastre uma conta nova

4. Tente criar um produto

Se tudo funcionar, está pronto!

## 🐛 Troubleshooting

### "Failed to fetch" ao fazer login

- Verifique se `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão corretos
- Reinicie o servidor dev

### Erro "relation products does not exist"

- Execute o script SQL novamente
- Verifique se está no banco de dados correto

### Usuários veem dados de outros usuários

- Verifique se as políticas de RLS estão ativas
- Vá para **Authentication** > **Policies** e confirme

### Problema com CORS

- Vá para **Settings** > **CORS**
- Adicione sua URL de desenvolvimento: `http://localhost:3000`
- Em produção, adicione o domínio final

## 📚 Referências

- [Docs Supabase](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase SQL Editor](https://supabase.com/docs/guides/database/sql-editor)
