# ✅ SMOKE TESTS - PreçoCerto v1.0.0

**URL de Produção:** https://precocerto-cc04a.web.app

**Data:** 24/08/2026  
**Responsável:** Eng. Chivas  
**Tempo Total:** ~30 minutos

---

## 📋 Teste 1: Autenticação (5 minutos)

**Ações:**
1. Abra: https://precocerto-cc04a.web.app
2. Clique "Sign In"
3. Insira credenciais de teste
4. Deve redirecionado para Dashboard
5. Abra F12 Console (pressione F12)
6. Verifique: Não há erros vermelhos

**Resultado:**
- [ ] PASS - Autenticação funcionou
- [ ] FAIL - Erro ao fazer login

**Notas:** ___________________________________

---

## 📊 Teste 2: Dashboard Executivo (5 minutos)

**Ações:**
1. No Dashboard principal
2. Verificar: KPI cards visíveis (números grandes em cima)
3. Verificar: Período selector (botões 7/30/90 dias)
4. Verificar: Gráficos renderizam
5. F12 Console: Verificar se há erros vermelhos
6. Tempo de carga: Menos de 2 segundos?

**Resultado:**
- [ ] PASS - Tudo funcionou
- [ ] FAIL - Algum problema

**Notas:** ___________________________________

---

## 🔔 Teste 3: Alertas (5 minutos)

**Ações:**
1. Menu lateral → "Alertas"
2. Verificar: View carrega
3. Verificar: 3 stat cards visíveis (números)
4. Tempo de carga: Menos de 1.5 segundos?
5. F12 Console: Verificar erros

**Resultado:**
- [ ] PASS - Tudo OK
- [ ] FAIL - Problemas

**Notas:** ___________________________________

---

## 🌙 Teste 4: Dark Mode (5 minutos)

**Ações:**
1. Procurar toggle de dark mode (canto superior da tela)
2. Clicar para ativar dark mode
3. Verificar: Cores mudam (fundo escuro)
4. Verificar: Texto legível
5. Verificar: Todos componentes funcionam

**Resultado:**
- [ ] PASS - Dark mode funciona
- [ ] FAIL - Problemas com cores/legibilidade

**Notas:** ___________________________________

---

## 📱 Teste 5: Mobile Responsiveness (5 minutos)

**Ações:**
1. Pressione F12 (abrir DevTools)
2. Clique no ícone "Responsive Mode" (ou Ctrl+Shift+M)
3. Selecione "iPhone 12" (390x844)
4. Verificar: Menu hamburger aparece
5. Verificar: Todas seções acessíveis
6. Verificar: Sem scroll horizontal

**Resultado:**
- [ ] PASS - Mobile OK
- [ ] FAIL - Problemas

**Notas:** ___________________________________

---

## 📊 RESUMO FINAL

| Teste | Status | Tempo | Notas |
|-------|--------|-------|-------|
| 1. Autenticação | [ ] PASS / [ ] FAIL | ___ seg | |
| 2. Dashboard | [ ] PASS / [ ] FAIL | ___ seg | |
| 3. Alertas | [ ] PASS / [ ] FAIL | ___ seg | |
| 4. Dark Mode | [ ] PASS / [ ] FAIL | ___ seg | |
| 5. Mobile | [ ] PASS / [ ] FAIL | ___ seg | |
| **TOTAL** | **__/5 PASS** | | |

---

## ✅ Resultado Esperado

**5/5 PASS** ✅ - Aplicação pronta para full test suite

**Menos de 5/5** ⚠️ - Investigar erros antes de continuar

---

## 📝 Instruções Finais

1. Abra https://precocerto-cc04a.web.app
2. Execute cada teste na ordem
3. Marque PASS ou FAIL
4. Se houver erro: Abra F12 Console e copie a mensagem de erro
5. Comunique-me os resultados aqui

**Pronto? Comece!** 🚀
