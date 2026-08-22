# 🚀 Deployment Quick Start - PreçoCerto Cloud Functions

## 1️⃣ Verificações Pré-Deployment (5 minutos)

```bash
# ✅ Clonar repositório
git clone https://github.com/professorlucas789-lab/suite-marketing-ecommerce.git
cd suite-marketing-ecommerce

# ✅ Verificar branches
git checkout claude/precocerto-stage-1-xsicob

# ✅ Instalar dependências
npm install
cd precocerto && npm install
cd ../precocerto/functions && npm install

# ✅ Compilar projeto
npm run build

# ✅ Executar testes
npm run test

# ✅ Verificar saúde
npm run test -- src/services/__tests__/
```

## 2️⃣ Configurar Google Cloud (10 minutos)

### A. Criar Projeto Google Cloud

```bash
# 1. Abrir https://console.cloud.google.com
# 2. Criar novo projeto: "precocerto-prod"
# 3. Ativar APIs:
#    - Cloud Functions API
#    - Cloud Scheduler API
#    - Cloud Firestore API
#    - Cloud Logging API

gcloud projects list
gcloud config set project precocerto-prod
```

### B. Configurar Firebase

```bash
# 1. Abrir https://console.firebase.google.com
# 2. Adicionar projeto Google Cloud existente
# 3. Ativar Firestore Database (modo nativo)
# 4. Ativar Cloud Functions

firebase projects:list
firebase use precocerto-prod
```

### C. Obter Credenciais

```bash
# Fazer download da chave de serviço
# https://console.cloud.google.com → Contas de Serviço → Criar chave JSON
# Salvar em: ~/.config/gcloud/precocerto-service-account.json

gcloud auth activate-service-account --key-file=~/.config/gcloud/precocerto-service-account.json
gcloud config set project precocerto-prod
```

## 3️⃣ Deploy de Cloud Functions (5 minutos)

```bash
# ✅ Login Firebase
firebase login

# ✅ Deploy de todas as functions
cd precocerto/functions
firebase deploy --only functions --project precocerto-prod

# ✅ Verificar deployment
firebase functions:list --project precocerto-prod

# Saída esperada:
# ✓ checkAlertsScheduled
# ✓ generateDailyReports
# ✓ cleanupOldNotifications
# ✓ healthCheck
# ✓ triggerAlertsManual
```

## 4️⃣ Configurar Cloud Scheduler (5 minutos)

### Via Google Cloud Console

```
https://console.cloud.google.com → Cloud Scheduler
```

**Job 1: Alertas - 6h**
```
Nome: precocerto-alerts-6am
Schedule: 0 5 * * * (Luanda Time)
Timezone: Africa/Luanda
Target: HTTPS
URL: https://us-central1-precocerto-prod.cloudfunctions.net/checkAlertsScheduled
HTTP Method: POST
Headers: Content-Type: application/json
```

**Job 2: Alertas - 12h**
```
Nome: precocerto-alerts-12pm
Schedule: 0 11 * * *
Timezone: Africa/Luanda
[mesmos settings acima]
```

**Job 3: Alertas - 18h**
```
Nome: precocerto-alerts-6pm
Schedule: 0 17 * * *
Timezone: Africa/Luanda
[mesmos settings acima]
```

**Job 4: Relatórios - 8h (seg-sex)**
```
Nome: precocerto-daily-reports
Schedule: 0 7 * * MON-FRI
Timezone: Africa/Luanda
URL: https://us-central1-precocerto-prod.cloudfunctions.net/generateDailyReports
```

**Job 5: Limpeza - 23h**
```
Nome: precocerto-cleanup-notifications
Schedule: 0 22 * * *
Timezone: Africa/Luanda
URL: https://us-central1-precocerto-prod.cloudfunctions.net/cleanupOldNotifications
```

### Via CLI (Alternativa)

