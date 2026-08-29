# FASE 8: Cloud Functions Automáticas e Notificações

**Status**: ✅ Implementação Completa  
**Data**: 29 de Agosto de 2026  
**Branch**: `claude/precocerto-stage-1-xsicob`

---

## 📋 Resumo Executivo

FASE 8 implementa **automação completa** de análises preditivas com notificações multi-canal:

- ✅ **Cloud Functions Automáticas** - Análises agendadas diariamente
- ✅ **Cloud Scheduler** - Cron jobs configuráveis (diária/twice-daily/semanal)
- ✅ **Notificações Multi-Canal** - Email, WhatsApp, SMS, In-App
- ✅ **Integração Twilio** - WhatsApp e SMS profissionais
- ✅ **SendGrid** - Email transacional confiável
- ✅ **Relatórios Automáticos** - Diários e semanais
- ✅ **Auditoria Completa** - Histórico de execução e envios
- ✅ **UI de Configuração** - Painel intuitivo para setup

A solução é **production-ready**, **escalável** e **completamente automática**.

---

## 🏗️ Arquitetura

### Fluxo de Execução Automática

```
[Cloud Scheduler - Cron]
    ↓
    └→ 07:00 UTC diariamente
    
[Cloud Function: Predictive Analysis]
    ↓
    ├→ Carregar dados da loja (produtos, vendas, anomalias)
    ├→ Executar PredictiveAnalyticsService
    ├→ Gerar previsões, tendências, reabastecimentos
    ├→ Salvar no Firestore (batch operations)
    └→ Log de execução
    
[Cloud Function: Anomaly Detection]
    ↓
    ├→ Analisar dados em tempo real
    ├→ Detectar anomalias (Z-score)
    ├→ Classificar por severidade
    └→ Persistir histórico
    
[Cloud Function: Report Generation]
    ↓
    ├→ Gerar relatório diário de anomalias
    ├→ Gerar relatório semanal (sexta-feira)
    ├→ Calcular insights e recomendações
    └→ Salvar no Firestore
    
[Cloud Function: Notification Sender]
    ↓
    ├→ Obter notificações pendentes
    ├→ Validar configuração de canais
    ├→ Enviar via Twilio (WhatsApp/SMS)
    ├→ Enviar via SendGrid (Email)
    ├→ Salvar in-app no Firestore
    └→ Registar histórico de envios
    
[Banco de Dados Firestore]
    ↓
    └→ Listeners reagem às mudanças em tempo real
    
[Componentes React]
    ↓
    └→ Atualizam automaticamente via listeners
```

### Estrutura de Ficheiros

```
src/
├── types/
│   └── automation.ts              # Tipos para automação
├── services/
│   ├── automationService.ts       # Orquestração de automação
│   └── notificationService.ts     # Envio de notificações
├── hooks/
│   └── useAutomation.ts           # Hook de automação
├── components/
│   └── AutomationSettingsPanel.tsx # UI de configuração
└── firebase-functions/
    ├── scheduledAnalysis.ts       # Cloud Function: Análise diária
    ├── anomalyDetection.ts        # Cloud Function: Detectar anomalias
    ├── reportGeneration.ts        # Cloud Function: Gerar relatórios
    └── notificationSender.ts      # Cloud Function: Enviar notificações
```

---

## 🎯 Tipos e Interfaces

### AutomationConfig

Define configuração de automação por loja:

```typescript
{
  id: string;
  storeId: string;
  
  // Análise Preditiva Automática
  enableAutoAnalysis: boolean;
  analysisSchedule: 'daily' | 'twice-daily' | 'weekly';
  analysisTime: string; // HH:mm em UTC (ex: '07:00')

  // Geração de Alertas
  enableAutoAlerts: boolean;
  alertThresholds: {
    criticalAnomaly: boolean;      // Alerta ao detectar crítica
    lowStockWarning: boolean;       // Alerta estoque baixo
    expiryWarning: boolean;         // Alerta validade
    highMarginDeviation: boolean;   // Alerta margin >20%
  };

  // Canais de Notificação
  notificationChannels: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
    inApp: boolean;
  };

  // Destinatários
  recipients: {
    email: string[];
    phoneNumber?: string; // WhatsApp/SMS
  };

  // Relatórios
  maxAnomaliesPerReport: number;
  includeWeeklyReport: boolean;
  weeklyReportDay: 'monday' | 'friday';

  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
  nextExecutionAt?: string;
}
```

