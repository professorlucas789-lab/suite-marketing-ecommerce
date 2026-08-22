# 📧📱 Setup SendGrid & Twilio - PreçoCerto

Guia completo para configurar integração de Email (SendGrid) e WhatsApp/SMS (Twilio) no sistema de notificações automáticas do PreçoCerto.

---

## 📋 Pré-Requisitos

✅ Conta Google Cloud com projeto Firebase criado
✅ Node.js 18+ instalado
✅ Git configurado com branch `claude/precocerto-stage-1-xsicob`
✅ Variáveis de ambiente Firebase já configuradas

---

## 1️⃣ Setup SendGrid (Email Transacional)

### 1.1 Criar Conta SendGrid

1. Aceder a https://sendgrid.com/
2. Clicar em **"Sign Up"** (canto superior direito)
3. Preencher formulário:
   - Email: `seu-email@example.com`
   - Palavra-passe: senha forte (guardar em gestor de senhas)
   - Empresa: "PreçoCerto"
   - País: Portugal (ou país actual)
4. Clicar em **"Create Account"**
5. Verificar email e confirmar conta

### 1.2 Obter API Key

1. No dashboard SendGrid, ir a **Settings → API Keys**
2. Clicar em **"Create API Key"**
3. Preencher:
   - Name: `precocerto-notifications-prod`
   - Permissions: **Restricted Access** (recomendado)
   - Selecionar: `Mail Send` ✅
4. Clicar em **"Create & Copy"**
5. **GUARDAR A API KEY NUM LOCAL SEGURO** (não está visível depois!)
   - Formato: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 1.3 Verificar Email do Remetente

1. Ir a **Settings → Sender Authentication**
2. Clicar em **"Verify a Single Sender"**
3. Preencher:
   - From Email: `noreply@precocerto.ao` (ou domínio da sua empresa)
   - From Name: `PreçoCerto Automações`
   - Reply To: `support@precocerto.ao`
4. Clicar em **"Create"**
5. Verificar email recebido e clicar no link de confirmação

**Nota**: Se usar domínio próprio, fazer Domain Authentication (mais robusto para produção)

### 1.4 Testar Integração SendGrid

```bash
# No diretório do projeto
curl --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header "Authorization: Bearer SG_YOUR_API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{"personalizations":[{"to":[{"email":"seu-email@example.com"}],"subject":"Teste PreçoCerto"}],"from":{"email":"noreply@precocerto.ao","name":"PreçoCerto"},"content":[{"type":"text/html","value":"<h1>Email de Teste</h1><p>Integração SendGrid funcionando!</p>"}]}'
```

**Resposta esperada**: HTTP 202 (Accepted)

---

## 2️⃣ Setup Twilio (WhatsApp & SMS)

### 2.1 Criar Conta Twilio

1. Aceder a https://www.twilio.com/
2. Clicar em **"Sign Up"** (canto superior direito)
3. Preencher:
   - Email: `seu-email@example.com`
   - Palavra-passe: senha forte
   - Primeiro e Último nome
   - País: Portugal (ou país actual)
4. Clicar em **"Get Started"**
5. Verificar email
6. Responder questões sobre caso de uso (marketing/business automations)

### 2.2 Obter Credenciais Twilio