```bash
# Criar jobs
gcloud scheduler jobs create http precocerto-alerts-6am \
  --schedule="0 5 * * *" \
  --timezone="Africa/Luanda" \
  --http-method=POST \
  --uri="https://us-central1-precocerto-prod.cloudfunctions.net/checkAlertsScheduled"

# Listar jobs
gcloud scheduler jobs list

# Testar job
gcloud scheduler jobs run precocerto-alerts-6am
```

## 5️⃣ Verificar Deployment (5 minutos)

### Health Check

```bash
# Verificar saúde do sistema
curl https://us-central1-precocerto-prod.cloudfunctions.net/healthCheck

# Resposta esperada:
# {
#   "status": "healthy",
#   "totalStores": 15,
#   "lastExecution": "2026-08-22T18:00:00Z",
#   "recentLogs": [...]
# }
```

### Verificar Logs

```bash
# Via Firebase CLI
firebase functions:log --project precocerto-prod

# Via Google Cloud Console
# https://console.cloud.google.com → Cloud Functions → Logs
```

### Testar Manual (DEBUG)

```bash
# Disparar verificação de alertas manualmente
curl -X POST "https://us-central1-precocerto-prod.cloudfunctions.net/triggerAlertsManual" \
  -H "Content-Type: application/json" \
  -d '{"storeId":"store-1","token":"YOUR_SECRET_TOKEN"}'
```

## 6️⃣ Monitoramento Contínuo (Sempre)

### Alertas Críticos

Configurar no Google Cloud Monitoring:

```
1. Cloud Console → Monitoring → Alert Policies
2. Criar alertas para:
   - Cloud Functions Error Rate > 1%
   - Cloud Functions Execution Time > 30s
   - Cloud Scheduler Job Failure
```

### Dashboard de Automações

Criar dashboard no Firebase Console:

```
Dashboard > Criar novo
Adicionar widgets:
- Cloud Functions Execution Count
- Cloud Functions Error Rate
- Firestore automationLogs collection size
- Latest execution status
```

### Logs Diários

Verificar logs em:
- `automationLogs` collection no Firestore
- Cloud Logging console
- Firebase functions:log CLI

---

## 📊 Cronograma Esperado (Após Deployment)

| Hora (Luanda) | Ação | Status |
|------|------|--------|
| 06:00 | ✅ Verificar alertas | Automático |
| 08:00 | 📊 Gerar relatórios | Automático (seg-sex) |
| 12:00 | ✅ Verificar alertas | Automático |
| 18:00 | ✅ Verificar alertas | Automático |
| 23:00 | 🧹 Limpar notificações | Automático |

---

## ✅ Checklist Final

- [ ] Google Cloud Project criado
- [ ] Firebase habilitado
- [ ] Credenciais configuradas
- [ ] Cloud Functions deployadas (5 functions)
- [ ] Cloud Scheduler jobs criados (5 jobs)
- [ ] Health Check retorna "healthy"
- [ ] Logs aparecem em Cloud Logging
- [ ] Alertas de monitoramento configurados
- [ ] Dashboard criado
- [ ] Documentação atualizada

---

## 🆘 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| "Permission denied" | Verificar credenciais: `gcloud auth login` |
| "Function not found" | Verificar deployed: `firebase functions:list` |
| "Cloud Scheduler job not triggering" | Verificar timezone e horário UTC |
| "Firestore access denied" | Atualizar Firestore Security Rules |
| "Timeout após 60s" | Otimizar queries Firestore |

---

## 📚 Documentação Completa

- Deployment detalhado: `CLOUD_FUNCTIONS_SETUP.md`
- Testes da suite: `TESTING.md`
- Arquitetura do projeto: `README.md`
- Guias de troubleshooting: Verificar Cloud Logging

---

**Tempo Total de Deployment**: ~30 minutos
**Custo Mensal Estimado**: ~$3-5
**Uptime Esperado**: 99.9%
**SLA**: Retry automático com máx 1h

🎉 **Pronto para Produção!**
