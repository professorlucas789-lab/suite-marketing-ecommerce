# Cloud Functions Setup - PreçoCerto Automation Scheduling

## Visão Geral

Este guia descreve como configurar Google Cloud Functions e Cloud Scheduler para automatizar completamente o sistema PreçoCerto.

### 🎯 Objetivos

- ✅ Verificações de alertas automáticas (3x por dia: 6h, 12h, 18h)
- ✅ Geração de relatórios diários (8h, segunda-sexta)
- ✅ Limpeza de notificações antigas (23h diariamente)
- ✅ Monitoramento e logging de execuções
- ✅ Recuperação automática de falhas com retry

---

## 📋 Pré-requisitos

1. **Google Cloud Project** ativo com Firebase habilitado
2. **Firebase CLI** instalado: `npm install -g firebase-tools`
3. **Node.js** 18+ instalado
4. **Credenciais** de admin do Google Cloud (JSON key)
5. **Firestore** configurado e operacional
6. **GitHub** repositório com acesso

---

## 🚀 Instalação e Deployment

### Passo 1: Preparar o Ambiente

```bash
# Navegar para a pasta de functions
cd precocerto/functions

# Instalar dependências
npm install

# Configurar Firebase CLI
firebase login
firebase init functions
```

### Passo 2: Deploy das Cloud Functions

```bash
# Deploy de todas as functions
firebase deploy --only functions

# Ou deploy de function específica
firebase deploy --only functions:checkAlertsScheduled
firebase deploy --only functions:generateDailyReports
firebase deploy --only functions:cleanupOldNotifications
firebase deploy --only functions:healthCheck
```

### Passo 3: Configurar Cloud Scheduler

Após o deploy, configurar triggers via Google Cloud Console:

#### 3.1 - Verificação de Alertas (3x diária)

```
Trigger Name: precocerto-check-alerts-6am
Schedule: 0 5 * * * (6h Luanda = 5h UTC)
Timezone: Africa/Luanda
HTTP Method: POST
URL: https://[REGION]-[PROJECT].cloudfunctions.net/checkAlertsScheduled
```

Repetir para:
- `0 11 * * *` (12h Luanda)
- `0 17 * * *` (18h Luanda)

#### 3.2 - Relatórios Diários (Segunda-Sexta às 8h)

```
Trigger Name: precocerto-daily-reports-8am
Schedule: 0 7 * * MON-FRI (8h Luanda = 7h UTC)
Timezone: Africa/Luanda
HTTP Method: POST
URL: https://[REGION]-[PROJECT].cloudfunctions.net/generateDailyReports
```

#### 3.3 - Limpeza de Notificações (23h diária)

```
Trigger Name: precocerto-cleanup-notifications-11pm
Schedule: 0 22 * * * (23h Luanda = 22h UTC)
Timezone: Africa/Luanda
HTTP Method: POST
URL: https://[REGION]-[PROJECT].cloudfunctions.net/cleanupOldNotifications
```

---

## 📊 Agendamento Detalhado

### Cronograma Diário (Hora Luanda - UTC+1)

| Hora | Ação | Função |
|------|------|--------|
| **06:00** | ✅ Verificação de Alertas | `checkAlertsScheduled` |
| **08:00** | 📊 Geração de Relatórios | `generateDailyReports` (seg-sex) |
| **12:00** | ✅ Verificação de Alertas | `checkAlertsScheduled` |
| **18:00** | ✅ Verificação de Alertas | `checkAlertsScheduled` |
| **23:00** | 🧹 Limpeza de Notificações | `cleanupOldNotifications` |

### Frequência e SLA

- **Alertas**: 3x diárias, máx 1h retry
- **Relatórios**: 5x semana (seg-sex), máx 1h retry
- **Limpeza**: 1x diária, soft cleanup
- **Timeout**: 60 segundos por execução
- **Memory**: 512MB (padrão)

---

## 🔍 Monitoramento e Logging

### Via Firebase Console

