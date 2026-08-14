# ⚡ Quick Start - Categorias por Loja

## 🎯 TL;DR (Resumo Executivo)

**Antes:** Categorias globais por utilizador
```typescript
const categories = await getUserCategories(userId);
```

**Depois:** Categorias isoladas por loja
```typescript
const { categories } = useCategories({ storeId: 'loja-001' });
```

---

## 🚀 Setup Rápido

### 1. Importar Hooks Necessários

```typescript
import { useCategories } from '../hooks/useCategories';
import { useStore } from '../contexts/StoreContext';
import { useUserAuth } from '../hooks/useUserAuth';
```

### 2. Obter StoreId

```typescript
// Forma simples (recomendada)
const { currentStore } = useStore();
const storeId = currentStore?.storeId;

// Ou passar diretamente
const { categories } = useCategories({ storeId: 'loja-001' });
```

### 3. Usar o Hook

```typescript
export function MyCategoriesComponent() {
  const { currentStore } = useStore();
  const { categories, loading, error, createCategory } = useCategories({
    storeId: currentStore?.storeId || '',
  });

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h2>Categorias ({categories.length})</h2>
      {categories.map(cat => (
        <div key={cat.id}>
          <strong>{cat.name}</strong> - Margem: {cat.marginRules.baseMargin}%
        </div>
      ))}
      
      <button onClick={() => createCategory({...})}>
        Nova Categoria
      </button>
    </div>
  );
}
```

---

## 📚 Operações Comuns

### Criar Categoria

```typescript
const { createCategory } = useCategories({ storeId });

const categoryId = await createCategory({
  name: 'Medicamentos',
  businessType: 'farmacia',
  description: 'Todos os medicamentos',
  marginRules: {
    baseMargin: 35,
    minMargin: 30,
    maxMargin: 40,
  },
  priceStrategy: 'percentage',
  regulatoryConstraints: {
    lastUpdated: new Date().toISOString(),
  },
});
```

### Atualizar Categoria

```typescript
const { updateCategory } = useCategories({ storeId });

await updateCategory('cat-001', {
  marginRules: {
    baseMargin: 38,
    minMargin: 33,
    maxMargin: 43,
  },
});
```

### Deletar Categoria

```typescript
const { deleteCategory } = useCategories({ storeId });

await deleteCategory('cat-001');
```

### Listar Categorias

```typescript
const { categories } = useCategories({ storeId });

categories.forEach(cat => {
  console.log(`${cat.name} (${cat.id}) - ${cat.marginRules.baseMargin}%`);
});
```

### Obter uma Categoria Específica

```typescript
const { getCategoryById } = useCategories({ storeId });

const category = await getCategoryById('cat-001');
console.log(category?.name);
```

---

## 🔒 Permissões (RBAC)

### Admin
✅ Vê menu "Categorias"
✅ Seleciona loja
✅ Vê todas as categorias da loja
✅ Pode criar/editar/deletar

### Gestor de Loja
❌ Não vê menu "Categorias"
✅ Vê categorias de sua loja (em Produtos)
❌ Não pode criar/editar/deletar

### Funcionário
❌ Não vê menu "Categorias"
✅ Vê categorias de sua loja (em Produtos)
❌ Não pode fazer nada

**Como verificar permissões:**

```typescript
const { papel, isAdmin } = useUserAuth();

if (isAdmin) {
  // Admin: mostra seletor de lojas
} else {
  // Gestor/Funcionário: mostra categorias da loja atual
}
```

---

## 🔄 Real-Time Updates

O sistema já sincroniza automaticamente com Firestore. Não precisa fazer nada especial!

```typescript
const { categories } = useCategories({ storeId });
// ↑ Já está subscrito a mudanças em tempo real
// Se outro admin atualizar categoria, você vê automaticamente
```

---

## ❌ Erros Comuns

### ❌ "Store ID não fornecido"

```typescript
// ERRADO
const { categories } = useCategories({ storeId: '' });

// CORRETO
const { currentStore } = useStore();
const { categories } = useCategories({ storeId: currentStore?.storeId || '' });
```