1. No **Twilio Console** (https://console.twilio.com/), verificar:
   - **Account SID**: Está visível no topo (começar com "AC")
   - **Auth Token**: Também visível ao lado do SID
   - **GUARDAR AMBOS**

2. Encontrar ou adquirir número Twilio:
   - Clicar em **"Explore Products"** → **"Phone Numbers"** → **"Manage"** → **"Buy Numbers"**
   - Selecionar país (Portugal ou Angola)
   - Pesquisar números disponíveis
   - Escolher um e clicar **"Buy"**
   - Número comprado aparecerá em **"Active Numbers"**

### 2.3 Configurar WhatsApp Business (Recomendado)

#### Opção A: Twilio WhatsApp Sandbox (Testes Rápidos)

1. No Twilio Console, ir a **Explore → WhatsApp**
2. Clicar em **"Get Started"**
3. Será criado automaticamente um "sandbox" WhatsApp
4. Seguir instruções para conectar:
   - Enviar mensagem para número do sandbox: `+1 (415) 523-8886`
   - Mensagem: `join [código]`
   - Vai receber confirmação

**⚠️ Limitação**: Só funciona com números adicionados ao sandbox (máx 100). Para produção, usar Opção B.

#### Opção B: Twilio WhatsApp Business Account (Produção)

1. Ir a **Explore → WhatsApp → Business Accounts**
2. Clicar em **"Start Setup"**
3. Preencher informações da empresa:
   - Nome: "PreçoCerto"
   - Website: "https://precocerto-als.netlify.app/"
   - Descrição: "Sistema de gestão de lojas com notificações automáticas"
4. Adicionar número de telefone verificado
5. Aguardar aprovação (24-48h)
6. Após aprovação, usar número da conta business em produção

### 2.4 Testar Integração Twilio

```bash
# Enviar SMS de teste
curl -X POST https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json \
  -d "From=+1XXXXXXXXXX" \
  -d "To=+244XXXXXXXXX" \
  -d "Body=Teste PreçoCerto SMS" \
  -u YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN
```

**Resposta esperada**: JSON com `"status": "queued"` e SID da mensagem

```bash
# Enviar WhatsApp de teste (requer sandbox ativo)
curl -X POST https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json \
  -d "From=whatsapp:+1XXXXXXXXXX" \
  -d "To=whatsapp:+244XXXXXXXXX" \
  -d "Body=Teste PreçoCerto WhatsApp" \
  -u YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN
```

---

## 3️⃣ Configurar Variáveis de Ambiente

### 3.1 Ficheiro `.env.local` (Desenvolvimento)

```bash
# SendGrid
SENDGRID_API_KEY=SG_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@precocerto.ao
SENDGRID_FROM_NAME=PreçoCerto Automações

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
TWILIO_WHATSAPP_NUMBER=+1XXXXXXXXXX
```

### 3.2 Firebase Cloud Functions (Produção)

```bash
# Deploy variáveis de ambiente para Cloud Functions
firebase functions:config:set sendgrid.api_key="SG_xxx..." \
  sendgrid.from_email="noreply@precocerto.ao" \
  sendgrid.from_name="PreçoCerto Automações" \
  twilio.account_sid="ACxxx..." \
  twilio.auth_token="xxx..." \
  twilio.phone_number="+1XXXXXXXXXX" \
  twilio.whatsapp_number="+1XXXXXXXXXX"

# Verificar configuração
firebase functions:config:get
```

### 3.3 Variáveis de Ambiente no Google Cloud Console (Alternativa)

1. Abrir https://console.cloud.google.com
2. Ir a **Cloud Functions → Detalhes da Função → Runtime settings**
3. Adicionar variáveis de ambiente directamente no editor

**Nota**: Valores sensíveis (API Keys) devem estar em **Google Secret Manager** para produção

---

## 4️⃣ Integração com NotificationService

### 4.1 Arquivo de Integração SendGrid

**Localização**: `src/integrations/sendgrid.ts`

```typescript
class SendGridServiceImpl {
  async sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Envia email via SendGrid API
    // Graceful degradation: retorna { success: false } se API key não configurada
  }

  async sendAlertEmail(to, alertType, title, message, data?) {
    // Envia email formatado com HTML e estilos
  }

  async sendDailyReportEmail(to, storeName, reportDate, reportData) {
    // Envia relatório diário com KPIs e gráficos
  }
}

export const SendGridService = new SendGridServiceImpl(config);
```

### 4.2 Arquivo de Integração Twilio

**Localização**: `src/integrations/twilio.ts`

```typescript
class TwilioServiceImpl {
  validateAngolaNumber(number: string): boolean {
    // Valida formatos: 9XXXXXXXX, 244XXXXXXXXX, +244XXXXXXXXX
  }

  normalizeNumber(number: string): string {
    // Converte para formato padrão: +244XXXXXXXXX
  }

  async sendSMS(to: string, body: string) {
    // Envia SMS via Twilio com validação de número
  }

  async sendWhatsApp(to: string, body: string, mediaUrl?: string) {
    // Envia mensagem WhatsApp via Twilio
  }

  async sendAlertWhatsApp(to, alertType, title, message) {
    // Envia alerta formatado com emoji
  }

  async sendReportWhatsApp(to, storeName, reportDate, reportData) {
    // Envia relatório via WhatsApp
  }
}

export const TwilioService = new TwilioServiceImpl(config);
```

### 4.3 Como NotificationService Usa as Integrações

```typescript
// Em NotificationService.ts

private async sendEmailNotification(...) {
  // Usa SendGridService para enviar emails
  const SendGridService = await import('../integrations/sendgrid').then(m => m.SendGridService);
  return SendGridService.sendEmail({...});
}

private async sendWhatsAppNotification(...) {
  // Usa TwilioService para enviar WhatsApp
  const TwilioService = await import('../integrations/twilio').then(m => m.TwilioService);
  return TwilioService.sendWhatsApp(preferences.phoneNumber, message);
}

private async sendSmsNotification(...) {
  // Usa TwilioService para enviar SMS
  const TwilioService = await import('../integrations/twilio').then(m => m.TwilioService);
  return TwilioService.sendSMS(preferences.phoneNumber, messageText);
}
```

---

## 5️⃣ Testes Práticos

### 5.1 Teste Email via Node.js

```bash
# Entrar na pasta precocerto
cd precocerto

# Criar ficheiro de teste
cat > test-sendgrid.js << 'EOF'
const axios = require('axios');

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL;

async function sendTestEmail() {
  try {
    const response = await axios.post(
      'https://api.sendgrid.com/v3/mail/send',
      {
        personalizations: [
          { to: [{ email: 'seu-email@example.com' }], subject: 'Teste PreçoCerto' }
        ],
        from: { email: fromEmail, name: 'PreçoCerto Automações' },
        content: [
          { type: 'text/html', value: '<h1>✅ Teste OK</h1>' }
        ]
      },
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    console.log('✅ Email enviado com sucesso!');
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

sendTestEmail();
EOF

# Executar teste
node test-sendgrid.js
```

### 5.2 Teste WhatsApp via Node.js

```bash
# Criar ficheiro de teste
cat > test-twilio.js << 'EOF'
const axios = require('axios');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

async function sendTestWhatsApp() {
  try {
    const params = new URLSearchParams();
    params.append('From', `whatsapp:${fromNumber}`);
    params.append('To', 'whatsapp:+244XXXXXXXXX'); // Seu número
    params.append('Body', '✅ Teste PreçoCerto WhatsApp OK');

    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      params,
      { auth: { username: accountSid, password: authToken } }
    );
    console.log('✅ WhatsApp enviado! SID:', response.data.sid);
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

sendTestWhatsApp();
EOF

# Executar teste
node test-twilio.js
```

### 5.3 Teste via Aplicação (TypeScript/React)

```typescript
// Em componente React ou função de teste
import { SendGridService } from '@/integrations/sendgrid';
import { TwilioService } from '@/integrations/twilio';

async function testIntegrations() {
  // Testar SendGrid
  const emailResult = await SendGridService.sendEmail({
    to: 'seu-email@example.com',
    subject: 'Teste PreçoCerto',
    htmlContent: '<h1>✅ Email OK</h1>',
  });
  console.log('Email:', emailResult);

  // Testar Twilio WhatsApp
  const whatsappResult = await TwilioService.sendWhatsApp(
    '+244XXXXXXXXX',
    'Teste PreçoCerto WhatsApp ✅'
  );
  console.log('WhatsApp:', whatsappResult);

  // Testar Twilio SMS
  const smsResult = await TwilioService.sendSMS(
    '+244XXXXXXXXX',
    'Teste PreçoCerto SMS OK'
  );
  console.log('SMS:', smsResult);
}

await testIntegrations();
```

---

## 6️⃣ Troubleshooting

### ❌ "SendGrid API key not configured"

**Problema**: Mensagens não são enviadas por email
**Solução**:
1. Verificar se `SENDGRID_API_KEY` está definida: `echo $SENDGRID_API_KEY`
2. Verificar se API key é válida em SendGrid Console
3. Reiniciar servidor: `npm run dev`
4. Se em Cloud Functions: `firebase functions:config:get` para verificar variáveis

### ❌ "Twilio credentials not configured"

**Problema**: WhatsApp/SMS não são enviados
**Solução**:
1. Verificar credenciais: `echo $TWILIO_ACCOUNT_SID $TWILIO_AUTH_TOKEN`
2. Validar em Twilio Console: https://console.twilio.com/
3. Verificar número de telefone: `echo $TWILIO_PHONE_NUMBER`

### ❌ "Invalid phone number format"

**Problema**: Erro ao enviar para número Angola
**Solução**:
Twilio aceita estes formatos:
- ✅ `+244923456789` (com country code)
- ✅ `244923456789` (sem +)
- ✅ `923456789` (9 dígitos - adicionamos 244 automaticamente)
- ❌ `244 923 456 789` (com espaços - remove automaticamente)

Se problema persistir, adicionar número ao Twilio Verified Caller IDs.

### ❌ "Rate limit exceeded"

**Problema**: Muitos emails/SMS enviados rapidamente
**Solução**:
- SendGrid: Limite ~3000 emails/dia (plano free)
- Twilio: Limite ~1000 SMS/dia (plano trial)
- Implementar fila de mensagens (Firebase Cloud Tasks) para envio gradual
- Usar `setTimeout()` entre envios

### ❌ "Email vai para SPAM"

**Problema**: Emails PreçoCerto caem em spam
**Solução**:
1. Em SendGrid, configurar SPF e DKIM:
   - Settings → Sender Authentication → Domain Authentication
   - Adicionar registos DNS do domínio (fornecidos por SendGrid)
2. Usar from name descritivo: "PreçoCerto Automações" (não genérico)
3. Adicionar footer com empresa e link de unsubscribe
4. Testar em https://www.mail-tester.com/

### ⚠️ "WhatsApp sandbox expirou"

**Problema**: Mensagens WhatsApp não são entregues após 3 dias de inatividade
**Solução**:
- Renovar sandbox respondendo: `join [código]` ao número Twilio
- **OU** migrar para WhatsApp Business Account (recomendado para produção)

---

## 7️⃣ Verificação de Produção

### Antes de Fazer Deploy em Produção

```bash
# ✅ 1. Testar todas as integrações localmente
npm run test -- src/integrations/

# ✅ 2. Verificar variáveis de ambiente
firebase functions:config:get

# ✅ 3. Testar Cloud Functions localmente
firebase emulators:start

# ✅ 4. Enviar teste para email real
firebase functions:shell
> SendGridService.sendEmail({to: 'seu-email@example.com', ...})

# ✅ 5. Verificar logs
firebase functions:log --project precocerto-prod

# ✅ 6. Monitorar alertas em Cloud Console
# https://console.cloud.google.com → Cloud Functions → Monitoring
```

### Após Deploy em Produção

1. **Verificar Health Check**:
   ```bash
   curl https://us-central1-precocerto-prod.cloudfunctions.net/healthCheck
   ```

2. **Testar com dados reais** (baixo volume):
   - Criar um alerta manualmente em produção
   - Verificar se email/WhatsApp é recebido

3. **Monitorar primeiras 24h**:
   - Logs: Cloud Functions → Logs
   - Erros: Cloud Monitoring → Alert Policies
   - Taxa de sucesso: Dashboard PreçoCerto

---

## 📞 Suporte

**SendGrid Support**: https://support.sendgrid.com/
**Twilio Support**: https://support.twilio.com/
**Firebase Support**: https://firebase.google.com/support

---

## 🔐 Segurança - Best Practices

✅ **Nunca fazer commit de API Keys** (usar `.env` + `.gitignore`)
✅ **Usar Google Secret Manager** para produção
✅ **Rotacionar API Keys** a cada 6 meses
✅ **Criar API keys com permissões mínimas** (apenas Mail Send para SendGrid)
✅ **Configurar IP Whitelisting** em SendGrid/Twilio se possível
✅ **Monitorar logs** para atividade suspeita
✅ **Testar graceful degradation** se APIs ficarem indisponíveis

---

**Versão**: 1.0
**Última atualização**: 2026-08-22
**Autor**: Claude - Phase 8 Implementation