1. Abrir [Firebase Console](https://console.firebase.google.com)
2. Projeto → Functions → Logs
3. Filtrar por:
   - `checkAlertsScheduled`
   - `generateDailyReports`
   - `cleanupOldNotifications`

### Coleção de Logs no Firestore

Cada execução registra em `automationLogs`:

```json
{
  "type": "alerts_check",
  "timestamp": "2026-08-22T06:15:00Z",
  "processedStores": 15,
  "totalAlertsTriggered": 42,
  "durationMs": 2350,
  "status": "success"
}
```

### Health Check API

Verificar saúde do sistema:

```bash
curl https://[REGION]-[PROJECT].cloudfunctions.net/healthCheck

# Resposta esperada:
{
  "status": "healthy",
  "totalStores": 15,
  "lastExecution": "2026-08-22T18:00:00Z",
  "recentLogs": [...]
}
```

---

## 🔐 Segurança

### Autenticação Firebase

As Cloud Functions usam Firebase Admin SDK com credenciais de serviço (automático).

### Proteção de Endpoints HTTP

Para endpoints manuais (`triggerAlertsManual`), usar token:

```bash
curl -X POST \
  "https://[REGION]-[PROJECT].cloudfunctions.net/triggerAlertsManual" \
  -H "Content-Type: application/json" \
  -d '{"storeId": "store-1", "token": "YOUR_SECRET_TOKEN"}'
```

**Definir `TRIGGER_TOKEN` em Environment Variables da Cloud Function**

### Firestore Security Rules

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Logs de automação - apenas leitura para admins
    match /automationLogs/{document=**} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow write: if request.auth.uid == 'cloud-scheduler';
    }
  }
}
```

---

## 📈 Performance e Custos

### Estimativa de Custos (Google Cloud)

| Item | Preço | Uso Mensal | Custo |
|------|-------|-----------|-------|
| Cloud Functions invocations | $0.40 / 1M | 4,380 | ~$1.75 |
| Compute time (512MB) | $0.0000041 / 100ms | 11,500 exec * 2.5s | ~$1.15 |
| Cloud Scheduler jobs | $0.10 / job | 3 jobs | $0.30 |
| Firestore read operations | $0.06 / 1M | 439,000 | $0.03 |
| **Total Mensal** | | | **~$3.23** |

*Preços referência (2026); consultar Google Cloud pricing para valores atuais*

### Otimizações

- ✅ Reutilizar conexões Firestore
- ✅ Usar batch queries
- ✅ Cache em memória quando possível
- ✅ Índices Firestore para queries frequentes

---

## 🧪 Testes Locais

### Teste de Function Local

```bash
# Iniciar emulador
firebase emulators:start

# Em outro terminal, testar:
curl -X POST http://localhost:5001/[PROJECT]/us-central1/checkAlertsScheduled
```

### Teste com Dados Reais

```bash
# Deploy para staging
firebase deploy --only functions:checkAlertsScheduled --project staging-project

# Verificar logs
firebase functions:log --project staging-project
```

---

## 🚨 Troubleshooting

### Problema: "Function deployment failed"

```bash
# Solução:
firebase deploy --only functions --force
# Verificar credenciais: firebase login
```

### Problema: "Cloud Scheduler job not triggering"

1. Verificar timezone: `gcloud scheduler jobs describe precocerto-check-alerts-6am`
2. Verificar URL é acessível
3. Verificar Firebase Authentication está ativa

### Problema: "Firestore permission denied"

```bash
# Atualizar Firestore rules
firebase deploy --only firestore:rules
```

### Problema: "Timeout after 60 seconds"

- Otimizar queries Firestore (adicionar índices)
- Reduzir número de lojas processadas por execution
- Aumentar memory alocada (até 4GB)

---

## 📚 Estrutura do Projeto

```
precocerto/
├── functions/
│   ├── src/
│   │   ├── index.ts              # Cloud Functions
│   │   ├── services/
│   │   │   ├── automatedAlertsService.ts
│   │   │   ├── dailyReportService.ts
│   │   │   └── notificationService.ts
│   │   └── types/
│   │       └── sales.ts, etc.
│   ├── package.json
│   └── tsconfig.json
├── CLOUD_FUNCTIONS_SETUP.md      # Este arquivo
├── firebase.json                  # Config Firebase
└── firestore.rules                # Security rules
```

---

## 🔄 CI/CD Integration

### GitHub Actions Workflow

Criar `.github/workflows/deploy-functions.yml`:

```yaml
name: Deploy Cloud Functions

on:
  push:
    branches: [main, claude/precocerto-stage-1-xsicob]
    paths:
      - 'precocerto/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci --prefix precocerto/functions
      - run: npm run test --prefix precocerto/functions
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: ${{ secrets.FIREBASE_PROJECT_ID }}
```

---

## ✅ Checklist de Deployment

- [ ] Google Cloud Project criado e configurado
- [ ] Firebase Project está ativo
- [ ] Firestore database operacional
- [ ] Cloud Functions code pronto (functions/src/index.ts)
- [ ] Dependências instaladas (`npm install`)
- [ ] Tests passando (`npm run test`)
- [ ] Build compilando (`npm run build`)
- [ ] Arquivo `firebase.json` atualizado
- [ ] Firestore Rules configuradas
- [ ] Firebase CLI login feito (`firebase login`)
- [ ] Deploy executado (`firebase deploy --only functions`)
- [ ] Cloud Scheduler jobs criados (3 jobs)
- [ ] Health Check testado
- [ ] Logs monitorados por 24h
- [ ] Alertas configurados no Cloud Monitoring

---

## 📞 Suporte e Documentação

### Referências Oficiais

- [Google Cloud Functions Documentation](https://cloud.google.com/functions/docs)
- [Cloud Scheduler Documentation](https://cloud.google.com/scheduler/docs)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)

### Documentação Interna

- Ver `TESTING.md` para testes da suite
- Ver `README.md` para overview do projeto
- Ver commits git para histórico de implementação

---

**Data de Criação**: 2026-08-22
**Versão**: 1.0
**Status**: 📋 Pronto para Deployment
**Próximo Passo**: Deploy para Staging → Testes 24h → Produção
