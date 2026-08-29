/**
 * Hook para Push Notifications
 * FASE 9: Dashboard Mobile com Push Notifications
 *
 * Gerencia configuração, envio e análise de push notifications
 */

import { useState, useEffect, useCallback } from 'react';
import { useStore } from './useStore';
import { PushNotificationService } from '../services/pushNotificationService';
import { PushNotificationConfig, PushNotification } from '../types/mobile';

interface UsePushNotificationsState {
  config: PushNotificationConfig | null;
  isLoading: boolean;
  error: string | null;

  // Histórico
  notificationHistory: PushNotification[];
  totalSent: number;
  totalClicked: number;
  clickRate: number;
}

/**
 * Hook para gerenciar push notifications
 */
export function usePushNotifications() {
  const { currentStore, currentUser } = useStore();
  const [state, setState] = useState<UsePushNotificationsState>({
    config: null,
    isLoading: false,
    error: null,
    notificationHistory: [],
    totalSent: 0,
    totalClicked: 0,
    clickRate: 0,
  });

  /**
   * Registar dispositivo
   */
  const registerDevice = useCallback(
    async (fcmToken: string, deviceId: string, deviceType: 'ios' | 'android') => {
      if (!currentUser?.uid || !currentStore?.storeId) return;

      try {
        await PushNotificationService.registerDevice(
          currentUser.uid,
          currentStore.storeId,
          fcmToken,
          deviceId,
          deviceType
        );

        // Recarregar config
        const config = await PushNotificationService.getPushConfig(
          currentUser.uid,
          currentStore.storeId
        );

        setState((prev) => ({ ...prev, config }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Erro ao registar dispositivo',
        }));
      }
    },
    [currentUser?.uid, currentStore?.storeId]
  );

  /**
   * Carregar configuração de push
   */
  useEffect(() => {
    if (!currentUser?.uid || !currentStore?.storeId) return;

    const loadConfig = async () => {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const config = await PushNotificationService.getPushConfig(
          currentUser.uid,
          currentStore.storeId
        );

        const history = await PushNotificationService.getNotificationHistory(
          currentStore.storeId,
          10
        );

        const stats = await PushNotificationService.getEngagementStats(
          currentStore.storeId,
          7
        );

        setState((prev) => ({
          ...prev,
          config,
          notificationHistory: history,
          totalSent: stats.totalSent,
          totalClicked: stats.totalClicked,
          clickRate: stats.clickRate,
          isLoading: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Erro ao carregar configuração',
          isLoading: false,
        }));
      }
    };

    loadConfig();
  }, [currentUser?.uid, currentStore?.storeId]);

  /**
   * Atualizar configuração
   */
  const updateConfig = useCallback(
    async (updates: Partial<PushNotificationConfig>) => {
      if (!currentUser?.uid || !currentStore?.storeId) return;

      try {
        await PushNotificationService.updatePushConfig(
          currentUser.uid,
          currentStore.storeId,
          updates
        );

        setState((prev) => ({
          ...prev,
          config: prev.config
            ? { ...prev.config, ...updates }
            : null,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Erro ao atualizar configuração',
        }));
      }
    },
    [currentUser?.uid, currentStore?.storeId]
  );

  /**
   * Ativar/desativar tipo de notificação
   */
  const toggleNotificationType = useCallback(
    async (type: keyof PushNotificationConfig['enabledTypes']) => {
      if (!state.config) return;

      const newEnabledTypes = {
        ...state.config.enabledTypes,
        [type]: !state.config.enabledTypes[type],
      };

      await updateConfig({ enabledTypes: newEnabledTypes });
    },
    [state.config, updateConfig]
  );

  /**
   * Ativar/desativar quiet hours
   */
  const toggleQuietHours = useCallback(
    async (enabled: boolean) => {
      if (!state.config) return;

      await updateConfig({
        quietHours: {
          ...state.config.quietHours,
          enabled,
        },
      });
    },
    [state.config, updateConfig]
  );

  /**
   * Atualizar quiet hours
   */
  const updateQuietHours = useCallback(
    async (startTime: string, endTime: string) => {
      if (!state.config) return;

      await updateConfig({
        quietHours: {
          ...state.config.quietHours,
          startTime,
          endTime,
        },
      });
    },
    [state.config, updateConfig]
  );

  /**
   * Registar clique em notificação
   */
  const recordNotificationClick = useCallback(
    async (notificationId: string, deviceId?: string) => {
      if (!currentStore?.storeId) return;

      await PushNotificationService.logEvent(
        currentUser?.uid || '',
        currentStore.storeId,
        notificationId,
        'clicked',
        deviceId
      );
    },
    [currentStore?.storeId, currentUser?.uid]
  );

  /**
   * Remover dispositivo
   */
  const unregisterDevice = useCallback(
    async (deviceId: string) => {
      if (!currentUser?.uid || !currentStore?.storeId) return;

      try {
        await PushNotificationService.unregisterDevice(
          currentUser.uid,
          currentStore.storeId,
          deviceId
        );

        // Recarregar config
        const config = await PushNotificationService.getPushConfig(
          currentUser.uid,
          currentStore.storeId
        );

        setState((prev) => ({ ...prev, config }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Erro ao remover dispositivo',
        }));
      }
    },
    [currentUser?.uid, currentStore?.storeId]
  );

  /**
   * Limpar erro
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // Estado
    config: state.config,
    isLoading: state.isLoading,
    error: state.error,

    // Histórico
    notificationHistory: state.notificationHistory,
    totalSent: state.totalSent,
    totalClicked: state.totalClicked,
    clickRate: state.clickRate,

    // Ações
    registerDevice,
    updateConfig,
    toggleNotificationType,
    toggleQuietHours,
    updateQuietHours,
    recordNotificationClick,
    unregisterDevice,
    clearError,

    // Helpers
    isPushEnabled: state.config?.enabled || false,
    registeredDevices: state.config?.registeredDevices || [],
  };
}
