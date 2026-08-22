/**
 * Hook: useAutomatedNotifications
 * Gerencia ativação e monitoramento de automações
 * Fase: Integrações Avançadas
 */

import { useState, useCallback, useEffect } from 'react';
import { NotificationService } from '../services/notificationService';
import { AutomatedAlertsService } from '../services/automatedAlertsService';
import { DailyReportService } from '../services/dailyReportService';

interface AutomationStatus {
  stockAlerts: boolean;
  expiryAlerts: boolean;
  dailyReports: boolean;
  realTimeSync: boolean;
}

interface AutomationMetrics {
  lastCheckTime?: string;
  alertsTriggeredToday: number;
  notificationsSent: number;
  unreadNotifications: number;
}

interface UseAutomatedNotificationsState {
  status: AutomationStatus;
  metrics: AutomationMetrics;
  loading: boolean;
  error: string | null;
}

interface UseAutomatedNotificationsActions {
  enableStockAlerts: () => Promise<void>;
  disableStockAlerts: () => Promise<void>;
  enableExpiryAlerts: () => Promise<void>;
  disableExpiryAlerts: () => Promise<void>;
  enableDailyReports: () => Promise<void>;
  disableDailyReports: () => Promise<void>;
  runImmediateCheck: () => Promise<void>;
  sendTestNotification: () => Promise<void>;
}

export function useAutomatedNotifications(
  storeId: string,
  userId: string
): [UseAutomatedNotificationsState, UseAutomatedNotificationsActions] {
  const [state, setState] = useState<UseAutomatedNotificationsState>({
    status: {
      stockAlerts: true,
      expiryAlerts: true,
      dailyReports: true,
      realTimeSync: true,
    },
    metrics: {
      alertsTriggeredToday: 0,
      notificationsSent: 0,
      unreadNotifications: 0,
    },
    loading: false,
    error: null,
  });

  // Carregar status inicial
  useEffect(() => {
    const loadAutomationStatus = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true }));

        // Obter preferências de notificação
        const preferences = await NotificationService.getNotificationPreferences(
          userId,
          storeId
        );

        // Contar notificações não lidas
        const unreadCount = await NotificationService.getUnreadCount(storeId, userId);

        setState((prev) => ({
          ...prev,
          metrics: {
            ...prev.metrics,
            unreadNotifications: unreadCount,
          },
          loading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Erro ao carregar status',
          loading: false,
        }));
      }
    };

    if (storeId && userId) {
      loadAutomationStatus();
    }
  }, [storeId, userId]);

  /**
   * Ativar alertas de stock
   */
  const enableStockAlerts = useCallback(async () => {
    try {
      const preferences = await NotificationService.getNotificationPreferences(userId, storeId);

      if (preferences) {
        await NotificationService.saveNotificationPreferences({
          ...preferences,
          stockAlerts: true,
        });
      } else {
        await NotificationService.saveNotificationPreferences({
          userId,
          storeId,
          enableInApp: true,
          enableEmail: true,
          enableWhatsApp: true,
          enableSms: false,
          stockAlerts: true,
          expiryAlerts: true,
          saleAlerts: true,
          paymentAlerts: true,
          dailyReports: true,
        });
      }

      setState((prev) => ({
        ...prev,
        status: { ...prev.status, stockAlerts: true },
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao ativar alertas',
      }));
    }
  }, [storeId, userId]);

  /**
   * Desativar alertas de stock
   */
  const disableStockAlerts = useCallback(async () => {
    try {
      const preferences = await NotificationService.getNotificationPreferences(userId, storeId);

      if (preferences) {
        await NotificationService.saveNotificationPreferences({
          ...preferences,
          stockAlerts: false,
        });
      }

      setState((prev) => ({
        ...prev,
        status: { ...prev.status, stockAlerts: false },
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao desativar alertas',
      }));
    }
  }, [storeId, userId]);

  /**
   * Ativar alertas de validade
   */
  const enableExpiryAlerts = useCallback(async () => {
    try {
      const preferences = await NotificationService.getNotificationPreferences(userId, storeId);

      if (preferences) {
        await NotificationService.saveNotificationPreferences({
          ...preferences,
          expiryAlerts: true,
        });
      }

      setState((prev) => ({
        ...prev,
        status: { ...prev.status, expiryAlerts: true },
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao ativar alertas',
      }));
    }
  }, [storeId, userId]);

  /**
   * Desativar alertas de validade
   */
  const disableExpiryAlerts = useCallback(async () => {
    try {
      const preferences = await NotificationService.getNotificationPreferences(userId, storeId);

      if (preferences) {
        await NotificationService.saveNotificationPreferences({
          ...preferences,
          expiryAlerts: false,
        });
      }

      setState((prev) => ({
        ...prev,
        status: { ...prev.status, expiryAlerts: false },
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao desativar alertas',
      }));
    }
  }, [storeId, userId]);

  /**
   * Ativar relatórios diários
   */
  const enableDailyReports = useCallback(async () => {
    try {
      const preferences = await NotificationService.getNotificationPreferences(userId, storeId);

      if (preferences) {
        await NotificationService.saveNotificationPreferences({
          ...preferences,
          dailyReports: true,
          dailyReportTime: '08:00', // 8h da manhã
        });
      }

      setState((prev) => ({
        ...prev,
        status: { ...prev.status, dailyReports: true },
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao ativar relatórios',
      }));
    }
  }, [storeId, userId]);

  /**
   * Desativar relatórios diários
   */
  const disableDailyReports = useCallback(async () => {
    try {
      const preferences = await NotificationService.getNotificationPreferences(userId, storeId);

      if (preferences) {
        await NotificationService.saveNotificationPreferences({
          ...preferences,
          dailyReports: false,
        });
      }

      setState((prev) => ({
        ...prev,
        status: { ...prev.status, dailyReports: false },
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao desativar relatórios',
      }));
    }
  }, [storeId, userId]);

  /**
   * Executar verificação imediata de alertas
   */
  const runImmediateCheck = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));

      const result = await AutomatedAlertsService.runFullAlertCheck(storeId);

      setState((prev) => ({
        ...prev,
        loading: false,
        metrics: {
          ...prev.metrics,
          lastCheckTime: new Date().toISOString(),
          alertsTriggeredToday: result.alertsTriggered,
        },
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao executar verificação',
        loading: false,
      }));
    }
  }, [storeId]);

  /**
   * Enviar notificação de teste
   */
  const sendTestNotification = useCallback(async () => {
    try {
      await NotificationService.sendNotification({
        storeId,
        userId,
        type: 'daily_report',
        title: '✅ Teste de Notificação',
        message: 'Se vês esta mensagem, as automações estão funcionando corretamente!',
        priority: 'normal',
        channels: ['in-app', 'email', 'whatsapp'],
      });

      setState((prev) => ({
        ...prev,
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao enviar teste',
      }));
    }
  }, [storeId, userId]);

  return [
    state,
    {
      enableStockAlerts,
      disableStockAlerts,
      enableExpiryAlerts,
      disableExpiryAlerts,
      enableDailyReports,
      disableDailyReports,
      runImmediateCheck,
      sendTestNotification,
    },
  ];
}
