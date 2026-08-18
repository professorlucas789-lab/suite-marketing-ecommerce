/**
 * Expiry Alert Service
 * Serviço para gerenciar alertas de validade de produtos
 * NOVO (Fase 13): Notificações inteligentes
 */

import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ExpiryAlert, AlertHistory } from '../types/alerts';
import { Product } from '../types';

/**
 * Calcular dias até expiração
 */
export function calculateDaysUntilExpiry(dataValidade: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiryDate = new Date(dataValidade);
  expiryDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Determinar severidade do alerta baseado em dias
 */
export function determineSeverity(daysUntilExpiry: number): 'CRITICAL' | 'WARNING' | 'INFO' {
  if (daysUntilExpiry <= 7) return 'CRITICAL';
  if (daysUntilExpiry <= 30) return 'WARNING';
  return 'INFO';
}

/**
 * Verificar produtos vencendo em uma loja
 */
export async function checkExpiringProducts(
  storeId: string
): Promise<ExpiryAlert[]> {
  try {
    const productsRef = collection(db, 'lojas', storeId, 'products');
    const q = query(
      productsRef,
      where('storeId', '==', storeId)
    );

    const snapshot = await getDocs(q);
    const alerts: ExpiryAlert[] = [];

    for (const docSnap of snapshot.docs) {
      const product = docSnap.data() as Product;

      if (!product.farmaciaDataValidade) continue;

      const daysUntilExpiry = calculateDaysUntilExpiry(
        product.farmaciaDataValidade
      );

      if (daysUntilExpiry <= 60 && daysUntilExpiry > 0) {
        const severity = determineSeverity(daysUntilExpiry);

        alerts.push({
          id: `alert-${product.id}-${Date.now()}`,
          storeId,
          productId: product.id!,
          productName: product.nome,
          dataValidade: product.farmaciaDataValidade,
          daysUntilExpiry,
          severity,
          channels: ['in-app'],
          resolvido: false,
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString(),
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('❌ Erro ao verificar produtos vencendo:', error);
    handleFirestoreError(error, OperationType.LIST, 'expiry-alerts');
    return [];
  }
}

/**
 * Criar novo alerta de validade
 */
export async function createExpiryAlert(
  storeId: string,
  alert: Omit<ExpiryAlert, 'id' | 'criadoEm' | 'atualizadoEm'>
): Promise<string> {
  try {
    const alertId = `exp-${alert.productId}-${Date.now()}`;
    const now = new Date().toISOString();

    const newAlert: ExpiryAlert = {
      id: alertId,
      ...alert,
      criadoEm: now,
      atualizadoEm: now,
    };

    await setDoc(
      doc(db, 'lojas', storeId, 'expiryAlerts', alertId),
      newAlert
    );

    console.log(`✅ Alerta criado: ${alert.productName} (${alertId})`);

    return alertId;
  } catch (error) {
    console.error('❌ Erro ao criar alerta:', error);
    handleFirestoreError(error, OperationType.CREATE, 'expiryAlerts');
    throw error;
  }
}

/**
 * Obter alertas ativos de uma loja
 */
export async function getActiveAlerts(storeId: string): Promise<ExpiryAlert[]> {
  try {
    const q = query(
      collection(db, 'lojas', storeId, 'expiryAlerts'),
      where('resolvido', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as ExpiryAlert);
  } catch (error) {
    console.error('❌ Erro ao obter alertas:', error);
    handleFirestoreError(error, OperationType.LIST, 'expiryAlerts');
    return [];
  }
}

/**
 * Marcar alerta como resolvido
 */
export async function resolveAlert(
  storeId: string,
  alertId: string,
  motivo: string,
  userId: string
): Promise<void> {
  try {
    const now = new Date().toISOString();

    await updateDoc(doc(db, 'lojas', storeId, 'expiryAlerts', alertId), {
      resolvido: true,
      resolvidoEm: now,
      resolvidoPor: userId,
      resolvidoMotivo: motivo,
      atualizadoEm: now,
    });

    console.log(`✅ Alerta resolvido: ${alertId}`);
  } catch (error) {
    console.error('❌ Erro ao resolver alerta:', error);
    handleFirestoreError(error, OperationType.UPDATE, 'expiryAlerts');
    throw error;
  }
}

/**
 * Subscribe a alertas em tempo real
 */
export function subscribeToAlerts(
  storeId: string,
  onUpdate: (alerts: ExpiryAlert[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'lojas', storeId, 'expiryAlerts'),
    where('resolvido', '==', false)
  );

  return onSnapshot(q, (snapshot) => {
    const alerts = snapshot.docs.map((doc) => doc.data() as ExpiryAlert);
    alerts.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });
    onUpdate(alerts);
  });
}
