# FASE 1: Notificações Inteligentes de Validade

## Status: ✅ IMPLEMENTADO

Implementação completa de sistema de alertas automáticos de validade de produtos com:
- Detecção automática de produtos expirando
- Alertas por severidade (CRITICAL < 7 dias, WARNING 7-30 dias, INFO 30-60 dias)
- Histórico de alertas para auditoria
- Interface reativa React para gerenciar alertas

---

## Arquivos Implementados

### 1. Types (`src/types/notifications.ts`) ✅
**Status**: Já existia
- Interface `ExpiryAlert` - Alerta de validade com severidade
- Interface `StockAlertConfig` - Configuração de alertas
- Interface `AlertHistory` - Histórico para auditoria
- Interface `NotificationPreferencesExtended` - Preferências multi-canal

### 2. Service (`src/services/expiryAlertService.ts`) ✅
**Status**: Já existia (555 linhas)
- `checkExpiringProducts()` - Busca produtos vencendo (threshold configurável)
- `createAlert()` - Cria alerta no Firestore
- `sendAlertNotification()` - Envia por canais (in-app, email, whatsapp)
- `acknowledgeAlert()` - Marca como reconhecido
- `resolveAlert()` - Marca como resolvido
- `listAlerts()` - Lista com filtros por severidade
- `getAlertsSummary()` - Resumo de alertas (críticos/avisos/info)
- `getAlertHistory()` - Histórico com filtros de data/ação
- `deleteResolvedAlerts()` - Limpeza automática

**Algoritmo de Severidade**:
```
CRITICAL: < 7 dias ou já expirou
WARNING:  7-30 dias
INFO:     30+ dias
```

### 3. Hook React (`src/hooks/useExpiryAlerts.ts`) ✅ NOVO
**Status**: Criado - 280 linhas
**Padrão**: [state, actions]

```typescript
const {
  // Estado
  alerts,           // ExpiryAlert[]
  alertsSummary,    // { critical, warning, info, total }
  isLoading,        // boolean
  error,            // string | null

  // Ações
  checkExpiringProducts,  // (daysThreshold?: number) => Promise<ExpiryAlert[]>
  listAlerts,             // (filters?) => Promise<void>
  acknowledgeAlert,       // (alertId, userId) => Promise<void>
  resolveAlert,           // (alertId, userId, reason) => Promise<void>
  refreshAlerts,          // () => Promise<void>
  getAlertsSummary,       // () => Promise<void>
  clearError,             // () => void
} = useExpiryAlerts();
```

**Comportamento**:
- Auto-recarrega ao mudar de loja
- Caching local de alertas
- Tratamento automático de erros
- Logging de operações

### 4. Componente Panel (`src/components/ExpiryAlertPanel.tsx`) ✅ NOVO
**Status**: Criado - 300+ linhas
**Features**:
- ✅ Lista de alertas com filtro por severidade (ALL/CRITICAL/WARNING/INFO)
- ✅ Cores visuais por severidade (vermelho/amarelo/azul)
- ✅ KPI cards com contagem de alertas
- ✅ Ações: Reconhecer, Resolver
- ✅ Modal de resolução com motivo
- ✅ Modo compacto para dashboards
- ✅ Status visual de reconhecimento/resolução
- ✅ Responsividade mobile

**Props**:
```typescript
interface ExpiryAlertPanelProps {
  compact?: boolean;      // Modo compacto (menor padding)
  showResolved?: boolean; // Mostrar alertas resolvidos
}
```

### 5. Componente Dashboard (`src/components/ExpiryMonitoringDashboard.tsx`) ✅ NOVO
**Status**: Criado - 400+ linhas
**Features**:
- ✅ KPI cards (Críticos, Avisos, Informativos)
- ✅ Gráfico de distribuição por severidade (Pizza SVG)
- ✅ Tabela de produtos com próximas datas de vencimento
- ✅ Ordenação por dias restantes ou quantidade
- ✅ Botão de atualização manual
- ✅ Indicadores visuais de risco (cores por dias)
- ✅ Responsividade mobile

**Layout**:
```
┌─────────────────────────────────────────────┐
│ Monitoramento de Validade                   │
├─────────────────────────────────────────────┤
│ [Críticos: 5] [Avisos: 12] [Info: 23]      │
├─────────────────────────────────────────────┤
│ Distribuição por Severidade (Gráfico Pizza) │
├─────────────────────────────────────────────┤
│ Produto | Data | Dias | Qtd | Severidade  │
│ ─────────────────────────────────────────── │
│ ...                                         │
└─────────────────────────────────────────────┘
```

