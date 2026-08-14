# 🏗️ Arquitetura Detalhada - Sistema de Categorias por Loja

## 1️⃣ Diagrama de Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              CategoriesTab.tsx                         │    │
│  │ ┌──────────────────────────────────────────────────┐  │    │
│  │ │ Admin: Vê seletor de lojas (grid visual)        │  │    │
│  │ │ Gestor: Vê apenas categorias de sua loja        │  │    │
│  │ │ Funcionário: Sem acesso ao menu                 │  │    │
│  │ └──────────────────────────────────────────────────┘  │    │
│  │                      ↓                                 │    │
│  │ ┌──────────────────────────────────────────────────┐  │    │
│  │ │ CategoryList / CategoryForm                      │  │    │
│  │ └──────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                      STATE MANAGEMENT                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ useCategories({ storeId })                           │    │
│  │ ┌──────────────────────────────────────────────────┐  │    │
│  │ │ categories: CategoryMarginConfig[]              │  │    │
│  │ │ loading: boolean                                │  │    │
│  │ │ error: string | null                            │  │    │
│  │ │ createCategory()                                │  │    │
│  │ │ updateCategory()                                │  │    │
│  │ │ deleteCategory()                                │  │    │
│  │ │ getCategory()                                   │  │    │
│  │ └──────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ useStore()                                            │    │
│  │ ┌──────────────────────────────────────────────────┐  │    │
│  │ │ currentStore: { storeId, storeName, storeType }│  │    │
│  │ │ userStores: Store[]                            │  │    │
│  │ │ switchStore()                                   │  │    │
│  │ └──────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  categoryService.ts                                            │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ createCategory(storeId, data)                       │      │
│  │ getStoreCategories(storeId)                         │      │
│  │ subscribeToStoreCategories(storeId, callback)       │      │
│  │ updateCategory(storeId, categoryId, updates)        │      │
│  │ updateCategoryMarginRules(storeId, categoryId, ...) │      │
│  │ deleteCategory(storeId, categoryId)                 │      │
│  │ getDefaultCategory(storeId)                         │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE (Firestore)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Collection: lojas/{storeId}/categories/{categoryId}           │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ Document: {                                          │      │
│  │   id: string                                         │      │
│  │   storeId: string (isolamento por loja)             │      │
│  │   name: string                                       │      │
│  │   businessType: string                              │      │
│  │   description?: string                              │      │
│  │   marginRules: {                                     │      │
│  │     baseMargin: number                              │      │
│  │     minMargin: number                               │      │
│  │     maxMargin: number                               │      │
│  │   }                                                  │      │
│  │   priceStrategy: 'fixed' | 'percentage' | ...       │      │
│  │   regulatoryConstraints: {...}                      │      │
│  │   createdAt: ISO string                             │      │
│  │   updatedAt: ISO string                             │      │
│  │ }                                                    │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
│  Real-time subscriptions: OnSnapshot listeners                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ Fluxo de Autenticação e Autorização (RBAC)

```
┌─────────────────────────────┐
│  Utilizador faz Login       │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────────────────┐
│ useUserAuth() retorna:                  │
│ - papel: 'admin' | 'loja-manager' | ... │
│ - isAdmin: boolean                      │
└──────────────┬──────────────────────────┘
               ↓
       ┌───────┴───────┐
       ↓               ↓
   [ADMIN]         [NÃO-ADMIN]
       ↓               ↓
  ┌─────────────┐  ┌──────────────────────┐
  │ Vê Menu     │  │ Menu NÃO aparece     │
  │ "Categorias"│  │                      │
  │             │  │ Mas vê categorias:   │
  │ Clica →     │  │ - Em produtos        │
  │ CategoriesTab│ │ - Da sua loja        │
  │             │  └──────────────────────┘
  │ Vê:         │
  │ • Seletor   │
  │   de lojas  │
  │ • Grid com  │
  │   todas as  │
  │   lojas     │
  │ • Clica em  │
  │   loja →    │
  │   Vê todas  │
  │   categorias│
  │   daquela   │
  │   loja      │
  └─────────────┘
```

---

## 3️⃣ Ciclo de Vida de uma Categoria

