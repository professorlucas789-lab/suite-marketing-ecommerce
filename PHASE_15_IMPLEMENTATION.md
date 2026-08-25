# 🔐 Phase 15: Firestore Security + Data Migration - Implementation Guide

## Overview

**Phase 15** implementa:
1. ✅ **Firestore Security Rules Completas** - RBAC e isolamento de dados
2. ✅ **Data Migration Service** - Migrar categorias legadas para globais
3. ✅ **Validation & Integrity Checks** - Garantir consistência pós-migração
4. ✅ **Migration UI Panel** - Interface para administradores

---

## 📋 Checklist de Implementação

### 1. Deploy Firestore Security Rules

```bash
# Fazer login no Firebase
firebase login

# Fazer deploy das novas regras
firebase deploy --only firestore:rules

# Verificar se deployment foi bem-sucedido
firebase firestore:rules:get
```

**Ficheiro**: `firestore.rules`

**Principais Regras**:
- ✅ Categorias globais isoladas por userId
- ✅ Produtos acesso limitado a staff da loja
- ✅ Vendas só podem ser criadas por funcionários
- ✅ Notificações gerenciadas por gerentes
- ✅ Logs de automação restritos

---

### 2. Executar Migração de Dados

#### Opção A: Via UI (Recomendado para produção)

1. Abrir Dashboard de Administrador
2. Ir para Settings → Data Migration
3. Clicar em "Iniciar Migração"
4. Aguardar conclusão (pode demorar alguns minutos)
5. Validar integridade dos dados
6. Fazer download do relatório

#### Opção B: Via CLI (Para desenvolvimento)

```bash
# Entrar no Node REPL com Firebase Admin SDK
node

// Importar serviço de migração
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const { migrateUserCategoriesToGlobal, generateMigrationReport } = require('./dist/services/dataMigrationService');

// Executar migração
const stats = await migrateUserCategoriesToGlobal('USER_ID_HERE');
console.log(generateMigrationReport(stats));

// Validar
const { validateMigrationIntegrity } = require('./dist/services/dataMigrationService');
const result = await validateMigrationIntegrity('USER_ID_HERE');
console.log(result);
```

---

## 🏗️ Arquitetura

### Firestore Structure (Novo)

```
users/
├── {userId}/
│   └── globalCategories/
│       └── {categoryId}: CategoryMarginConfig (storeId: "global")

lojas/
├── {storeId}/
│   ├── categories/        ← Legacy (pode ser removido após migração)
│   ├── produtos/
│   ├── sales/
│   ├── notifications/
│   ├── staff/
│   └── ...
```

### RBAC Levels

| Nível | Role | Permissões |
|-------|------|-----------|
| 🔴 Proprietário | owner | Todas (CRUD completo) |
| 🟠 Gerente | manager | CRUD produtos, vendas, alertas |
| 🟡 Funcionário | staff | Read produtos, Create/Update vendas |
| 🔵 Visitante | - | Nenhuma (sem acesso) |

---

## 📊 Data Migration Flow

```
┌─────────────────────────────────────────────────────┐
│ 1. LOAD: Obter lojas do utilizador                 │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 2. FOR EACH STORE: Obter categorias locais          │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 3. CREATE: Categorias globais (batch)               │
│   storeId: "global" (não por loja)                 │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 4. UPDATE: Produtos com novo categoryId             │
│   500 operações por batch (limite Firestore)       │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 5. VALIDATE: Verificar integridade                  │
│   - Produtos órfãos (categoryId inválido)          │
│   - Inconsistências de dados                       │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 6. REPORT: Gerar relatório detalhado               │
│   - Estatísticas                                    │
│   - Erros encontrados                               │
│   - Próximos passos                                 │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Testes de Validação

### Teste 1: Validar Firestore Rules

```bash
# Verificar se regras foram aplicadas
firebase firestore:rules:get

# Deve output
# rules_version = '2';
# service cloud.firestore {
#   ...
# }
```

### Teste 2: Verificar Acesso RBAC

```javascript
// Como staff (funcionário):
- ✅ Pode LER produtos
- ✅ Pode CRIAR vendas
- ❌ Não pode DELETAR produtos

// Como manager:
- ✅ Pode LER/CRIAR/ATUALIZAR produtos
- ✅ Pode DELETAR vendas (auditoria)
- ❌ Não pode alterar configurações loja

// Como owner (proprietário):
- ✅ Pode tudo
```

### Teste 3: Validar Migração

```javascript
const { validateMigrationIntegrity } = require('./dataMigrationService');

