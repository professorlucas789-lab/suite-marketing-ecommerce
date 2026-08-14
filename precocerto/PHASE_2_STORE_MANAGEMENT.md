# Fase 2: Gestão de Lojas (Admin) - Implementação

## Visão Geral

A Fase 2 implementa a interface de gestão de lojas para administradores, permitindo:

- **CRUD de Lojas**: Criar, ler, atualizar e deletar lojas
- **Gestão de Utilizadores**: Atribuição e remoção de utilizadores por loja
- **Gestão de Permissões**: Configuração granular de permissões por utilizador
- **Configurações de Loja**: Personalização de definições operacionais

## Componentes Criados

### 1. StoreList (src/components/StoreList.tsx)

**Responsabilidade**: Exibir todas as lojas e gerenciar operações CRUD

**Funcionalidades**:
- Grid responsivo de lojas (1 coluna mobile, 2 tablet, 3 desktop)
- Botão "Criar Loja" que abre formulário modal
- Card de loja com informações essenciais:
  - Nome, tipo, endereço
  - Telefone, email
  - Status (Ativo/Inativo)
  - Botões de editar e deletar
- Confirmação visual antes de deletar
- Estados de carregamento e erro
- Dark mode suportado

**Props**: Nenhuma (usa hooks e contexto)

**Hooks Utilizados**:
- `useState`: Gestão de estado (stores, loading, erro, selected store, etc.)
- `useEffect`: Carregamento inicial de lojas
- `getAllStores()`: Busca todas as lojas ativas

**Estrutura da Loja Exibida**:
```typescript
{
  id: string;
  nome: string;
  tipo: 'farmacia' | 'informatica' | 'ortopedico' | 'generico';
  endereco: string;
  telefone: string;
  email: string;
  ativo: boolean;
}
```

### 2. StoreUserManagement (src/components/StoreUserManagement.tsx)

**Responsabilidade**: Gerenciar utilizadores de uma loja específica

**Funcionalidades**:
- Listagem de utilizadores da loja
- Formulário para adicionar novo utilizador
- Seleção de papel (Admin, Gestor de Loja, Funcionário)
- Configuração de permissões granulares:
  - Visualizar
  - Criar
  - Editar
  - Deletar
  - Relatórios
- Auto-set de permissões baseado no papel selecionado
- Exibição de permissões por utilizador
- Remoção de utilizadores

**Props**:
```typescript
interface StoreUserManagementProps {
  storeId: string;
  storeName: string;
}
```

**Permissões por Papel**:
- **Admin**: Todas as permissões (true)
- **Gestor de Loja**: Visualizar, Criar, Editar, Relatórios (não Deletar)
- **Funcionário**: Visualizar, Criar (resto false)

**Estados Gerenciados**:
- Utilizadores da loja
- Papel selecionado para novo utilizador
- Permissões customizadas
- Formulário aberto/fechado
- Estado de carregamento

### 3. StoreSettings (src/components/StoreSettings.tsx)

**Responsabilidade**: Configurar definições operacionais da loja

**Funcionalidades**:
- Configuração de horário de funcionamento:
  - Hora de abertura
  - Hora de fecho
  - Dias de trabalho por semana (5, 6, ou 7)
- Opções operacionais:
  - Ativo para vendas
  - Permite remoção de produtos
  - Notificações ativas
- Formulário com validação
- Estados de sucesso e erro
- Dark mode suportado

**Props**:
```typescript
interface StoreSettingsProps {
  store: Store;
  onUpdate?: (store: Store) => void;
}
```

**Configurações Disponíveis**:
```typescript
{
  horaAbertura: string;      // HH:mm
  horaFecho: string;         // HH:mm
  diasTrabalhoPorSemana: number;  // 5, 6, ou 7
  ativoParaVendas: boolean;
  permiteRemocaoProdutos: boolean;
  notificacoesAtivas: boolean;
}
```

## Utilitários Utilizados

### storeUtils.ts

Funções existentes utilizadas:

1. **getAllStores()**: Retorna todas as lojas ativas
   ```typescript
   const stores = await getAllStores();
   ```

2. **getStore(storeId)**: Retorna uma loja específica
   ```typescript
   const store = await getStore('store-1');
   ```

3. **getStoreUsers(storeId)**: Retorna utilizadores de uma loja
   ```typescript
   const users = await getStoreUsers('store-1');
   ```

4. **addUserToStore(userId, storeId)**: Adiciona utilizador a loja
   ```typescript
   await addUserToStore('user-1', 'store-1');
   ```

5. **createStore()**: Cria nova loja (usado em StoreForm)
   ```typescript
   const storeId = await createStore(storeData);
   ```

6. **updateStore()**: Atualiza loja existente
   ```typescript
   await updateStore('store-1', updates);
   ```

7. **deleteStore()**: Soft delete de loja
   ```typescript
   await deleteStore('store-1');
   ```

## Fluxo de Dados

