# Fase 3: Dados em Tempo Real - Implementação

## Visão Geral

A Fase 3 implementa o sistema de dados em tempo real, permitindo:

- **Activity Feed**: Visualização de atividades em tempo real
- **Real-time Monitor**: Monitorização de mudanças na loja
- **Notifications**: Sistema de notificações para eventos importantes
- **Activity Dashboard**: Dashboard com estatísticas em tempo real

## Componentes Criados

### 1. ActivityFeed (src/components/ActivityFeed.tsx)

**Responsabilidade**: Exibir feed de atividades com formatação visual

**Funcionalidades**:
- Listagem de atividades em tempo real
- Ícones e labels para cada tipo de atividade
- Timestamps relativos (ex: "5m atrás", "2h atrás")
- Tags de visibilidade (Admin, Loja)
- Limite de atividades exibidas (com contador de mais)
- Dark mode suportado
- Estados de carregamento e erro

**Props**:
```typescript
interface ActivityFeedProps {
  activities: ActivityStream[];
  loading: boolean;
  error: string | null;
  limit?: number;  // Padrão: sem limite
}
```

**Tipos de Atividade Suportados**:
- produto_adicionado ➕
- produto_editado ✏️
- produto_deletado 🗑️
- utilizador_criado 👤
- utilizador_editado 📝
- utilizador_deletado 🚫
- loja_criada 🏪
- loja_editada 🏪
- loja_deletada 🏪
- preco_alterado 💰
- stock_alterado 📦
- relatorio_gerado 📊

**Formatação de Tempo**:
```
< 1 min: "Agora mesmo"
< 1 hora: "Xm atrás"
< 24 horas: "Xh atrás"
< 7 dias: "Xd atrás"
> 7 dias: Data formatada
```

### 2. StoreActivityDashboard (src/components/StoreActivityDashboard.tsx)

**Responsabilidade**: Dashboard com visão consolidada de atividades e estatísticas

**Funcionalidades**:
- Exibição de estatísticas em cards:
  - Total de produtos
  - Total de utilizadores
  - Preço médio
  - Margem média
  - Valor total de stock
- Feed de atividades em tempo real
- Toggle de auto-refresh (30 segundos)
- Última hora de atualização
- Carregamento assíncrono de dados

**Props**:
```typescript
interface StoreActivityDashboardProps {
  storeId: string;
  storeName: string;
  showStats?: boolean;      // Padrão: true
  activityLimit?: number;   // Padrão: 10
}
```

**Dados de Estatísticas**:
```typescript
{
  totalProdutos: number;
  totalUtilizadores: number;
  precoMedio: number;
  margemMedia: number;
  valorTotalStock: number;
  ultimaAtualizacao: string;  // ISO timestamp
}
```

**Auto-Refresh**:
- Intervalo: 30 segundos
- Usa hooks real-time (onSnapshot) para atualização contínua
- Botão toggle para pausar/retomar

### 3. NotificationCenter (src/components/NotificationCenter.tsx)

**Responsabilidade**: Sistema centralizado de notificações

**Funcionalidades**:
- Bell icon com contador de notificações não lidas
- Painel suspenso com lista de notificações
- Tipos de notificação: success, error, warning, info
- Marca como lido ao abrir painel
- Remove notificação individual
- Limpar todas as notificações
- Auto-hide de notificações de sucesso (5 segundos)
- Ação opcional em notificação (com link/botão)
- Dark mode suportado

**Interface de Notificação**:
```typescript
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**Uso Global**:
```typescript
// Exportado automaticamente para window.__notificationCenter
const { addNotification, removeNotification } = useNotifications();

