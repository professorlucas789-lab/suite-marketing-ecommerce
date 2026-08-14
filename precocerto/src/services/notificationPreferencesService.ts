/**
 * Serviço de Preferências de Notificação
 * Gerencia as preferências do utilizador no Firestore
 * Fase 13: Notificações
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { NotificationPreferences } from '../types/store';

/**
 * Preferências padrão para novo utilizador
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<
  NotificationPreferences,
  'userId' | 'dataCriacao' | 'dataAtualizacao'
> = {
  canais: {
    email: true,
    push: false,
    inApp: true,
  },
  eventos: {
    produtoAdicionado: true,
    produtoEditado: true,
    produtoDeletado: true,
    utilizadorCriado: false,
    utilizadorAlterado: false,
    precoAlterado: true,
    relatoriosGerados: true,
    alertasSeguranca: true,
    manutencaoSistema: true,
  },
  frequenciaResumo: 'diaria',
  horarioNaoPerturbar: {
    ativo: true,
    horaInicio: '22:00',
    horaFim: '08:00',
  },
};

/**
 * Obter preferências do utilizador
 * Se não existirem, retorna padrão
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'notifications');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as NotificationPreferences;
    }

    // Criar preferências padrão
    console.log(`📧 Criando preferências padrão para: ${userId}`);
    const defaultPrefs: NotificationPreferences = {
      userId,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      dataCriacao: new Date().toISOString(),
      dataAtualizacao: new Date().toISOString(),
    };

    await setDoc(docRef, defaultPrefs);
    return defaultPrefs;
  } catch (error) {
    console.error('❌ Erro ao obter preferências de notificação:', error);
    throw error;
  }
}

/**
 * Atualizar preferências do utilizador
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<NotificationPreferences>
): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'notifications');

    await updateDoc(docRef, {
      ...updates,
      dataAtualizacao: new Date().toISOString(),
    });

    console.log(`✅ Preferências de notificação atualizadas para: ${userId}`);
  } catch (error) {
    console.error('❌ Erro ao atualizar preferências de notificação:', error);
    throw error;
  }
}

/**
 * Resetar para preferências padrão
 */
export async function resetNotificationPreferences(userId: string): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'notifications');

    const defaultPrefs: NotificationPreferences = {
      userId,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      dataCriacao: new Date().toISOString(),
      dataAtualizacao: new Date().toISOString(),
    };

    await setDoc(docRef, defaultPrefs);
    console.log(`🔄 Preferências de notificação resetadas para: ${userId}`);
  } catch (error) {
    console.error('❌ Erro ao resetar preferências de notificação:', error);
    throw error;
  }
}

/**
 * Verificar se deve enviar notificação baseado em preferências
 */
