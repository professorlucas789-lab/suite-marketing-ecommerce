/**
 * Cloud Function: Verificar Produtos Expirando
 * FASE 4: Integrações e Automação
 *
 * Executado: Diariamente às 07:00 (UTC)
 * Responsabilidade: Verificar todos os produtos de todas as lojas e enviar alertas
 *
 * Triggers:
 * - Cloud Scheduler: Cron diário
 * - Manual: Endpoint HTTP
 */

import { https } from 'firebase-functions';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { sendNotification, getNotificationPreferences } from './notificationOrchestrator';
import { ExpiryNotificationData, NotificationPayload } from './types';

const apps = getApps();
if (apps.length === 0) {
  initializeApp({
    credential: cert(
      JSON.parse(process.env.FIREBASE_ADMIN_SDK || '{}')
    ),
  });
}

const db = getFirestore();

/**
 * Cloud Function: Verificar produtos expirando
 * Entrada: Cloud Scheduler → HTTP Trigger
 */
export const checkExpiringProducts = https.onRequest(async (req, res) => {
  console.log('🕒 [Cron] Iniciando verificação de produtos expirando...');

  try {
    const result = await checkAllStoresForExpiringProducts();
    res.status(200).json({
      success: true,
      message: 'Verificação de expirados completada',
      result,
    });
  } catch (error) {
    console.error('Erro ao verificar produtos expirando:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Verificar todas as lojas para produtos expirando
 */
async function checkAllStoresForExpiringProducts() {
  const storesSnapshot = await db.collection('stores').get();
  const results = [];

  console.log(`📍 Verificando ${storesSnapshot.size} lojas...`);

  for (const storeDoc of storesSnapshot.docs) {
    const storeId = storeDoc.id;
    const store = storeDoc.data();

    try {
      const storeResult = await checkStoreForExpiringProducts(storeId, store.name || storeId);
      results.push(storeResult);
    } catch (error) {
      console.error(`Erro ao verificar loja ${storeId}:`, error);
      results.push({ storeId, error: String(error) });
    }
  }

  return {
    storesChecked: results.length,
    results,
  };
}

/**
 * Verificar loja específica para produtos expirando
 */
async function checkStoreForExpiringProducts(storeId: string, storeName: string) {
  console.log(`\n🏪 Verificando loja: ${storeName} (${storeId})`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Datas de corte
  const in2Days = new Date(today);
  in2Days.setDate(in2Days.getDate() + 2);

  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);

  // Query: produtos com validade < 30 dias
  const productsSnapshot = await db
    .collection('products')
    .where('storeId', '==', storeId)
    .where('farmaciaDataValidade', '>', new Date(today.getTime() - 86400000)) // Não vencidos ontem
    .where('farmaciaDataValidade', '<=', new Date(in30Days.getTime()))
    .get();

  if (productsSnapshot.empty) {
    console.log('  ✅ Nenhum produto expirando detectado');
    return { storeId, storeName, alertsCreated: 0 };
  }

  console.log(`  ⚠️ Encontrados ${productsSnapshot.size} produtos em risco`);

  // Categorizar por severidade
  const criticalProducts = [];
  const warningProducts = [];
  const infoProducts = [];

  for (const doc of productsSnapshot.docs) {
    const product = doc.data();
    const expiryDate = product.farmaciaDataValidade
      ? new Date(product.farmaciaDataValidade)
      : null;

    if (!expiryDate) continue;

    expiryDate.setHours(0, 0, 0, 0);
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Categorizar
    if (daysUntilExpiry < 0) {
      // Já venceu - ignorar (foi verificado em cron anterior)
      continue;
    } else if (daysUntilExpiry <= 2) {
      criticalProducts.push({ product, daysUntilExpiry });
    } else if (daysUntilExpiry <= 7) {
      warningProducts.push({ product, daysUntilExpiry });
    } else {
      infoProducts.push({ product, daysUntilExpiry });
    }
  }

  // Enviar alertas por severidade
  let alertsCreated = 0;

  if (criticalProducts.length > 0) {
    alertsCreated += await sendExpiryAlerts(
      storeId,
      storeName,
      criticalProducts,
      'CRITICAL'
    );
  }

  if (warningProducts.length > 0) {
    alertsCreated += await sendExpiryAlerts(
      storeId,
      storeName,
      warningProducts,
      'WARNING'
    );
  }

  if (infoProducts.length > 0) {
    alertsCreated += await sendExpiryAlerts(
      storeId,
      storeName,
      infoProducts,
      'INFO'
    );
  }

  console.log(`  📧 ${alertsCreated} alertas criados`);

  return {
    storeId,
    storeName,
    alertsCreated,
    breakdown: {
      critical: criticalProducts.length,
      warning: warningProducts.length,
      info: infoProducts.length,
    },
  };
}

/**
 * Enviar alertas de validade para um grupo de produtos
 */
async function sendExpiryAlerts(
  storeId: string,
  storeName: string,
  products: Array<{ product: any; daysUntilExpiry: number }>,
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
): Promise<number> {
  const preferences = await getNotificationPreferences(storeId);

  if (!preferences?.expiryAlerts?.enabled) {
    console.log(`  ℹ️ Alertas de validade desabilitados para esta loja`);
    return 0;
  }

  let alertsCreated = 0;

  for (const { product, daysUntilExpiry } of products) {
    try {
      const notificationData: ExpiryNotificationData = {
        productId: product.id,
        productName: product.nome,
        daysUntilExpiry,
        currentQuantity: product.quantidadeDisponivel || 0,
        batchNumber: product.batchNumber,
        expiryDate: product.farmaciaDataValidade,
      };

      // Mensagens por severidade
      const messages = {
        CRITICAL: {
          subject: `🚨 CRÍTICO: ${product.nome} vence em ${daysUntilExpiry} dias`,
          message: `O produto "${product.nome}" vence em ${daysUntilExpiry} dias (${new Date(product.farmaciaDataValidade).toLocaleDateString('pt-PT')}). Quantidade: ${product.quantidadeDisponivel}. Ação imediata necessária!`,
        },
        WARNING: {
          subject: `⚠️ AVISO: ${product.nome} vence em ${daysUntilExpiry} dias`,
          message: `O produto "${product.nome}" vence em ${daysUntilExpiry} dias (${new Date(product.farmaciaDataValidade).toLocaleDateString('pt-PT')}). Considere estratégia de venda.`,
        },
        INFO: {
          subject: `ℹ️ Validade: ${product.nome} vence em ${daysUntilExpiry} dias`,
          message: `Acompanhamento: "${product.nome}" vence em ${daysUntilExpiry} dias. Stock disponível: ${product.quantidadeDisponivel}.`,
        },
      };

      const messageContent = messages[severity];

      const payload: NotificationPayload = {
        storeId,
        storeName,
        type: 'expiry_alert',
        severity,
        channels: preferences.expiryAlerts.channels || ['in-app', 'email'],
        subject: messageContent.subject,
        message: messageContent.message,
        htmlContent: generateExpiryAlertHTML(
          product,
          daysUntilExpiry,
          severity,
          storeName
        ),
        data: notificationData,
        recipientEmail: getManagerEmail(storeId),
        recipientPhone: getManagerPhone(storeId),
        timestamp: new Date().toISOString(),
      };

      // Enviar notificação
      await sendNotification(payload);

      // Salvar alerta no Firestore para auditoria
      await db
        .collection('stores')
        .doc(storeId)
        .collection('expiryAlerts')
        .add({
          productId: product.id,
          productName: product.nome,
          severity,
          daysUntilExpiry,
          currentQuantity: product.quantidadeDisponível,
          expiryDate: product.farmaciaDataValidade,
          createdAt: new Date().toISOString(),
          acknowledged: false,
        });

      alertsCreated++;
    } catch (error) {
      console.error(
        `Erro ao enviar alerta para ${product.nome}:`,
        error
      );
    }
  }

  return alertsCreated;
}

/**
 * Gerar HTML do alerta de validade
 */
function generateExpiryAlertHTML(
  product: any,
  daysUntilExpiry: number,
  severity: string,
  storeName: string
): string {
  const bgColor =
    severity === 'CRITICAL'
      ? '#dc2626'
      : severity === 'WARNING'
        ? '#ea580c'
        : '#3b82f6';
  const emoji = severity === 'CRITICAL' ? '🚨' : severity === 'WARNING' ? '⚠️' : 'ℹ️';

  return `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="background: ${bgColor}; color: white; padding: 15px; border-radius: 4px; text-align: center;">
            <h2 style="margin: 0;">${emoji} Alerta de Validade</h2>
            <p style="margin: 5px 0;">${storeName}</p>
          </div>

          <div style="margin: 20px 0;">
            <p><strong>Produto:</strong> ${product.nome}</p>
            <p><strong>Data de Vencimento:</strong> ${new Date(product.farmaciaDataValidade).toLocaleDateString('pt-PT')}</p>
            <p><strong>Dias Até Vencimento:</strong> <span style="color: ${bgColor}; font-weight: bold;">${daysUntilExpiry} dias</span></p>
            <p><strong>Quantidade Disponível:</strong> ${product.quantidadeDisponível} unidades</p>
            ${product.batchNumber ? `<p><strong>Lote:</strong> ${product.batchNumber}</p>` : ''}
          </div>

          <div style="background: #f0f0f0; padding: 15px; border-left: 4px solid ${bgColor}; margin: 20px 0;">
            <p><strong>Recomendação:</strong></p>
            <ul>
              ${severity === 'CRITICAL' ? '<li>⚠️ Ação imediata necessária</li>' : ''}
              ${severity === 'CRITICAL' || severity === 'WARNING' ? '<li>Acelerar venda deste produto</li>' : ''}
              <li>Monitore o stock regularmente</li>
              <li>Considere promoções para acelerar saída</li>
            </ul>
          </div>

          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            Este é um email automático do sistema PreçoCerto. Não responda a este email.
          </p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Obter email do gerente da loja (TODO: implementar)
 */
function getManagerEmail(storeId: string): string {
  // TODO: Buscar do Firestore
  return `manager@${storeId}.local`;
}

/**
 * Obter telefone do gerente da loja (TODO: implementar)
 */
function getManagerPhone(storeId: string): string {
  // TODO: Buscar do Firestore
  return '+244923000000';
}
