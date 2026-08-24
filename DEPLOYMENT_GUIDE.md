# 🚀 Guia de Deployment - PreçoCerto Application

## Status de Pré-Deployment

✅ **Build Status:** Sucesso (26.06s)  
✅ **TypeScript:** Validação completa  
✅ **Componentes:** 32 asset chunks (lazy-loaded)  
✅ **Features:** Phases 1-8 implementadas  
✅ **Testes:** Compilação sem erros  

---

## 📋 Checklist de Deployment

### 1. **Pré-requisitos**
- [ ] Firebase Project criado (projeto-id: TBD)
- [ ] Firebase CLI instalado (`npm install -g firebase-tools`)
- [ ] Autenticação Firebase configurada (`firebase login`)
- [ ] Variáveis de ambiente configuradas

### 2. **Build Validation**
```bash
cd /workspace/suite-marketing-ecommerce
npm run build
# Esperado: ✓ built in ~14-26 seconds
# Esperado: 32 asset chunks
# Esperado: Nenhum erro TypeScript
```

### 3. **Deployment para Firebase Hosting**

#### Opção A: Deploy com Autenticação (Local/CI-CD)
```bash
# 1. Autenticar com Firebase
firebase login

# 2. Verificar projeto configurado
firebase projects:list

# 3. Deploy completo (Hosting + Functions + Firestore Rules)
firebase deploy

# 4. Alternativa: Deploy apenas Hosting (mais rápido para testes)
firebase deploy --only hosting

# 5. Verificar URL da aplicação
firebase hosting:channel:list
```

**Tempo esperado:** 2-5 minutos para hosting, 5-10 minutos para functions

#### Opção B: Deploy com GitHub Actions (Recomendado)
```yaml
# .github/workflows/firebase-deploy.yml
name: Deploy to Firebase

on:
  push:
    branches: [main, claude/precocerto-stage-1-xsicob]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Build
        run: |
          cd /workspace/suite-marketing-ecommerce
          npm install --force --legacy-peer-deps
          npm run build
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: [firebase-project-id]
```

---

## 🔐 Configuração de Ambiente

### Firebase Configuration
```javascript
// precocerto/src/firebase.ts
export const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};
```

### Variáveis de Ambiente Necessárias
```
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=...
REACT_APP_FIREBASE_STORAGE_BUCKET=...
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
```

---

## 📊 Funcionalidades por Fase (Prontas para Deploy)

### Phase 17: Executive Dashboard ✅
- KPI Cards (Revenue, Orders, Margin, Health)
- Trend Analysis (7/30/90 dias)
- Top Products & Categories
- Store Health Score (0-100%)
- Critical Alerts System

**Localização:** `/dashboard-executivo`  
**RBAC:** Admin, Loja-Manager

### Phase 1: Expiry Notifications ✅
- Monitoramento automático de validade
- Multi-channel: In-App, Email, WhatsApp, SMS
- Severidade: CRITICAL, WARNING, INFO
- Histórico e auditoria

**Localização:** `/alertas`  
**RBAC:** Todos

### Phase 2: Stock Management ✅
- Movement Tracking (IN/OUT/ADJUSTMENT)
- Low Stock Alerts
- Reorder Recommendations
- Analytics & Trends

**Localização:** `/estoque`  
**RBAC:** Admin, Loja-Manager

### Phase 3: Sales Module ✅
- Quick Sales Recorder
- Sales History & Analytics
- Margin Analysis
- Cash Closing

**Localização:** `/vendas`  
**RBAC:** Todos (registar), Admin/Manager (analytics)

### Phase 4+: Financeiro, Fornecedores, Clientes ✅
- Todas as views implementadas
- Integração completa
- Analytics e reports

---

## 🧪 Testes Pós-Deployment

### 1. **Smoke Tests** (5 minutos)
```bash
# Verificar se aplicação carrega
curl https://[firebase-app].web.app/

# Testar autenticação
# 1. Ir para https://[firebase-app].web.app
# 2. Login com teste@precoacerto.pt
# 3. Verificar dashboard carrega
```

### 2. **Feature Tests** (15-20 minutos)

**Dashboard Executivo:**
- [ ] KPIs carregam com dados reais
- [ ] Período selector funciona (7/30/90 dias)
- [ ] Gráficos renderizam
- [ ] Dark mode toggle funciona

