# Fase 6: Segurança e Auditoria - Implementação

## Visão Geral

A Fase 6 implementa um sistema completo de segurança e auditoria para rastreamento de todas as atividades no sistema multi-loja, permitindo:

- **Logging Abrangente**: Registo de todas as ações (CREATE, READ, UPDATE, DELETE, LOGIN)
- **Alertas de Segurança**: Detecção automática de atividades suspeitas
- **Controlo de Acesso**: Rastreamento de tentativas de acesso não autorizadas
- **Relatórios de Conformidade**: Compliance GDPR e auditorias regulares
- **Histórico de Alterações**: Registo detalhado de todas as mudanças

## Componentes Criados

### 1. Tipos e Interfaces (src/types/audit.ts)

**Entidades Principais**:

#### AuditEntry
```typescript
interface AuditEntry {
  id: string;
  timestamp: string;                    // ISO 8601
  userId: string;
  userName: string;
  userEmail: string;
  storeId: string;
  storeName: string;
  action: AuditAction;                  // Tipo específico da ação
  actionType: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'PERMISSION_CHANGE';
  entityType: 'PRODUCT' | 'USER' | 'STORE' | 'SETTINGS' | 'REPORT' | 'AUTH';
  entityId: string;
  entityName: string;
  changes: AuditChange[];               // Lista de campos alterados
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  errorMessage?: string;
  metadata: Record<string, any>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
```

#### AuditAction (22 tipos)
- `PRODUCT_CREATED` / `PRODUCT_UPDATED` / `PRODUCT_DELETED`
- `USER_CREATED` / `USER_UPDATED` / `USER_DELETED` / `USER_ROLE_CHANGED`
- `PERMISSION_GRANTED` / `PERMISSION_REVOKED`
- `STORE_CREATED` / `STORE_UPDATED` / `STORE_DELETED` / `STORE_SETTINGS_CHANGED`
- `REPORT_GENERATED` / `REPORT_EXPORTED` / `DATA_EXPORTED`
- `LOGIN_SUCCESS` / `LOGIN_FAILURE` / `LOGOUT` / `PASSWORD_CHANGED`
- `STORE_ACCESSED` / `UNAUTHORIZED_ACCESS_ATTEMPT`

#### SecurityAlert
```typescript
interface SecurityAlert {
  id: string;
  timestamp: string;
  type: 'UNAUTHORIZED_ACCESS' | 'MULTIPLE_FAILURES' | 'UNUSUAL_ACTIVITY' | 'PERMISSION_ABUSE' | 'DATA_ACCESS_VIOLATION';
  severity: 'WARNING' | 'CRITICAL';
  userId?: string;
  userName?: string;
  storeId?: string;
  storeName?: string;
  description: string;
  details: Record<string, any>;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}
```

#### AccessLog
```typescript
interface AccessLog {
  id: string;
  userId: string;
  userName: string;
  storeId: string;
  storeName: string;
  accessTime: string;
  exitTime?: string;
  duration: number;                     // em segundos
  ipAddress: string;
  userAgent: string;
  accessType: 'LOGIN' | 'STORE_ACCESS' | 'REPORT_VIEW' | 'DATA_EXPORT';
  status: 'ACTIVE' | 'CLOSED' | 'TIMEOUT';
}
```

#### PermissionChange
```typescript
interface PermissionChange {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  targetUserId: string;
  targetUserName: string;
  storeId: string;
  storeName: string;
  roleFrom: string;
  roleTo: string;
  changedBy: string;
  reason?: string;
}
```

#### DataAccessLog
```typescript
interface DataAccessLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  storeId: string;
  storeName: string;
  dataType: 'PRODUCTS' | 'USERS' | 'REPORTS' | 'SETTINGS' | 'AUDIT_LOGS';
  recordCount: number;
  filters?: Record<string, any>;
  exportFormat?: 'JSON' | 'CSV' | 'PDF' | 'XLSX';
  purpose?: string;
  ipAddress: string;
}
```

