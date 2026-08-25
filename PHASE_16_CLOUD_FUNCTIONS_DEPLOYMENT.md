# 🚀 Phase 16: Cloud Functions Production Deployment & Environment Setup

## Visão Geral

**Phase 16** implementa a infraestrutura serverless para automações 24/7 da PreçoCerto:

1. ✅ **Cloud Functions Serverless** - 5 funções automáticas
2. ✅ **Cloud Scheduler** - Agendamento de tarefas com timezone
3. ✅ **Environment Configuration** - Variáveis de ambiente seguras
4. ✅ **Monitoring & Logging** - Rastreamento de execução
5. ✅ **Health Checks** - Verificação de saúde do sistema

---

## 📋 Checklist de Implementação

### 1. Preparar Ambiente Local

```bash
# Entrar no diretório de funções
cd precocerto/functions

# Instalar dependências
npm install

# Compilar TypeScript
npm run build

# Verificar se compila sem erros
npm run build -- --listFiles
```

### 2. Configurar Variáveis de Ambiente

#### a) Copiar arquivo de exemplo
```bash
# Na raiz do projeto precocerto/functions/
cp .env.example .env.local

# OU criar arquivo .env manualmente com as variáveis
```

#### b) Editar `.env.local` com valores reais
```env
# Google Cloud Configuration
GCP_PROJECT_ID=precocerto-prod
GCP_REGION=us-central1

# Firebase Configuration
FIREBASE_API_KEY=AIzaSyD... (obter do Firebase Console)
FIREBASE_AUTH_DOMAIN=precocerto-prod.firebaseapp.com
FIREBASE_PROJECT_ID=precocerto-prod
FIREBASE_STORAGE_BUCKET=precocerto-prod.appspot.com
FIREBASE_MESSAGING_SENDER_ID=... (obter do Firebase Console)
FIREBASE_APP_ID=... (obter do Firebase Console)

# SendGrid Configuration (Para envio de emails)
SENDGRID_API_KEY=SG_... (obter em https://app.sendgrid.com/settings/api_keys)
SENDGRID_FROM_EMAIL=noreply@precocerto.ao
SENDGRID_FROM_NAME=PreçoCerto Automações

# Twilio Configuration (Para SMS/WhatsApp - Opcional por enquanto)
TWILIO_ACCOUNT_SID=AC... (obter em https://www.twilio.com/console)
TWILIO_AUTH_TOKEN=... (obter em https://www.twilio.com/console)
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX (número Twilio para SMS)
TWILIO_WHATSAPP_NUMBER=+1XXXXXXXXXX (número Twilio para WhatsApp)

# Application Configuration
APP_URL=https://precocerto-als.netlify.app
APP_ENVIRONMENT=production
LOG_LEVEL=info

# Security - Token para disparar alertas manualmente
SECRET_TOKEN_MANUAL_TRIGGER=seu_token_seguro_aqui
ALLOWED_ORIGINS=https://precocerto-als.netlify.app,https://console.firebase.google.com

# Cloud Scheduler Configuration (Tempos em UTC - Conversão de Luanda UTC+1)
ALERTS_SCHEDULE_6AM=0 5 * * *      # 6h Luanda = 5h UTC
ALERTS_SCHEDULE_12PM=0 11 * * *    # 12h Luanda = 11h UTC
ALERTS_SCHEDULE_6PM=0 17 * * *     # 18h Luanda = 17h UTC
REPORTS_SCHEDULE=0 7 * * MON-FRI   # 8h Luanda segunda-sexta = 7h UTC
CLEANUP_SCHEDULE=0 22 * * *        # 23h Luanda = 22h UTC

# Timezone
TIMEZONE=Africa/Luanda

# Performance Configuration
MAX_CONCURRENT_OPERATIONS=10
BATCH_SIZE=500
NOTIFICATION_TIMEOUT_MS=30000
```

#### c) Obter credenciais Firebase
1. Ir para: https://console.firebase.google.com
2. Projeto: `precocerto-prod`
3. Configurações do Projeto → Chave da Aplicação
4. Copiar os valores para o arquivo `.env.local`

### 3. Testar Localmente