addNotification(
  'Produto Criado',
  'Paracetamol foi adicionado com sucesso',
  'success',
  {
    label: 'Ver Produto',
    onClick: () => { /* navigate */ }
  }
);
```

**Cores por Tipo**:
- Success: Verde (#10b981)
- Error: Vermelho (#ef4444)
- Warning: Amarelo (#eab308)
- Info: Azul (#3b82f6)

### 4. RealTimeMonitor (src/components/RealTimeMonitor.tsx)

**Responsabilidade**: Monitorização visual de mudanças em tempo real

**Funcionalidades**:
- Timeline visual de eventos recentes
- Indicador de status (🔴 Ativo / ⊙ Pausa)
- Botão toggle para pausar/retomar monitorização
- Contadores de tipos de eventos (Add, Update, Delete)
- Formatação de tempo relativo
- Ícones coloridos por tipo de evento
- Máximo de eventos configurável

**Props**:
```typescript
interface StoreMonitorProps {
  storeId: string;
  maxEvents?: number;  // Padrão: 5
}
```

**Tipos de Evento**:
```typescript
interface RealTimeEvent {
  id: string;
  type: 'add' | 'update' | 'delete';
  entityType: string;
  entity: string;
  timestamp: Date;
}
```

**Cores por Evento**:
- Add (verde): TrendingUp ↗️
- Update (azul): Zap ⚡
- Delete (vermelho): TrendingDown ↘️

**Cards de Resumo**:
- Total de adições
- Total de atualizações
- Total de removidas

## Integração com Hooks Existentes

Os componentes utilizam os hooks criados na Fase 1:

### useStoreActivity()
```typescript
const { activities, loading, error } = useStoreActivity(storeId, limit);
```
- Ouve mudanças em tempo real usando onSnapshot
- Retorna atividades ordenadas por data (mais recentes primeiro)
- Suporta limite de resultados

### useStoreStats()
```typescript
const { stats, loading, error, refresh } = useStoreStats(storeId);
```
- Calcula automaticamente estatísticas da loja
- Retorna: totalProdutos, totalUtilizadores, precoMedio, margemMedia, valorTotalStock
- Função refresh() para atualização manual
- Atualização automática com useEffect

### useStoreProducts() e useStoreUsers()
- Já implementados na Fase 1
- Fornecidos dados base para cálculos de estadísticas

## Fluxo de Dados em Tempo Real

```
Firestore Collections
├── activity_stream
│   └── onSnapshot() → useStoreActivity()
│       └── ActivityFeed / RealTimeMonitor
│
├── products
│   └── onSnapshot() → useStoreProducts()
│       └── useStoreStats() (calcula totais)
│           └── StoreActivityDashboard
│
└── users
    └── onSnapshot() → useStoreUsers()
        └── useStoreStats() (calcula contadores)
            └── StoreActivityDashboard
```

## Testes

**Arquivo**: `src/tests/phase6-phase3-realtime.test.ts`

**Estatísticas**:
- Total de testes: 25
- Status: Todos passando ✓

**Categorias de Testes**:

1. **Activity Stream em Tempo Real** (5 testes):
   - Registar atividade quando produto é adicionado
   - Registar atividade quando produto é editado
   - Registar atividade quando produto é deletado
   - Registar múltiplas atividades em sequência
   - Ordenar atividades por data (mais recentes primeiro)

2. **Controle de Visibilidade** (3 testes):
   - Segregar atividades visíveis para loja
   - Restringir atividades admin de utilizadores
   - Permitir admin ver todas as atividades

3. **Sistema de Notificações** (5 testes):
   - Criar notificação de sucesso
   - Criar notificação de erro
   - Marcar notificação como lida
   - Contar notificações não lidas
   - Remover notificação

4. **Monitorização em Tempo Real** (5 testes):
   - Registar evento de adição
   - Registar evento de atualização
   - Registar evento de remoção
   - Contar eventos por tipo
   - Manter últimos N eventos

5. **Agregação de Dados** (4 testes):
   - Calcular estatísticas básicas
   - Atualizar estatísticas quando produto é adicionado
   - Calcular valor total de stock
   - Calcular margem média

6. **Sincronização de Dados** (3 testes):
   - Registar sincronização bem-sucedida
   - Detectar conflito de sincronização
   - Resolver conflito de sincronização

## Performance e Otimizações

### Real-time Listeners
- Firestore onSnapshot para atualizações automáticas
- Sem polling desnecessário
- Cleanup automático de listeners

### Memoization
- React.memo em componentes que recebem props estáticas
- useMemo para cálculos complexos
- useCallback para callbacks estáveis

### Limitação de Dados
- Limite configurável de atividades exibidas
- Slice de array para manter apenas X eventos
- Contador visual de "mais atividades"

### Estado de Carregamento
- Skeleton screens durante carregamento
- Loading state visual para melhor UX
- Erro handling com mensagens claras

## Padrões Utilizados

### 1. Pattern de Auto-Refresh
```typescript
useEffect(() => {
  if (!autoRefresh) return;
  const interval = setInterval(() => {
    // Refresh (já feito por onSnapshot)
  }, 30000);
  return () => clearInterval(interval);
}, [autoRefresh]);
```

### 2. Pattern de Notificação Global
```typescript
// Expor para window
(window as any).__notificationCenter = { addNotification };

