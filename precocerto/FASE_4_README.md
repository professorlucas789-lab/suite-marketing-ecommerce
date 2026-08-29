# FASE 4: Integrações e Automação

**Status**: ✅ Implementação Concluída  
**Data**: 29 de Agosto de 2026  
**Branch**: `claude/precocerto-stage-1-xsicob`

---

## 📋 Resumo Executivo

FASE 4 implementa o sistema automático de notificações e processamento em background:

- ✅ **Orquestrador de Notificações** - Decisão automática de canal (Email, WhatsApp, SMS, In-App)
- ✅ **Verificação Automática de Expirados** - Diariamente às 07:00 (Cron Job)
- ✅ **Verificação Automática de Stock Baixo** - Diariamente às 12:00 (Cron Job)
- ✅ **Relatórios Diários de Vendas** - Diariamente às 18:00 (Cron Job)
- ✅ **Retry Automático** - Com backoff exponencial para falhas críticas
- ✅ **Logging e Auditoria** - Cada notificação é registada em Firestore

A solução é **serverless**, **escalável** e **confiável**, usando Firebase Cloud Functions + Cloud Scheduler.

---

## 🏗️ Arquitetura

### Estrutura de Ficheiros

```
functions/
├── src/
│   ├── index.ts                        # Ponto de entrada (exports)
│   ├── types.ts                        # Tipos compartilhados
│   ├── notificationOrchestrator.ts    # Orquestrador de notificações
│   ├── checkExpiringProducts.ts       # Verificar produtos vencidos
│   ├── checkLowStock.ts               # Verificar stock baixo
│   └── generateDailySalesReport.ts    # Gerar relatórios
├── package.json                        # Dependências Firebase
├── tsconfig.json                       # Configuração TypeScript
└── .env.local (NÃO COMMIT)            # Variáveis sensíveis
```

### Fluxo de Dados

```
Cloud Scheduler (Cron)
    ↓
Cloud Function HTTP Trigger
    ↓
Verificar Firestore (getAllStores, getAllProducts)
    ↓
Processar Dados
    ↓
Orquestrador de Notificações
    ↓
Múltiplos Canais (Email → SendGrid, WhatsApp → Twilio, etc.)
    ↓
Logging em Firestore (/stores/{storeId}/notificationLogs)
    ↓
Retry Automático se Falhar (para alertas CRÍTICOS)
```

---

## 🔄 Cloud Functions

### 1. `checkExpiringProducts` - Verificar Produtos Expirando

**Schedule**: Diariamente às 07:00 UTC  
**Responsabilidade**: Verificar TODOS os produtos de TODAS as lojas

**Fluxo**:
1. Iterar todas as lojas
2. Query produtos com `farmaciaDataValidade` < 30 dias
3. Categorizar por severidade:
   - **CRITICAL**: 0-2 dias
   - **WARNING**: 3-7 dias
   - **INFO**: 8-30 dias
4. Enviar notificações via orquestrador
5. Salvar em `/stores/{storeId}/expiryAlerts`

**Exemplo de Alerta**:
```
🚨 CRÍTICO: Ibuprofen 200mg vence em 1 dia

Produto: Ibuprofen 200mg
Data de Vencimento: 30-08-2026
Dias Até Vencimento: 1 dia (CRÍTICO)
Quantidade Disponível: 25 unidades

Recomendação: Ação imediata necessária
```

---

### 2. `checkLowStock` - Verificar Stock Baixo

**Schedule**: Diariamente às 12:00 UTC  
**Responsabilidade**: Verificar produtos com stock < mínimo configurado

**Fluxo**:
1. Iterar todas as lojas
2. Query produtos com `quantidadeDisponível` < `quantidadeMinima`
3. Categorizar por severidade:
   - **CRITICAL**: Stock < 50% do mínimo
   - **WARNING**: Stock < 100% do mínimo
4. Calcular dias até esgotar (usando `averageDailyUsage`)
5. Enviar notificações
6. Salvar em `/stores/{storeId}/stockAlerts`