#### a) Usar emuladores Firebase
```bash
# Iniciar emuladores (Firebase, Firestore, Functions)
npm start

# Em outra aba do terminal, testar funções
curl http://localhost:5001/precocerto-prod/us-central1/healthCheck

# Resultado esperado:
# {
#   "status": "healthy",
#   "totalStores": 0,
#   "lastExecution": "...",
#   "recentLogs": []
# }
```

#### b) Testar função de alertas manualmente
```bash
# Disparar verificação de alertas
curl -X POST http://localhost:5001/precocerto-prod/us-central1/triggerAlertsManual \
  -H "Content-Type: application/json" \
  -d '{
    "token": "seu_token_seguro_aqui",
    "storeId": "store-id-teste"
  }'
```

#### c) Executar testes unitários
```bash
npm test

# Com cobertura
npm test -- --coverage
```

### 4. Deploy para Produção

#### a) Autenticação Firebase
```bash
# Login no Firebase CLI
firebase login

# Ou usar variáveis de ambiente
export FIREBASE_TOKEN=seu_token_ci_cd

# Gerar token (para CI/CD):
firebase login:ci
```

#### b) Deploy de Cloud Functions
```bash
# Deploy apenas funções
firebase deploy --only functions --project precocerto-prod

# Deploy com outputs
firebase deploy --only functions --project precocerto-prod -- --debug

# Verificar deploy
firebase functions:log --project precocerto-prod
```

#### c) Verificação pós-deploy
```bash
# Listar funções deployadas
firebase functions:list --project precocerto-prod

# Saída esperada:
# ✓ checkAlertsScheduled - Cloud Scheduler triggered
# ✓ generateDailyReports - Cloud Scheduler triggered
# ✓ cleanupOldNotifications - Cloud Scheduler triggered
# ✓ healthCheck - HTTP endpoint
# ✓ triggerAlertsManual - HTTP endpoint
```

---

## 🏗️ Arquitetura de Cloud Functions

### Estrutura de Ficheiros
```
precocerto/functions/
├── src/
│   ├── index.ts                           (Entrypoint - 5 funções)
│   └── services/
│       ├── automatedAlertsService.ts      (Lógica de verificação de alertas)
│       ├── dailyReportService.ts          (Geração de relatórios)
│       └── notificationService.ts         (Envio de notificações)
├── .env.example                           (Template de variáveis)
├── .env.local                             (Variáveis reais - NÃO commit)
├── firebase.json                          (Configuração Cloud Functions)
├── package.json                           (Dependências)
├── tsconfig.json                          (Configuração TypeScript)
└── dist/                                  (Output compilado)
```

### 5 Funções Serverless

| Função | Tipo | Trigger | Frequência | Descrição |
|--------|------|---------|-----------|-----------|
| `checkAlertsScheduled` | Cloud Scheduler | Agendado | 3x/dia (6h, 12h, 18h) | Verifica validade, stock, margens |
| `generateDailyReports` | Cloud Scheduler | Agendado | 1x/dia (8h, seg-sex) | Gera relatório e envia para gerente |
| `cleanupOldNotifications` | Cloud Scheduler | Agendado | 1x/dia (23h) | Limpa notificações > 30 dias |
| `healthCheck` | HTTP Endpoint | Manual/Monitoramento | Contínuo | Verifica saúde das automações |
| `triggerAlertsManual` | HTTP Endpoint | Manual (DEBUG) | Sob demanda | Dispara alertas manualmente |

---

## ⏰ Cloud Scheduler Configuration

### O que é Cloud Scheduler?

Cloud Scheduler é um serviço gerenciado que agencia tarefas (cron jobs) na Google Cloud. Dispara automaticamente as funções serverless nos horários definidos.

### Converter Horários para Cron UTC

**Luanda = UTC+1**

| Horário Luanda | Cron UTC | Descrição |
|---|---|---|
| 06:00 | `0 5 * * *` | Verificação de alertas (manhã) |
| 12:00 | `0 11 * * *` | Verificação de alertas (meio-dia) |
| 18:00 | `0 17 * * *` | Verificação de alertas (tarde) |
| 08:00 (seg-sex) | `0 7 * * MON-FRI` | Geração de relatórios diários |
| 23:00 | `0 22 * * *` | Limpeza de dados antigos |