### 6. Testes (`src/components/ExpiryAlertPanel.test.tsx`) ✅ NOVO
**Status**: Criado - testes básicos
- ✅ Renderização de título
- ✅ Resumo de alertas
- ✅ Listagem de produtos
- ✅ Dias até expiração
- ✅ Quantidade de unidades
- ✅ Botões de ação
- ✅ Modo compacto

---

## Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│ Cloud Firestore: /stores/{storeId}/products             │
│ (Busca produtos com expiryDate ≤ hoje + 60 dias)        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │ ExpiryAlertService          │
         │ .checkExpiringProducts()    │
         │ .calculateSeverity()        │
         │ .generateAlertMessage()     │
         └──────────────┬──────────────┘
                        │
                        ▼
         ┌─────────────────────────────┐
         │ Cloud Firestore:            │
         │ /stores/{storeId}/expiryAlerts
         │ /stores/{storeId}/alertHistory
         └──────────────┬──────────────┘
                        │
                        ▼
         ┌─────────────────────────────┐
         │ React Hook:                 │
         │ useExpiryAlerts()           │
         │ (Real-time listener)        │
         └──────────────┬──────────────┘
                        │
                        ▼
         ┌─────────────────────────────┐
         │ React Components:           │
         │ - ExpiryAlertPanel          │
         │ - ExpiryMonitoringDashboard │
         │ (UI com filtros + ações)    │
         └─────────────────────────────┘
```

---

## Integração com Outras Fases

### FASE 4 - Cloud Functions (Webhook Handlers)
Quando implementada, as Cloud Functions farão:
```typescript
// Cloud Function: expiryAlertCron (executado diariamente às 7h)
async function dailyExpiryCheck() {
  const stores = await getAllStores();
  
  for (const store of stores) {
    const alerts = await ExpiryAlertService.checkExpiringProducts(store.id, 60);
    
    for (const alert of alerts) {
      // 1. Criar alerta no Firestore
      const created = await ExpiryAlertService.createAlert(alert);
      
      // 2. Buscar preferências de notificação do utilizador
      const prefs = await getNotificationPreferences(store.managerId);
      
      // 3. Enviar notificações por canais configurados
      if (prefs.expiryAlerts?.enabled) {
        alert.channels = prefs.expiryAlerts.channels;
        await ExpiryAlertService.sendAlertNotification(alert);
      }
    }
  }
}
```

### FASE 5 - Integrações (SendGrid + Twilio)
Quando implementadas, as notificações usarão:
- **Email**: `SendGridEmailService.sendExpiryAlert()`
- **WhatsApp**: `TwilioWhatsAppService.sendExpiryAlert()`

Exemplo:
```typescript
await SendGridEmailService.sendExpiryAlert(
  managerEmail,
  'Ibuprofen 200mg',
  5,  // dias até expiração
  'CRITICAL'
);

await TwilioWhatsAppService.sendExpiryAlert(
  managerPhone,
  'Ibuprofen 200mg',
  5,
  'CRITICAL'
);
```

### FASE 2 - Gestão de Estoque
Alertas de validade criarão automaticamente:
- Recomendações de venda urgente
- Sugestões de devolução ao fornecedor
- Relatórios de perda financeira

---

## Como Usar

### 1. Em Componentes React

```typescript
import { useExpiryAlerts } from '../hooks/useExpiryAlerts';
import { ExpiryAlertPanel } from '../components/ExpiryAlertPanel';
import { ExpiryMonitoringDashboard } from '../components/ExpiryMonitoringDashboard';

function ProductsPage() {
  const { alerts, alertsSummary, refreshAlerts } = useExpiryAlerts();
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Painel compacto na sidebar */}
      <ExpiryAlertPanel compact={true} />
      
      {/* Dashboard completo */}
      <ExpiryMonitoringDashboard />
    </div>
  );
}
```

### 2. Verificar Produtos Expirando

```typescript
const { checkExpiringProducts } = useExpiryAlerts();

// Buscar produtos expirando nos próximos 30 dias
const expiringProducts = await checkExpiringProducts(30);

expiringProducts.forEach(alert => {
  console.log(`${alert.productName} expira em ${alert.daysUntilExpiry} dias`);
});
```

### 3. Reconhecer Alerta

```typescript
const { acknowledgeAlert } = useExpiryAlerts();