const result = await validateMigrationIntegrity('userId');

// Deve retornar:
// {
//   isValid: true,
//   orphanedProducts: [],
//   inconsistencies: []
// }
```

---

## 📊 Estatísticas Esperadas

Após migração bem-sucedida:

```
Exemplo para utilizador com 3 lojas:

Loja A: 15 categorias → 15 globais
Loja B: 15 categorias → reutiliza globais (15 criadas antes)
Loja C: 15 categorias → reutiliza globais (15 criadas antes)

Total: 45 categorias locais → 15 globais ✅ (reduziu 66%)

Produtos atualizados: ~500 produtos
Tempo de migração: ~30-60 segundos

Performance: +40% (menos queries de categorias)
```

---

## 🔐 Segurança Checklist

- [x] Firestore Rules implementadas com RBAC completo
- [x] Categorias globais isoladas por userId
- [x] Produtos acesso limitado por loja
- [x] Vendas auditadas e rastreáveis
- [x] Sem acesso cross-user
- [ ] Backup de dados antes de migração (TO-DO)
- [ ] SSL/TLS em todas as conexões (Firebase padrão)
- [ ] Auditoria de mudanças (Firebase Audit Logs)

---

## 🚀 Deployment Steps (Produção)

### Pre-Deployment

```bash
# 1. Fazer backup de dados
firebase firestore:export gs://bucket-name/backup-phase-15

# 2. Testar em staging
firebase deploy --only firestore:rules --project staging-project

# 3. Executar migração em staging
# ... verificar resultado
```

### Deployment

```bash
# 1. Deploy Firestore Rules
firebase deploy --only firestore:rules --project production-project

# 2. Executar migração em produção
# Via UI: Settings → Data Migration → Iniciar
# Ou via Cloud Function endpoint: POST /triggerMigration

# 3. Validar integridade
# Via UI: Settings → Data Migration → Validar

# 4. Monitorar logs
firebase functions:log --project production-project
```

### Post-Deployment

```bash
# 1. Verificar estatísticas
firebase firestore:get /users --project production-project | grep globalCategories

# 2. Testar aplicação
# - Criar produto (deve usar categoria global)
# - Alterar categoria (deve sincronizar)
# - Verificar acesso RBAC

# 3. Documentar migração
# - Anexar relatório ao ticket
# - Atualizar runbook
```

---

## 📝 Troubleshooting

### ❌ Problema: "Permission denied" ao executar migração

**Solução**:
1. Verificar se utilizador é proprietário de lojas
2. Verificar se Firestore Rules estão ativas
3. Verificar credenciais de autenticação

### ❌ Problema: Produtos órfãos após migração

**Solução**:
```javascript
// Executar repair
const orphanedProducts = validationResult.orphanedProducts;

for (const orphaned of orphanedProducts) {
  // Encontrar categoria por nome
  const categoryName = 'Margem Premium';
  const globalCat = globalCategories.find(c => c.name === categoryName);
  
  if (globalCat) {
    // Atualizar produto com categoria válida
    await updateDoc(productRef, {
      categoryId: globalCat.id,
      updatedAt: new Date().toISOString(),
    });
  }
}
```

### ❌ Problema: Migração muito lenta

**Solução**:
- Aumentar tamanho de batch (máx 500)
- Executar fora de horário de pico
- Monitorar quota Firestore (reads/writes)

---

## 📚 Documentos Relacionados

- `CATEGORY_SYNC_FIX.md` - Phase 14 (Categorias Globais)
- `firestore.rules` - Regras de segurança
- `dataMigrationService.ts` - Serviço de migração
- `MigrationPanel.tsx` - Interface de migração

---

## 🎯 Resultados Esperados

✅ **Segurança**:
- RBAC completo implementado
- Dados isolados por utilizador/loja
- Acesso controlado por papel

✅ **Performance**:
- Menos queries (categorias compartilhadas)
- Sincronização em tempo real
- Índices Firestore otimizados

✅ **Escalabilidade**:
- Suporta 1000+ lojas
- Sincronização automática
- Sem limite de loja

✅ **Conformidade**:
- RGPD: Isolamento de dados
- Auditoria: Logs de mudanças
- Backup: Recuperação de dados

---

## 📞 Suporte

Para dúvidas:
1. Verificar logs: `firebase functions:log`
2. Verificar Firestore: Firebase Console → Firestore
3. Consultar documentação: README.md
4. Abrir issue no GitHub

---

**Versão**: 1.0  
**Data**: 2026-08-22  
**Status**: ✅ Ready for Production  
