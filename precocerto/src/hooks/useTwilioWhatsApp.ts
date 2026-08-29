/**
 * Hook: Twilio WhatsApp Integration
 * FASE 5: Integrações Avançadas
 *
 * Fornece interface reativa para Twilio WhatsApp
 */

import { useState, useCallback } from 'react';
import { TwilioWhatsAppService, WhatsAppTemplate } from '../integrations/twilioWhatsappService';

export interface WhatsAppSendResult {
  messageSid: string;
  success: boolean;
  error?: string;
}

export function useTwilioWhatsApp() {
  const [isConfigured, setIsConfigured] = useState(
    TwilioWhatsAppService.isConfigured()
  );
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<WhatsAppSendResult | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const sendMessage = useCallback(
    async (
      phoneNumber: string,
      message: string,
      mediaUrl?: string
    ): Promise<WhatsAppSendResult> => {
      setIsSending(true);
      setError(null);

      try {
        // Validar número
        if (!TwilioWhatsAppService.validatePhoneNumber(phoneNumber)) {
          throw new Error('Número de telefone inválido');
        }

        // Normalizar número
        const normalizedPhone = TwilioWhatsAppService.normalizePhoneNumber(phoneNumber);

        const result = await TwilioWhatsAppService.sendMessage(
          normalizedPhone,
          message,
          mediaUrl
        );

        setLastResult(result);

        if (!result.success) {
          setError('Falha ao enviar mensagem WhatsApp');
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return {
          messageSid: '',
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  const sendExpiryAlert = useCallback(
    async (
      phoneNumber: string,
      productName: string,
      daysUntilExpiry: number,
      severity: 'CRITICAL' | 'WARNING' | 'INFO'
    ): Promise<WhatsAppSendResult> => {
      setIsSending(true);
      setError(null);

      try {
        if (!TwilioWhatsAppService.validatePhoneNumber(phoneNumber)) {
          throw new Error('Número de telefone inválido');
        }

        const result = await TwilioWhatsAppService.sendExpiryAlert(
          phoneNumber,
          productName,
          daysUntilExpiry,
          severity
        );

        setLastResult(result);

        if (!result.success) {
          setError('Falha ao enviar alerta de validade');
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return {
          messageSid: '',
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  const sendLowStockAlert = useCallback(
    async (
      phoneNumber: string,
      productName: string,
      currentStock: number,
      minimumStock: number
    ): Promise<WhatsAppSendResult> => {
      setIsSending(true);
      setError(null);

      try {
        if (!TwilioWhatsAppService.validatePhoneNumber(phoneNumber)) {
          throw new Error('Número de telefone inválido');
        }

        const result = await TwilioWhatsAppService.sendLowStockAlert(
          phoneNumber,
          productName,
          currentStock,
          minimumStock
        );

        setLastResult(result);

        if (!result.success) {
          setError('Falha ao enviar alerta de stock baixo');
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return {
          messageSid: '',
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  const sendDailySalesDigest = useCallback(
    async (
      phoneNumber: string,
      storeId: string,
      storeName: string,
      date: string,
      totalSales: number,
      totalRevenue: number,
      topProduct: string
    ): Promise<WhatsAppSendResult> => {
      setIsSending(true);
      setError(null);

      try {
        if (!TwilioWhatsAppService.validatePhoneNumber(phoneNumber)) {
          throw new Error('Número de telefone inválido');
        }

        const result = await TwilioWhatsAppService.sendDailySalesDigest(
          phoneNumber,
          storeId,
          storeName,
          date,
          totalSales,
          totalRevenue,
          topProduct
        );

        setLastResult(result);

        if (!result.success) {
          setError('Falha ao enviar resumo de vendas');
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return {
          messageSid: '',
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  const sendWelcomeMessage = useCallback(
    async (phoneNumber: string, userName: string): Promise<WhatsAppSendResult> => {
      setIsSending(true);
      setError(null);

      try {
        if (!TwilioWhatsAppService.validatePhoneNumber(phoneNumber)) {
          throw new Error('Número de telefone inválido');
        }

        const result = await TwilioWhatsAppService.sendWelcomeMessage(
          phoneNumber,
          userName
        );

        setLastResult(result);

        if (!result.success) {
          setError('Falha ao enviar mensagem de boas-vindas');
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return {
          messageSid: '',
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  const sendCriticalAlertsReport = useCallback(
    async (
      phoneNumber: string,
      storeName: string,
      criticalCount: number,
      warningCount: number
    ): Promise<WhatsAppSendResult> => {
      setIsSending(true);
      setError(null);

      try {
        if (!TwilioWhatsAppService.validatePhoneNumber(phoneNumber)) {
          throw new Error('Número de telefone inválido');
        }

        const result = await TwilioWhatsAppService.sendCriticalAlertsReport(
          phoneNumber,
          storeName,
          criticalCount,
          warningCount
        );

        setLastResult(result);

        if (!result.success) {
          setError('Falha ao enviar relatório de alertas');
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return {
          messageSid: '',
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  const loadApprovedTemplates = useCallback(async () => {
    setTemplatesLoading(true);

    try {
      const loadedTemplates = await TwilioWhatsAppService.getApprovedTemplates();
      setTemplates(loadedTemplates);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar templates';
      setError(errorMessage);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const validatePhoneNumber = useCallback((phoneNumber: string): boolean => {
    return TwilioWhatsAppService.validatePhoneNumber(phoneNumber);
  }, []);

  const normalizePhoneNumber = useCallback((phoneNumber: string): string => {
    return TwilioWhatsAppService.normalizePhoneNumber(phoneNumber);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isConfigured,
    isSending,
    error,
    lastResult,
    templates,
    templatesLoading,

    // Actions
    sendMessage,
    sendExpiryAlert,
    sendLowStockAlert,
    sendDailySalesDigest,
    sendWelcomeMessage,
    sendCriticalAlertsReport,
    loadApprovedTemplates,
    validatePhoneNumber,
    normalizePhoneNumber,
    clearError,
  };
}