```
1. CRIAR CATEGORIA
   ┌──────────────────────────────────┐
   │ Admin seleciona loja: "Zango"   │
   └────────────┬─────────────────────┘
                ↓
   ┌──────────────────────────────────┐
   │ Admin clica em "Nova Categoria" │
   └────────────┬─────────────────────┘
                ↓
   ┌──────────────────────────────────────────────┐
   │ CategoryForm.tsx abre                        │
   │ Preenche: nome, margem, regras               │
   └────────────┬─────────────────────────────────┘
                ↓
   ┌──────────────────────────────────────────────┐
   │ createCategory(storeId='loja-001', data)    │
   └────────────┬─────────────────────────────────┘
                ↓
   ┌──────────────────────────────────────────────────────┐
   │ Firestore: lojas/loja-001/categories/auto-id       │
   │ Documento criado com:                              │
   │ - id: auto-generated                               │
   │ - storeId: "loja-001" ← ISOLAMENTO                │
   │ - name, marginRules, etc                           │
   │ - createdAt: now                                   │
   │ - updatedAt: now                                   │
   └────────────┬─────────────────────────────────────────┘
                ↓
   ✅ Categoria criada com sucesso
      (OnSnapshot dispara → UI atualiza)

2. ATUALIZAR CATEGORIA
   ┌──────────────────────────────────────────────┐
   │ Admin clica "Editar" em categoria           │
   └────────────┬─────────────────────────────────┘
                ↓
   ┌──────────────────────────────────────────────┐
   │ CategoryForm carrega dados existentes        │
   │ Admin modifica: margem 35% → 38%             │
   └────────────┬─────────────────────────────────┘
                ↓
   ┌──────────────────────────────────────────────────────┐
   │ updateCategory(storeId, categoryId, updates)        │
   └────────────┬─────────────────────────────────────────┘
                ↓
   ┌──────────────────────────────────────────────────────┐
   │ Firestore: lojas/loja-001/categories/cat-001       │
   │ Documento atualizado:                              │
   │ - marginRules.baseMargin: 38 (era 35)               │
   │ - updatedAt: now                                    │
   └────────────┬─────────────────────────────────────────┘
                ↓
   ✅ Categoria atualizada
      (OnSnapshot dispara → UI atualiza)

3. DELETAR CATEGORIA
   ┌──────────────────────────────────────────────┐
   │ Admin clica "Deletar" em categoria          │
   │ Confirma ação                                │
   └────────────┬─────────────────────────────────┘
                ↓
   ┌──────────────────────────────────────────────────────┐
   │ deleteCategory(storeId, categoryId)                 │
   └────────────┬─────────────────────────────────────────┘
                ↓
   ┌──────────────────────────────────────────────────────┐
   │ Firestore: lojas/loja-001/categories/cat-001       │
   │ Documento DELETADO                                  │
   └────────────┬─────────────────────────────────────────┘
                ↓
   ✅ Categoria deletada
      (OnSnapshot dispara → UI atualiza)
      ⚠️ Produtos ainda tem referência (sem cascade)
```

---

## 4️⃣ Estrutura de Tipos (TypeScript)