export async function shouldSendNotification(
  userId: string,
  eventType: keyof NotificationPreferences['eventos'],
  channel: keyof NotificationPreferences['canais'] = 'email'
): Promise<boolean> {
  try {
    const prefs = await getNotificationPreferences(userId);

    // 1. Verificar se canal está ativo
    if (!prefs.canais[channel]) {
      return false;
    }

    // 2. Verificar se tipo de evento está ativo
    if (!prefs.eventos[eventType]) {
      return false;
    }

    // 3. Verificar se está dentro do horário permitido
    if (prefs.horarioNaoPerturbar.ativo) {
      const agora = new Date();
      const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(
        agora.getMinutes()
      ).padStart(2, '0')}`;

      const { horaInicio, horaFim } = prefs.horarioNaoPerturbar;

      // Se horaFim < horaInicio (ex: 22:00 a 08:00), atravessa a meia-noite
      if (horaInicio < horaFim) {
        // Horário normal (ex: 08:00 a 22:00)
        if (horaAtual >= horaInicio && horaAtual < horaFim) {
          return false; // Está no horário de não perturbar
        }
      } else {
        // Horário inverted (ex: 22:00 a 08:00)
        if (horaAtual >= horaInicio || horaAtual < horaFim) {
          return false; // Está no horário de não perturbar
        }
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar se deve enviar notificação:', error);
    return false;
  }
}

/**
 * Habilitar canal específico
 */
export async function enableNotificationChannel(
  userId: string,
  channel: keyof NotificationPreferences['canais']
): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'notifications');
    await updateDoc(docRef, {
      [`canais.${channel}`]: true,
      dataAtualizacao: new Date().toISOString(),
    });
    console.log(`✅ Canal '${channel}' habilitado para: ${userId}`);
  } catch (error) {
    console.error(`❌ Erro ao habilitar canal '${channel}':`, error);
    throw error;
  }
}

/**
 * Desabilitar canal específico
 */
export async function disableNotificationChannel(
  userId: string,
  channel: keyof NotificationPreferences['canais']
): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'notifications');
    await updateDoc(docRef, {
      [`canais.${channel}`]: false,
      dataAtualizacao: new Date().toISOString(),
    });
    console.log(`✅ Canal '${channel}' desabilitado para: ${userId}`);
  } catch (error) {
    console.error(`❌ Erro ao desabilitar canal '${channel}':`, error);
    throw error;
  }
}

/**
 * Habilitar tipo de evento
 */
export async function enableNotificationEvent(
  userId: string,
  eventType: keyof NotificationPreferences['eventos']
): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'notifications');
    await updateDoc(docRef, {
      [`eventos.${eventType}`]: true,
      dataAtualizacao: new Date().toISOString(),
    });
    console.log(`✅ Evento '${eventType}' habilitado para: ${userId}`);
  } catch (error) {
    console.error(`❌ Erro ao habilitar evento '${eventType}':`, error);
    throw error;
  }
}

/**
 * Desabilitar tipo de evento
 */
export async function disableNotificationEvent(
  userId: string,
  eventType: keyof NotificationPreferences['eventos']
): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'notifications');
    await updateDoc(docRef, {
      [`eventos.${eventType}`]: false,
      dataAtualizacao: new Date().toISOString(),
    });
    console.log(`✅ Evento '${eventType}' desabilitado para: ${userId}`);
  } catch (error) {
    console.error(`❌ Erro ao desabilitar evento '${eventType}':`, error);
    throw error;
  }
}

/**
 * Atualizar horário de não perturbar
 */
export async function updateQuietHours(
  userId: string,
  ativo: boolean,
  horaInicio: string,
  horaFim: string
): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'notifications');
    await updateDoc(docRef, {
      horarioNaoPerturbar: {
        ativo,
        horaInicio,
        horaFim,
      },
      dataAtualizacao: new Date().toISOString(),
    });
    console.log(`✅ Horário de não perturbar atualizado para: ${userId}`);
  } catch (error) {
    console.error('❌ Erro ao atualizar horário de não perturbar:', error);
    throw error;
  }
}

/**
 * Atualizar frequência de resumo
 */
export async function updateSummaryFrequency(
  userId: string,
  frequency: 'nunca' | 'diaria' | 'semanal' | 'mensal'
): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'notifications');
    await updateDoc(docRef, {
      frequenciaResumo: frequency,
      dataAtualizacao: new Date().toISOString(),
    });
    console.log(`✅ Frequência de resumo atualizada para: ${userId} (${frequency})`);
  } catch (error) {
    console.error('❌ Erro ao atualizar frequência de resumo:', error);
    throw error;
  }
}

/**
 * Verificar se está no horário de não perturbar
 */
export function isInQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.horarioNaoPerturbar.ativo) {
    return false;
  }

  const agora = new Date();
  const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(
    agora.getMinutes()
  ).padStart(2, '0')}`;

  const { horaInicio, horaFim } = prefs.horarioNaoPerturbar;

  // Se horaFim < horaInicio (ex: 22:00 a 08:00), atravessa a meia-noite
  if (horaInicio < horaFim) {
    // Horário normal (ex: 08:00 a 22:00)
    return horaAtual >= horaInicio && horaAtual < horaFim;
  } else {
    // Horário inverted (ex: 22:00 a 08:00)
    return horaAtual >= horaInicio || horaAtual < horaFim;
  }
}