**Exemplo de Alerta**:
```
⚠️ Stock baixo: Paracetamol 500mg

Stock Atual: 8 unidades (CRÍTICO)
Stock Mínimo: 20 unidades
Dias até Esgotar: ~3 dias

Reabastecimento Recomendado: 40 unidades
```

---

### 3. `generateDailySalesReport` - Relatório Diário de Vendas

**Schedule**: Diariamente às 18:00 UTC  
**Responsabilidade**: Resumir vendas do dia anterior

**Fluxo**:
1. Iterar todas as lojas
2. Query vendas de ontem (00:00 até 23:59)
3. Agregar dados:
   - Total de vendas
   - Total de unidades
   - Total de receita
   - Lucro (receita - custo)
   - Margem
   - Top produto
   - Métodos de pagamento
4. Gerar HTML profissional
5. Enviar via email (por padrão)
6. Salvar em `/stores/{storeId}/dailyReports`

**Exemplo de Relatório**:
```
📊 RELATÓRIO DE VENDAS - 28/08/2026
Loja: Farmácia ABC

Total de Vendas: 145 transações
Unidades Vendidas: 523 unidades
Receita Total: Kz 52.450
Lucro: Kz 15.735
Margem: 30%

🏆 Produto Mais Vendido: Paracetamol 500mg (89 unidades)

Métodos de Pagamento:
- Dinheiro: 89 transações
- Cartão: 45 transações
- Transferência: 11 transações
```

---

## 🎯 Orquestrador de Notificações

**Ficheiro**: `notificationOrchestrator.ts`

### Responsabilidades:
1. ✅ Decidir qual canal usar
2. ✅ Enviar em paralelo (Promise.allSettled)
3. ✅ Retry automático para críticos
4. ✅ Logging completo
5. ✅ Respeitar preferências da loja

### Canais Suportados:

| Canal | Serviço | Status | Timeout |
|-------|---------|--------|---------|
| **email** | SendGrid | ✅ Pronto | 30s |
| **whatsapp** | Twilio | ✅ Pronto | 15s |
| **sms** | Twilio | ✅ Pronto | 15s |
| **in-app** | Firestore | ✅ Pronto | 5s |

### Estratégia de Retry

Para alertas **CRÍTICOS**, retry automático com backoff exponencial:
```
Tentativa 1: Imediato
Tentativa 2: 10 segundos depois (2^1 * 5s)
Tentativa 3: 20 segundos depois (2^2 * 5s)
Tentativa 4: 40 segundos depois (2^3 * 5s)
```

### Fluxo de Envio

```
sendNotification(payload)
    ↓
Validar payload
    ↓
Filtrar canais habilitados
    ↓
Enviar em Paralelo:
    ├→ sendEmailNotification()
    ├→ sendWhatsAppNotification()
    ├→ sendSMSNotification()
    └→ sendInAppNotification()
    ↓
Analisar resultados
    ↓
Salvar log em Firestore
    ↓
Se CRÍTICO e falhou: retryNotification()
```

---

## 🗄️ Schema Firestore

### Coleção: `/stores/{storeId}/expiryAlerts`
```typescript
{
  id: "alert-123",
  productId: "prod-789",
  productName: "Ibuprofen 200mg",
  severity: "CRITICAL",
  daysUntilExpiry: 1,
  currentQuantity: 25,
  expiryDate: "2026-08-30",
  createdAt: "2026-08-29T07:30:00Z",
  acknowledged: false,
  acknowledgedAt?: "2026-08-29T09:00:00Z"
}
```

### Coleção: `/stores/{storeId}/stockAlerts`
```typescript
{
  id: "alert-456",
  productId: "prod-456",
  productName: "Paracetamol 500mg",
  severity: "CRITICAL",
  currentQuantity: 8,
  minimumQuantity: 20,
  daysUntilStockout: 3,
  createdAt: "2026-08-29T12:30:00Z",
  acknowledged: false
}
```

