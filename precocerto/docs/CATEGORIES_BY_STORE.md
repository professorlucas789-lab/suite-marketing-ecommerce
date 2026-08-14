# 📚 Documentação - Sistema de Categorias por Loja (Fase 12)

## 📖 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Exemplos de Uso](#exemplos-de-uso)
4. [API Reference](#api-reference)
5. [Migrações](#migrações)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

### O Problema Resolvido
Antes: Todas as categorias eram globais por utilizador, causando conflitos de preços entre lojas.
Agora: Cada loja tem suas próprias categorias com margens e preços específicos.

### Benefícios
✅ **Isolamento de Dados** - Categorias isoladas por loja
✅ **Margens Flexíveis** - Cada loja define suas próprias margens
✅ **Controle Centralizado** - Admin gerencia tudo
✅ **Escalabilidade** - Suporta múltiplas lojas com facilidade

### Casos de Uso Real

#### Exemplo 1: Farmácia Multi-Zona
```
Farmácia Zango (Zona A)
├─ Medicamentos (Margem: 35%)
├─ Genéricos (Margem: 30%)
└─ Cosméticos (Margem: 40%)

Farmácia Calumbo (Zona B)
├─ Medicamentos (Margem: 28%)
├─ Genéricos (Margem: 25%)
└─ Cosméticos (Margem: 35%)
```

---

## 🏗️ Arquitetura

### Estrutura Firestore

```
firestore/
├── lojas/
│   ├── "loja-001-zango"/
│   │   ├── categories/
│   │   │   ├── "cat-001"
│   │   │   │   ├── id: "cat-001"
│   │   │   │   ├── storeId: "loja-001-zango"
│   │   │   │   ├── name: "Medicamentos"
│   │   │   │   ├── marginRules: { baseMargin: 35, ... }
│   │   │   │   └── ...
│   │   │   └── "cat-002"
│   │   └── ...
│   │
│   └── "loja-002-calumbo"/
│       ├── categories/
│       │   ├── "cat-001"
│       │   │   ├── id: "cat-001"
│       │   │   ├── storeId: "loja-002-calumbo"
│       │   │   ├── name: "Medicamentos"
│       │   │   ├── marginRules: { baseMargin: 28, ... }
│       │   │   └── ...
│       │   └── ...
│       └── ...
└── ...
```

### Fluxo de Dados

```
User (Admin)
    ↓
App.tsx (activeTab === 'categories')
    ↓
CategoriesTab (com StoreContext)
    ↓
useCategories({ storeId }) ← StoreContext fornece storeId
    ↓
categoryService.ts (getStoreCategories, subscribeToStoreCategories, etc)
    ↓
Firestore (lojas/{storeId}/categories)
```

### Controle de Acesso (RBAC)

| Papel | Acesso | Visualização |
|-------|--------|-------------|
| **Admin** | ✅ Menu "Categorias" | Todas as lojas, seletor visual |
| **Gestor de Loja** | ❌ Menu "Categorias" | Categorias da sua loja (em produtos) |
| **Funcionário** | ❌ Menu "Categorias" | Categorias da sua loja (em produtos) |

---

## 💻 Exemplos de Uso

### 1. Usar o Hook em um Componente

```typescript
import { useCategories } from '../hooks/useCategories';
import { useStore } from '../contexts/StoreContext';

export function MyComponent() {
  const { currentStore } = useStore();
  const { categories, loading, error } = useCategories({ 
    storeId: currentStore?.storeId || '' 
  });

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      {categories.map(cat => (
        <div key={cat.id}>
          {cat.name} - Margem: {cat.marginRules.baseMargin}%
        </div>
      ))}
    </div>
  );
}
```

### 2. Criar uma Categoria

```typescript
const { createCategory } = useCategories({ storeId: 'loja-001' });

const newCategory = await createCategory({
  name: 'Medicamentos Premium',
  businessType: 'farmacia',
  description: 'Medicamentos de marca importada',
  color: 'emerald-600',
  icon: 'Pill',
  marginRules: {
    baseMargin: 40,
    minMargin: 35,
    maxMargin: 45,
    recommendedMargin: 40,
  },
  priceStrategy: 'percentage',
  regulatoryConstraints: {
    maxMarginPercentage: 45,
    restrictionBody: 'ARMED',
    lastUpdated: new Date().toISOString(),
  },
});

console.log('Categoria criada:', newCategory);
```

### 3. Atualizar Margens de uma Categoria

```typescript
const { updateCategory } = useCategories({ storeId: 'loja-001' });

await updateCategory('cat-001', {
  marginRules: {
    baseMargin: 38, // Aumentou de 35 para 38
    minMargin: 33,
    maxMargin: 43,
  },
});
```

### 4. Deletar uma Categoria

```typescript
const { deleteCategory } = useCategories({ storeId: 'loja-001' });

await deleteCategory('cat-001');
```

### 5. Obter Categoria Específica

```typescript
const { getCategory } = useCategories({ storeId: 'loja-001' });

const category = await getCategory('cat-001');
console.log(category);
// {
//   id: 'cat-001',
//   storeId: 'loja-001-zango',
//   name: 'Medicamentos',
//   marginRules: { baseMargin: 35, ... },
//   ...
// }
```

### 6. Admin Selecionando Loja

```typescript
// Em CategoriesTab.tsx
const { userStores, switchStore } = useStore();

const handleStoreChange = async (storeId: string) => {
  setSelectedStoreId(storeId);
  await switchStore(storeId);
  // Hook useCategories vai se reinscrever automaticamente
};

return (
  <div>
    <select onChange={(e) => handleStoreChange(e.target.value)}>
      {userStores.map(store => (
        <option key={store.id} value={store.id}>
          {store.nome}
        </option>
      ))}
    </select>
  </div>
);
```

---

## 📚 API Reference

### categoryService.ts

#### `createCategory(storeId, categoryData)`
```typescript
export async function createCategory(
  storeId: string,
  categoryData: Omit<CategoryMarginConfig, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>
): Promise<string>
```
**Parâmetros:**
- `storeId` (string) - ID da loja
- `categoryData` (object) - Dados da categoria

**Retorna:** ID da categoria criada

**Exemplo:**
```typescript
const categoryId = await createCategory('loja-001', {
  name: 'Cosméticos',
  businessType: 'farmacia',
  marginRules: { baseMargin: 40, minMargin: 35, maxMargin: 45 },
  priceStrategy: 'percentage',
  regulatoryConstraints: { lastUpdated: new Date().toISOString() },
});
```

---

#### `getStoreCategories(storeId)`
```typescript
export async function getStoreCategories(
  storeId: string
): Promise<CategoryMarginConfig[]>
```
**Parâmetros:**
- `storeId` (string) - ID da loja

**Retorna:** Array de categorias da loja

**Exemplo:**
```typescript
const categories = await getStoreCategories('loja-001');
console.log(categories.length); // 5
```

---

#### `subscribeToStoreCategories(storeId, callback)`
```typescript
export function subscribeToStoreCategories(
  storeId: string,
  onUpdate: (categories: CategoryMarginConfig[]) => void
): Unsubscribe
```
**Parâmetros:**
- `storeId` (string) - ID da loja
- `onUpdate` (function) - Callback quando categorias mudam

**Retorna:** Função para unsubscribe

**Exemplo:**
```typescript
const unsubscribe = subscribeToStoreCategories('loja-001', (categories) => {
  console.log('Categorias atualizadas:', categories);
});

// Depois, parar de escutar
unsubscribe();
```

---

#### `updateCategory(storeId, categoryId, updates)`
```typescript
export async function updateCategory(
  storeId: string,
  categoryId: string,
  updates: Partial<CategoryMarginConfig>
): Promise<void>
```
**Parâmetros:**
- `storeId` (string) - ID da loja
- `categoryId` (string) - ID da categoria
- `updates` (object) - Campos a atualizar

**Exemplo:**
```typescript
await updateCategory('loja-001', 'cat-001', {
  marginRules: { baseMargin: 38, minMargin: 33, maxMargin: 43 },
});
```

---

#### `deleteCategory(storeId, categoryId)`
```typescript
export async function deleteCategory(
  storeId: string,
  categoryId: string
): Promise<void>
```
**Parâmetros:**
- `storeId` (string) - ID da loja
- `categoryId` (string) - ID da categoria

**Exemplo:**
```typescript
await deleteCategory('loja-001', 'cat-001');
```

---

### useCategories Hook

```typescript
export function useCategories({ storeId }: UseCategoriesProps) {
  const [categories, setCategories] = useState<CategoryMarginConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return {
    categories: CategoryMarginConfig[],
    loading: boolean,
    error: string | null,
    createCategory: (data) => Promise<string>,
    updateCategory: (id, updates) => Promise<void>,
    deleteCategory: (id) => Promise<void>,
    getCategory: (id) => Promise<CategoryMarginConfig | null>,
    getCategoryById: (id) => CategoryMarginConfig | undefined,
  };
}
```

**Uso:**
```typescript
const { categories, loading, createCategory } = useCategories({ 
  storeId: 'loja-001' 
});
```

---

## 🔄 Migrações

### Se Ainda Usar Código Antigo (userId)

**Antes (DEPRECATED):**
```typescript
// ❌ Não use mais
const categories = await getUserCategories(userId);
const unsubscribe = subscribeToCategories(userId, callback);
```

**Depois (NOVO):**
```typescript
// ✅ Use isto
const categories = await getStoreCategories(storeId);
const unsubscribe = subscribeToStoreCategories(storeId, callback);
```

### Tabela de Mapeamento

| Antigo | Novo |
|--------|------|
| `getUserCategories(userId)` | `getStoreCategories(storeId)` |
| `subscribeToCategories(userId, cb)` | `subscribeToStoreCategories(storeId, cb)` |
| `createCategory(userId, data)` | `createCategory(storeId, data)` |
| `updateCategory(userId, id, updates)` | `updateCategory(storeId, id, updates)` |
| `deleteCategory(userId, id)` | `deleteCategory(storeId, id)` |
| `getCategoryById(userId, id)` | `getCategoryById(storeId, id)` |

---

## 🔧 Troubleshooting

### ❌ "Store ID não fornecido"
**Causa:** useCategories foi chamado sem storeId

**Solução:**
```typescript
// ❌ Errado
const { categories } = useCategories({ storeId: '' });

// ✅ Correto
const { currentStore } = useStore();
const { categories } = useCategories({ storeId: currentStore?.storeId || '' });
```

---

### ❌ "Categorias não aparecem"
**Causa:** Categoria está em outra loja ou storeId mudou

**Verificação:**
```typescript
// Verifique o storeId correto
console.log('StoreId atual:', currentStore?.storeId);

// Verifique as categorias
const cats = await getStoreCategories(currentStore?.storeId || '');
console.log('Categorias:', cats);
```

---

### ❌ "Firestore: Missing or insufficient permissions"
**Causa:** Regras de segurança do Firestore podem estar bloqueando

**Verificação de Regras (firestore.rules):**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Lojas e seus sub-documentos
    match /lojas/{storeId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == request.resource.data.adminId;
      
      // Categorias por loja
      match /categories/{categoryId} {
        allow read: if request.auth != null;
        allow write: if request.auth.uid == get(/databases/$(database)/documents/lojas/$(storeId)).data.adminId;
      }
    }
  }
}
```

---

### ✅ Checklist de Implementação

- [ ] Navigação: "Categorias" restrito apenas a admin
- [ ] Hook: useCategories recebe { storeId }
- [ ] Componente: CategoriesTab mostra seletor para admin
- [ ] Firestore: Dados em lojas/{storeId}/categories
- [ ] Tipo: CategoryMarginConfig usa storeId
- [ ] Service: Todas as funções usam storeId
- [ ] Context: StoreContext fornece currentStore.storeId

---

## 📞 Suporte

Para questões ou bugs, entre em contacto ou abra uma issue no GitHub.

---

**Versão:** 1.0 (Fase 12)
**Última atualização:** 2026-08-14
**Responsável:** Admin System