### AutomationExecutionLog

Rastreia cada execução:

```typescript
{
  id: string;
  storeId: string;
  functionName: string; // 'predictiveAnalysis', 'alertGeneration'

  executedAt: string;
  duration: number; // ms
  status: 'success' | 'partial_success' | 'failed';

  // Resultados
  forecastsGenerated?: number;
  anomaliesDetected?: number;
  alertsCreated?: number;
  notificationsSent?: number;

  // Erros
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;

  nextScheduledExecution?: string;
}
```

### AutomatedNotification

Notificação criada por Cloud Function:

```typescript
{
  id: string;
  storeId: string;

  type: 'daily_report' | 'alert_critical' | 'alert_warning' | 'weekly_summary';
  priority: 'high' | 'medium' | 'low';

  // Conteúdo
  title: string;
  message: string;
  data: {
    anomalyCount?: number;
    criticalCount?: number;
    forecastsGenerated?: number;
    lowStockProducts?: string[];
    urgentReorders?: string[];
  };

  // Canais
  channels: ('email' | 'whatsapp' | 'sms' | 'inApp')[];
  recipient: {
    email?: string;
    phoneNumber?: string;
  };

  // Estado
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  failureReason?: string;

  createdAt: string;
}
```

---

## 🔧 Serviço de Automação

### AutomationService

**Responsabilidades**:
- Gerenciar configuração de automação por loja
- Executar análise preditiva automaticamente
- Gerar relatórios diários e semanais
- Registar logs de execução
- Validar configuração

**Métodos Principais**:

#### Configuração

```typescript
// Obter configuração
await getAutomationConfig(storeId): Promise<AutomationConfig | null>

// Atualizar configuração
await updateAutomationConfig(storeId, config): Promise<void>

// Validar configuração
validateAutomationConfig(config): boolean
```

#### Execução

```typescript
// Executar análise automática (chamada por Cloud Function)
await runAutomaticAnalysis(
  storeId: string,
  products: Product[],
  sales: Sale[]
): Promise<AutomationExecutionLog>
```

#### Relatórios

```typescript
// Gerar relatório de anomalias
await generateAnomalyReport(
  storeId: string,
  fromDate: Date,
  toDate: Date
): Promise<AnomalyReport>

// Gerar relatório semanal
await generateWeeklyReport(
  storeId: string,
  startDate: Date,
  endDate: Date,
  kpis: Record<string, any>
): Promise<WeeklyReport>
```

#### Logs

```typescript
// Obter último log de execução
await getLastExecutionLog(
  storeId: string,
  functionName: string
): Promise<AutomationExecutionLog | null>
```

---

## 📧 Serviço de Notificações

### NotificationService

**Responsabilidades**:
- Enviar notificações multi-canal
- Validar configuração de serviços
- Registar histórico de envios
- Retry automático de falhas
- Testar canais de notificação

**Métodos Principais**:

#### Envio

```typescript
// Enviar notificação através de múltiplos canais
await sendNotification(notification: AutomatedNotification): Promise<boolean>

// Testar um canal de notificação
await testNotificationConfig(
  storeId: string,
  channel: 'email' | 'whatsapp' | 'sms',
  recipient: string
): Promise<boolean>
```

#### Retry

```typescript
// Obter notificações falhadas
await getFailedNotifications(storeId: string, limit?: number): Promise<NotificationHistory[]>

// Retry automático
await retryFailedNotifications(storeId: string): Promise<number>
```

