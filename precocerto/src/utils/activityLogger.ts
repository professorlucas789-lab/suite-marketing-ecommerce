/**
 * Utilidades para registo de atividades do utilizador
 * Fase 11: User Activity Logging
 */

import { db, auth } from '../firebase';
import { addDoc, collection, Timestamp } from 'firebase/firestore';

export type ActivityType = 'login' | 'password_change' | 'avatar_update' | 'profile_update' | 'logout' | 'other';

export interface ActivityLogData {
  userId: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Timestamp;
  ipAddress?: string;
  device?: string;
  metadata?: Record<string, any>;
}

/**
 * Obter informações do dispositivo
 */
const getDeviceInfo = (): string => {
  const ua = navigator.userAgent;

  if (/mobile/i.test(ua)) return 'Telemóvel';
  if (/tablet/i.test(ua)) return 'Tablet';
  if (/windows/i.test(ua)) return 'Windows PC';
  if (/macintosh/i.test(ua)) return 'Mac';
  if (/linux/i.test(ua)) return 'Linux';

  return 'Dispositivo desconhecido';
};

/**
 * Registar uma atividade do utilizador
 */
export async function logActivity(
  type: ActivityType,
  title: string,
  description: string,
  metadata?: Record<string, any>
): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    console.warn('Tentativa de registar atividade sem utilizador autenticado');
    return;
  }

  try {
    const activityData: ActivityLogData = {
      userId: user.uid,
      type,
      title,
      description,
      timestamp: Timestamp.now(),
      device: getDeviceInfo(),
      metadata
    };

    await addDoc(collection(db, 'audit_logs'), activityData);
    console.log(`✓ Atividade registada: ${title}`);
  } catch (error) {
    console.error('Erro ao registar atividade:', error);
    // Não lançar erro - o registo não deve impedir a ação
  }
}

/**
 * Registar login
 */
export async function logLogin(): Promise<void> {
  await logActivity(
    'login',
    'Login realizado',
    'Utilizador fez login com sucesso'
  );
}

/**
 * Registar alteração de senha
 */
export async function logPasswordChange(): Promise<void> {
  await logActivity(
    'password_change',
    'Senha alterada',
    'A senha da conta foi alterada com sucesso'
  );
}

/**
 * Registar atualização de avatar
 */
export async function logAvatarUpdate(action: 'upload' | 'remove'): Promise<void> {
  if (action === 'upload') {
    await logActivity(
      'avatar_update',
      'Avatar atualizado',
      'Uma nova foto de perfil foi enviada'
    );
  } else {
    await logActivity(
      'avatar_update',
      'Avatar removido',
      'A foto de perfil foi removida'
    );
  }
}

/**
 * Registar logout
 */
export async function logLogout(): Promise<void> {
  await logActivity(
    'logout',
    'Logout realizado',
    'Utilizador fez logout'
  );
}

/**
 * Registar atualização de perfil
 */
export async function logProfileUpdate(fields: string[]): Promise<void> {
  await logActivity(
    'profile_update',
    'Perfil atualizado',
    `Os seguintes campos foram alterados: ${fields.join(', ')}`
  );
}