### Coleção: `/stores/{storeId}/dailyReports`
```typescript
{
  id: "2026-08-28", // YYYY-MM-DD
  date: "2026-08-28",
  totalSales: 145,
  totalUnits: 523,
  totalRevenue: 52450,
  totalCost: 36715,
  totalProfit: 15735,
  profitMargin: 30,
  avgTicketValue: 362,
  topProduct: {
    name: "Paracetamol 500mg",
    units: 89,
    revenue: 8450
  },
  paymentMethods: {
    cash: 89,
    card: 45,
    transfer: 11
  },
  createdAt: "2026-08-29T18:30:00Z"
}
```

### Coleção: `/stores/{storeId}/notificationLogs`
```typescript
{
  id: "1693310400000-abc123def",
  storeId: "store-123",
  type: "expiry_alert",
  channels: ["in-app", "email", "whatsapp"],
  status: "sent",
  sentAt: "2026-08-29T07:30:15Z",
  retryCount: 0,
  createdAt: "2026-08-29T07:30:00Z",
  error?: null
}
```

---

## 📋 Variáveis de Ambiente

**Ficheiro**: `.env.local` (NÃO fazer commit)

```bash
# Firebase Admin SDK
FIREBASE_ADMIN_SDK='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'

# SendGrid
SENDGRID_API_KEY=sg_...
SENDGRID_FROM_EMAIL=alerts@precocerto.com
SENDGRID_FROM_NAME="PreçoCerto"

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=+244923000000
TWILIO_PHONE_NUMBER=+244923000001

# Configuração
NODE_ENV=production
LOG_LEVEL=info
```

---

## 🚀 Deployment

### Pré-requisitos

1. ✅ Firebase Project criado
2. ✅ Firebase CLI instalado: `npm install -g firebase-tools`
3. ✅ Autenticado: `firebase login`
4. ✅ Variáveis de ambiente configuradas

### Passos de Deployment

#### 1. Preparar Firebase Project
```bash
cd functions

# Copiar .env.local (variáveis sensíveis)
# O deploy carrega estas como secrets do Firebase

firebase functions:config:set sendgrid.api_key="sg_..."
firebase functions:config:set twilio.account_sid="AC..."
firebase functions:config:set twilio.auth_token="..."
```

#### 2. Deploy das Cloud Functions
```bash
# Deploy apenas de functions
firebase deploy --only functions

# Deploy com relatório detalhado
firebase deploy --only functions --debug
```

