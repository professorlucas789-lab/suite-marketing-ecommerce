# 🚀 Setup do GitHub Actions - Deploy Automático

Este arquivo explica como configurar o **deploy automático** no GitHub quando você faz push!

---

## ⚙️ O que é GitHub Actions?

GitHub Actions é um serviço que **executa automaticamente** workflows (tarefas) quando você faz push no repositório. 

No nosso caso, vai:
1. ✅ Fazer clone do seu código
2. ✅ Instalar dependências (npm)
3. ✅ Compilar a aplicação (build)
4. ✅ Fazer deploy no Firebase Hosting

**Tudo automaticamente!** 🎯

---

## 📋 Passos para Configurar

### Passo 1: Gerar Token do Firebase

Você precisa de um **token de serviço do Firebase** para que o GitHub Actions possa fazer deploy.

**No seu Windows, execute:**

```bash
firebase login:ci
```

Isto vai:
1. Abrir o navegador para fazer login
2. Pedir permissão ao GitHub Actions
3. Gerar um **token** (copie este token!)

---

### Passo 2: Adicionar o Token como Secret no GitHub

1. **Abra** https://github.com/professorlucas789-lab/suite-marketing-ecommerce
2. **Clique** em "Settings" (Definições)
3. **Clique** em "Secrets and variables" → "Actions"
4. **Clique** em "New repository secret"
5. **Nome:** `FIREBASE_SERVICE_ACCOUNT_PRECOCERTO`
6. **Valor:** Cole o token que copiou acima
7. **Clique** em "Add secret"

---

### Passo 3: Pronto! 🎉

Agora, **sempre que você fizer push** para a branch `claude/precocerto-stage-1-xsicob`:

```bash
git push origin claude/precocerto-stage-1-xsicob
```

O GitHub Actions vai:
1. ✅ Compilar automaticamente
2. ✅ Fazer deploy no Firebase
3. ✅ Seu site fica disponível em https://precocerto-cc04a.web.app

---

## ✅ Verificar o Deploy

**Após fazer push:**

1. **Abra** https://github.com/professorlucas789-lab/suite-marketing-ecommerce
2. **Clique** em "Actions"
3. **Veja** o workflow em execução
4. Quando ficar **✅ verde** = Deploy bem-sucedido!

---

## 🔧 Troubleshooting

### "FIREBASE_SERVICE_ACCOUNT_PRECOCERTO não encontrado"

**Solução:** Verifique se adicionou o secret corretamente nas Definições → Secrets

### "Firebase CLI not authenticated"

**Solução:** Execute `firebase login:ci` novamente e atualize o secret

### "Build falhou"

**Solução:** Verifique os logs do GitHub Actions para ver qual é o erro

---

## 📝 Informações Úteis

- **Workflow file:** `.github/workflows/deploy-firebase.yml`
- **Branch de deploy:** `claude/precocerto-stage-1-xsicob`
- **URL de produção:** https://precocerto-cc04a.web.app
- **Tempo de deploy:** ~3-5 minutos

---

## 🎯 Próximas Vezes

Depois de configurado **uma vez**, você só precisa de:

```bash
git add .
git commit -m "Sua mensagem"
git push origin claude/precocerto-stage-1-xsicob
```

**E pronto!** O deploy acontece automaticamente! 🚀

---

**Precisa de ajuda? Contacte o suporte ou reveja este documento.**