### 2. Hook de Auditoria (src/hooks/useAudit.ts)

**Funcionalidades Principais**:

#### logAction()
```typescript
const entry = await logAction({
  userId: 'user-1',
  userName: 'João Silva',
  userEmail: 'joao@example.com',
  storeId: 'store-1',
  storeName: 'Farmácia Central',
  action: 'PRODUCT_CREATED',
  actionType: 'CREATE',
  entityType: 'PRODUCT',
  entityId: 'prod-1',
  entityName: 'Paracetamol 500mg',
  changes: [...],
  ipAddress: '192.168.1.100',
  userAgent: navigator.userAgent,
  status: 'SUCCESS',
  metadata: {},
  severity: 'LOW',
});
```

#### logAccess()
```typescript
const accessLog = await logAccess(
  userId: 'user-1',
  storeId: 'store-1',
  accessType: 'LOGIN'
);
```

#### filterAuditEntries()
```typescript
const filtered = filterAuditEntries({
  userId: 'user-1',
  storeId: 'store-1',
  actionType: 'DELETE',
  severity: 'HIGH',
  status: 'FAILURE',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});
```

#### getAuditStats()
```typescript
const stats = getAuditStats('store-1');
// Retorna:
// {
//   totalEntries: 150,
//   totalLogins: 25,
//   totalFailures: 3,
//   uniqueUsers: 8,
//   criticalEvents: 2,
//   dateRange: { start, end },
//   actionCounts: { ... },
//   userActivity: [ ... ]
// }
```

#### Detecção de Alertas Automática
O hook verifica automaticamente:
- **Múltiplas Falhas de Login**: 3+ falhas em 30 minutos → Alerta CRÍTICO
- **Tentativas de Acesso Não Autorizado**: Detecção imediata → Alerta CRÍTICO
- **Atividade Incomum**: >10 ações em 5 minutos → Alerta WARNING

### 3. Dashboard de Auditoria (src/components/AuditDashboard.tsx)

**Características**:
- KPI Cards com 6 métricas principais
- Filtros multi-dimensionais (período, tipo ação, severidade, status)
- Log detalhado com expansão de entradas
- Visualização de alterações por campo
- Dark mode completo
- Exportação de relatórios

**KPIs Exibidos**:
- Total de Eventos
- Sucessos (verde)
- Falhas (vermelho)
- Eventos Críticos (laranja)
- Alertas Ativos (púrpura)
- Utilizadores Únicos (índigo)

**Filtros Disponíveis**:
- Período (24h, 7 dias, 30 dias, todos)
- Tipo de Ação (CREATE, UPDATE, DELETE, LOGIN)
- Severidade (LOW, MEDIUM, HIGH, CRITICAL)
- Status (SUCCESS, FAILURE)

### 4. Painel de Alertas de Segurança (src/components/SecurityAlertPanel.tsx)

**Funcionalidades**:
- Resumo de alertas ativos vs. resolvidos
- Expandir detalhes de cada alerta
- Resolver alertas com notas
- Histórico de alertas resolvidos
- Ícones e cores por tipo de alerta
- Integração com dark mode

**Estados de Alerta**:
- 🔓 UNAUTHORIZED_ACCESS: Tentativa de acesso não autorizado
- ❌ MULTIPLE_FAILURES: Múltiplas falhas (ex: login)
- ⚠️ UNUSUAL_ACTIVITY: Comportamento anómalo
- 🚫 PERMISSION_ABUSE: Abuso de permissões
- 📊 DATA_ACCESS_VIOLATION: Violação de acesso a dados

**Ações**:
- Expandir detalhes do alerta
- Adicionar nota de resolução
- Resolver alerta (com timestamp e identificação do admin)
- Visualizar alertas históricos

## Regras de Severidade

### LOW (Azul)
- Ações normais de utilizadores autorizados
- Logins bem-sucedidos
- Criação de produtos

### MEDIUM (Laranja)
- Exclusões de dados
- Mudanças de permissões
- Acessos fora do horário

