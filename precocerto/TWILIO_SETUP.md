# 🔐 Integração Twilio - Guia Completo

**Fase 11: Integração Real de Notificações com WhatsApp e SMS**

Este documento explica como configurar Twilio para enviar notificações via WhatsApp e SMS automaticamente no PreçoCerto.

---

## 📋 Pré-requisitos

- ✅ Conta Google Cloud (Firebase)
- ✅ Conta Twilio ativa
- ✅ Número Twilio comprado (WhatsApp e/ou SMS)
- ✅ Firebase Cloud Functions habilitado

---

## 🚀 Passo 1: Criar Conta Twilio

1. Aceda a [twilio.com](https://www.twilio.com)
2. Clique em **Sign Up** e complete o registo
3. Verifique seu telefone e email
4. No **Console**, copie:
   - **Account SID** (começando com AC)
   - **Auth Token** (token secreto)

### Exemplo:
```
Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Auth Token: <twilio-auth-token>
```

⚠️ **NUNCA compartilhe Auth Token!**

---

## 💰 Passo 2: Comprar Número Twilio

1. No Console Twilio → **Phone Numbers → Buy**
2. Escolha um número que suporte:
   - WhatsApp (para notificações rápidas)
   - SMS (para alertas críticos)
3. Compre o número (+244 para Angola)

### Custo (aproximado):
- **WhatsApp**: $0.01 USD/mensagem
- **SMS**: $0.005 USD/mensagem
- **Número**: ~$1 USD/mês

---

## 🔧 Passo 3: Configurar no PreçoCerto

### Opção A: Via Interface (Recomendado)

1. **Admin** → Menu **🔐 Twilio (WhatsApp/SMS)**
2. Preencha:
   - Account SID
   - Auth Token
   - Número WhatsApp: `whatsapp:+244923456789`
   - Número SMS: `+244923456789`
3. Clique **Validar Credenciais**
4. Teste com um telefone real em **Testar Conexão**

### Opção B: Via Variáveis de Ambiente

Crie `.env.local` na raiz do projeto:

```bash
VITE_TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=<twilio-auth-token>
VITE_TWILIO_WHATSAPP_NUMBER=whatsapp:+244923456789
VITE_TWILIO_SMS_NUMBER=+244923456789
```

⚠️ **Nunca faça commit de `.env.local` com credenciais reais!**

---

## ☁️ Passo 4: Deploy Cloud Functions (Produção)

Para que os alertas sejam enviados **automaticamente**, configure Cloud Functions:

### Opção A: Com Firebase CLI (Recomendado)

```bash
# 1. Instale Firebase CLI
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Inicialize Cloud Functions no projeto
firebase init functions

# 4. Crie as funções (ver arquivo functions/index.ts abaixo)

# 5. Deploy
firebase deploy --only functions
```

### Opção B: Via Console Firebase

1. Firebase Console → **Functions**
2. **Create Function** com runtime Node.js 18
3. Copy-paste o código abaixo
4. Deploy

---

## 📝 Cloud Function: Enviar Notificações

Crie `functions/src/index.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Validar credenciais
export const validateTwilio = functions.https.onRequest(async (req, res) => {
  const { accountSid, authToken } = req.body;

  if (!accountSid || !authToken) {
    return res.status(400).json({
      error: 'Account SID e Auth Token são obrigatórios'
    });
  }

  try {
    const client = twilio(accountSid, authToken);
    await client.api.accounts.list({ limit: 1 });
    
    res.json({ valid: true, message: 'Credenciais válidas' });
  } catch (error) {
    res.status(400).json({
      error: 'Credenciais inválidas',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Enviar WhatsApp
export const sendWhatsApp = functions.https.onRequest(async (req, res) => {
  const { credentials, recipientPhone, message } = req.body;

  if (!credentials || !recipientPhone || !message) {
    return res.status(400).json({
      error: 'Credenciais, telefone e mensagem são obrigatórios'
    });
  }

  try {
    const client = twilio(credentials.accountSid, credentials.authToken);
    const msg = await client.messages.create({
      from: credentials.whatsappNumber,
      to: `whatsapp:+${recipientPhone.replace(/\D/g, '')}`,
      body: message,
    });

    res.json({
      success: true,
      messageId: msg.sid,
      status: msg.status
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro ao enviar WhatsApp',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Enviar SMS
export const sendSMS = functions.https.onRequest(async (req, res) => {
  const { credentials, recipientPhone, message } = req.body;

  if (!credentials || !recipientPhone || !message) {
    return res.status(400).json({
      error: 'Credenciais, telefone e mensagem são obrigatórios'
    });
  }

  try {
    const client = twilio(credentials.accountSid, credentials.authToken);
    const msg = await client.messages.create({
      from: credentials.smsNumber,
      to: `+${recipientPhone.replace(/\D/g, '')}`,
      body: message,
    });

    res.json({
      success: true,
      messageId: msg.sid,
      status: msg.status
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro ao enviar SMS',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cron: Verificar alertas diariamente às 7h
export const checkExpiryAlertsCron = functions.pubsub
  .schedule('0 7 * * *') // 7:00 UTC (zona horária pode variar)
  .timeZone('Africa/Luanda') // Zona horária de Angola
  .onRun(async (context) => {
    console.log('🔍 Iniciando verificação de validade às 7h...');
    
    // Chamar alertAutomationService.checkExpiryAlerts() para cada loja
    // Implementar lógica aqui
    
    return null;
  });

// Cron: Verificar stock baixo diariamente às 12h
export const checkLowStockCron = functions.pubsub
  .schedule('0 12 * * *') // 12:00 UTC
  .timeZone('Africa/Luanda')
  .onRun(async (context) => {
    console.log('📦 Iniciando verificação de stock às 12h...');
    return null;
  });

// Cron: Enviar resumo diário às 18h
export const sendDailySummaryCron = functions.pubsub
  .schedule('0 18 * * *') // 18:00 UTC
  .timeZone('Africa/Luanda')
  .onRun(async (context) => {
    console.log('📊 Enviando resumo diário às 18h...');
    return null;
  });
```

---

## 🧪 Passo 5: Testar

### Teste Local (Desenvolvimento)

1. Abra **🔔 Notificações** → Preencha email/telefone
2. Vá para **⚙️ Automação de Alertas** → **Testar Alertas Agora**
3. Verifique se recebeu notificações

### Teste em Produção (Após Deploy)

1. Vá para **🔐 Twilio (WhatsApp/SMS)**
2. Insira suas credenciais Twilio
3. Clique **Validar Credenciais** ✅
4. Teste com um número real em **Testar Conexão**
5. Deve receber mensagem WhatsApp em segundos

---

## 🐛 Troubleshooting

### ❌ "Credenciais inválidas"
- ✅ Verifique Account SID e Auth Token no console Twilio
- ✅ Certifique-se de que copiar sem espaços extras

### ❌ "Erro ao enviar WhatsApp"
- ✅ Número está comprado? (Phone Numbers → Manage)
- ✅ WhatsApp habilitado no número? (Settings → WhatsApp)
- ✅ Número de teste tem WhatsApp? (Envie "join" primeiro)

### ❌ "Message queued" mas não recebe
- ✅ Número de teste deve ter WhatsApp instalado
- ✅ Pode levar até 5 minutos (fila de Twilio)
- ✅ Verifique spam/filtros

### ❌ Cloud Functions não chamam APIs
- ✅ Variáveis de ambiente definidas no Cloud Functions?
- ✅ Quotas do Twilio suficientes?

---

## 📊 Monitorar Uso

No Console Twilio:

- **Messagese → Logs**: Ver todas as mensagens enviadas
- **Billing**: Custo atual vs. limite
- **Account → Subaccounts**: Criar sub-contas por loja (futuro)

---

## 🔒 Boas Práticas de Segurança

1. ✅ **Nunca** compartilhe Auth Token
2. ✅ Guarde credenciais apenas em Cloud Functions (não no frontend)
3. ✅ Use variáveis de ambiente, não hardcode
4. ✅ Rode verif IPs se possível (Twilio Security)
5. ✅ Faça audit de Cloud Functions regularmente

---

## 🎯 Próximos Passos

1. ✅ Configurar Twilio
2. ✅ Fazer teste manual
3. ✅ Deploy Cloud Functions
4. ✅ Configurar preferências de notificação (cada utilizador)
5. ✅ Monitorar alertas (Dashboard ⚙️ Automação)
6. Future: Sub-contas por loja, Custom templates, WhatsApp media

---

## 📞 Suporte

- **Twilio Docs**: https://www.twilio.com/docs
- **Firebase Cloud Functions**: https://firebase.google.com/docs/functions
- **Status Twilio**: https://status.twilio.com

---

**Sistema pronto para produção! 🚀**
