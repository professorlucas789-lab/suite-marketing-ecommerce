/**
 * Cloud Function: Verificar Stock Baixo
 * FASE 4: Integrações e Automação
 *
 * Executado: Diariamente às 12:00 (UTC)
 * Responsabilidade: Verificar produtos com stock abaixo do mínimo configurado
 *
 * Triggers:
 * - Cloud Scheduler: Cron diário
 * - Manual: Endpoint HTTP
 */

import { https } from 'firebase-functions';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { sendNotification, getNotificationPreferences } from './notificationOrchestrator';
import { LowStockNotificationData, NotificationPayload } from './types';

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
 * Cloud Function: Verificar stock baixo
 */
export const checkLowStock = https.onRequest(async (req, res) => {
  console.log('🕒 [Cron] Iniciando verificação de stock baixo...');

  try {
    const result = await checkAllStoresForLowStock();
    res.status(200).json({
      success: true,
      message: 'Verificação de stock baixo completada',
      result,
    });
  } catch (error) {
    console.error('Erro ao verificar stock baixo:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Verificar todas as lojas para stock baixo
 */
async function checkAllStoresForLowStock() {
  const storesSnapshot = await db.collection('stores').get();
  const results = [];

  console.log(`📍 Verificando ${storesSnapshot.size} lojas para stock baixo...`);

  for (const storeDoc of storesSnapshot.docs) {
    const storeId = storeDoc.id;
    const store = storeDoc.data();

    try {
      const storeResult = await checkStoreForLowStock(storeId, store.name || storeId);
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
 * Verificar loja específica para stock baixo
 */
async function checkStoreForLowStock(storeId: string, storeName: string) {
  console.log(`\n🏪 Verificando stock da loja: ${storeName} (${storeId})`);

  // Query: Produtos com stock configurado
  const productsSnapshot = await db
    .collection('products')
    .where('storeId', '==', storeId)
    .where('quantidadeMinima', '>', 0) // Tem mínimo configurado
    .get();

  console.log(`  📦 Analisando ${productsSnapshot.size} produtos com stock mínimo`);

  // Categorizar por severidade
  const criticalProducts = [];
  const lowProducts = [];

  for (const doc of productsSnapshot.docs) {
    const product = doc.data();
    const currentQty = product.quantidadeDisponível || 0;
    const minQty = product.quantidadeMinima || 0;

    if (minQty === 0) continue;

    // CRÍTICO: stock < 50% do mínimo
    if (currentQty < minQty * 0.5) {
      criticalProducts.push({ product: { ...product, id: doc.id }, currentQty });
    }
    // BAIXO: stock < 100% do mínimo
    else if (currentQty < minQty) {
      lowProducts.push({ product: { ...product, id: doc.id }, currentQty });
    }
  }

  // Enviar alertas
  let alertsCreated = 0;

  if (criticalProducts.length > 0) {
    alertsCreated += await sendLowStockAlerts(
      storeId,
      storeName,
      criticalProducts,
      'CRITICAL'
    );
  }

  if (lowProducts.length > 0) {
    alertsCreated += await sendLowStockAlerts(
      storeId,
      storeName,
      lowProducts,
      'WARNING'
    );
  }

  console.log(`  📧 ${alertsCreated} alertas de stock criados`);

  return {
    storeId,
    storeName,
    alertsCreated,
    breakdown: {
      critical: criticalProducts.length,
      warning: lowProducts.length,
    },
  };
}

/**
 * Enviar alertas de stock baixo
 */
async function sendLowStockAlerts(
  storeId: string,
  storeName: string,
  products: Array<{ product: any; currentQty: number }>,
  severity: 'CRITICAL' | 'WARNING'
): Promise<number> {
  const preferences = await getNotificationPreferences(storeId);

  if (!preferences?.lowStockAlerts?.enabled) {
    console.log(`  ℹ️ Alertas de stock baixo desabilitados para esta loja`);
    return 0;
  }

  let alertsCreated = 0;

  for (const { product, currentQty } of products) {
    try {
      const minQty = product.quantidadeMinima || 0;
      const daysUntilStockout = calculateDaysUntilStockout(product, currentQty);

      const notificationData: LowStockNotificationData = {
        productId: product.id,
        productName: product.nome,
        currentQuantity: currentQty,
        minimumQuantity: minQty,
        daysUntilStockout,
        reorderQuantity: product.quantidadeReabastecimento || minQty * 2,
      };

      // Mensagens por severidade
      const messages = {
        CRITICAL: {
          subject: `🚨 CRÍTICO: Stock baixo - ${product.nome}`,
          message: `⚠️ ATENÇÃO URGENTE!\n\nProduto: ${product.nome}\nStock Atual: ${currentQty} unidades\nMínimo: ${minQty} unidades\n\nStock vai esgotar em aproximadamente ${daysUntilStockout} dias!\n\nReabastecimento sugerido: ${product.quantidadeReabastecimento || minQty * 2} unidades`,
        },
        WARNING: {
          subject: `⚠️ Stock baixo: ${product.nome}`,
          message: `Aviso de Stock Baixo\n\nProduto: ${product.nome}\nStock Atual: ${currentQty} unidades\nMínimo: ${minQty} unidades\n\nRecomenda-se reabastecimento de ${product.quantidadeReabastecimento || minQty * 2} unidades`,
        },
      };

      const messageContent = messages[severity];

      const payload: NotificationPayload = {
        storeId,
        storeName,
        type: 'low_stock',
        severity,
        channels: preferences.lowStockAlerts.channels || ['in-app', 'email'],
        subject: messageContent.subject,
        message: messageContent.message,
        htmlContent: generateLowStockAlertHTML(
          product,
          currentQty,
          minQty,
          daysUntilStockout,
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

      // Salvar alerta de stock no Firestore
      await db
        .collection('stores')
        .doc(storeId)
        .collection('stockAlerts')
        .add({
          productId: product.id,
          productName: product.nome,
          severity,
          currentQuantity: currentQty,
          minimumQuantity: minQty,
          daysUntilStockout,
          createdAt: new Date().toISOString(),
          acknowledged: false,
        });

      alertsCreated++;
    } catch (error) {
      console.error(
        `Erro ao enviar alerta de stock para ${product.nome}:`,
        error
      );
    }
  }

  return alertsCreated;
}

/**
 * Calcular dias até esgotar stock baseado na média diária
 */
function calculateDaysUntilStockout(product: any, currentQty: number): number {
  const avgDailyUsage = product.averageDailyUsage || 1;

  if (avgDailyUsage <= 0) return 999; // Sem histórico

  const daysLeft = Math.ceil(currentQty / avgDailyUsage);
  return Math.max(1, daysLeft);
}

/**
 * Gerar HTML do alerta de stock baixo
 */
function generateLowStockAlertHTML(
  product: any,
  currentQty: number,
  minQty: number,
  daysUntilStockout: number,
  severity: string,
  storeName: string
): string {
  const bgColor = severity === 'CRITICAL' ? '#dc2626' : '#ea580c';
  const emoji = severity === 'CRITICAL' ? '🚨' : '⚠️';
  const percentageOfMin = Math.round((currentQty / minQty) * 100);

  return `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="background: ${bgColor}; color: white; padding: 15px; border-radius: 4px; text-align: center;">
            <h2 style="margin: 0;">${emoji} Alerta de Stock Baixo</h2>
            <p style="margin: 5px 0;">${storeName}</p>
          </div>

          <div style="margin: 20px 0;">
            <p><strong>Produto:</strong> ${product.nome}</p>
            <p><strong>Categoria:</strong> ${product.categoria || 'N/A'}</p>

            <div style="background: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Stock Atual:</strong> <span style="color: ${bgColor}; font-size: 24px; font-weight: bold;">${currentQty}</span> unidades</p>
              <p style="margin: 5px 0;"><strong>Stock Mínimo:</strong> ${minQty} unidades</p>
              <p style="margin: 5px 0;"><strong>Percentagem do Mínimo:</strong> ${percentageOfMin}%</p>
              <p style="margin: 5px 0;"><strong>Dias até Esgotar:</strong> <span style="color: ${bgColor}; font-weight: bold;">~${daysUntilStockout} dias</span></p>
            </div>

            <p><strong>Reabastecimento Recomendado:</strong> ${product.quantidadeReabastecimento || minQty * 2} unidades</p>
          </div>

          <div style="background: ${bgColor}20; padding: 15px; border-left: 4px solid ${bgColor}; margin: 20px 0;">
            <p><strong>Ações Recomendadas:</strong></p>
            <ul style="margin: 10px 0;">
              ${severity === 'CRITICAL' ? '<li>🔴 <strong>URGENTE:</strong> Contacte o fornecedor imediatamente</li>' : ''}
              <li>📞 Solicitar reabastecimento ao fornecedor</li>
              <li>📊 Revisar padrão de vendas deste produto</li>
              <li>🛍️ Considerar promoção para acelerar venda</li>
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
 * Obter email do gerente da loja
 */
function getManagerEmail(storeId: string): string {
  // TODO: Buscar do Firestore
  return `manager@${storeId}.local`;
}

/**
 * Obter telefone do gerente da loja
 */
function getManagerPhone(storeId: string): string {
  // TODO: Buscar do Firestore
  return '+244923000000';
}