### Canais Suportados

#### Email (SendGrid)
- Endpoint: `/.netlify/functions/send-email`
- Template HTML profissional
- Rastreamento de opens/clicks
- Custo: ~$0.30 por 1000 emails

#### WhatsApp (Twilio)
- Endpoint: `/.netlify/functions/send-whatsapp`
- Mensagens formatadas com emoji
- Custo: ~$0.01 por mensagem
- Formato: `whatsapp:+244912345678`

#### SMS (Twilio)
- Endpoint: `/.netlify/functions/send-sms`
- Limite 160 caracteres
- Custo: ~$0.01 por SMS
- Formato: `+244912345678`

#### In-App
- Savedirectamente no Firestore
- Real-time via listeners
- Sem custo

---

## 🎣 Hook de Automação

### useAutomation()

```typescript
const {
  // Estado
  config,           // AutomationConfig
  isLoading,        // boolean
  error,            // string | null
  isExecuting,      // boolean

  // Relatórios
  lastExecutionLog,   // AutomationExecutionLog | null
  lastAnomalyReport,  // AnomalyReport | null
  lastWeeklyReport,   // WeeklyReport | null

  // Ações
  updateConfig,       // (updates: Partial<AutomationConfig>) => Promise<void>
  executeAnalysis,    // (products, sales) => Promise<AutomationExecutionLog>
  generateAnomalyReport, // (fromDate, toDate) => Promise<AnomalyReport>
  generateWeeklyReport,  // (startDate, endDate, kpis) => Promise<WeeklyReport>
  testNotificationChannel, // (channel, recipient) => Promise<boolean>
  clearError,         // () => void

  // Helpers
  isConfigured,       // boolean
  nextExecutionTime,  // string | undefined
} = useAutomation();
```

**Exemplo**:

```typescript
function SettingsPage() {
  const { config, updateConfig, testNotificationChannel } = useAutomation();

  const handleToggleAutoAnalysis = async () => {
    await updateConfig({
      enableAutoAnalysis: !config?.enableAutoAnalysis,
    });
  };

  const handleTestEmail = async () => {
    const success = await testNotificationChannel('email', 'user@email.com');
    if (success) {
      console.log('✓ Email enviado com sucesso');
    }
  };

  return (
    <>
      <button onClick={handleToggleAutoAnalysis}>
        {config?.enableAutoAnalysis ? 'Desativar' : 'Ativar'} Automação
      </button>
      <button onClick={handleTestEmail}>Testar Email</button>
    </>
  );
}
```

---

## 🎨 Componente de Configuração

### AutomationSettingsPanel

Painel visual para configurar automação:

```typescript
<AutomationSettingsPanel compact={false} />
```

**Features**:
- ✅ Toggle automação (ativa/inativa)
- ✅ Seletor de frequência (diária/twice-daily/semanal)
- ✅ Seletor de hora (UTC)
- ✅ Seletor de tipos de alerta
- ✅ Ativar/desativar canais de notificação
- ✅ Botão de teste de cada canal
- ✅ Input para email e telefone
- ✅ Status de próxima execução
- ✅ Botão de execução manual

---

## 🗄️ Schema Firestore

### Coleção: `/stores/{storeId}/automationConfig`

```typescript
{
  id: string;
  storeId: string;
  
  enableAutoAnalysis: boolean;
  analysisSchedule: 'daily' | 'twice-daily' | 'weekly';
  analysisTime: string; // "07:00"

  enableAutoAlerts: boolean;
  alertThresholds: {
    criticalAnomaly: boolean;
    lowStockWarning: boolean;
    expiryWarning: boolean;
    highMarginDeviation: boolean;
  };

  notificationChannels: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
    inApp: boolean;
  };

  recipients: {
    email: string[];
    phoneNumber: string;
  };

  maxAnomaliesPerReport: number;
  includeWeeklyReport: boolean;
  weeklyReportDay: 'monday' | 'friday';

  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastExecutedAt?: Timestamp;
  nextExecutionAt?: Timestamp;
}
```