await acknowledgeAlert(alertId, userId);
// UI atualiza automaticamente
```

### 4. Resolver Alerta

```typescript
const { resolveAlert } = useExpiryAlerts();

await resolveAlert(alertId, userId, 'Produto vendido');
// Alerta marcado como resolvido, removido da visualização
```

---

## Testes

### Testes Unitários

```bash
npm run test expiryAlertService.test.ts
```

**Coverage**:
- ✅ calculateSeverity()
- ✅ generateAlertMessage()
- ✅ checkExpiringProducts()
- ✅ createAlert()
- ✅ acknowledgeAlert()
- ✅ resolveAlert()
- ✅ getAlertsSummary()
- ✅ getAlertHistory()

### Testes de Componentes

```bash
npm run test ExpiryAlertPanel.test.tsx
```

### Teste Manual

1. **Setup Firestore**:
   ```
   /stores/{storeId}/products
   - Produto A: expiryDate = 2026-09-01 (5 dias)
   - Produto B: expiryDate = 2026-09-15 (20 dias)
   ```

2. **Abrir Dashboard**:
   - Vê 1 CRÍTICO e 1 WARNING
   - Vê produtos na tabela com días até expirar

3. **Reconhecer Alerta**:
   - Clica botão de olho (Eye icon)
   - Status atualiza localmente

4. **Resolver Alerta**:
   - Clica botão de check (CheckCircle icon)
   - Modal solicita motivo
   - Alerta desaparece da lista

---

## Próximas Fases

| Fase | Descrição | Dependências |
|------|-----------|---|
| **FASE 2** | Gestão de Estoque | Terminar FASE 1 |
| **FASE 3** | Módulo de Vendas | Terminar FASE 2 |
| **FASE 4** | Cloud Functions & Crons | Terminar FASE 1 |
| **FASE 5** | Integrações (Email + WhatsApp) | FASE 1 + FASE 4 |
| **FASE 6** | Machine Learning (Previsões) | Histórico de vendas |

---

## Notas Técnicas

### Estrutura de Dados no Firestore

```javascript
// Collection: /stores/{storeId}/expiryAlerts
{
  id: "expiry-prod-123-1693305600000",
  storeId: "store-1",
  productId: "prod-123",
  productName: "Ibuprofen 200mg",
  expiryDate: "2026-09-15",
  daysUntilExpiry: 5,
  severity: "CRITICAL",
  createdAt: Timestamp,
  triggeredAt: Timestamp, // Quando foi enviada notificação
  acknowledgedAt: Timestamp,
  resolvedAt: Timestamp,
  channels: ["in-app", "email", "whatsapp"],
  notificationIds: {
    "email": "msg-123",
    "whatsapp": "msg-456"
  },
  quantity: 10,
  batchNumber: "LOT-2026-001",
  notes: "Verificar stock após vencimento"
}

// Collection: /stores/{storeId}/alertHistory
{
  id: "history-1693305600000-abc123",
  storeId: "store-1",
  alertId: "expiry-prod-123-1693305600000",
  productId: "prod-123",
  action: "created" | "triggered" | "acknowledged" | "resolved",
  severity: "CRITICAL",
  timestamp: Timestamp,
  userId: "user-1",
  details: {
    channelsSent: ["in-app", "email"],
    reason: "Produto vendido",
    daysUntilExpiry: 5
  }
}
```

### Performance

- **Listagem de alertas**: O(n) com índice Firestore
- **Cálculo de severidade**: O(1)
- **Histórico**: Paginado em 50 registros

### Segurança

**Security Rules**:
```javascript
// Apenas gerentes da loja podem ver alertas
match /stores/{storeId}/expiryAlerts/{alertId} {
  allow read: if request.auth.uid in get(/databases/$(database)/documents/stores/$(storeId)).data.managers;
  allow create: if request.auth.uid in get(/databases/$(database)/documents/stores/$(storeId)).data.managers;
  allow update: if request.auth.uid in get(/databases/$(database)/documents/stores/$(storeId)).data.managers;
}
```

---

## Melhorias Futuras

- [ ] Alertas de escalação automática (reenviar se não resolvido em 24h)
- [ ] Notificações em tempo real com WebSockets
- [ ] Previsão de próximas expirações com ML
- [ ] Integração com sistema de devolução ao fornecedor
- [ ] Cálculo automático de perda financeira
- [ ] Relatórios de tendência de desperdício