```typescript
// ============================================
// CategoryMarginConfig (tipo principal)
// ============================================
interface CategoryMarginConfig {
  id: string;                           // "cat-001"
  storeId: string;                      // "loja-001" ← NOVO
  name: string;                         // "Medicamentos"
  businessType: string;                 // "farmacia"
  description?: string;                 // Opcional
  color?: string;                       // "emerald-600"
  icon?: string;                        // "Pill"
  
  marginRules: {
    baseMargin: number;                 // 35
    minMargin: number;                  // 30
    maxMargin: number;                  // 40
    recommendedMargin?: number;         // 35
    historicalAverageMargin?: number;   // 34.5
  };
  
  priceStrategy: 'fixed' | 'percentage' | 'tiered' | 'dynamic';
  
  regulatoryConstraints: {
    maxMarginPercentage?: number;       // 35
    requiresRegistration?: boolean;     // true/false
    restrictionBody?: string;           // "ARMED"
    notes?: string;                     // "Conforme legislação..."
    lastUpdated: string;                // ISO date
  };
  
  historicalData?: {
    totalProductsCount: number;
    totalProductsSold: number;
    averageMonthlyRevenue: number;
    averageProductROI: number;
    seasonalityPattern?: string;
    lastUpdated: string;
  };
  
  createdAt: string;                    // ISO date
  updatedAt: string;                    // ISO date
}

// ============================================
// StoreContext
// ============================================
interface StoreContextType {
  currentStore: {
    storeId: string;                    // "loja-001"
    storeName: string;                  // "Farmácia Zango"
    storeType: string;                  // "farmacia"
  } | null;
  
  userStores: Store[];                  // Array de todas as lojas do user
  switchStore: (storeId: string) => Promise<void>;
  // ... outros
}

// ============================================
// useCategories Hook Return
// ============================================
interface UseCategoriesReturn {
  categories: CategoryMarginConfig[];
  loading: boolean;
  error: string | null;
  createCategory: (data: Omit<CategoryMarginConfig, ...>) => Promise<string>;
  updateCategory: (id: string, updates: Partial<CategoryMarginConfig>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getCategory: (id: string) => Promise<CategoryMarginConfig | null>;
  getCategoryById: (id: string) => CategoryMarginConfig | undefined;
}
```

---

## 5️⃣ Fluxo de Permissões (Detalhado)

```
┌──────────────────────────────────────────────────────────────┐
│                    navigationConfig.ts                        │
│                                                               │
│  id: 'categories'                                            │
│  roles: ['admin'] ← Apenas admin vê o menu                  │
└─────────────────┬──────────────────────────────────────────────┘
                  ↓
            App.tsx
                  ↓
        Verifica: activeTab === 'categories'
                  ↓
         ┌────────┴────────┐
         ↓                 ↓
     [ADMIN]          [NÃO-ADMIN]
         ↓                 ↓
   CategoriesTab    ← Menu não aparece
         ↓
   useStore() → currentStore
         ↓
   useCategories({ storeId })
         ↓
   categoryService.subscribeToStoreCategories()
         ↓
   Firestore: lojas/{storeId}/categories
         ↓
    Mostra todas as categorias da loja selecionada
```

---

## 6️⃣ Real-Time Updates (OnSnapshot)

```
┌─────────────────────────────────────────────────────────────┐
│ User A (Admin) - Loja Zango                                │
│ Abre CategoriesTab                                         │
└────────────────┬────────────────────────────────────────────┘
                 ↓
    subscribeToStoreCategories('loja-zango', callback)
                 ↓
    OnSnapshot listener criado
    (escuta: lojas/loja-zango/categories)
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ User B (Admin) - Mesma Loja Zango                         │
│ Cria nova categoria: "Vitaminas"                           │
│ createCategory('loja-zango', { name: 'Vitaminas' })       │
└────────────────┬────────────────────────────────────────────┘
                 ↓
    Firestore salva novo documento
                 ↓
    OnSnapshot dispara para TODOS os listeners
    em lojas/loja-zango/categories
                 ↓
    ┌─────────────────────────┬─────────────────────────┐
    ↓                         ↓
  User A                    User B
  (CategoriesTab)           (CategoriesTab)
  
  callback({                callback({
    ...,                      ...categoriesAnteriores,
    novo: Vitaminas           novo: Vitaminas
  })                        })
  
  setState(categories)      setState(categories)
         ↓                         ↓
   UI Atualiza              UI Atualiza
   (mostra Vitaminas)       (mostra Vitaminas)
```

---

## 7️⃣ Checklist de Implementação

- [x] **Fase 12 (Categorias por Loja)**
  - [x] navigationConfig.ts - Restringir a 'admin'
  - [x] CategoryMarginConfig - Adicionar storeId
  - [x] categoryService.ts - Reescrever funções
  - [x] useCategories - Aceitar storeId
  - [x] CategoriesTab - Adicionar seletor para admin

- [ ] **Fase 13 (Próximas Etapas)**
  - [ ] Integração com Produtos (referenciar categorias por loja)
  - [ ] Relatórios por categoria/loja
  - [ ] Histórico de mudanças em categorias
  - [ ] Backup de categorias

---

**Versão:** 1.0 (Fase 12)
**Última atualização:** 2026-08-14
