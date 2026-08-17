/**
 * Configuração Twilio
 * Setup para WhatsApp e SMS
 * Fase 10: Automação de Alertas
 */

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string; // Número Twilio para WhatsApp (formato: whatsapp:+244...)
  smsNumber: string; // Número Twilio para SMS
  enabled: boolean;
}

/**
 * Carregar configuração Twilio do ambiente
 * Em produção, usar variáveis de ambiente seguras
 */
export function getTwilioConfig(): TwilioConfig {
  const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID || '';
  const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN || '';
  const whatsappNumber = import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER || 'whatsapp:+1415555100';
  const smsNumber = import.meta.env.VITE_TWILIO_SMS_NUMBER || '+1415555100';

  return {
    accountSid,
    authToken,
    whatsappNumber,
    smsNumber,
    enabled: !!accountSid && !!authToken,
  };
}

/**
 * Validar configuração Twilio
 */
export function validateTwilioConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = getTwilioConfig();

  if (!config.accountSid) {
    errors.push('VITE_TWILIO_ACCOUNT_SID não configurado');
  }

  if (!config.authToken) {
    errors.push('VITE_TWILIO_AUTH_TOKEN não configurado');
  }

  if (!config.whatsappNumber) {
    errors.push('VITE_TWILIO_WHATSAPP_NUMBER não configurado');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Formato de telefone Twilio
 * Converte: 923456789 → +244923456789
 */
export function formatPhoneForTwilio(phone: string): string {
  // Remover caracteres especiais
  let cleaned = phone.replace(/\D/g, '');

  // Se não começar com código país, adicionar Angola (+244)
  if (!cleaned.startsWith('244')) {
    cleaned = '244' + cleaned;
  }

  return '+' + cleaned;
}

/**
 * Formato WhatsApp Twilio
 * Converte: +244923456789 → whatsapp:+244923456789
 */
export function formatPhoneForWhatsApp(phone: string): string {
  const formatted = formatPhoneForTwilio(phone);
  return `whatsapp:${formatted}`;
}
