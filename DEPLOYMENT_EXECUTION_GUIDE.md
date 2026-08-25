# 🚀 GUIA DE EXECUÇÃO DE DEPLOYMENT
## PreçoCerto Application - Para Ambiente de Produção

**Data:** 2026-08-24  
**Status:** Pronto para Execução  
**Tempo Estimado:** 30 minutos (deployment) + 2-3 horas (testes)

---

## ⚠️ PRÉ-REQUISITOS CONFIRMADOS

✅ Build compila sem erros  
✅ Todos os componentes integrados  
✅ Documentação completa  
✅ Testes preparados  
✅ Firestore rules definidas  

---

## 🎯 FASE 1: DEPLOYMENT (30 MINUTOS)

### Passo 1: Verificar Pré-requisitos de Acesso

```bash
# 1.1: Verificar Firebase CLI instalado
firebase --version
# Esperado: 15.x ou superior

# 1.2: Verificar projeto Firebase
firebase projects:list
# Se falhar: execute "firebase login" primeiro

# 1.3: Verificar configuração local
cat firebase.json
# Esperado: hosting/public aponta para "precocerto/dist"
```

### Passo 2: Build Final

```bash
cd /workspace/suite-marketing-ecommerce

# 2.1: Limpar build anterior
rm -rf precocerto/dist

# 2.2: Instalar dependências (se necessário)
npm install --force --legacy-peer-deps

# 2.3: Build produção
npm run build

# Esperado:
# ✓ 2481 modules transformed
# ✓ built in ~26 seconds
# ✓ Nenhum erro TypeScript
```

### Passo 3: Verificar Build Output

```bash
# 3.1: Verificar que dist foi criado
ls -lah precocerto/dist/
# Esperado: index.html + assets/ (>100MB total)

# 3.2: Verificar firebase.json
cat firebase.json | grep "public"
# Esperado: "public": "precocerto/dist"

# 3.3: Verificar arquivo index.html
head -20 precocerto/dist/index.html
# Esperado: HTML com React app metadata
```

### Passo 4: Configurar Variáveis de Ambiente

```bash
# 4.1: Verificar .firebaserc (se existir)
cat .firebaserc 2>/dev/null || echo "Criar .firebaserc"

# 4.2: Se .firebaserc não existe, criar:
cat > .firebaserc << 'EOF'
{
  "projects": {
    "default": "[SEU-PROJECT-ID]"
  }
}
EOF

# Substitua [SEU-PROJECT-ID] com seu projeto Firebase
```

### Passo 5: Deploy para Firebase Hosting

```bash
# 5.1: Deploy apenas Hosting (opção recomendada para teste)
firebase deploy --only hosting

# SAÍDA ESPERADA:
# ✔  Deploy complete!
# 
# Project Console: https://console.firebase.google.com/project/[id]/overview
# Hosting URL: https://[project-id].web.app

# 5.2: Se tudo correr bem, deploy completo (inclui functions)
firebase deploy

# SAÍDA ESPERADA:
# ✔  Deploy complete!
# ✔  functions[processAlerts]: Successful update operation.
# ✔  hosting[default]: Successful release to live channel
```

### Passo 6: Registar URL de Deployment

```bash
# 6.1: Obter URL de deployment
firebase hosting:channel:list

# 6.2: Esperado:
# Channel      Site           URL
# live         [project-id]   https://[project-id].web.app
# live         [project-id]   https://[project-id].firebaseapp.com

# 6.3: Guarde a URL para testes
# PRODUCTION_URL="https://[project-id].web.app"
```

---

## 🧪 FASE 2: SMOKE TESTS (30 MINUTOS)

Verificação rápida após deployment:

### Teste 1: Carregamento da Aplicação

```bash
# 1.1: Testar que página carrega
curl -s https://[project-id].web.app | head -50
# Esperado: HTML com <title>PreçoCerto</title>

# 1.2: Verificar que app.js está acessível
curl -s -I https://[project-id].web.app/assets/index-*.js | grep "200"
# Esperado: HTTP 200

# 1.3: Testar no navegador
# Abrir: https://[project-id].web.app
# Esperado: Login page carrega, nenhum erro no console (F12)
```

### Teste 2: Autenticação

```
1. Ir para https://[project-id].web.app
2. Clicar "Sign In"
3. Usar credenciais de teste:
   - Email: teste@precocerto.pt (ou seu usuário)
   - Password: [sua senha]
4. Esperado: Redireciona para Dashboard
5. Verificar console (F12): Nenhum erro em vermelho
```

### Teste 3: Dashboard Carregamento

```
1. Após login, verificar Dashboard principal
2. Esperado:
   - Produtos listados
   - Cards com números
   - Menu lateral funciona
3. Clicar "Dashboard Executivo" no menu
4. Esperado:
   - KPI cards carregam
   - Gráficos renderizam
   - Load time < 2 segundos
```

### Teste 4: Alertas

```
1. Clicar "Alertas" no menu
2. Esperado:
   - AlertsView carrega
   - 3 stat cards visíveis (Críticos, Avisos, Stock Baixo)
   - Sem erros no console
3. Se houver produtos vencendo:
   - Alertas aparecem corretamente
   - Cores corretas (vermelho=crítico, amarelo=aviso)
```

### Teste 5: Verificar Console (F12)

```
1. Abrir Chrome DevTools (F12)
2. Ir para aba "Console"
3. Verificar:
   ✓ Nenhum erro em vermelho
   ✓ Nenhum erro de Firestore
   ✓ Nenhum erro de autenticação
4. Se houver erros:
   - Screenshot do erro
   - Copiar erro completo
   - Registar em issues
```

---

## 📊 FASE 3: TESTES FUNCIONAIS (2-3 HORAS)

Seguir TEST_PLAN.md completamente:

