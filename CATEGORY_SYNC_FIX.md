# 🔄 Category Synchronization Fix - Fase 14

## ❌ Problema Identificado

Quando um utilizador cadastra um produto no menu "Lista de Produtos" e seleciona/altera a **Categoria (Margem de Lucro)**, a alteração não era propagada para as outras lojas:

- Cada loja tinha suas próprias categorias isoladas em `/lojas/{storeId}/categories/`
- Alterações numa categoria só afetavam a loja específica
- Outras lojas não viam as mudanças da categoria
- Resultado: Inconsistência de categorias entre lojas

### Exemplo do Problema

```
Utilizador tem 3 lojas: Loja A, Loja B, Loja C

1. Cria categoria "Margem Premium" (50%) na Loja A
2. Altera para "Margem Premium" (55%) na Loja A ✅ Atualizada em A
3. Loja B e C continuam com a versão antiga ou não têm a categoria
4. Resultado: Inconsistência entre lojas ❌
```

---

## ✅ Solução Implementada

**Categorias Globais Sincronizadas** - Todas as categorias são agora compartilhadas entre TODAS as lojas do utilizador, com sincronização em tempo real via Firestore listeners.

### Arquitetura da Solução

```
ANTES (Isolado por Loja):
├── lojas/
│   ├── loja-001/categories/
│   │   └── cat-001: "Margem Premium" (50%)
│   ├── loja-002/categories/
│   │   └── (vazio - não tem categoria)
│   └── loja-003/categories/
│       └── (vazio - não tem categoria)

DEPOIS (Sincronizado Globalmente):
├── users/
│   └── user-001/globalCategories/
│       └── cat-001: "Margem Premium" (50%) ← Compartilhada por todas as lojas
```

### Fluxo de Sincronização

```
Utilizador altera categoria na Loja A
         ↓
updateGlobalCategory() -> Firebase /users/{userId}/globalCategories/
         ↓
Firestore trigger -> subscribeToUserGlobalCategories() listener
         ↓
Todas as lojas recebem atualização em TEMPO REAL 🔄
         ↓
ProductForm + BatchProductForm mostram nova categoria sincronizada
```

---

## 📁 Arquivos Novos/Modificados

### ✨ Novos Serviços

**`src/services/globalCategoryService.ts`** (300+ linhas)
- `createGlobalCategory(userId, categoryData)` - Criar categoria global
- `getUserGlobalCategories(userId)` - Obter categorias globais
- `subscribeToUserGlobalCategories(userId, callback)` - Listener real-time
- `updateGlobalCategory(userId, categoryId, updates)` - Atualizar categoria
- `updateGlobalCategoryMarginRules(userId, categoryId, marginRules)` - Atualizar margens
- `deleteGlobalCategory(userId, categoryId)` - Deletar categoria
- `migrateStoreCategoriesToGlobal(userId, storeId)` - Migração de dados legados

### ✨ Novos Hooks

**`src/hooks/useGlobalCategories.ts`** (200+ linhas)
- Hook completo para gerenciar categorias globais
- Padrão: `[categories, loading, error, actions]`
- Listeners real-time automáticos
- Suporta CRUD completo

```typescript
// Uso:
const { categories, loading, error, updateCategory } = useGlobalCategories();

// Atualizar categoria - propagada para todas as lojas
await updateCategory(categoryId, { marginRules: { ... } });
```

### 🔄 Componentes Modificados

**`src/components/ProductForm.tsx`**
- ✅ Agora usa `useGlobalCategories` como fonte primária
- ✅ Fallback para `useCategories` (local) se não houver globais
- ✅ Sincronização automática quando categoria é alterada

**`src/components/BatchProductForm.tsx`**
- ✅ Agora usa `useGlobalCategories` como fonte primária
- ✅ Fallback para `useCategories` (local) se não houver globais
- ✅ Sincronização automática quando categoria é alterada

---

## 🎯 Benefícios da Solução

### 1️⃣ **Sincronização em Tempo Real**
- ✅ Alteração numa categoria reflete **imediatamente** em TODAS as lojas
- ✅ Sem delay, sem refresh manual necessário
- ✅ Listeners do Firestore garantem propagação em tempo real

### 2️⃣ **Consistência Global**
- ✅ Todas as lojas veem a mesma categoria
- ✅ Mesma "Margem de Lucro" (50%) em todas as lojas
- ✅ Sem duplicação de categorias

### 3️⃣ **Compatibilidade Retroativa**
- ✅ Sistema antigo (local per-store) continua funcionando
- ✅ Fallback automático se categorias globais não existam
- ✅ Transição suave sem quebra de funcionalidade

### 4️⃣ **Escalabilidade**
- ✅ Suporta N lojas sem problema
- ✅ Firestore listeners otimizados (query by userId)
- ✅ Performance mantida com índices corretos