### Coleção: `/stores/{storeId}/automationLogs`

```typescript
{
  id: string;
  storeId: string;
  functionName: string; // 'predictiveAnalysis', etc.

  executedAt: Timestamp;
  duration: number; // ms
  status: 'success' | 'partial_success' | 'failed';

  forecastsGenerated?: number;
  anomaliesDetected?: number;
  alertsCreated?: number;
  notificationsSent?: number;

  errorMessage?: string;
  errorDetails?: Record<string, unknown>;

  createdAt: Timestamp;
}
```

### Coleção: `/stores/{storeId}/automatedNotifications`

```typescript
{
  id: string;
  storeId: string;

  type: 'daily_report' | 'alert_critical' | 'alert_warning' | 'weekly_summary';
  priority: 'high' | 'medium' | 'low';

  title: string;
  message: string;
  data: {
    anomalyCount?: number;
    criticalCount?: number;
    forecastsGenerated?: number;
    lowStockProducts?: string[];
    urgentReorders?: string[];
  };

  channels: ('email' | 'whatsapp' | 'sms' | 'inApp')[];
  recipient: {
    email?: string;
    phoneNumber?: string;
  };

  status: 'pending' | 'sent' | 'failed';
  sentAt?: Timestamp;
  failureReason?: string;

  createdAt: Timestamp;
}
```

### Coleção: `/stores/{storeId}/notificationHistory`

```typescript
{
  id: string;
  storeId: string;
  automatedNotificationId: string;

  channel: 'email' | 'whatsapp' | 'sms' | 'inApp';
  recipient: string; // email ou phone

  status: 'sent' | 'failed' | 'bounced' | 'unsubscribed';
  sentAt?: Timestamp;
  failureReason?: string;

  retryCount: number;
  lastRetryAt?: Timestamp;

  createdAt: Timestamp;
}
```

---

## 🚀 Configuração e Deploy

### 1. Variáveis de Ambiente

```bash
# .env.local (desenvolvimento)
REACT_APP_TWILIO_ACCOUNT_SID=AC...
REACT_APP_TWILIO_AUTH_TOKEN=...
REACT_APP_TWILIO_PHONE_NUMBER=+55...
REACT_APP_TWILIO_WHATSAPP_NUMBER=+55...

REACT_APP_SENDGRID_API_KEY=SG....

# Firebase já configurado em firebase.ts
```

### 2. Cloud Functions Setup

```bash
# Deploy de Cloud Functions
firebase deploy --only functions

# Verificar deployments
firebase functions:list

# Ver logs
firebase functions:log
```

### 3. Cloud Scheduler Setup

```bash
# Criar agendamento diário às 7h UTC
gcloud scheduler jobs create pubsub daily-analysis \
  --schedule="0 7 * * *" \
  --topic=predictive-analysis \
  --time-zone="UTC"
```

### 4. Firestore Security Rules

```javascript
// Apenas dados da loja do utilizador
match /stores/{storeId}/automationConfig {
  allow read: if request.auth.uid != null && 
              isStoreManager(storeId);
  allow write: if request.auth.uid != null && 
               isStoreManager(storeId);
}

match /stores/{storeId}/automatedNotifications {
  allow read: if request.auth.uid != null && 
              isStoreManager(storeId);
  allow create: if false; // Apenas Cloud Functions
  allow update: if request.auth.uid != null && 
                isStoreManager(storeId);
}

match /stores/{storeId}/automationLogs {
  allow read: if request.auth.uid != null && 
              isStoreManager(storeId);
  allow write: if false; // Apenas Cloud Functions
}

// Helper function
function isStoreManager(storeId) {
  return get(/databases/$(database)/documents/stores/$(storeId)/managers/$(request.auth.uid)).exists();
}
```

---

## 📊 Monitoramento

### No Firebase Console

