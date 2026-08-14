# 🔧 Diagnóstico e Solução de Bugs Reportados

## 📋 Resumo
Dois problemas críticos foram reportados:
1. ❌ Admin não consegue aceder o menu "Categorias"
2. ❌ Cores inconsistentes - apenas alguns botões admitem a mudança de palete de cores

---

## 🐛 Problema 1: Admin não consegue aceder "Categorias"

### Sintomas
- Utilizador admin não vê o menu "Categorias" no sidebar
- Configuração está correta (`roles: ['admin']` em `navigationConfig.ts`)
- Menu aparece corretamente para outros papéis

### Análise
A configuração no `navigationConfig.ts` está **correta**:
```typescript
{
  id: 'categories',
  label: 'Categorias',
  icon: 'Folder',
  roles: ['admin'], // ✅ Correto
  section: 'main',
}
```

O problema está em **um dos seguintes**:

#### Causa Possível 1: Campo `papel` incorreto no Firestore
O hook `useUserAuth` retorna `papel` do documento do utilizador no Firestore:
```typescript
// Em useUserAuth.ts
papel: user?.papel || null,
isAdmin: user?.papel === 'admin',
```

**Verificar:**
```
Firestore → Collection "users" → Documento do utilizador
→ Campo "papel" deve ser exatamente "admin" (minúsculas)
```

#### Causa Possível 2: Utilizador não tem documento no Firestore
Se o utilizador não tem documento em Firestore, o sistema cria um padrão com papel "funcionario":
```typescript
// Em useUserAuth.ts (linhas 59-89)
defaultUser: User = {
  papel: 'funcionario', // ⚠️ Padrão é funcionário, não admin!
  // ...
}
```

#### Causa Possível 3: Cache do navegador
O localStorage ou cache pode estar guardando dados antigos.

### Solução Passo a Passo

**Passo 1: Verificar dados do admin no Firestore**

1. Abrir Firebase Console
2. Ir a: Firestore Database → Collection "users"
3. Procurar o documento com o email do admin
4. Verificar se o campo `papel` está definido como **"admin"** (não "Admin", não "ADMIN")

**Passo 2: Se o campo `papel` estiver errado, corrigir:**

```javascript
// Você pode corrigir manualmente no Firebase Console
// Ou usar este script no console do navegador (quando logado como admin):

// 1. Abrir DevTools (F12)
// 2. Ir a "Console" tab
// 3. Copiar e colar:

const { doc, updateDoc } = window.firebase.firestore;
const { auth, db } = window; // Assumindo que firebase está global

const userId = auth.currentUser.uid;
const userRef = doc(db, 'users', userId);

await updateDoc(userRef, {
  papel: 'admin'
});

console.log('✅ Campo papel atualizado para admin!');

// 4. Fazer logout e login novamente
```

**Passo 3: Se o problema persistir, limpar cache:**

1. Abrir DevTools (F12)
2. Ir a "Application" tab
3. Limpar: Local Storage e Cookies
4. Fazer logout
5. Fazer login novamente

**Passo 4: Verificar papel do utilizador (Debug):**

Se ainda não funcionar, adicione este código temporariamente no `DynamicSidebar.tsx` para diagnóstico:

```typescript
// Em DynamicSidebar.tsx (no início do componente)
console.log('🔍 DEBUG Sidebar:', {
  papel,
  isAdmin,
  allowedItems: allowedItems.map(i => i.id),
  filteredCategories: allowedItems.filter(i => i.id === 'categories')
});
```

Depois abra DevTools Console e procure pela mensagem `🔍 DEBUG Sidebar`.

---

## 🎨 Problema 2: Cores inconsistentes

### Sintomas
- Ao alterar a cor primária nas Configurações
- Alguns botões mudaram de cor ✅
- Outros botões **não mudam** ❌
- Especialmente botões com cores hardcoded como `bg-blue-600`, `bg-emerald-600`

### Análise
Encontrados **28+ botões** com cores hardcoded:

```typescript
// ❌ Hardcoded (não se atualiza)
className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white..."

// ❌ Hardcoded (não se atualiza)
className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
```

### Solução Implementada ✅

Criei um sistema de **cores dinâmicas centralizado**:

#### 1. Novo arquivo: `colorUtils.ts`
```typescript
// Converte cores Tailwind para valores hex
getTailwindColorHex("emerald-600") // → "#059669"

// Injeta variáveis CSS globais
injectPrimaryColorCSS("#059669");
```

#### 2. Novo componente: `PrimaryButton.tsx`
```typescript
// Botão que sempre usa a cor primária (via CSS variables)
<PrimaryButton variant="solid" size="md">
  Clique aqui
</PrimaryButton>
```

