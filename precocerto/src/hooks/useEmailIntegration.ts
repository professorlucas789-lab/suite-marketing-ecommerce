/**
 * Hook: Email Integration
 * FASE 5: Integrações Avançadas
 *
 * Fornece interface reativa para SendGrid
 */

import { useState, useCallback } from 'react';
import { SendGridEmailService, SendGridEmailPayload } from '../integrations/sendgridEmailService';

export interface EmailSendResult {
  messageId: string;
  success: boolean;
  error?: string;
}

export function useEmailIntegration() {
  const [isConfigured, setIsConfigured] = useState(
    SendGridEmailService.isConfigured()
  );
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<EmailSendResult | null>(null);

  const sendEmail = useCallback(
    async (payload: SendGridEmailPayload): Promise<EmailSendResult> => {
      setIsSending(true);
      setError(null);

      try {
        const result = await SendGridEmailService.sendEmail(payload);

        setLastResult(result);

        if (!result.success) {
          setError('Falha ao enviar email');
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return {
          messageId: '',
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
      email: string,
      productName: string,
      daysUntilExpiry: number,
      severity: 'CRITICAL' | 'WARNING' | 'INFO'
    ): Promise<EmailSendResult> => {
      setIsSending(true);
      setError(null);

      try {
        const result = await SendGridEmailService.sendExpiryAlert(
          email,
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
          messageId: '',
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  const sendDailyAlertReport = useCallback(
    async (
      email: string,
      storeId: string,
      storeName: string,
      criticalCount: number,
      warningCount: number,
      infoCount: number
    ): Promise<EmailSendResult> => {
      setIsSending(true);
      setError(null);

      try {
        const result = await SendGridEmailService.sendDailyAlertReport(
          email,
          storeId,
          storeName,
          criticalCount,
          warningCount,
          infoCount
        );

        setLastResult(result);

        if (!result.success) {
          setError('Falha ao enviar relatório diário');
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return {
          messageId: '',
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  const sendLowStockNotification = useCallback(
    async (
      email: string,
      productName: string,
      currentStock: number,
      minimumStock: number
    ): Promise<EmailSendResult> => {
      setIsSending(true);
      setError(null);

      try {
        const result = await SendGridEmailService.sendLowStockNotification(
          email,
          productName,
          currentStock,
          minimumStock
        );

        setLastResult(result);

        if (!result.success) {
          setError('Falha ao enviar notificação de stock baixo');
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return {
          messageId: '',
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  const sendSalesReport = useCallback(
    async (
      email: string,
      storeId: string,
      storeName: string,
      date: string,
      totalSales: number,
      totalRevenue: number,
      totalUnits: number,
      topProduct: string
    ): Promise<EmailSendResult> => {
      setIsSending(true);
      setError(null);

      try {
        const result = await SendGridEmailService.sendSalesReport(
          email,
          storeId,
          storeName,
          date,
          totalSales,
          totalRevenue,
          totalUnits,
          topProduct
        );

        setLastResult(result);

        if (!result.success) {
          setError('Falha ao enviar relatório de vendas');
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return {
          messageId: '',
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isConfigured,
    isSending,
    error,
    lastResult,

    // Actions
    sendEmail,
    sendExpiryAlert,
    sendDailyAlertReport,
    sendLowStockNotification,
    sendSalesReport,
    clearError,
  };
}