### ❌ "useStore deve ser usado dentro de StoreProvider"

```typescript
// Verificar se App.tsx tem:
<StoreProvider>
  <YourComponent />
</StoreProvider>
```

### ❌ "Categorias não aparecem"

```typescript
// 1. Verificar storeId
console.log('StoreId:', currentStore?.storeId);

// 2. Verificar categorias
const { categories } = useCategories({ storeId: currentStore?.storeId || '' });
console.log('Categorias:', categories);

// 3. Verificar Firestore
// lojas/{storeId}/categories deve ter documentos
```

---

## 📋 Exemplo Completo (Componente)

```typescript
import React, { useState } from 'react';
import { useCategories } from '../hooks/useCategories';
import { useStore } from '../contexts/StoreContext';
import { useUserAuth } from '../hooks/useUserAuth';

export function CategoriesManager() {
  // Hooks
  const { currentStore, userStores, switchStore } = useStore();
  const { papel, isAdmin } = useUserAuth();
  const { categories, loading, error, createCategory, deleteCategory } = useCategories({
    storeId: currentStore?.storeId || '',
  });

  // State
  const [showForm, setShowForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Handlers
  const handleCreate = async () => {
    if (!newCategoryName) return alert('Nome obrigatório');

    try {
      await createCategory({
        name: newCategoryName,
        businessType: 'farmacia',
        marginRules: {
          baseMargin: 35,
          minMargin: 30,
          maxMargin: 40,
        },
        priceStrategy: 'percentage',
        regulatoryConstraints: {
          lastUpdated: new Date().toISOString(),
        },
      });

      setNewCategoryName('');
      setShowForm(false);
    } catch (err) {
      alert('Erro ao criar: ' + err);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm('Tem certeza?')) return;

    try {
      await deleteCategory(categoryId);
    } catch (err) {
      alert('Erro ao deletar: ' + err);
    }
  };

  if (!isAdmin) {
    return <div>❌ Acesso restrito. Apenas admin.</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Gerenciar Categorias</h1>

      {/* Seletor de Loja (Admin) */}
      {userStores.length > 1 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <label className="block text-sm font-semibold mb-2">Selecionar Loja:</label>
          <select
            value={currentStore?.storeId || ''}
            onChange={(e) => switchStore(e.target.value)}
            className="px-4 py-2 border rounded"
          >
            {userStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Status */}
      {loading && <div className="text-blue-600">Carregando...</div>}
      {error && <div className="text-red-600">Erro: {error}</div>}

      {/* Lista de Categorias */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Categorias ({categories.length})</h2>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex justify-between items-center p-3 bg-gray-100 rounded"
            >
              <div>
                <div className="font-semibold">{cat.name}</div>
                <div className="text-sm text-gray-600">
                  Margem: {cat.marginRules.baseMargin}%
                </div>
              </div>
              <button
                onClick={() => handleDelete(cat.id)}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm"
              >
                Deletar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Criar Nova Categoria */}
      {showForm ? (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <input
            type="text"
            placeholder="Nome da categoria"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="w-full px-3 py-2 border rounded mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Criar
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-400 text-white rounded"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold"
        >
          + Nova Categoria
        </button>
      )}
    </div>
  );
}
```

---

## 🔗 Links Úteis

- [Documentação Completa](./CATEGORIES_BY_STORE.md)
- [Arquitetura Detalhada](./CATEGORIES_ARCHITECTURE.md)
- [API Reference](./CATEGORIES_BY_STORE.md#-api-reference)

---

## 📞 Precisa de Ajuda?

1. **Verificar console.log**
   ```typescript
   const { categories } = useCategories({ storeId });
   console.log('Debug:', { categories, storeId });
   ```

2. **Verificar Firestore**
   - Firebase Console → Firestore
   - Collection: `lojas/{storeId}/categories`

3. **Verificar Permissões**
   ```typescript
   const { papel, isAdmin } = useUserAuth();
   console.log('Seu papel:', papel, 'IsAdmin:', isAdmin);
   ```

---

**Versão:** 1.0 (Fase 12)
**Última atualização:** 2026-08-14