#### 3. Integração no `App.tsx`
```typescript
// Injeta cores CSS sempre que a cor primária muda
useEffect(() => {
  if (businessSettings?.primaryColor) {
    const hexColor = getTailwindColorHex(businessSettings.primaryColor);
    injectPrimaryColorCSS(hexColor);
  }
}, [businessSettings?.primaryColor]);
```

### Como Funciona
1. Quando a cor primária é alterada nas Configurações
2. O App.tsx detecta a mudança
3. Converte a cor Tailwind para hex
4. Injeta CSS variables globais: `--color-primary`, `--color-primary-700`, etc.
5. Todos os botões que usam `bg-[var(--color-primary)]` se atualizam automaticamente

### Migração de Botões (Próximas Etapas)

Para que todos os botões se beneficiem das cores dinâmicas, é necessário refatorar:

**Botões que precisam atualizar (28+ encontrados):**

| Arquivo | Botão | Status |
|---------|-------|--------|
| `StoreForm.tsx` | Botão Salvar | ⏳ Pendente |
| `AuditDashboard.tsx` | Botão Exportar | ⏳ Pendente |
| `BusinessSettingsView.tsx` | Botão Salvar Configurações | ⏳ Pendente |
| `Dashboard.tsx` | Múltiplos botões | ⏳ Pendente |
| `ImportCSVModal.tsx` | Botão Importar | ⏳ Pendente |
| E mais... | | ⏳ Pendente |

### Exemplo de Refatoração

**Antes (❌ Hardcoded):**
```typescript
<button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
  Salvar
</button>
```

**Depois (✅ Dinâmico):**
```typescript
import { PrimaryButton } from '../buttons/PrimaryButton';

<PrimaryButton>
  Salvar
</PrimaryButton>
```

Ou manualmente:
```typescript
<button className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-700)] text-white rounded-lg">
  Salvar
</button>
```

---

## 📋 Checklist de Resolução

### Problema 1: Admin → Categorias
- [ ] Verificar campo `papel` no Firestore para admin
- [ ] Se incorreto, corrigir manualmente ou com script
- [ ] Limpar cache do navegador
- [ ] Fazer logout e login novamente
- [ ] Confirmar se "Categorias" aparece agora

### Problema 2: Cores Inconsistentes
- [x] Criar `colorUtils.ts` com mapeamento centralizado
- [x] Criar componente `PrimaryButton.tsx`
- [x] Integrar injetor de cores no `App.tsx`
- [ ] Refatorar 28+ botões para usar cores dinâmicas (Phase seguinte)
- [ ] Testar mudança de cor → todos os botões atualizam

---

## 🚀 Próximas Etapas

### Fase Imediata
1. **Corrigir Problema 1:** Verificar/ajustar campo `papel` no Firestore
2. **Testar Problema 2:** Verificar se cores dinâmicas funcionam após mudança

### Fase 2: Refatoração de Cores
Criar um script/tarefa para:
- Substituir todos os `bg-emerald-600` → `bg-[var(--color-primary)]`
- Substituir todos os `hover:bg-emerald-700` → `hover:bg-[var(--color-primary-700)]`
- Usar `PrimaryButton` em vez de `<button>` direto

### Fase 3: Tematização Completa
- Expandir para cores secundárias, de erro, sucesso, etc.
- Criar tema escuro completo com suporte a cores dinâmicas

---

## 📞 Questões Pendentes

Para resolver o **Problema 1** completamente, preciso de:

1. **Qual é o email exato do utilizador admin?**
   - Exemplo: `admin@empresa.com` ou `professorlucas789@gmail.com`?

2. **Quando não consegue ver "Categorias", consegue ver:**
   - "Utilizadores" (apenas admin)? ✅ ou ❌
   - "Configurações" (apenas admin)? ✅ ou ❌
   - "Backup e Dados" (apenas admin)? ✅ ou ❌

3. **Quando faz logout e login novamente:**
   - O menu "Categorias" aparece? ✅ ou ❌

4. **Que versão do navegador está usando:**
   - Chrome, Firefox, Safari, Edge?
   - Qual versão?

---

## 📚 Referências

- `navigationConfig.ts` - Configuração de papéis
- `useUserAuth.ts` - Hook que obtém papel do utilizador
- `DynamicSidebar.tsx` - Componente que renderiza menu
- `colorUtils.ts` - Novo: Mapeamento de cores
- `PrimaryButton.tsx` - Novo: Botão com cores dinâmicas

---

**Status:** 🟡 Problema 2 Parcialmente Resolvido | 🔴 Problema 1 Aguardando Informações
**Última atualização:** 2026-08-14