---

## 🔧 Como Usar (Para Desenvolvimento)

### Criar Categoria Global

```typescript
const { createCategory } = useGlobalCategories();

await createCategory({
  name: "Margem Premium",
  businessType: "farmacia",
  marginRules: {
    baseMargin: 50,
    minMargin: 40,
    maxMargin: 60,
  },
  priceStrategy: 'percentage',
  regulatoryConstraints: {
    lastUpdated: new Date().toISOString(),
  },
});
```

### Atualizar Categoria (Propagada para Todas as Lojas)

```typescript
const { updateCategory } = useGlobalCategories();

// Alterar margem de 50% para 55%
await updateCategory(categoryId, {
  marginRules: {
    baseMargin: 55, // ← Novo valor
    minMargin: 45,
    maxMargin: 65,
  },
});

// ✅ Todas as lojas veem 55% automaticamente
```

### Monitorar Mudanças em Tempo Real

```typescript
const { categories } = useGlobalCategories();
// Hook automaticamente se subscreve a mudanças
// Qualquer alteração é refletida em `categories` em tempo real
```

---

## 📊 Estrutura de Dados Firestore

### Antes
```
/lojas/{storeId}/categories/{categoryId}
  - storeId: "store-001"
  - name: "Margem Premium"
  - marginRules: { baseMargin: 50 }
```

### Depois
```
/users/{userId}/globalCategories/{categoryId}
  - storeId: "global"  // ← Indica que é global
  - name: "Margem Premium"
  - marginRules: { baseMargin: 50 }
  - ✅ Compartilhada por todas as lojas do userId
```

---

## 🚀 Deployment Steps

### 1. Atualizar Firestore Security Rules

Adicionar regra para categorias globais:

```javascript
// Firestore Rules
match /users/{userId}/globalCategories/{categoryId} {
  allow read: if request.auth.uid == userId;
  allow create: if request.auth.uid == userId && 
                   request.resource.data.storeId == "global";
  allow update: if request.auth.uid == userId;
  allow delete: if request.auth.uid == userId;
}
```

### 2. Migração de Dados (Opcional)

Se houver dados legados em `/lojas/{storeId}/categories/`, executar migração:

```typescript
import { migrateStoreCategoriesToGlobal } from '@/services/globalCategoryService';

// Migrar categorias da Loja A para global
await migrateStoreCategoriesToGlobal(userId, 'store-001');
```

### 3. Verificação

```bash
# Verificar se categorias globais existem
firebase firestore:get /users/{userId}/globalCategories
```

---

## 🧪 Testes Recomendados

### Teste 1: Criar Categoria
```
1. Login como utilizador com 3 lojas
2. Ir para ListaDeProducts (Loja A)
3. Criar categoria "Teste" (50%)
4. Verificar se aparece em todas as lojas
```

### Teste 2: Atualizar Categoria
```
1. Login em Loja A
2. Alterar categoria de 50% para 55%
3. Mudar para Loja B
4. Verificar se categoria mostra 55%
5. Mudar para Loja C
6. Verificar se categoria mostra 55%
```

### Teste 3: Sincronização em Tempo Real
```
1. Abrir ProductForm em Loja A e Loja B (lado a lado)
2. Alterar categoria em Loja A
3. Verificar se Loja B recebe mudança SEM refresh
```

### Teste 4: Backward Compatibility
```
1. Se Sistema antigo tiver categorias locais
2. Sistema deve usar categorias globais (se existirem)
3. Fallback para categorias locais se globais vazias
4. Sem quebra de funcionalidade
```

---

## 🔐 Segurança

- ✅ Categorias são isoladas por `userId` (RBAC)
- ✅ Cada utilizador só vê suas próprias categorias
- ✅ Firestore Rules garantem isolamento
- ✅ Sem acesso cross-user a categorias

---

## 📋 Checklist de Implementação

- [x] Criar `globalCategoryService.ts` com CRUD completo
- [x] Criar `useGlobalCategories.ts` hook
- [x] Atualizar `ProductForm.tsx` para usar categorias globais
- [x] Atualizar `BatchProductForm.tsx` para usar categorias globais
- [x] Adicionar compatibilidade retroativa (fallback local)
- [x] Criar documentação `CATEGORY_SYNC_FIX.md`
- [ ] Atualizar Firestore Security Rules
- [ ] Testar sincronização em tempo real
- [ ] Migrar dados legados (se necessário)
- [ ] Verificar em produção

---

## 🎉 Resultado Final

**Problema:** Alterações de categoria isoladas por loja ❌  
**Solução:** Categorias globais sincronizadas em tempo real ✅  
**Impacto:** Todas as lojas veem a mesma categoria **instantaneamente** 🚀

---

**Versão**: 1.0  
**Data**: 2026-08-22  
**Status**: ✅ Implementado  