**Alertas de Validade:**
- [ ] Alertas críticos aparecem
- [ ] Filtros por severidade funcionam
- [ ] Acknowledge/resolve funcionam
- [ ] Histórico visível

**Gestão de Stock:**
- [ ] Registar movimento IN funciona
- [ ] Registar movimento OUT reduz stock
- [ ] Alertas de stock baixo disparam
- [ ] Analytics mostram dados corretos

**Módulo de Vendas:**
- [ ] Registar venda funciona
- [ ] Histórico de vendas aparece
- [ ] Margin calculations corretas
- [ ] Relatórios geram dados

### 3. **Performance Tests** (Chrome DevTools)
- Dashboard Executivo: < 2 segundos load
- Alertas View: < 1.5 segundos load
- Stock Management: < 2 segundos load
- Sales Module: < 2 segundos load

### 4. **Responsiveness Tests**
- [ ] Desktop (1920x1080): OK
- [ ] Tablet (768x1024): OK
- [ ] Mobile (375x667): OK
- [ ] Dark mode: OK em todos

---

## 🔧 Troubleshooting

### Firebase Deploy Falha
```bash
# Verificar autenticação
firebase login

# Limpar cache
firebase cache:clear

# Deploy com verbose
firebase deploy --debug

# Deploy apenas hosting (testa rápido)
firebase deploy --only hosting
```

### Build Falha
```bash
# Limpar node_modules
rm -rf precocerto/node_modules precocerto/package-lock.json

# Reinstalar com legacy peer deps
npm install --force --legacy-peer-deps

# Build com verbose
npm run build -- --debug
```

### Aplicação Branca Após Deploy
```
1. Verificar Console (F12) para erros
2. Verificar se firebase.json aponta para dist correto
3. Limpar browser cache (Ctrl+Shift+Del)
4. Verificar Firestore rules permitem leitura
```

---

## 📱 URLs de Deploy

### Production
- **URL Principal:** `https://[firebase-project].web.app`
- **URL Alternativa:** `https://[firebase-project].firebaseapp.com`

### Staging (Preview Channel)
```bash
firebase hosting:channel:deploy preview-v1
# Gera URL: https://[firebase-project]--preview-v1.web.app
```

---

## 🔐 Firestore Security Rules

Verificar antes do deploy:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acesso apenas ao próprio utilizador
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    
    // Permitir leitura de lojas pertencentes ao utilizador
    match /lojas/{storeId} {
      allow read: if resource.data.ownerId == request.auth.uid;
    }
    
    // Alertas - apenas para loja do utilizador
    match /lojas/{storeId}/expiryAlerts/{alertId} {
      allow read: if request.auth.uid == get(/databases/$(database)/documents/lojas/$(storeId)).data.ownerId;
      allow write: if false; // Apenas Cloud Functions podem escrever
    }
  }
}
```

---

## 📊 Monitoramento Pós-Deploy

### Firebase Console
1. Ir a: https://console.firebase.google.com
2. Selecionar projeto
3. Monitoring:
   - **Hosting:** Verificar tráfego, bandwidth
   - **Functions:** Verificar execução, erros
   - **Firestore:** Verificar reads/writes, storage

### Application Performance
```bash
# Monitorar performance
firebase functions:log

# Ver erros de Firestore
firebase firestore:describe-indexes
```

---

## ✅ Checklist Final

- [ ] Build compila sem erros
- [ ] Todas as features testadas localmente
- [ ] Variáveis de ambiente configuradas
- [ ] Firestore rules atualizadas
- [ ] Firebase.json correto
- [ ] GitHub Actions workflow configurado (opcional)
- [ ] Deploy executado com sucesso
- [ ] Smoke tests passaram
- [ ] Feature tests passaram
- [ ] Performance aceitável
- [ ] Responsiveness OK
- [ ] Monitoring configurado

---

## 🎯 Próximas Fases (Após Deployment)

1. **Phase 18:** Mobile App (React Native)
2. **Phase 19:** Integrações Externas (PDF, Excel, Google Sheets)
3. **Phase 20:** Predictive Analytics (ML)
4. **Phase 21+:** Otimizações e Features Adicionais

---

## 📞 Support

Para suporte ou questões:
1. Verificar logs em Firebase Console
2. Verificar Chrome DevTools (F12)
3. Verificar Firestore Rules
4. Verificar variáveis de ambiente

**Versão:** 1.0  
**Data:** 2026-08-24  
**Status:** Pronto para Deploy ✅
