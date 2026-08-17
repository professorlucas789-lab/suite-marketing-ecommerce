/**
 * Serviço de Automação de Alertas
 * Monitora eventos e dispara notificações automáticas
 * Fase 10: Automação de Alertas
 */

import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { sendNotificationMultiChannel, NotificationPayload, AlertSeverity } from './notificationChannelService';
import { userManagementService } from './userManagementService';

export interface AlertRule {
  id: string;
  name: string;
  type: 'expiry' | 'low-stock' | 'sales-anomaly' | 'margin-warning';
  enabled: boolean;
  storeId: string;
  conditions: {
    daysUntilExpiry?: number; // Para alertas de validade
    minStockLevel?: number; // Para alertas de stock
    maxMarginChange?: number; // % de mudança
    minDailySales?: number; // Para anomalias
  };
  channels: ('in-app' | 'email' | 'whatsapp' | 'sms')[];
  recipientRoles: ('admin' | 'loja-manager' | 'funcionario')[];
  cooldownMinutes?: number; // Não repetir alerta em X minutos
  createdAt: string;
  updatedAt: string;
}

/**
 * Verificar alertas de validade de produtos
 */
export async function checkExpiryAlerts(storeId: string): Promise<string[]> {
  try {
    const alertIds: string[] = [];
    const now = new Date();
    const criticalDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias
    const warningDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias

    // Buscar produtos expirando
    const productsSnapshot = await getDocs(
      query(
        collection(db, `lojas/${storeId}/produtos`),
        where('farmaciaDataValidade', '!=', ''),
        where('ativo', '==', true)
      )
    );

    const usersSnapshot = await getDocs(
      query(collection(db, 'users'), where('storeId', '==', storeId), where('papel', 'in', ['admin', 'loja-manager']))
    );

    for (const doc of productsSnapshot.docs) {
      const product = doc.data();
      const expiryDate = new Date(product.farmaciaDataValidade);

      let severity: AlertSeverity = 'INFO';
      if (expiryDate <= criticalDate) {
        severity = 'CRITICAL';
      } else if (expiryDate <= warningDate) {
        severity = 'WARNING';
      }

      if (expiryDate <= warningDate) {
        const daysUntilExpiry = Math.floor(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Enviar para todos os managers
        for (const userDoc of usersSnapshot.docs) {
          const user = userDoc.data();
          const notification: NotificationPayload = {
            title: `Produto Vencendo em ${daysUntilExpiry} dias`,
            message: `${product.nome} vence em ${expiryDate.toLocaleDateString('pt-AO')}. Ação necessária!`,
            severity,
            channels: ['in-app', 'email', 'whatsapp'],
            recipientId: user.uid,
            recipientEmail: user.email,
            recipientPhone: user.phone,
            metadata: {
              productId: doc.id,
              storeId,
              alertType: 'expiry',
              daysUntilExpiry,
            },
            timestamp: new Date().toISOString(),
          };

          await sendNotificationMultiChannel(notification);
          alertIds.push(doc.id);
        }
      }
    }

    console.log(`✅ Verificação de validade: ${alertIds.length} produtos vencendo`);
    return alertIds;
  } catch (error) {
    console.error('❌ Erro ao verificar alertas de validade:', error);
    return [];
  }
}

/**
 * Verificar alertas de stock baixo
 */
export async function checkLowStockAlerts(storeId: string): Promise<string[]> {
  try {
    const alertIds: string[] = [];

    // Buscar configurações de stock mínimo
    const productsSnapshot = await getDocs(
      collection(db, `lojas/${storeId}/produtos`)
    );

    const usersSnapshot = await getDocs(
      query(collection(db, 'users'), where('storeId', '==', storeId), where('papel', '==', 'admin'))
    );

    for (const doc of productsSnapshot.docs) {
      const product = doc.data();
      const quantidadeDisponível = product.quantidadeDisponível || 0;
      const quantidadeMinima = product.quantidadeMinima || 10;

      if (quantidadeDisponível > 0 && quantidadeDisponível <= quantidadeMinima) {
        const severity = quantidadeDisponível === 0 ? 'CRITICAL' : 'WARNING';

        // Enviar para admins
        for (const userDoc of usersSnapshot.docs) {
          const user = userDoc.data();
          const notification: NotificationPayload = {
            title: `Stock Baixo: ${product.nome}`,
            message: `Quantidade disponível: ${quantidadeDisponível} un. (Mínimo: ${quantidadeMinima} un.)`,
            severity,
            channels: ['in-app', 'email', 'whatsapp'],
            recipientId: user.uid,
            recipientEmail: user.email,
            recipientPhone: user.phone,
            metadata: {
              productId: doc.id,
              storeId,
              alertType: 'low-stock',
              currentQuantity: quantidadeDisponível,
              minQuantity: quantidadeMinima,
            },
            timestamp: new Date().toISOString(),
          };

          await sendNotificationMultiChannel(notification);
          alertIds.push(doc.id);
        }
      }
    }

    console.log(`✅ Verificação de stock: ${alertIds.length} produtos com stock baixo`);
    return alertIds;
  } catch (error) {
    console.error('❌ Erro ao verificar alertas de stock:', error);
    return [];
  }
}

/**
 * Verificar anomalias de margem em vendas
 */
export async function checkMarginAnomalies(storeId: string): Promise<string[]> {
  try {
    const alertIds: string[] = [];
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Buscar vendas de ontem
    const salesSnapshot = await getDocs(
      query(
        collection(db, `lojas/${storeId}/vendas`),
        where('date', '>=', yesterday.toISOString().split('T')[0]),
        where('date', '<=', now.toISOString().split('T')[0])
      )
    );

    // Calcular margem média
    let totalMargin = 0;
    let count = 0;

    salesSnapshot.docs.forEach((doc) => {
      const sale = doc.data();
      totalMargin += sale.margemReal || 0;
      count++;
    });

    if (count === 0) return [];

    const avgMargin = totalMargin / count;
    const minMarginThreshold = avgMargin * 0.7; // 30% abaixo da média = alerta

    // Buscar vendas com margem baixa
    const lowMarginSales = salesSnapshot.docs.filter((doc) => {
      const sale = doc.data();
      return (sale.margemReal || 0) < minMarginThreshold;
    });

    if (lowMarginSales.length > 0) {
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), where('storeId', '==', storeId), where('papel', '==', 'loja-manager'))
      );

      for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data();
        const notification: NotificationPayload = {
          title: `⚠️ Anomalia de Margem Detectada`,
          message: `${lowMarginSales.length} vendas com margem abaixo de ${minMarginThreshold.toFixed(1)}% foram detectadas. Revisar preços.`,
          severity: 'WARNING',
          channels: ['in-app', 'email'],
          recipientId: user.uid,
          recipientEmail: user.email,
          metadata: {
            storeId,
            alertType: 'margin-warning',
            avgMargin: parseFloat(avgMargin.toFixed(2)),
            lowMarginCount: lowMarginSales.length,
          },
          timestamp: new Date().toISOString(),
        };

        await sendNotificationMultiChannel(notification);
        alertIds.push(userDoc.id);
      }
    }

    console.log(`✅ Verificação de margem: ${lowMarginSales.length} vendas com anomalia`);
    return alertIds;
  } catch (error) {
    console.error('❌ Erro ao verificar anomalias de margem:', error);
    return [];
  }
}

