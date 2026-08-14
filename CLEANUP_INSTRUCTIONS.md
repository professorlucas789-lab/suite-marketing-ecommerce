# 🧹 Limpeza do Firestore - Instruções

Este guia explica como executar o script de limpeza que vai:
- ✅ Eliminar todos os dados de teste do Firestore
- ✅ Restaurar permissões para `professorlucas789@gmail.com`
- ✅ Criar utilizador admin do zero

---

## 📋 Pré-requisitos

1. **Node.js** instalado (v16+)
2. **Firebase Admin SDK** instalado
3. **Arquivo de credenciais** já está no projeto: `precocertocc04afirebaseadminsdkfbsvce27b2a44ef.json`

---

## 🚀 Passos para Executar

### 1. Instalar dependências necessárias

```bash
cd /caminho/para/suite-marketing-ecommerce
npm install firebase-admin ts-node typescript
```

### 2. Executar o script de limpeza

```bash
npx ts-node cleanup-firestore.ts
```

### 3. Aguardar a conclusão

O script vai:
1. Limpar todas as coleções do Firestore
2. Criar novo utilizador admin
3. Mostrar credenciais de login

---

## 📝 Output Esperado

```
🧹 Iniciando limpeza do Firestore...

📂 Processando coleção: users
   ✓ 2 documento(s) eliminado(s)
📂 Processando coleção: stores
   ✓ 1 documento(s) eliminado(s)
...

✅ Todas as coleções foram limpas!

👤 Criando novo utilizador admin...
   ✓ Novo utilizador criado com UID: ...

🔐 Criando documento do utilizador com permissões admin...
   ✓ Documento criado com sucesso

============================================================
✅ LIMPEZA CONCLUÍDA COM SUCESSO!
============================================================

📋 Informações de Login:
   Email: professorlucas789@gmail.com
   Senha (temporária): TempPassword123!

⚠️  IMPORTANTE:
   1. Faz login com o email e senha acima
   2. Muda a senha imediatamente nas configurações
   3. Todos os dados anteriores foram eliminados
```

---

## 🔐 Depois da Limpeza

### 1. Faz Login na Aplicação

- URL: https://precocerto-als.netlify.app
- **Email:** professorlucas789@gmail.com
- **Senha:** TempPassword123!

### 2. Muda a Senha Imediatamente

1. Vai às **Configurações**
2. Clica em **Alterar Senha**
3. Define uma senha segura

### 3. Começa do Zero

Agora tens:
- ✅ Firestore limpo
- ✅ Utilizador admin restaurado
- ✅ Permissões completas

---

## ⚠️ Notas Importantes

1. **Credenciais sensíveis:** O arquivo `precocertocc04afirebaseadminsdkfbsvce27b2a44ef.json` contém credenciais privadas. **NÃO o commites ao Git!**

2. **Sem volta atrás:** Esta ação **elimina todos os dados permanentemente**. Certifica-te que realmente queres limpar!

3. **Depois de executar:** Podes eliminar o arquivo `cleanup-firestore.ts` e o JSON de credenciais se não precisares mais.

---

## 🆘 Troubleshooting

### Erro: "Cannot find module 'firebase-admin'"
```bash
npm install firebase-admin
```

### Erro: "ENOENT: no such file or directory"
Certifica-te que o arquivo JSON está no mesmo diretório do script.

### Erro: "Invalid service account"
Verifica se o arquivo JSON não foi corrompido.

---

**Quando estiver pronto, executa o script! 🚀**
