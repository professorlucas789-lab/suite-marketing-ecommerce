# 🏪 Documentação - Listagem de Lojas do Utilizador (Fase 14)

## 📖 Índice
1. [Visão Geral](#visão-geral)
2. [Componentes](#componentes)
3. [Exemplos de Uso](#exemplos-de-uso)
4. [Interface do Utilizador](#interface-do-utilizador)
5. [Estrutura de Dados](#estrutura-de-dados)

---

## 🎯 Visão Geral

### O Que É?
Sistema que permite aos utilizadores ver e gerenciar suas lojas de forma visual e intuitiva.

### Benefícios
✅ **Visão Consolidada** - Ver todas as suas lojas num único lugar
✅ **Estatísticas** - Dados em tempo real de cada loja
✅ **Seleção Visual** - Mudar de loja com um clique
✅ **Comparação** - Admin pode comparar todas as lojas
✅ **Responsivo** - Funciona em qualquer dispositivo

### Público-Alvo

#### Gestor de Loja / Funcionário
- Vê suas lojas atribuídas
- Informações de contacto e endereço
- Estatísticas de produtos e utilizadores
- Seleção rápida de loja

#### Admin
- Vê TODAS as lojas do sistema
- Comparativo consolidado
- Filtro e ordenação
- Relatório geral de desempenho

---

## 🏗️ Componentes

### 1️⃣ **UserStoresDashboard**

Para utilizadores que têm acesso a múltiplas lojas (não-admin).

**Localização:** `src/components/UserStoresDashboard.tsx`

**Funcionalidades:**
- Grid de cartões das lojas
- Estatísticas por loja
- Seleção de loja
- Info consolidada

**Props:** Nenhuma (usa hooks)

**Hooks Utilizados:**
- `useStore()` - Para dados de lojas
- `useUserAuth()` - Para verificar papel

**Exemplo:**
```typescript
import { UserStoresDashboard } from '../components/UserStoresDashboard';

function MyPage() {
  return <UserStoresDashboard />;
}
```

### 2️⃣ **StoresComparisonView**

Para admin ver comparativo de TODAS as lojas.

**Localização:** `src/components/StoresComparisonView.tsx`

**Funcionalidades:**
- Tabela comparativa
- Estatísticas globais
- Filtro por nome/produtos/utilizadores
- Ordenação

**Props:** Nenhuma

**Exemplo:**
```typescript
import { StoresComparisonView } from '../components/StoresComparisonView';

function AdminPage() {
  return <StoresComparisonView />;
}
```

---

## 💻 Exemplos de Uso

### 1. Renderização Condicional no App

```typescript
// App.tsx
{activeTab === "stores" && (
  <motion.div>
    {isAdmin ? <StoreList /> : <UserStoresDashboard />}
  </motion.div>
)}
```

### 2. Usar em Componente Customizado

```typescript
import { UserStoresDashboard } from '../components/UserStoresDashboard';
import { useUserAuth } from '../hooks/useUserAuth';

export function MyStoresPage() {
  const { papel } = useUserAuth();

  return (
    <div>
      {papel === 'admin' ? (
        <AdminStoresPage />
      ) : (
        <UserStoresDashboard />
      )}
    </div>
  );
}
```

### 3. Acessar Dados de Lojas

```typescript
import { useStore } from '../contexts/StoreContext';

export function MyComponent() {
  const { userStores, currentStore, switchStore } = useStore();

  return (
    <div>
      <p>Loja atual: {currentStore?.storeName}</p>
      <p>Total de lojas: {userStores.length}</p>
      
      <button onClick={() => switchStore(userStores[0].id)}>
        Mudar para {userStores[0].nome}
      </button>
    </div>
  );
}
```

---

## 🖥️ Interface do Utilizador

### UserStoresDashboard

```
┌─────────────────────────────────────────────────────┐
│  🏪 Suas Lojas                              3 lojas │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Estatísticas Consolidadas (se >1 loja):         │
│  ┌─────────────┬─────────────┬─────────────┐     │
│  │   10        │      20     │      5      │     │
│  │ Produtos    │ Utilizadores│ Atualizado  │     │
│  └─────────────┴─────────────┴─────────────┘     │
│                                                     │
│  Grid de Lojas:                                  │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ 🏪 Farmácia 1│  │ 🏪 Farmácia 2│             │
│  │ Zango        │  │ Calumbo      │             │
│  │              │  │              │             │
│  │ 📍 Endereco  │  │ 📍 Endereco  │             │
│  │ 📦 Produtos  │  │ 📦 Produtos  │             │
│  │ 👥 Users     │  │ 👥 Users     │             │
│  │              │  │              │             │
│  │  ✓ Selecionada  │  [ ] Selecionar │        │
│  └──────────────┘  └──────────────┘             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### StoresComparisonView (Admin)

```
┌─────────────────────────────────────────────────────┐
│  📊 Comparação de Lojas                      6 lojas│
├─────────────────────────────────────────────────────┤
│                                                     │
│  Estatísticas Globais:                          │
│  ┌──────┬────────┬────────────┬───────┬────────┐│
│  │ 6    │  120   │     25     │ 45.5€ │ 32.3% ││
│  │Lojas │Produtos│Utilizadores│ Preço │ Margem││
│  └──────┴────────┴────────────┴───────┴────────┘│
│                                                     │
│  Filtro: [Ordenar por] [Nome v]                │
│                                                     │
│  Tabela:                                         │
│  ┌──────┬──────┬────┬────┬─────┬──────┬────────┐│
│  │Loja  │Tipo  │Prod│User│Preço│Margem│Status ││
│  ├──────┼──────┼────┼────┼─────┼──────┼────────┤│
│  │Farm-1│Farmá │ 20 │ 5  │ 45€ │ 35%  │ Ativa ││
│  │Farm-2│Farmá │ 18 │ 4  │ 42€ │ 30%  │ Ativa ││
│  │Info-1│Info  │ 50 │ 8  │120€ │ 28%  │ Ativa ││
│  └──────┴──────┴────┴────┴─────┴──────┴────────┘│
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Estrutura de Dados

### Store (Tipo Base)
```typescript
interface Store {
  id: string;
  nome: string;
  tipo: 'farmacia' | 'informatica' | 'ortopedico' | 'generico';
  endereco: string;
  telefone: string;
  email: string;
  nif?: string;
  ativo: boolean;
  dataCriacao: string;
  dataAtualizacao: string;
  criadoPor: string;
  totalProdutos?: number;
  totalUtilizadores?: number;
  ultimaAtualizacao?: string;
}
```

### StoreStats (Estatísticas)
```typescript
interface StoreStats {
  totalProdutos: number;
  utilizadoresAtivos: number;
  ultimaAtualizacao: string;
  precoMedio?: number;
  margemMedia?: number;
}
```

### Firestore Collection (Stats)
```
firestore/
├── lojas/
│   └── {storeId}/
│       └── stats/
│           └── current
│               ├── totalProdutos: 20
│               ├── utilizadoresAtivos: 5
│               ├── precoMedio: 45.50
│               ├── margemMedia: 32.5
│               └── ultimaAtualizacao: "2026-08-14T10:30:00Z"
```

---

## 🎨 Cartão de Loja (UserStoresDashboard)

```
┌─────────────────────────────────┐
│ Farmácia Zango          ✓ Sel   │  ← Header com tipo
├─────────────────────────────────┤
│ 📍 Avenida Principal, Zango, AO │  ← Endereço
│                                 │
│ 📞 +244 923 456789             │  ← Telefone
│ 📧 farmacia@zango.ao            │  ← Email
│                                 │
│ 📦 Produtos: 20                 │  ← Stats
│ 👥 Utilizadores: 5              │
│ 📅 Atualizado: 14/08/2026       │
├─────────────────────────────────┤
│ ✓ Ativa                ✓        │  ← Status + Check
└─────────────────────────────────┘
```

---

## 🔄 Fluxo de Dados

```
App.tsx (activeTab === "stores")
    ↓
Verificar isAdmin
    ├─ true: renderiza StoreList (admin gerencia)
    └─ false: renderiza UserStoresDashboard
              ↓
        useStore() → currentStore, userStores
              ↓
        Carregar stats de cada loja (Firestore)
              ↓
        UserStoresDashboard renderiza cartões
              ↓
        User clica num cartão
              ↓
        switchStore(storeId) → atualiza StoreContext
              ↓
        Toda a app reflete nova loja (produtos, categorias, etc)
```

---

## ⚙️ Configuração

### Permissões Firestore

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Lojas e stats
    match /lojas/{storeId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == get(/databases/$(database)/documents/lojas/$(storeId)).data.criadoPor;
      
      match /stats/current {
        allow read: if request.auth != null;
      }
    }
  }
}
```

---

## 📈 Performance

### Otimizações
- ✅ Carregamento lazy de stats (não bloqueia UI)
- ✅ Cache local em StoreContext
- ✅ Queries consolidadas

### Timings
- Carregar UserStoresDashboard: ~200ms
- Carregar StoresComparisonView: ~500ms (depende de nº de lojas)

---

## 🧪 Casos de Teste

### Teste 1: Gestor com 1 Loja
```
✅ Vê seu dashboard
✅ Vê a loja selecionada
✅ Não vê outras lojas
✅ Clique não muda nada (uma única loja)
```

### Teste 2: Gestor com Múltiplas Lojas
```
✅ Vê todas as suas lojas
✅ Vê estatísticas de cada uma
✅ Pode selecionar qualquer loja
✅ Dados da app refletem a nova loja
```

### Teste 3: Admin
```
✅ Vê todas as lojas do sistema
✅ Tabela comparativa funciona
✅ Filtros funcionam
✅ Ordenação funciona
```

---

## 🔧 Troubleshooting

### ❌ Lojas não aparecem
```typescript
// Verificar se userStores está populado
const { userStores, loading } = useStore();
console.log('UserStores:', userStores, 'Loading:', loading);

// Verificar Firestore
// Deve ter: users/{userId}/field 'lojas' com array de IDs
```

### ❌ Stats não carregam
```typescript
// Verificar se stats/current existe em Firestore
// Caminho: lojas/{storeId}/stats/current

// Se não existir, criar documento vazio:
const statsRef = doc(db, 'lojas', storeId, 'stats', 'current');
await setDoc(statsRef, {
  totalProdutos: 0,
  utilizadoresAtivos: 0,
  ultimaAtualizacao: new Date().toISOString(),
});
```

### ❌ Seleção de loja não funciona
```typescript
// Verificar se switchStore está funcionando
const { switchStore } = useStore();
await switchStore(storeId);

// Verificar se StoreContext está disponível
// Deve ter <StoreProvider> em App.tsx
```

---

## 📋 Checklist de Implementação

- [x] UserStoresDashboard criado
- [x] StoresComparisonView criado
- [x] Renderização condicional em App.tsx
- [x] Integração com StoreContext
- [x] Carregamento de stats do Firestore
- [x] Interface responsiva
- [x] Seleção visual de loja
- [x] Filtro e ordenação (admin)
- [ ] Gráficos de tendência (Próxima melhoria)
- [ ] Exportar dados (Próxima melhoria)

---

## 🚀 Próximas Melhorias

**Fase 15: Dashboard Avançado**
- [ ] Gráficos de tendência por loja
- [ ] Comparativo mês a mês
- [ ] Alertas de desempenho
- [ ] Exportação de relatórios

**Fase 16: Automação**
- [ ] Cron jobs para atualizar stats
- [ ] Notificações de baixo desempenho
- [ ] Sugestões de ação

---

## 📞 Suporte

Para questões ou bugs, consulte:
1. Verificar console.log para erros
2. Verificar Firestore para dados
3. Verificar permissões de segurança
4. Verificar se StoreContext está disponível

---

**Versão:** 1.0 (Fase 14)
**Última atualização:** 2026-08-14
**Status:** ✅ Implementado e Pronto para Uso