/**
 * Enviar resumo diário para managers
 */
export async function sendDailySummary(storeId: string): Promise<void> {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Buscar vendas do dia
    const salesSnapshot = await getDocs(
      query(
        collection(db, `lojas/${storeId}/vendas`),
        where('date', '==', today)
      )
    );

    // Calcular KPIs
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalUnits = 0;
    let totalMargin = 0;

    salesSnapshot.docs.forEach((doc) => {
      const sale = doc.data();
      totalRevenue += sale.totalPrice || 0;
      totalProfit += sale.profitTotal || 0;
      totalUnits += sale.quantity || 0;
      totalMargin += sale.margemReal || 0;
    });

    const avgMargin = salesSnapshot.size > 0 ? totalMargin / salesSnapshot.size : 0;
    const avgTransactionValue = salesSnapshot.size > 0 ? totalRevenue / salesSnapshot.size : 0;

    // Buscar managers
    const usersSnapshot = await getDocs(
      query(collection(db, 'users'), where('storeId', '==', storeId), where('papel', '==', 'loja-manager'))
    );

    const message = `
📊 Resumo do Dia ${now.toLocaleDateString('pt-AO')}

💰 Receita: ${(totalRevenue / 1000).toFixed(1)}K Kz
💵 Lucro: ${(totalProfit / 1000).toFixed(1)}K Kz
📦 Unidades: ${totalUnits}
📈 Margem Média: ${avgMargin.toFixed(1)}%
🎯 Ticket Médio: ${avgTransactionValue.toFixed(0)} Kz
🔢 Transações: ${salesSnapshot.size}
    `.trim();

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const notification: NotificationPayload = {
        title: `Resumo de Vendas - ${now.toLocaleDateString('pt-AO')}`,
        message,
        severity: 'INFO',
        channels: ['in-app', 'email'],
        recipientId: user.uid,
        recipientEmail: user.email,
        metadata: {
          storeId,
          alertType: 'daily-summary',
          totalRevenue,
          totalProfit,
          totalUnits,
          avgMargin: parseFloat(avgMargin.toFixed(2)),
        },
        timestamp: new Date().toISOString(),
      };

      await sendNotificationMultiChannel(notification);
    }

    console.log(`✅ Resumo diário enviado para loja ${storeId}`);
  } catch (error) {
    console.error('❌ Erro ao enviar resumo diário:', error);
  }
}

/**
 * Executar todas as verificações de alertas
 */
export async function runAllAlertChecks(storeId: string): Promise<{
  expiryAlerts: string[];
  stockAlerts: string[];
  marginAnomalies: string[];
}> {
  console.log(`🔍 Iniciando verificação de alertas para loja ${storeId}...`);

  const [expiryAlerts, stockAlerts, marginAnomalies] = await Promise.all([
    checkExpiryAlerts(storeId),
    checkLowStockAlerts(storeId),
    checkMarginAnomalies(storeId),
  ]);

  console.log(`✅ Verificação completa: ${expiryAlerts.length} validade + ${stockAlerts.length} stock + ${marginAnomalies.length} margem`);

  return {
    expiryAlerts,
    stockAlerts,
    marginAnomalies,
  };
}