// Usar de qualquer lugar
const { addNotification } = useNotifications();
```

### 3. Pattern de Timeline Visual
```typescript
{events.map((event, index) => (
  <div key={event.id}>
    <EventIcon />
    {index < events.length - 1 && <TimelineLine />}
    <EventInfo />
  </div>
))}
```

### 4. Pattern de Contador Badge
```typescript
{unreadCount > 0 && (
  <span className="absolute top-0 right-0 badge">
    {unreadCount > 9 ? '9+' : unreadCount}
  </span>
)}
```

## Dark Mode

Todos os componentes suportam dark mode com classes Tailwind:
- `dark:bg-slate-900` para backgrounds
- `dark:text-white` para texto
- `dark:border-slate-700` para borders
- `dark:hover:bg-slate-800` para hover states

## Acessibilidade

- Botões com `title` attributes
- Labels descritivos em notificações
- Contraste de cores adequado
- Ícones com texto alternativo
- Navegação via keyboard

## Próximos Passos (Fase 4)

Fase 4 focará em:
- **Painel Admin Unificado**: Dashboard central para admin monitorizar todas as lojas
- **Gráficos e Relatórios**: Visualização de dados históricos
- **Alertas Personalizados**: Definir limites e receber alertas

## Verificação de Implementação

✓ ActivityFeed component criado
✓ StoreActivityDashboard component criado
✓ NotificationCenter component criado
✓ RealTimeMonitor component criado
✓ 25 testes criados e passando
✓ Integração com useStoreActivity hook
✓ Integração com useStoreStats hook
✓ Dark mode suportado em todos os componentes
✓ Sistema de notificações global
✓ Auto-refresh com toggle

## Notas Importantes

1. **Real-time**: Todos os dados usam Firestore onSnapshot (não polling)
2. **Performance**: Limite de atividades exibidas para não sobrecarregar UI
3. **Visibilidade**: Atividades filtradas por papel do utilizador
4. **Notificações**: Auto-hide para sucesso, persistentes para erro
5. **Monitor**: Timeline visual para melhor compreensão de eventos
6. **Estatísticas**: Cálculos automáticos baseados em dados reais

## Exemplos de Uso

### Usar ActivityFeed
```typescript
const { activities, loading, error } = useStoreActivity('store-1', 50);

<ActivityFeed
  activities={activities}
  loading={loading}
  error={error}
  limit={10}
/>
```

### Usar StoreActivityDashboard
```typescript
<StoreActivityDashboard
  storeId="store-1"
  storeName="Farmácia Central"
  showStats={true}
  activityLimit={10}
/>
```

### Usar NotificationCenter
```typescript
import { NotificationCenter, useNotifications } from './components/NotificationCenter';

// No header/navbar
<NotificationCenter />

// Em qualquer lugar
const { addNotification } = useNotifications();

addNotification(
  'Sucesso',
  'Produto criado com sucesso!',
  'success'
);
```

### Usar RealTimeMonitor
```typescript
<RealTimeMonitor
  storeId="store-1"
  maxEvents={5}
/>
```