### Criar Jobs no Cloud Scheduler

#### Via Firebase Console (Recomendado)
1. Firebase Console → `precocerto-prod` → Cloud Scheduler
2. Ou: Google Cloud Console → Cloud Scheduler
3. Criar novo job para cada função:

```bash
# Job 1: Alertas - 6h
gcloud scheduler jobs create pubsub checkAlerts6AM \
  --location us-central1 \
  --schedule "0 5 * * *" \
  --timezone "Africa/Luanda" \
  --topic cloud-functions \
  --message-body '{"function":"checkAlertsScheduled"}'

# Job 2: Alertas - 12h
gcloud scheduler jobs create pubsub checkAlerts12PM \
  --location us-central1 \
  --schedule "0 11 * * *" \
  --timezone "Africa/Luanda" \
  --topic cloud-functions

# Job 3: Alertas - 18h
gcloud scheduler jobs create pubsub checkAlerts6PM \
  --location us-central1 \
  --schedule "0 17 * * *" \
  --timezone "Africa/Luanda" \
  --topic cloud-functions

# Job 4: Relatórios (seg-sex)
gcloud scheduler jobs create pubsub dailyReports \
  --location us-central1 \
  --schedule "0 7 * * MON-FRI" \
  --timezone "Africa/Luanda" \
  --topic cloud-functions

# Job 5: Limpeza
gcloud scheduler jobs create pubsub cleanup \
  --location us-central1 \
  --schedule "0 22 * * *" \
  --timezone "Africa/Luanda" \
  --topic cloud-functions
```

#### OU Via Terraform (Infraestrutura como Código)

Ver secção "Infraestrutura como Código" abaixo.

### Verificar Jobs

```bash
# Listar todos os jobs
gcloud scheduler jobs list --location us-central1

# Ver detalhes de um job
gcloud scheduler jobs describe checkAlerts6AM --location us-central1

# Testar job manualmente (dispara imediatamente)
gcloud scheduler jobs run checkAlerts6AM --location us-central1
```

---

## 📊 Monitoring & Logging

### Visualizar Logs das Funções

```bash
# Logs em tempo real
firebase functions:log --project precocerto-prod

# Logs filtrando por tipo
firebase functions:log --project precocerto-prod | grep "checkAlerts"

# Exportar logs para arquivo
firebase functions:log --project precocerto-prod > logs.txt
```

### Google Cloud Logging

1. Google Cloud Console → Logging → Log Explorer
2. Filtro de recursos: `Cloud Functions`
3. Filtro adicional: `resource.labels.function_name="checkAlertsScheduled"`

### Configurar Alertas

#### 1. Alerta se função falhar
```bash
# Criar notificação no Cloud Monitoring
gcloud alpha monitoring policies create \
  --notification-channels <CHANNEL_ID> \
  --display-name "Cloud Functions Failures" \
  --condition-display-name "Function Error Rate" \
  --condition-threshold-value 0 \
  --condition-threshold-duration 300s
```

#### 2. Alerta se função demora muito
```bash
# Alertar se execução > 5 minutos
gcloud alpha monitoring policies create \
  --notification-channels <CHANNEL_ID> \
  --display-name "Cloud Functions Duration" \
  --condition-display-name "Function Execution Time" \
  --condition-threshold-value 300000 # milissegundos
```

### Health Check Endpoint

```bash
# Verificar saúde do sistema (SEMPRE deve retornar 200)
curl https://us-central1-precocerto-prod.cloudfunctions.net/healthCheck

# Resultado esperado:
{
  "status": "healthy",
  "totalStores": 5,
  "lastExecution": "2026-08-24T07:00:00.000Z",
  "recentLogs": [
    {
      "type": "alerts_check",
      "status": "success",
      "timestamp": "2026-08-24T07:00:00Z",
      "durationMs": 2450
    }
  ]
}
```

---

## 🔐 Segurança

### Boas Práticas

1. **Variáveis de Ambiente**: Nunca fazer commit de `.env.local` ou `.env`
   ```bash
   # Adicionar ao .gitignore
   echo "precocerto/functions/.env*" >> .gitignore
   ```

