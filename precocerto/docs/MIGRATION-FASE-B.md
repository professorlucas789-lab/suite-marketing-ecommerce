# 🔄 Guia de Migração — FASE B

**Migração de Estrutura de Produtos para Modelo Unificado**

Data: 9 de outubro de 2026  
Status: ✅ Pronto para Staging

---

## 📋 O que é a Migração FASE B?

A FASE B migra o sistema de gestão de produtos de uma **estrutura fragmentada** para uma **estrutura unificada**:

### ANTES (Fragmentado):
```
products/
  ├── prod-001
  ├── prod-002
  └── prod-003

stores/{storeId}/products/
  ├── prod-001 (dados por loja)
  ├── prod-002
  └── prod-003
```

### DEPOIS (Unificado):
```
products/
  ├── prod-001/
  │  ├── (dados globais)
  │  └── stock/
  │     ├── store-001
  │     └── store-002
  ├── prod-002/
  │  ├── (dados globais)
  │  └── stock/
  │     ├── store-001
  │     └── store-002
  └── prod-003/
     └── (mesma estrutura)
```

### Benefícios:
- ✅ Sem fragmentação de dados
- ✅ Queries mais eficientes
- ✅ Isolamento por loja garantido
- ✅ Transações atómicas para vendas
- ✅ Histórico de movimentos rastreado

---

## 🚀 Como Executar em Staging

### Pré-requisitos:
1. **Node.js 18+** instalado
2. **npm** ou **yarn** disponível
3. **Credenciais Firebase Staging** obtidas do console Firebase

### Passo 1: Configurar Credenciais

```bash
# Copiar arquivo de exemplo
cp .env.staging.example .env.staging

# Editar .env.staging com credenciais reais
nano .env.staging
```

**Credenciais necessárias:**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Obter em: **Firebase Console > Project Settings > Web App**

### Passo 2: Instalar Dependências

```bash
cd precocerto
npm install
```

### Passo 3: Executar Migração

```bash
# Executar migração em staging
npm run migrate:staging

# Ou versão de demonstração (não faz alterações):
npm run migrate:demo
```

---

## 📊 O que Acontece na Migração

### 1️⃣ Backup Automático
- Cria cópia completa de `products/`
- Cria cópia completa de `stores/*/products/`
- Armazena em `products_backup/` e `stores_products_backup/`
- ID do backup: `backup_TIMESTAMP` (usado para rollback se necessário)

### 2️⃣ Migração de Dados
Para cada loja:
- Lê produtos originais
- Lê stock de cada loja
- Escreve em nova estrutura: `products/{id}/stock/{storeId}`
- Preserva histórico de movimentos

### 3️⃣ Validação de Integridade
- Verifica se há produtos órfãos
- Verifica se há lojas vazias
- Valida consistência de dados
- Gera relatório detalhado

### 4️⃣ Relatório Final
```
╔════════════════════════════════════════════════════════════╗
║  RELATÓRIO DE MIGRAÇÃO                                     ║
╚════════════════════════════════════════════════════════════╝

Status: ✅ SUCESSO
Timestamp: 2026-10-09T23:45:12.345Z
Backup ID: backup_2026-10-09T23:45:12.345Z

📊 Estatísticas:
   - Produtos processados: 145
   - Lojas processadas: 3
   - Stock entries migradas: 287
   - Duração: 2543ms

✅ Migração completada com sucesso!
```

---

## ✅ Validação Pós-Migração

Após a migração completar com sucesso:

### 1️⃣ Verificar Dados em Staging
```bash
# Conectar ao Firebase Staging
firebase use precocerto-staging

# Verificar estrutura nova
firebase firestore:inspect products --limit=5
firebase firestore:inspect products/prod-001/stock --limit=5
```

### 2️⃣ Testar Fluxo de Vendas
- [ ] Criar venda com 1 produto
- [ ] Criar venda com múltiplos produtos
- [ ] Validar stock atualizado corretamente
- [ ] Testar anulação de venda
- [ ] Validar reversão de stock

### 3️⃣ Verificar Relatórios
- [ ] Dashboard atualiza corretamente
- [ ] Histórico de vendas mantido
- [ ] KPIs calculam corretamente
- [ ] Alertas de validade funcionam

### 4️⃣ Obter Aprovação
- [ ] Testar em ambiente staging
- [ ] Validar com time
- [ ] Aprovar para produção

---

## 🔄 Rollback (Se Necessário)

Se algo der errado durante a migração, é possível fazer rollback:

```typescript
import { rollbackMigration } from '../src/scripts/migrationPhaseB';

// Rollback usando o backup ID
await rollbackMigration('backup_2026-10-09T23:45:12.345Z');
```

**O que rollback faz:**
1. Restaura `products/` do backup
2. Restaura `stores/*/products/` do backup
3. Apaga nova estrutura `products/*/stock/`
4. Retorna ao estado anterior

**Importante:** Rollback é seguro e reversível. Pode ser executado quantas vezes necessário.

---

## 📈 Progresso FASE B

| Etapa | Status | Data |
|-------|--------|------|
| Implementação de Serviços | ✅ Completo | 2026-10-09 |
| Testes Unitários | ✅ Completo (27 testes) | 2026-10-09 |
| Testes de Integração | ✅ Completo (1254 testes) | 2026-10-09 |
| TypeScript Compilation | ✅ Sem erros | 2026-10-09 |
| **Migração em Staging** | 🔄 Em Progresso | 2026-10-09 |
| Validação Pós-Migração | ⏳ Próximo | TBD |
| Deploy em Produção | ⏳ Próximo | TBD |

---

## 📚 Documentação Relacionada

- 📄 [FASE-B-NORMALIZACAO-PRODUTOS.md](./FASE-B-NORMALIZACAO-PRODUTOS.md) — Design técnico detalhado
- 📄 [FASE-B-CHECKLIST.md](../FASE-B-CHECKLIST.md) — Checklist de implementação
- 📄 [unifiedProductService.ts](../src/services/unifiedProductService.ts) — Serviço de produtos
- 📄 [unifiedSalesService.ts](../src/services/unifiedSalesService.ts) — Serviço de vendas

---

## 🆘 Troubleshooting

### "Credenciais de staging incompletas"
**Solução:** Preencher `.env.staging` com todas as variáveis necessárias

### "Falha ao conectar ao Firebase"
**Solução:** Verificar se credenciais estão corretas e projeto está ativo

### "Stock não atualizado corretamente"
**Solução:** Verificar integridade de dados com relatório de validação

### "Rollback falhou"
**Solução:** Contatar administrador, backup está preservado

---

## 📞 Contacto

Em caso de dúvidas ou problemas:
1. Consultar documentação
2. Verificar logs de erro
3. Contactar time de desenvolvimento
4. Executar rollback se necessário

---

**Status Final: ✅ Pronto para Staging**

A migração pode ser executada em staging a qualquer momento usando `npm run migrate:staging`.