### HIGH (Vermelho Claro)
- Múltiplas mudanças rápidas
- Acessos a áreas restritas
- Tentativas de ações não autorizadas

### CRITICAL (Vermelho Escuro)
- Tentativas de acesso não autorizado
- Múltiplas falhas de login
- Atividade suspeita em massa

## Detecção de Ameaças

### Múltiplas Falhas de Login
```typescript
// Trigger: 3+ falhas em 30 minutos
if (recentFailures.length >= 3) {
  generateAlert('MULTIPLE_FAILURES', 'CRITICAL');
}
```

### Atividade Incomum
```typescript
// Trigger: >10 ações em 5 minutos
if (recentActions.length > 10) {
  generateAlert('UNUSUAL_ACTIVITY', 'WARNING');
}
```

### Acesso Não Autorizado
```typescript
// Trigger: Tentativa de acesso a loja não permitida
if (userStore !== requestedStore) {
  generateAlert('UNAUTHORIZED_ACCESS', 'CRITICAL');
}
```

## Conformidade GDPR

### Requisitos Implementados
✅ **Rastreamento de Identidade**: Utilizador, email, IP registados
✅ **Timestamps Precisos**: ISO 8601 com timezone
✅ **Retenção de Dados**: Purgação após 90 dias
✅ **Acesso a Logs**: Apenas admin pode visualizar
✅ **Direito ao Esquecimento**: Purga de dados por utilizador
✅ **Notificações**: Alertas de atividade suspeita
✅ **Auditoria**: Rastreamento completo de todas as ações

### Purgação de Dados
```typescript
// Automático após 90 dias
const purged = purgeOldAuditEntries(90);
// Ou manual
const purged = purgeOldAuditEntries(365);
```

## Casos de Uso

### 1. Auditoria de Transação
```typescript
// Admin quer ver quem criou um produto
const entries = filterAuditEntries({
  entityType: 'PRODUCT',
  entityId: 'prod-123',
  actionType: 'CREATE',
});

// Retorna: Utilizador X, data Y, IP Z, mudanças registadas
```

### 2. Investigação de Incidente
```typescript
// Admin suspeita de atividade anormal
const alerts = getActiveAlerts();
const suspiciousUser = alerts.filter(a => a.userId === 'user-X');
const timeline = filterAuditEntries({
  userId: 'user-X',
  startDate: '2024-06-10',
  endDate: '2024-06-15',
});

// Visualizar sequência de eventos
```

### 3. Conformidade Regulatória
```typescript
// Gerar relatório de compliance
const stats = getAuditStats();
const report = {
  period: 'Q1 2024',
  totalEntries: stats.totalEntries,
  securityIncidents: stats.criticalEvents,
  userActivity: stats.userActivity,
  dataAccess: stats.dataAccessLogs,
};

// Exportar para revisão regulatória
```

### 4. Monitorização de Permissões
```typescript
// Rastrear mudanças de role
const entries = filterAuditEntries({
  action: 'USER_ROLE_CHANGED',
  startDate: '2024-06-01',
});

// Revisar todas as promoções/demissões
```

## Testes

**Arquivo**: `src/tests/phase6-phase6-security-audit.test.ts`

**Estatísticas**:
- Total de testes: 32
- Status: Todos passando ✓

**Categorias**:

1. **Logging de Auditoria** (6 testes):
   - Registar CREATE, UPDATE, DELETE
   - Registar LOGIN success/failure
   - Registar mudanças de permissão

2. **Filtros de Auditoria** (6 testes):
   - Filtrar por utilizador, loja, ação, severidade, status
   - Combinar múltiplos filtros

3. **Alertas de Segurança** (5 testes):
   - Gerar alertas para múltiplas falhas
   - Gerar alertas para acesso não autorizado
   - Gerar alertas para atividade incomum
   - Resolver alertas

4. **Logs de Acesso** (3 testes):
   - Registar acesso
   - Calcular duração
   - Fechar sessão

5. **Mudanças de Permissão** (2 testes):
   - Registar concessão e revogação

