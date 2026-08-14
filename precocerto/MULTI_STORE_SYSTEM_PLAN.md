# Plano de Implementação - Sistema Multi-Loja com Painel Admin em Tempo Real

## 1. Visão Geral

Sistema que permite:
- ✅ Múltiplas lojas (Farmácias, Loja de Informática, Loja de Material Ortopédico, etc.)
- ✅ Múltiplos utilizadores trabalhando simultaneamente por loja
- ✅ Painel admin unificado com dados em tempo real
- ✅ Segregação de dados por loja
- ✅ Auditoria e logs de atividades

## 2. Estrutura de Dados no Firebase

### 2.1 Nova Collection: `stores`
```typescript
interface Store {
  id: string;                    // ID único da loja
  nome: string;                  // Nome da loja (ex: "Farmácia Central")
  tipo: 'farmacia' | 'informatica' | 'ortopedico' | 'generico';
  endereco: string;
  telefone: string;
  email: string;
  nif?: string;                  // NIF/CNPJ da loja
  ativo: boolean;
  dataCriacao: string;           // ISO 8601 timestamp
  dataAtualizacao: string;
  createdBy: string;             // ID do admin que criou
  
  // Estatísticas
  totalProdutos: number;
  totalUtilizadores: number;
}
```

### 2.2 Nova Collection: `users`
```typescript
interface User {
  id: string;                    // UID do Firebase Auth
  nome: string;
  email: string;
  papel: 'admin' | 'loja-manager' | 'funcionario';
  
  // Permissões
  lojas: string[];               // IDs das lojas que o utilizador tem acesso
  permissoes: {
    visualizar: boolean;
    criar: boolean;
    editar: boolean;
    deletar: boolean;
    relatorios: boolean;
  };
  
  ativo: boolean;
  dataCriacao: string;
  ultimoLogin: string;
  createdBy: string;
}
```

### 2.3 Expandir Collection: `products`
```typescript
// Adicionar a Product:
interface Product {
  // ... campos existentes ...
  
  // NOVO - Multi-loja
  storeId: string;               // ID da loja proprietária
  storeName: string;             // Nome da loja (desnormalizado para queries)
  
  // Rastreamento
  criadoPor: string;             // ID do utilizador que criou
  atualizadoPor: string;         // ID do último utilizador que editou
  dataAtualizacao: string;       // Último update
}
```

### 2.4 Nova Collection: `audit_logs`
```typescript
interface AuditLog {
  id: string;
  storeId: string;
  userId: string;
  userName: string;
  acao: 'criar' | 'atualizar' | 'deletar' | 'visualizar';
  entityType: 'product' | 'user' | 'store';
  entityId: string;
  entityName: string;
  mudancas?: Record<string, {anterior: any, novo: any}>;
  timestamp: string;
  ip?: string;
  userAgent?: string;
}
```

### 2.5 Nova Collection: `activity_stream`
```typescript
interface ActivityStream {
  id: string;
  storeId: string;
  userId: string;
  userName: string;
  tipo: 'produto_adicionado' | 'produto_editado' | 'produto_deletado' | 'login';
  descricao: string;
  dados: Record<string, any>;
  timestamp: string;
  visivel_para: 'loja' | 'admin';  // Quem pode ver
}
```

## 3. Estrutura de Componentes

### 3.1 Componentes de Autenticação e Autorização
- `components/AuthProvider.tsx` - Provider de autenticação com papéis
- `components/RoleGuard.tsx` - Protetor de rotas por papel
- `components/PermissionCheck.tsx` - Verificador de permissões

### 3.2 Componentes de Gestão de Lojas
- `components/StoreSelector.tsx` - Seletor de loja para utilizadores
- `components/StoreList.tsx` - Lista de lojas (admin)
- `components/StoreForm.tsx` - Formulário de criação/edição de loja
- `components/StoreSettings.tsx` - Configurações da loja

### 3.3 Painel Admin Multi-Loja
- `components/AdminDashboard.tsx` - Dashboard principal do admin
- `components/StoreStatsOverview.tsx` - Estatísticas gerais de todas as lojas
- `components/RealTimeActivityFeed.tsx` - Feed de atividades em tempo real
- `components/StorePerformanceChart.tsx` - Gráficos de desempenho por loja
- `components/UserManagementPanel.tsx` - Gestão de utilizadores

### 3.4 Componentes de Produtos Multi-Loja
- Modificar `ProductForm.tsx` para incluir seletor de loja
- Modificar `ProductList.tsx` para filtrar por loja
- Nova view: `ProductsAcrossStores.tsx` - Visão consolidada de produtos

### 3.5 Hooks Personalizados
- `hooks/useStore.ts` - Contexto da loja atual
- `hooks/useStoreData.ts` - Dados da loja com realtime
- `hooks/useRealtimeActivity.ts` - Feed de atividades em tempo real
- `hooks/usePermissions.ts` - Verificação de permissões
- `hooks/useUserRole.ts` - Papel do utilizador

