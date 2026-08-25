# ⚡ Cloud Functions - Guia Rápido de Inicialização

## 5 Minutos para Preparação

### 1️⃣ Instalar Dependências (2 min)

```bash
cd precocerto/functions
npm install
npm run build
```

### 2️⃣ Configurar Variáveis de Ambiente (2 min)

```bash
# Copiar template
cp .env.example .env.local

# Editar com valores reais (obter do Firebase Console)
nano .env.local
# OU
code .env.local  # VS Code
```

**Variáveis obrigatórias**:
- `GCP_PROJECT_ID=precocerto-prod`
- `FIREBASE_API_KEY=...` (Firebase Console → Settings)
- `FIREBASE_PROJECT_ID=precocerto-prod`

### 3️⃣ Testar Localmente (1 min)

```bash
# Terminal 1: Iniciar emuladores
npm start

# Terminal 2: Testar função
curl http://localhost:5001/precocerto-prod/us-central1/healthCheck

# Esperado: {"status": "healthy", ...}
```

### 4️⃣ Deploy para Produção (1 min)

```bash
# Login
firebase login

# Deploy
firebase deploy --only functions --project precocerto-prod

# Verificar
firebase functions:list --project precocerto-prod
```

✅ **Pronto!** As 5 funções estão ativas em produção.

---

## Cloud Scheduler - Ativar Agendamentos

Após deploy, criar jobs no Google Cloud Console:

### Via CLI (Mais Rápido)

```bash
# 1. Alertas - 6h (5h UTC)
gcloud scheduler jobs create pubsub checkAlerts6AM \
  --location us-central1 \
  --schedule "0 5 * * *" \
  --timezone "Africa/Luanda" \
  --topic cloud-functions 2>/dev/null || echo "Job já existe"

# 2. Alertas - 12h (11h UTC)
gcloud scheduler jobs create pubsub checkAlerts12PM \
  --location us-central1 \
  --schedule "0 11 * * *" \
  --timezone "Africa/Luanda" \
  --topic cloud-functions 2>/dev/null || echo "Job já existe"

# 3. Alertas - 18h (17h UTC)
gcloud scheduler jobs create pubsub checkAlerts6PM \
  --location us-central1 \
  --schedule "0 17 * * *" \
  --timezone "Africa/Luanda" \
  --topic cloud-functions 2>/dev/null || echo "Job já existe"

# 4. Relatórios - 8h seg-sex (7h UTC)
gcloud scheduler jobs create pubsub generateDailyReports \
  --location us-central1 \
  --schedule "0 7 * * MON-FRI" \
  --timezone "Africa/Luanda" \
  --topic cloud-functions 2>/dev/null || echo "Job já existe"

# 5. Limpeza - 23h (22h UTC)
gcloud scheduler jobs create pubsub cleanupOldNotifications \
  --location us-central1 \
  --schedule "0 22 * * *" \
  --timezone "Africa/Luanda" \
  --topic cloud-functions 2>/dev/null || echo "Job já existe"
```

### Verificar Jobs

```bash
# Listar todos
gcloud scheduler jobs list --location us-central1

# Testar job (dispara imediatamente)
gcloud scheduler jobs run checkAlerts6AM --location us-central1

# Ver logs 30 segundos depois
sleep 30
firebase functions:log --project precocerto-prod | head -10
```

---

## 🔍 Monitoramento

### Ver Logs

```bash
# Logs em tempo real
firebase functions:log --project precocerto-prod

# Filtrar por função
firebase functions:log --project precocerto-prod | grep "checkAlerts"

# Últimos 50 logs
firebase functions:log --project precocerto-prod | head -50
```

### Health Check

```bash
# Verificar saúde do sistema
curl https://us-central1-precocerto-prod.cloudfunctions.net/healthCheck | jq .

# Esperado: 
# {
#   "status": "healthy",
#   "totalStores": N,
#   "lastExecution": "...",
#   "recentLogs": [...]
# }
```

---

## 🐛 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| `Permission denied` ao deploy | `gcloud auth login` |
| Função demora muito | Aumentar `maxRetryDuration` em `retryConfig` |
| Cloud Scheduler não funciona | `gcloud scheduler jobs resume <JOB_NAME> --location us-central1` |
| Notificações não enviam | Verificar `SENDGRID_API_KEY` em variáveis de ambiente |
| Logs vazios | Testar manualmente: `gcloud scheduler jobs run checkAlerts6AM --location us-central1` |

---

## 📊 Estrutura de Ficheiros Criados

```
precocerto/functions/
├── src/
│   ├── index.ts                           ✅ Entrypoint (5 funções)
│   └── services/
│       ├── automatedAlertsService.ts      ✅ Alertas
│       ├── dailyReportService.ts          ✅ Relatórios
│       └── notificationService.ts         ✅ Notificações
├── .env.example                           ✅ Template
├── .env.local                             ✅ Valores reais (não commit)
├── .gitignore                             ✅ Git ignore
├── firebase.json                          ✅ Config
├── package.json                           ✅ Dependências
├── tsconfig.json                          ✅ TypeScript
└── dist/                                  ✅ Build output

Documentação:
├── PHASE_16_CLOUD_FUNCTIONS_DEPLOYMENT.md ✅ Guia completo
└── CLOUD_FUNCTIONS_QUICKSTART.md          ✅ Este ficheiro
```

---

## ✅ Checklist

- [ ] `cd precocerto/functions && npm install`
- [ ] `cp .env.example .env.local` e editar valores
- [ ] `npm run build` - Sem erros?
- [ ] `npm start` - Emuladores funcionam?
- [ ] `firebase login`
- [ ] `firebase deploy --only functions --project precocerto-prod`
- [ ] `firebase functions:list --project precocerto-prod` - 5 funções?
- [ ] Criar 5 Cloud Scheduler jobs
- [ ] Testar: `curl ...healthCheck`
- [ ] Ver logs: `firebase functions:log`

🎉 **Phase 16 Completa!**