#### 3. Configurar Cloud Scheduler (Cron Jobs)
No console Firebase (https://console.firebase.google.com/):

**Job 1: Verificar Expirados**
```
Name: check-expiring-products
Schedule: 0 7 * * *  (diariamente às 07:00 UTC)
Timezone: UTC
HTTP Target:
  - URL: https://region-projectid.cloudfunctions.net/checkExpiringProducts
  - Method: POST
  - Auth: Add OIDC token
  - Service account email: (Cloud Functions service account)
```

**Job 2: Verificar Stock Baixo**
```
Name: check-low-stock
Schedule: 0 12 * * *  (diariamente às 12:00 UTC)
```

**Job 3: Gerar Relatórios**
```
Name: generate-daily-reports
Schedule: 0 18 * * *  (diariamente às 18:00 UTC)
```

Ou usar Firebase CLI:
```bash
# (Não suportado diretamente, usar console)
```

---

## 🧪 Testes

**Executar localmente**:
```bash
firebase emulators:start --only functions
```

**Testar manualmente** (via curl):
```bash
# Testar checkExpiringProducts
curl -X POST http://localhost:5001/projectid/us-central1/checkExpiringProducts

# Testar checkLowStock
curl -X POST http://localhost:5001/projectid/us-central1/checkLowStock

# Testar generateDailySalesReport
curl -X POST http://localhost:5001/projectid/us-central1/generateDailySalesReport
```

**Ver logs**:
```bash
# Logs em tempo real
firebase functions:log --limit 50

# Logs de função específica
firebase functions:log --limit 50 checkExpiringProducts
```

---

## 📊 Monitoramento

### Cloud Functions Dashboard
```
Firebase Console → Functions → Dashboard
```

Métricas disponíveis:
- ✅ Invocações (número de execuções)
- ✅ Taxa de erro
- ✅ Tempo de execução
- ✅ Memória usada
- ✅ CPU

### Alertas Recomendados

1. **Taxa de erro > 5%** → Notificar admin
2. **Tempo de execução > 30s** → Investigar gargalo
3. **Invocações falhadas** → Retry automático
4. **Quotas excedidas** → Escalar para plano superior

---

## 🔐 Segurança

### Security Rules para Firestore

```javascript
// Apenas funções podem escrever alertas
match /stores/{storeId}/expiryAlerts {
  allow read: if request.auth.uid != null && 
              get(/databases/$(database)/documents/users/$(request.auth.uid)).data.storeId == storeId;
  allow write: if request.auth.token.firebase.sign_in_provider == 'cloud-functions';
}
```

### Sensibilidades
- ✅ API keys em variáveis de ambiente (nunca em código)
- ✅ Cloud Functions com autenticação OIDC
- ✅ Logs sensíveis nunca em production
- ✅ Emails/telefones criptografados em transit (HTTPS)

---

## ⚡ Performance

### Otimizações Implementadas

1. **Paralelismo**: Enviar notificações em múltiplos canais simultaneamente
2. **Batching**: Múltiplas lojas processadas em paralelo
3. **Índices Firestore**: Query otimizadas para performance
4. **Lazy Loading**: Dados carregados conforme necessário
5. **Caching**: Preferências de notificação em cache

### Limites Firebase (Free Tier)

| Limite | Free | Spark | Blaze |
|--------|------|-------|-------|
| Invocações/mês | 2M | 2M | Pago |
| Memória | 256MB | 512MB | Até 8GB |
| Timeout | 60s | 60s | 540s |
| Concorrência | 1000 | 1000 | Ilimitado |

---

## 🐛 Troubleshooting

### "Function timeout" (Execução > 60s)
```
Solução: Otimizar queries Firestore, usar índices
Checklist:
  - Adicionar índices compostos
  - Limitar query a uma loja de cada vez
  - Usar batching
```

### "Authentication failed"
```
Solução: Verificar Cloud Functions service account
firebase functions:config:get
firebase functions:secrets:list
```

### "Notifications not sending"
```
Solução: Verificar logs
firebase functions:log checkExpiringProducts

Checklist:
  - SendGrid API key válida?
  - Twilio credentials corretos?
  - Firestore rules permitem escrita?
```

---

## 📈 Próximas Melhorias (Futuro)

- [ ] Dashboard em tempo real com status de notificações
- [ ] Webhook para eventos externos (integração com sistemas terceiros)
- [ ] ML para otimizar horário de envio de notificações
- [ ] Reorder automático quando stock baixo
- [ ] SMS em português com caracteres especiais
- [ ] Integração com Slack para alertas internos
- [ ] Relatórios comparativos (dia anterior, mesma semana)
- [ ] Budget alerts (acompanhar gastos)

---

## ✅ Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] Firebase Admin SDK inicializado
- [ ] SendGrid/Twilio credentials validados
- [ ] Cloud Functions compilam sem erros
- [ ] Testes locais passam
- [ ] Firestore Security Rules atualizadas
- [ ] Cloud Scheduler jobs criados
- [ ] Alertas monitoramento configurados
- [ ] Logs sendo registados em Firestore
- [ ] Notificações chegando com sucesso

---

**Próximo Passo**: FASE 5-6 - Integrações Avançadas e Machine Learning (Análise Preditiva)

---

*Documentação de FASE 4 - 29 de Agosto de 2026*  
*PreçoCerto - Sistema de Gestão Inteligente*
