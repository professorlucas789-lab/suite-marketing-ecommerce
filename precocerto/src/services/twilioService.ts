/**
 * Serviço Real Twilio
 * Integração real com Twilio API para WhatsApp e SMS
 * Fase 11: Integração Real de Notificações
 */

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  whatsappNumber: string; // Formato: whatsapp:+244...
  smsNumber: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  status: 'sent' | 'failed' | 'pending';
}

/**
 * Validar credenciais Twilio
 */
export async function validateTwilioCredentials(creds: TwilioCredentials): Promise<{
  valid: boolean;
  message: string;
}> {
  try {
    if (!creds.accountSid || !creds.authToken) {
      return {
        valid: false,
        message: 'Account SID e Auth Token são obrigatórios',
      };
    }

    // Chamar Cloud Function para validar
    const response = await fetch(
      `https://us-central1-prcerto.cloudfunctions.net/validateTwilio`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      }
    );

    if (!response.ok) {
      return {
        valid: false,
        message: 'Credenciais inválidas. Verifique Account SID e Auth Token.',
      };
    }

    return {
      valid: true,
      message: 'Credenciais validadas com sucesso!',
    };
  } catch (error) {
    return {
      valid: false,
      message: `Erro ao validar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
    };
  }
}

/**
 * Enviar WhatsApp via Twilio (Real)
 */
export async function sendWhatsAppReal(
  credentials: TwilioCredentials,
  recipientPhone: string,
  message: string
): Promise<SendMessageResult> {
  try {
    if (!credentials.accountSid || !credentials.authToken) {
      return {
        success: false,
        error: 'Credenciais Twilio não configuradas',
        status: 'failed',
      };
    }

    // Chamar Cloud Function que envia via Twilio
    const response = await fetch(
      `https://us-central1-prcerto.cloudfunctions.net/sendWhatsApp`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials,
          recipientPhone,
          message,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Erro ao enviar WhatsApp',
        status: 'failed',
      };
    }

    return {
      success: true,
      messageId: data.messageId || data.sid,
      status: 'sent',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      status: 'failed',
    };
  }
}

/**
 * Enviar SMS via Twilio (Real)
 */
export async function sendSMSReal(
  credentials: TwilioCredentials,
  recipientPhone: string,
  message: string
): Promise<SendMessageResult> {
  try {
    if (!credentials.accountSid || !credentials.authToken) {
      return {
        success: false,
        error: 'Credenciais Twilio não configuradas',
        status: 'failed',
      };
    }

    const response = await fetch(
      `https://us-central1-prcerto.cloudfunctions.net/sendSMS`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials,
          recipientPhone,
          message,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Erro ao enviar SMS',
        status: 'failed',
      };
    }

    return {
      success: true,
      messageId: data.messageId || data.sid,
      status: 'sent',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      status: 'failed',
    };
  }
}

/**
 * Obter credenciais do Firestore
 */
export async function getTwilioCredentialsFromFirestore(
  userId: string
): Promise<TwilioCredentials | null> {
  try {
    // Simular busca de Firestore
    // Em produção:
    // const doc = await getDoc(doc(db, `users/${userId}/twilioConfig/main`));
    // return doc.data() || null;

    const stored = localStorage.getItem(`twilio-${userId}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar credenciais Twilio:', error);
    return null;
  }
}

/**
 * Guardar credenciais no Firestore
 */
export async function saveTwilioCredentialsToFirestore(
  userId: string,
  credentials: TwilioCredentials
): Promise<boolean> {
  try {
    // Em produção:
    // await setDoc(doc(db, `users/${userId}/twilioConfig/main`), credentials);

    localStorage.setItem(`twilio-${userId}`, JSON.stringify(credentials));
    console.log(`✅ Credenciais Twilio guardadas para ${userId}`);
    return true;
  } catch (error) {
    console.error('Erro ao guardar credenciais Twilio:', error);
    return false;
  }
}

/**
 * Testar conexão com Twilio
 */
export async function testTwilioConnection(
  credentials: TwilioCredentials,
  testPhone: string
): Promise<SendMessageResult> {
  const testMessage = `🧪 Teste Twilio PreçoCerto - ${new Date().toLocaleTimeString('pt-AO')}`;

  console.log('🔍 Testando conexão com Twilio...');
  console.log('Enviando para:', testPhone);

  const result = await sendWhatsAppReal(credentials, testPhone, testMessage);

  if (result.success) {
    console.log('✅ Conexão bem-sucedida! Message ID:', result.messageId);
  } else {
    console.error('❌ Erro na conexão:', result.error);
  }

  return result;
}