```
Cloud Scheduler → Verificar agendamentos e última execução
Cloud Functions → Ver logs de execução
Firestore → Analytics → Leitura/Escritas por Dia
Emails & Messaging → Twilio → Ver deliveries
```

### Alertas Recomendados

1. **Cloud Function falhou** - Erro em executar análise automática
2. **Notificação não entregue** - Email/SMS rejeitado
3. **Quota excedida** - Sendgrid/Twilio limit
4. **Análise atrasada** - Execução não completou a tempo

---

## 🧪 Testes

### Mock Cloud Functions (Desenvolvimento)

```typescript
// mock-functions.ts
export async function mockRunAnalysis(storeId: string) {
  // Simular execução automática
  const log: AutomationExecutionLog = {
    id: `exec_${Date.now()}`,
    storeId,
    functionName: 'predictiveAnalysis',
    executedAt: new Date().toISOString(),
    duration: Math.random() * 5000,
    status: 'success',
    forecastsGenerated: 45,
    anomaliesDetected: 3,
  };
  return log;
}
```

### Testes de Notificação

```typescript
// Testar cada canal
it('should send email notification', async () => {
  const success = await NotificationService.testNotificationConfig(
    'store-1',
    'email',
    'test@example.com'
  );
  expect(success).toBe(true);
});
```

---

## 🚨 Troubleshooting

### "Cloud Function timeout"
**Solução**: Aumentar timeout em `firebase.json`:
```json
{
  "functions": {
    "runtime": "nodejs18",
    "timeoutSeconds": 300
  }
}
```

### "Twilio/SendGrid error"
**Solução**: Verificar credenciais em Firebase Secrets:
```bash
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:access TWILIO_AUTH_TOKEN
```

### "Notificação não chegou"
**Solução**: Verificar histórico de envios:
```typescript
const failed = await NotificationService.getFailedNotifications(storeId);
console.log('Failed:', failed);
```

### "Análise não executou"
**Solução**: Verificar último log:
```typescript
const log = await AutomationService.getLastExecutionLog(
  storeId,
  'predictiveAnalysis'
);
console.log('Last execution:', log);
```

---

## 🐛 Perguntas Frequentes

**P: Como aumentar frequência de análises?**
R: Mudar `analysisSchedule` para `'twice-daily'` na configuração

**P: Posso usar múltiplos emails?**
R: Sim, `recipients.email` é um array, iterar sobre todos

**P: E se o Twilio falhar?**
R: NotificationService faz retry automático até 3 vezes

**P: Como ver relatórios gerados?**
R: Guardar em collection `/stores/{storeId}/anomalyReports`

**P: Posso desativar um alerta específico?**
R: Sim, desativar em `alertThresholds` no AutomationConfig

---

## ✅ Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] Cloud Functions deployed
- [ ] Cloud Scheduler agendamentos criados
- [ ] Firestore Security Rules atualizadas
- [ ] Twilio/SendGrid testados
- [ ] Notificações chegam com sucesso
- [ ] Logs de execução registados
- [ ] Componente UI integrado no dashboard
- [ ] Testes E2E executados
- [ ] Documentação atualizada

---

## 📈 Próximas Fases

### FASE 9: Dashboard Mobile
- [ ] Versão mobile do ExecutiveDashboard
- [ ] Push notifications para alertas críticos
- [ ] Aprovação de reabastecimento via app

### FASE 10: Relatórios Avançados
- [ ] Relatórios semanais/mensais em PDF
- [ ] Comparação vs períodos anteriores
- [ ] Análise de variâncias

### FASE 11: Machine Learning Avançado
- [ ] Prophet para séries temporais
- [ ] Seasonal decomposition
- [ ] Previsão de demanda com sazonalidade

---

**Próximo Passo**: FASE 9 - Dashboard Mobile com push notifications

---

*Documentação de FASE 8 - 29 de Agosto de 2026*  
*PreçoCerto - Sistema de Gestão Inteligente*