## 4. Realtime com Firestore

### 4.1 Implementação de Listeners
```typescript
// Exemplo: Listener para atividades em tempo real
export function useRealtimeActivities(storeId: string) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener que atualiza quando há novas atividades
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'activity_stream'),
        where('storeId', '==', storeId),
        orderBy('timestamp', 'desc'),
        limit(50)
      ),
      (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data());
        setActivities(data);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [storeId]);

  return { activities, loading };
}
```

## 5. Plano de Implementação por Fases

### Fase 1: Estrutura Base de Multi-Loja
**Duração estimada: 2-3 dias**
- [ ] Criar estrutura de dados (types, interfaces)
- [ ] Criar collections no Firestore
- [ ] Implementar autenticação por loja
- [ ] Criar StoreProvider e hooks de contexto
- [ ] Testes unitários

### Fase 2: Gestão de Lojas (Admin)
**Duração estimada: 2-3 dias**
- [ ] CRUD de lojas
- [ ] Gestão de utilizadores por loja
- [ ] Atribuição de permissões
- [ ] Configurações de loja
- [ ] Testes

### Fase 3: Dados em Tempo Real
**Duração estimada: 2-3 dias**
- [ ] Implementar Firestore listeners
- [ ] Activity stream em tempo real
- [ ] Audit logs automáticos
- [ ] Feed de atividades
- [ ] Testes

### Fase 4: Painel Admin Unificado
**Duração estimada: 2-3 dias**
- [ ] Dashboard admin com múltiplas lojas
- [ ] Gráficos e estatísticas
- [ ] Filtros por loja, período, etc.
- [ ] Relatórios consolidados
- [ ] Testes

### Fase 5: Produtos Multi-Loja
**Duração estimada: 2 dias**
- [ ] Modificar ProductForm para suportar lojas
- [ ] Filtros de produtos por loja
- [ ] Segregação de dados
- [ ] Testes

### Fase 6: Segurança e Auditoria
**Duração estimada: 2 dias**
- [ ] Regras de Firestore por loja
- [ ] Validação de permissões no backend
- [ ] Logs de auditoria completos
- [ ] Segurança de dados

### Fase 7: Performance e Otimização
**Duração estimada: 1-2 dias**
- [ ] Indexação no Firestore
- [ ] Paginação
- [ ] Cache inteligente
- [ ] Otimização de queries

## 6. Exemplo de Fluxo de Trabalho

### Utilizador de Loja (Funcionário)
```
1. Faz login com email/password
2. Sistema determina lojas do utilizador
3. Se apenas 1 loja → vai diretamente
4. Se múltiplas lojas → mostra seletor
5. Seleciona uma loja
6. Acessa apenas dados dessa loja
7. Cria/edita produtos → registado em audit_log
```

### Admin
```
1. Faz login com credenciais admin
2. Vê painel dashboard com:
   - Estatísticas de todas as lojas
   - Feed de atividades em tempo real
   - Gráficos de desempenho
   - Alertas importantes
3. Pode clicar em cada loja para:
   - Ver detalhes completos
   - Gerir utilizadores
   - Ver histórico de atividades
   - Exportar relatórios
```

## 7. Regras de Firestore (Security)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Produtos - segregados por loja
    match /products/{productId} {
      allow read: if 
        request.auth.uid != null && 
        resource.data.storeId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.lojas;
      allow write: if 
        request.auth.uid != null &&
        request.resource.data.storeId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.lojas &&
        request.resource.data.storeId == resource.data.storeId;
    }
    
    // Activity Stream - segregado por loja
    match /activity_stream/{docId} {
      allow read: if 
        request.auth.uid != null &&
        resource.data.storeId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.lojas;
      allow create: if request.auth.uid != null;
    }
    
    // Audit Logs - segregado por loja
    match /audit_logs/{docId} {
      allow read: if 
        request.auth.uid != null &&
        resource.data.storeId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.lojas;
      allow create: if request.auth.uid != null;
    }
  }
}
```

## 8. Indicadores de Desempenho (KPIs) no Dashboard

### Por Loja:
- Total de produtos
- Produtos ativos
- Preço médio
- Margem média
- Valor total em stock
- Atividade de utilizadores (% online)
- Produtos adicionados esta semana
- Produtos com preço alterado

### Consolidado (Admin):
- Total de lojas
- Total de utilizadores
- Total de produtos em todas as lojas
- Atividade geral
- Alertas por loja

## 9. Notificações em Tempo Real

- [ ] Notificação quando novo produto é adicionado
- [ ] Alerta quando preço é alterado significativamente
- [ ] Notificação de utilizador online/offline
- [ ] Relatório diário de atividades
- [ ] Alertas de problemas/erros

## 10. Próximos Passos

1. Confirmar estrutura de dados com stakeholders
2. Iniciar implementação Fase 1
3. Criar testes de integração
4. Realizar UAT com múltiplas lojas
5. Deploy gradual

---

**Estimativa Total: 14-18 dias de desenvolvimento**