### Bloco 1: Executive Dashboard (30 minutos)
- 11 testes de funcionalidade
- Performance, RBAC, Dark mode

### Bloco 2: Expiry Alerts (40 minutos)
- 16 testes de alertas e filtros
- Severidade, ações, histórico

### Bloco 3: Stock Management (45 minutos)
- 14 testes de movimentos e analytics
- Alerts, previsões, configurações

### Bloco 4: Sales Module (50 minutos)
- 18 testes de recorder, history, analytics
- Integração com stock, cálculos

### Bloco 5: Performance & RBAC (30 minutos)
- Load times, bundle size
- Data isolation, permissions

---

## ✅ CHECKLIST DE VERIFICAÇÃO PÓS-DEPLOYMENT

### Funcionalidades Críticas
- [ ] Login funciona
- [ ] Dashboard Executivo carrega (< 2s)
- [ ] Alertas aparecem
- [ ] Stock Management responsivo
- [ ] Sales module registra vendas
- [ ] Dark mode toggle funciona
- [ ] Menu mobile funciona
- [ ] Sem erros no console (F12)

### Performance
- [ ] Dashboard: < 2 segundos
- [ ] Alertas: < 1.5 segundos
- [ ] Stock: < 2 segundos
- [ ] Sales: < 2 segundos

### Data Integrity
- [ ] Dados de diferentes lojas isolados
- [ ] Histórico preservado
- [ ] Timestamps corretos
- [ ] Aggregations precisas

### Security
- [ ] Usuários veem apenas sua loja
- [ ] Funcionários sem acesso a analytics
- [ ] Nenhum erro de permissão
- [ ] Firestore rules aplicadas

---

## 🔍 MONITORAMENTO PÓS-DEPLOYMENT

### Firebase Console
1. Ir para: https://console.firebase.google.com
2. Selecionar seu projeto
3. Verificar:

**Hosting:**
- [ ] Traffic gráfico (deve ter picos)
- [ ] Bandwidth usado
- [ ] Domains configurados

**Firestore:**
- [ ] Reads/writes dentro do esperado
- [ ] Sem erros de rules
- [ ] Storage usage

**Functions:**
- [ ] Logs sem erros
- [ ] Execução time < 1s
- [ ] No timeout errors

**Analytics (se configurado):**
- [ ] Users ativos
- [ ] Página mais visitada
- [ ] Taxa de bouncer

---

## 🐛 TROUBLESHOOTING - ERROS COMUNS

### Erro: "Deploy fails - permission denied"
```bash
# Solução:
firebase logout
firebase login --reauth
firebase deploy --only hosting
```

### Erro: "dist folder not found"
```bash
# Solução:
cd /workspace/suite-marketing-ecommerce
npm run build
# Verificar: ls precocerto/dist/
```

### Erro: "White screen after deployment"
```bash
# Solução:
1. Abrir Chrome DevTools (F12)
2. Verificar Console tab
3. Verificar Network tab - há erros 404?
4. Verificar que firebase.json aponta para "precocerto/dist"
5. Limpar cache do navegador (Ctrl+Shift+Del)
6. Fazer hard refresh (Ctrl+F5)
```

### Erro: "Firebase rules blocked access"
```bash
# Solução:
1. Verificar rules em Firebase Console > Firestore > Rules
2. Se regras muito restritivas:
   - Publicar rules menos restritivas para teste
   - Publicar regras corretas depois
3. Ver DEPLOYMENT_GUIDE.md > Firestore Security Rules
```

### Erro: "Dados antigos/cache"
```bash
# Solução:
1. Firebase cache: Ctrl+Shift+Del > Cookies e dados de site
2. Service Worker: F12 > Application > Clear storage
3. Fazer refresh: Ctrl+F5 (hard refresh)
```

---

## 📝 LOG DE DEPLOYMENT

Preencher este template durante deployment:

```
Data/Hora: __/__/____ __:__
URL Deployment: https://_______________

PRÉ-DEPLOYMENT:
[ ] Build executa com sucesso
[ ] npm run build completa em < 30s
[ ] dist/ tem 100+ MB
[ ] Nenhum erro TypeScript

DURANTE DEPLOYMENT:
[ ] firebase deploy --only hosting
[ ] Saída: ✔ Deploy complete
[ ] URL acessível (teste com curl)

PÓS-DEPLOYMENT (Smoke Tests):
[ ] Login funciona
[ ] Dashboard carrega
[ ] Sem erros no console (F12)
[ ] Menu funciona
[ ] Dark mode funciona

PROBLEMAS ENCONTRADOS:
_________________________________________________

RESOLUÇÃO:
_________________________________________________

APROVAÇÃO PARA TESTES:
[ ] Smoke tests PASS
[ ] Pronto para TEST_PLAN.md completo

Assinado: _________________
Data: __/__/____
```

---

## 🎯 PRÓXIMO: EXECUÇÃO DE TESTES

Após deployment bem-sucedido:

1. **Ler TEST_PLAN.md**
2. **Executar 87 testes** organizados por Phase
3. **Documentar resultados** em template
4. **Registar issues** se houver falhas
5. **Otimizar performance** se necessário

---

## 📞 SUPORTE DURANTE DEPLOYMENT

Se encontrar problemas:

1. **Verificar logs:** `firebase functions:log`
2. **Verificar console do navegador:** F12 > Console
3. **Verificar Firestore:** Console Firebase > Firestore tab
4. **Verificar regras:** Console Firebase > Firestore > Rules
5. **Reeferir a DEPLOYMENT_GUIDE.md** para troubleshooting detalhado

---

**Versão:** 1.0  
**Status:** Pronto para Execução  
**Tempo Total:** 30 min (deploy) + 2-3 horas (testes) = ~3-3.5 horas