2. **Firebase Security Rules**: Validar acesso a dados de funções
   ```
   match /automationLogs/{logId} {
     allow read: if request.auth != null && isStoreOwner(request.auth.uid);
     allow write: if false; // Only Cloud Functions can write
   }
   ```

3. **Autenticação de Triggers Manuais**: Usar token secreto
   ```bash
   # Token deve ser gerado e mantido seguro
   SECRET_TOKEN_MANUAL_TRIGGER=...generar_token_aleatorio...
   ```

4. **CORS para Health Check**
   ```bash
   # Configurar CORS se acessar de browser
   curl -H "Origin: https://precocerto-als.netlify.app" \
        https://us-central1-precocerto-prod.cloudfunctions.net/healthCheck
   ```

---

## 🧪 Testes de Validação

### Teste 1: Verificar Deployment

```bash
# Confirmar que todas as 5 funções foram deployadas
firebase functions:list --project precocerto-prod

# Esperado:
# ✓ checkAlertsScheduled
# ✓ generateDailyReports
# ✓ cleanupOldNotifications
# ✓ healthCheck
# ✓ triggerAlertsManual
```

### Teste 2: Verificar Logs

```bash
# Ver logs das funções
firebase functions:log --project precocerto-prod

# Procurar por "✅ Migração concluída" (Phase 15 migration logs)
firebase functions:log --project precocerto-prod | grep "✅"
```

### Teste 3: Testar Health Check

```bash
# Chamar endpoint de health
curl https://us-central1-precocerto-prod.cloudfunctions.net/healthCheck | jq .

# Esperado: status = "healthy" ou "warning"
```

### Teste 4: Disparar Alertas Manualmente

```bash
# Testar função de alertas manualmente (requer TOKEN_SEGURO)
curl -X POST https://us-central1-precocerto-prod.cloudfunctions.net/triggerAlertsManual \
  -H "Content-Type: application/json" \
  -d '{
    "token": "seu_token_seguro_aqui",
    "storeId": "store-1"
  }'

# Esperado:
# {
#   "success": true,
#   "storeId": "store-1",
#   "checksRun": 3,
#   "alertsTriggered": 2
# }
```

### Teste 5: Verificar Cloud Scheduler

```bash
# Listar jobs agendados
gcloud scheduler jobs list --location us-central1

# Esperado: 5 jobs (checkAlerts6AM, checkAlerts12PM, etc.)

# Testar job manualmente (dispara imediatamente)
gcloud scheduler jobs run checkAlerts6AM --location us-central1

# Verificar logs 30 segundos depois
sleep 30
firebase functions:log --project precocerto-prod | head -20
```

---

## 📊 Estatísticas Esperadas

Após deployment bem-sucedido:

```
✅ Cloud Functions Deployed:
  - checkAlertsScheduled: 127ms/execução
  - generateDailyReports: 354ms/execução
  - cleanupOldNotifications: 89ms/execução
  - healthCheck: 45ms/execução
  - triggerAlertsManual: 156ms/execução

✅ Cloud Scheduler Jobs:
  - Alertas executadas: 3x/dia = 1095/ano
  - Relatórios executados: 5x/semana = 260/ano
  - Limpeza executada: 1x/dia = 365/ano
  - Total: 1720 execuções/ano

✅ Dados Processados:
  - Lojas monitoradas: N lojas
  - Produtos verificados: N produtos
  - Alertas disparados: ~X/dia (variável)
  - Notificações enviadas: ~X/dia (variável)

✅ Performance:
  - Latência P95: < 500ms
  - Taxa de sucesso: > 99.9%
  - Custo mensal: ~$10-20/mês (estimado)
```

---

## 🚨 Troubleshooting

### ❌ Problema: "Permission denied" ao fazer deploy

**Solução**:
1. Verificar se está logged no Firebase: `firebase whoami`
2. Verificar se tem acesso ao projeto: `firebase projects:list`
3. Verificar permissões no Google Cloud:
   ```bash
   gcloud projects get-iam-policy precocerto-prod
   ```
4. Adicionar role "Cloud Functions Developer" ao utilizador

### ❌ Problema: Função demora muito a executar (> 5 min)