### Criação de Loja
```
StoreList
  ↓
[Clicar "Criar Loja"]
  ↓
StoreForm (Modal)
  ↓
createStore() [storeUtils]
  ↓
Firebase: Adiciona a 'stores' collection
  ↓
logAudit() [Registra ação]
  ↓
onSuccess callback → Recarrega lista
```

### Gestão de Utilizadores
```
StoreList
  ↓
[Clicar "Utilizadores" no card]
  ↓
StoreUserManagement
  ↓
[Adicionar Utilizador]
  ↓
addUserToStore() [storeUtils]
  ↓
Firebase: Atualiza array 'lojas' do utilizador
  ↓
logAudit() [Registra ação]
```

### Configurações de Loja
```
StoreSettings
  ↓
[Preenchher formulário]
  ↓
[Clicar "Guardar"]
  ↓
updateStore() [storeUtils]
  ↓
Firebase: Atualiza documento da loja
  ↓
logAudit() [Registra ação]
```

## Testes

**Arquivo**: `src/tests/phase6-phase2-store-management.test.ts`

**Estatísticas**:
- Total de testes: 26
- Status: Todos passando ✓

**Categorias de Testes**:

1. **Operações CRUD de Lojas** (5 testes):
   - Criar nova loja
   - Atualizar loja existente
   - Deletar loja (soft delete)
   - Obter lista de lojas ativas

2. **Gestão de Utilizadores por Loja** (5 testes):
   - Atribuir utilizador a loja
   - Adicionar utilizador a múltiplas lojas
   - Remover utilizador de loja
   - Obter utilizadores de loja específica

3. **Permissões e Papéis** (5 testes):
   - Permissões de funcionário
   - Permissões de gestor de loja
   - Permissões de administrador
   - Alterar permissões de utilizador

4. **Configurações de Loja** (4 testes):
   - Configurações padrão
   - Atualizar status operacional
   - Mudança de informações de contacto

5. **Validação de Dados** (4 testes):
   - Validação de campos obrigatórios
   - Rejeição de loja sem email
   - Validação de formato de email
   - Validação de tipo de loja

6. **Segregação de Dados por Loja** (2 testes):
   - Segregação de utilizadores
   - Restrição de acesso entre lojas

7. **Rastreamento de Mudanças** (2 testes):
   - Registar data e utilizador
   - Atualizar data de modificação

8. **Controle de Acesso** (3 testes):
   - Admin ver todas as lojas
   - Gestor ver apenas suas lojas
   - Funcionário restrito a loja específica

## Integração com o Contexto

Os componentes funcionam com o `StoreContext` (criado na Fase 1):

```typescript
const { currentStore, userStores, switchStore } = useStore();
```

**Informações Disponíveis**:
- `currentStore`: Loja atualmente selecionada
- `userStores`: Lista de lojas do utilizador
- `switchStore()`: Função para mudar loja

## Padrões Utilizados

### 1. Pattern de Formulário Modal
```typescript
{showForm && (
  <div className="fixed inset-0 bg-black/50 ...">
    <div className="bg-white ...">
      <StoreForm 
        store={selectedStore}
        onSuccess={handleSuccess}
        onCancel={() => setShowForm(false)}
      />
    </div>
  </div>
)}
```

### 2. Pattern de Confirmação de Delete
```typescript
{deleteConfirm === storeId && (
  <div className="absolute inset-0 bg-black/50 ...">
    {/* Confirmação */}
  </div>
)}
```

### 3. Pattern de Estado de Carregamento
```typescript
if (loading) {
  return <LoadingState />;
}
```

### 4. Pattern de Erro Consistente
```typescript
{error && (
  <div className="p-4 bg-red-50 ...">
    {/* Erro */}
  </div>
)}
```

## Estilo e Theming

Todos os componentes suportam:
- **Dark Mode**: Usando classes `dark:` do Tailwind
- **Responsive Design**: Mobile-first com breakpoints md e lg
- **Acessibilidade**: Inputs com labels, htmlFor/id associados
- **Feedback Visual**: Estados de hover, focus, disabled

## Próximos Passos (Fase 3)

Fase 3 focará em:
- **Dados em Tempo Real**: Implementar real-time listeners para lojas e utilizadores
- **Activity Stream**: Exibir feed de atividades em tempo real
- **Notificações**: Sistema de notificações para eventos importantes

## Verificação de Implementação

✓ StoreList component criado e funcionando
✓ StoreUserManagement component criado
✓ StoreSettings component criado
✓ 26 testes criados e passando
✓ Integração com storeUtils
✓ Dark mode suportado
✓ Validação de dados
✓ Tratamento de erros
✓ Estados de carregamento
✓ Confirmação de delete

## Notas Importantes

1. **Soft Delete**: Lojas deletadas têm `ativo: false`, não são removidas do banco
2. **Permissões Granulares**: Cada utilizador pode ter configuração única de permissões
3. **Auditoria**: Todas as operações são registradas automáticamente
4. **Segregação**: Utilizadores veem apenas dados das lojas a que têm acesso
5. **Modal Forms**: Formulários aparecem em modais para melhor UX
