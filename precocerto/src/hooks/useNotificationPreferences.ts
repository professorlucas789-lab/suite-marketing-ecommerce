/**
 * Hook para gerenciar preferências de notificação
 * Fase 13: Notificações
 */

import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { NotificationPreferences } from '../types/store';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  resetNotificationPreferences,
  enableNotificationChannel,
  disableNotificationChannel,
  enableNotificationEvent,
  disableNotificationEvent,
  updateQuietHours,
  updateSummaryFrequency,
  isInQuietHours,
} from '../services/notificationPreferencesService';

interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences | null;
  loading: boolean;
  error: string | null;
  isInQuietHours: boolean;

  // Métodos de atualização
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  toggleChannel: (channel: keyof NotificationPreferences['canais']) => Promise<void>;
  toggleEvent: (eventType: keyof NotificationPreferences['eventos']) => Promise<void>;
  setQuietHours: (ativo: boolean, horaInicio: string, horaFim: string) => Promise<void>;
  setSummaryFrequency: (frequency: 'nunca' | 'diaria' | 'semanal' | 'mensal') => Promise<void>;
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = auth.currentUser?.uid;

  // Carregar preferências ao montar
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadPreferences = async () => {
      try {
        setLoading(true);
        setError(null);

        const prefs = await getNotificationPreferences(userId);
        setPreferences(prefs);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao carregar preferências';
        setError(errorMsg);
        console.error('Erro ao carregar preferências de notificação:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [userId]);

  // Atualizar preferências
  const handleUpdatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!userId) throw new Error('Utilizador não autenticado');

    try {
      await updateNotificationPreferences(userId, updates);
      setPreferences((prev) => (prev ? { ...prev, ...updates } : null));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar preferências';
      setError(errorMsg);
      throw err;
    }
  };

  // Resetar para padrão
  const handleResetPreferences = async () => {
    if (!userId) throw new Error('Utilizador não autenticado');

    try {
      await resetNotificationPreferences(userId);
      const prefs = await getNotificationPreferences(userId);
      setPreferences(prefs);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao resetar preferências';
      setError(errorMsg);
      throw err;
    }
  };

  // Toggle canal
  const handleToggleChannel = async (channel: keyof NotificationPreferences['canais']) => {
    if (!userId || !preferences) throw new Error('Utilizador não autenticado');

    try {
      const isEnabled = preferences.canais[channel];

      if (isEnabled) {
        await disableNotificationChannel(userId, channel);
      } else {
        await enableNotificationChannel(userId, channel);
      }

      setPreferences((prev) =>
        prev
          ? {
              ...prev,
              canais: {
                ...prev.canais,
                [channel]: !prev.canais[channel],
              },
            }
          : null
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar canal';
      setError(errorMsg);
      throw err;
    }
  };

  // Toggle evento
  const handleToggleEvent = async (eventType: keyof NotificationPreferences['eventos']) => {
    if (!userId || !preferences) throw new Error('Utilizador não autenticado');

    try {
      const isEnabled = preferences.eventos[eventType];

      if (isEnabled) {
        await disableNotificationEvent(userId, eventType);
      } else {
        await enableNotificationEvent(userId, eventType);
      }

      setPreferences((prev) =>
        prev
          ? {
              ...prev,
              eventos: {
                ...prev.eventos,
                [eventType]: !prev.eventos[eventType],
              },
            }
          : null
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar evento';
      setError(errorMsg);
      throw err;
    }
  };

  // Atualizar horário de não perturbar
  const handleSetQuietHours = async (
    ativo: boolean,
    horaInicio: string,
    horaFim: string
  ) => {
    if (!userId) throw new Error('Utilizador não autenticado');

    try {
      await updateQuietHours(userId, ativo, horaInicio, horaFim);

      setPreferences((prev) =>
        prev
          ? {
              ...prev,
              horarioNaoPerturbar: {
                ativo,
                horaInicio,
                horaFim,
              },
            }
          : null
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar horário';
      setError(errorMsg);
      throw err;
    }
  };

  // Atualizar frequência de resumo
  const handleSetSummaryFrequency = async (
    frequency: 'nunca' | 'diaria' | 'semanal' | 'mensal'
  ) => {
    if (!userId) throw new Error('Utilizador não autenticado');

    try {
      await updateSummaryFrequency(userId, frequency);

      setPreferences((prev) =>
        prev
          ? {
              ...prev,
              frequenciaResumo: frequency,
            }
          : null
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar frequência';
      setError(errorMsg);
      throw err;
    }
  };

  return {
    preferences,
    loading,
    error,
    isInQuietHours: preferences ? isInQuietHours(preferences) : false,
    updatePreferences: handleUpdatePreferences,
    resetPreferences: handleResetPreferences,
    toggleChannel: handleToggleChannel,
    toggleEvent: handleToggleEvent,
    setQuietHours: handleSetQuietHours,
    setSummaryFrequency: handleSetSummaryFrequency,
  };
}