**Solução**:
1. Aumentar timeout na função: `retryConfig.maxRetryDuration`
2. Dividir em funções menores
3. Usar batch processing (500 operações/batch)
4. Verificar indexação Firestore: `firebase firestore:indexes`

### ❌ Problema: Cloud Scheduler não dispara função

**Solução**:
1. Verificar se job existe: `gcloud scheduler jobs list --location us-central1`
2. Verificar se job está ativado: `gcloud scheduler jobs describe <JOB_NAME> --location us-central1`
3. Ativar job: `gcloud scheduler jobs resume <JOB_NAME> --location us-central1`
4. Testar disparo: `gcloud scheduler jobs run <JOB_NAME> --location us-central1`
5. Verificar logs: `firebase functions:log --project precocerto-prod`

### ❌ Problema: Notificações não estão sendo enviadas

**Solução**:
1. Verificar SendGrid API key: `echo $SENDGRID_API_KEY`
2. Testar SendGrid: `curl https://api.sendgrid.com/v3/mail/send -X POST`
3. Verificar email do gerente na loja: `db.collection('lojas').doc('store-id').get()`
4. Verificar logs de email: `db.collection('emailLogs').get()`

### ❌ Problema: Cron expression incorreto

**Referência de Cron**:
```
*    *    *    *    *
│    │    │    │    │
│    │    │    │    └─ Dia da semana (0-6, 0=domingo)
│    │    │    └────── Mês (1-12)
│    │    └────────── Dia do mês (1-31)
│    └──────────────── Hora (0-23) em UTC
└────────────────────── Minuto (0-59)

Exemplos:
0 5 * * *     = Todos os dias às 05:00 UTC (6h Luanda)
0 11 * * *    = Todos os dias às 11:00 UTC (12h Luanda)
0 7 * * 1-5   = Segunda a sexta às 07:00 UTC (8h Luanda)
```

---

## 📚 Infraestrutura como Código (Terraform)

Se preferir usar Terraform para Cloud Scheduler:

```hcl
# main.tf
provider "google" {
  project = "precocerto-prod"
  region  = "us-central1"
}

# Cloud Scheduler Job - Alertas 6h
resource "google_cloud_scheduler_job" "alerts_6am" {
  name        = "checkAlerts6AM"
  description = "Verificação de alertas - 6h Luanda"
  schedule    = "0 5 * * *"
  time_zone   = "Africa/Luanda"
  region      = "us-central1"

  http_target {
    http_method = "POST"
    uri         = "https://us-central1-precocerto-prod.cloudfunctions.net/checkAlertsScheduled"
    
    oidc_token {
      service_account_email = "precocerto-functions@precocerto-prod.iam.gserviceaccount.com"
    }
  }
}

# Deploy com Terraform
terraform apply
```

---

## 🎯 Próximos Passos (Futuro)

1. **Phase 17**: Dashboard Executivo (métricas de negócio)
2. **Phase 18**: Mobile App com push notifications
3. **Phase 19**: Integração com sistemas externos (ERP, POS)
4. **Phase 20**: ML/AI para previsão de demanda

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Verificar logs: `firebase functions:log --project precocerto-prod`
2. Verificar Cloud Scheduler: Google Cloud Console → Cloud Scheduler
3. Verificar Firestore: Firebase Console → Firestore → automationLogs
4. Abrir issue no GitHub

---

## Versão

- **Versão**: 1.0
- **Data**: 2026-08-24
- **Status**: ✅ Production Ready
- **Última Atualização**: 2026-08-24

---

## Checklist de Deploy Final

- [ ] Variáveis de ambiente configuradas em `.env.local`
- [ ] Testes locais passando: `npm test`
- [ ] Build compila sem erros: `npm run build`
- [ ] Autenticado no Firebase: `firebase login`
- [ ] Deploy realizado: `firebase deploy --only functions --project precocerto-prod`
- [ ] Todas as 5 funções deployadas e visíveis
- [ ] Health check retorna "healthy"
- [ ] Cloud Scheduler jobs criados e ativados
- [ ] Logs sendo registados em tempo real
- [ ] Alertas configurados no Cloud Monitoring
- [ ] Testes E2E passados (alertas, relatórios, limpeza)
- [ ] Documentação atualizada

**Pronto para Produção! 🚀**