6. **Estatísticas de Auditoria** (6 testes):
   - Calcular totais, sucessos, falhas
   - Contar utilizadores e eventos críticos
   - Agrupar por ação

7. **Retenção de Dados** (2 testes):
   - Purgar entradas antigas
   - Manter entradas recentes

8. **Conformidade GDPR** (2 testes):
   - Verificar campos obrigatórios
   - Registar identidade e IP

## Integração com Contexto StoreContext

```typescript
// No contexto StoreContext.tsx
const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

// Registar ação ao criar produto
const createProduct = async (product) => {
  try {
    // Criar produto
    const created = await addProduct(product);
    
    // Registar auditoria
    logAction({
      action: 'PRODUCT_CREATED',
      entityId: created.id,
      entityName: product.name,
      // ...
    });
  } catch (error) {
    // Registar falha
    logAction({
      action: 'PRODUCT_CREATED',
      status: 'FAILURE',
      errorMessage: error.message,
      // ...
    });
  }
};
```

## Performance

- **Armazenamento**: Map em memória com indexação por userId/storeId
- **Queries**: Filtragem in-memory com O(n) para queries complexas
- **Alertas**: Gerados em tempo real durante logAction()
- **Purgação**: Background job (recomendado: nightly)

## Próximos Passos (Fase 7)

Fase 7 focará em:
- **Exportação Avançada**: PDFs, Excel, Email
- **Agendamento**: Relatórios automáticos
- **Encriptação**: Encriptação de dados sensíveis
- **Backup**: Backup automático de logs

## Verificação de Implementação

✓ Tipos de auditoria definidos (10 interfaces)
✓ Hook useAudit criado com 8 funções
✓ AuditDashboard component (6 métricas + filtros)
✓ SecurityAlertPanel component (alertas e resoluções)
✓ Detecção automática de ameaças
✓ 32 testes criados e passando
✓ Conformidade GDPR implementada
✓ Dark mode suportado
✓ Acessibilidade WCAG AA

## Exemplos de Uso

### Inicializar Auditoria
```typescript
const { logAction, logAccess, filterAuditEntries, getAuditStats } = useAudit();
```

### Log de Ação
```typescript
await logAction({
  userId: currentUser.id,
  userName: currentUser.name,
  userEmail: currentUser.email,
  storeId: currentStore.id,
  storeName: currentStore.name,
  action: 'PRODUCT_CREATED',
  actionType: 'CREATE',
  entityType: 'PRODUCT',
  entityId: product.id,
  entityName: product.name,
  changes: [{ field: 'name', oldValue: null, newValue: product.name, timestamp: new Date().toISOString() }],
  ipAddress: userIpAddress,
  userAgent: navigator.userAgent,
  status: 'SUCCESS',
  metadata: { source: 'admin-panel' },
  severity: 'LOW',
});
```

### Dashboard
```typescript
<AuditDashboard
  auditEntries={auditEntries}
  securityAlerts={securityAlerts}
  onExport={handleExport}
/>
```

### Alertas
```typescript
<SecurityAlertPanel
  alerts={securityAlerts}
  onResolve={handleResolveAlert}
  onDismiss={handleDismissAlert}
/>
```

## Métricas e Monitorização

| Métrica | Limite | Ação |
|---------|--------|------|
| Falhas de Login | 3 em 30min | Alerta CRÍTICO |
| Ações Rápidas | >10 em 5min | Alerta WARNING |
| Acesso Não Autorizado | Qualquer | Alerta CRÍTICO |
| Entradas Auditoria | >100k | Purgação necessária |
| Alertas Não Resolvidos | >10 | Revisão necessária |

## Notas Importantes

1. **Imutabilidade**: Logs de auditoria nunca devem ser alterados
2. **Retenção**: Configurável (padrão: 90 dias)
3. **Performance**: Usar índices para queries frequentes
4. **Privacidade**: Não registar senhas ou dados sensíveis
5. **Compliance**: Revisar regularmente para conformidade GDPR
