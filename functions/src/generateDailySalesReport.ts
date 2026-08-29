/**
 * Cloud Function: Gerar Relatório Diário de Vendas
 * FASE 4: Integrações e Automação
 *
 * Executado: Diariamente às 18:00 (UTC)
 * Responsabilidade: Resumir vendas do dia e enviar relatório
 *
 * Triggers:
 * - Cloud Scheduler: Cron diário
 * - Manual: Endpoint HTTP
 */

import { https } from 'firebase-functions';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { sendNotification, getNotificationPreferences } from './notificationOrchestrator';
import { DailySalesReportData, NotificationPayload } from './types';

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
 * Cloud Function: Gerar relatório diário de vendas
 */
export const generateDailySalesReport = https.onRequest(async (req, res) => {
  console.log('🕒 [Cron] Iniciando geração de relatório diário de vendas...');

  try {
    const result = await generateAllStoresReports();
    res.status(200).json({
      success: true,
      message: 'Relatórios diários gerados',
      result,
    });
  } catch (error) {
    console.error('Erro ao gerar relatórios diários:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Gerar relatórios para todas as lojas
 */
async function generateAllStoresReports() {
  const storesSnapshot = await db.collection('stores').get();
  const results = [];

  console.log(`📍 Gerando relatórios para ${storesSnapshot.size} lojas...`);

  for (const storeDoc of storesSnapshot.docs) {
    const storeId = storeDoc.id;
    const store = storeDoc.data();

    try {
      const reportResult = await generateStoreReport(storeId, store.name || storeId);
      results.push(reportResult);
    } catch (error) {
      console.error(`Erro ao gerar relatório para loja ${storeId}:`, error);
      results.push({ storeId, error: String(error) });
    }
  }

  return {
    storesReported: results.length,
    results,
  };
}

/**
 * Gerar relatório de uma loja específica
 */
async function generateStoreReport(storeId: string, storeName: string) {
  console.log(`\n🏪 Gerando relatório para: ${storeName} (${storeId})`);

  // Período: ontem (00:00 até 23:59)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const tomorrowStart = new Date(today);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  console.log(`  📅 Período: ${yesterday.toLocaleDateString('pt-PT')} (ontem)`);

  // Query: vendas do dia anterior
  const salesSnapshot = await db
    .collection('sales')
    .where('storeId', '==', storeId)
    .where('timestamp', '>=', yesterday.toISOString())
    .where('timestamp', '<', tomorrowStart.toISOString())
    .get();

  if (salesSnapshot.empty) {
    console.log('  ℹ️ Nenhuma venda registada');
    return {
      storeId,
      storeName,
      date: yesterday.toLocaleDateString('pt-PT'),
      totalSales: 0,
      reported: false,
    };
  }

  // Agregar dados de vendas
  const reportData = aggregateSalesData(salesSnapshot.docs, yesterday);

  console.log(`  📊 ${reportData.totalSales} vendas, ${reportData.totalUnits} unidades, Kz${reportData.totalRevenue}`);

  // Enviar relatório
  await sendSalesReport(storeId, storeName, reportData, yesterday);

  // Salvar relatório em Firestore
  await db
    .collection('stores')
    .doc(storeId)
    .collection('dailyReports')
    .doc(yesterday.toISOString().split('T')[0]) // YYYY-MM-DD
    .set({
      ...reportData,
      createdAt: new Date().toISOString(),
    });

  return {
    storeId,
    storeName,
    date: yesterday.toLocaleDateString('pt-PT'),
    totalSales: reportData.totalSales,
    reported: true,
  };
}

/**
 * Agregar dados de vendas
 */
function aggregateSalesData(salesDocs: any[], date: Date) {
  let totalSales = 0;
  let totalUnits = 0;
  let totalRevenue = 0;
  let totalCost = 0;
  const paymentMethods: Record<string, number> = {};
  const products: Record<string, any> = {};

  for (const doc of salesDocs) {
    const sale = doc.data();

    totalSales++;
    totalUnits += sale.quantity || 0;
    totalRevenue += sale.totalPrice || 0;
    totalCost += sale.totalCost || 0;

    // Contar pagamentos
    const method = sale.paymentMethod || 'other';
    paymentMethods[method] = (paymentMethods[method] || 0) + 1;

    // Top produtos
    const productId = sale.productId;
    if (!products[productId]) {
      products[productId] = {
        name: sale.productName,
        units: 0,
        revenue: 0,
      };
    }
    products[productId].units += sale.quantity || 0;
    products[productId].revenue += sale.totalPrice || 0;
  }

  // Encontrar top produto
  let topProduct = null;
  let maxRevenue = 0;
  for (const [_, product] of Object.entries(products)) {
    if (product.revenue > maxRevenue) {
      maxRevenue = product.revenue;
      topProduct = product;
    }
  }

  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
  const avgTicketValue = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;

  return {
    date: date.toISOString().split('T')[0],
    totalSales,
    totalUnits,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    profitMargin,
    avgTicketValue,
    topProduct,
    paymentMethods,
  };
}

/**
 * Enviar relatório de vendas
 */
async function sendSalesReport(
  storeId: string,
  storeName: string,
  reportData: any,
  date: Date
) {
  const preferences = await getNotificationPreferences(storeId);

  if (!preferences?.dailyReports?.enabled) {
    console.log(`  ℹ️ Relatórios diários desabilitados para esta loja`);
    return;
  }

  const notificationData: DailySalesReportData = {
    date: date.toISOString().split('T')[0],
    totalSales: reportData.totalSales,
    totalUnits: reportData.totalUnits,
    totalRevenue: reportData.totalRevenue,
    avgTicketValue: reportData.avgTicketValue,
    totalCost: reportData.totalCost,
    totalProfit: reportData.totalProfit,
    profitMargin: reportData.profitMargin,
    topProduct: reportData.topProduct,
    paymentMethods: reportData.paymentMethods,
  };

  const payload: NotificationPayload = {
    storeId,
    storeName,
    type: 'daily_sales',
    severity: 'INFO',
    channels: preferences.dailyReports.channels || ['email'],
    subject: `📊 Relatório de Vendas - ${date.toLocaleDateString('pt-PT')}`,
    message: `Resumo de vendas para ${storeName}:\n\nTotal de Vendas: ${reportData.totalSales}\nUnidades Vendidas: ${reportData.totalUnits}\nReceita: Kz${reportData.totalRevenue}\nLucro: Kz${reportData.totalProfit}\nMargem: ${reportData.profitMargin}%`,
    htmlContent: generateSalesReportHTML(reportData, storeName),
    data: notificationData,
    recipientEmail: getManagerEmail(storeId),
    recipientPhone: getManagerPhone(storeId),
    timestamp: new Date().toISOString(),
  };

  await sendNotification(payload);
}

/**
 * Gerar HTML do relatório de vendas
 */
function generateSalesReportHTML(reportData: any, storeName: string): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 700px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 4px; text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">📊 Relatório de Vendas</h2>
            <p style="margin: 10px 0 0 0; font-size: 16px;">${storeName}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">${reportData.date}</p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
            <div style="background: #f0f7ff; padding: 15px; border-radius: 4px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; color: #666; font-size: 12px;">TOTAL DE VENDAS</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; color: #3b82f6; font-weight: bold;">${reportData.totalSales}</p>
            </div>

            <div style="background: #f0fdf4; padding: 15px; border-radius: 4px; border-left: 4px solid #10b981;">
              <p style="margin: 0; color: #666; font-size: 12px;">UNIDADES VENDIDAS</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; color: #10b981; font-weight: bold;">${reportData.totalUnits}</p>
            </div>

            <div style="background: #fffbeb; padding: 15px; border-radius: 4px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #666; font-size: 12px;">RECEITA TOTAL</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; color: #f59e0b; font-weight: bold;">Kz${reportData.totalRevenue.toLocaleString('pt-PT')}</p>
            </div>

            <div style="background: #fef2f2; padding: 15px; border-radius: 4px; border-left: 4px solid #ef4444;">
              <p style="margin: 0; color: #666; font-size: 12px;">LUCRO</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; color: #ef4444; font-weight: bold;">Kz${reportData.totalProfit.toLocaleString('pt-PT')}</p>
            </div>

            <div style="background: #f5f3ff; padding: 15px; border-radius: 4px; border-left: 4px solid #8b5cf6;">
              <p style="margin: 0; color: #666; font-size: 12px;">MARGEM</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; color: #8b5cf6; font-weight: bold;">${reportData.profitMargin}%</p>
            </div>

            <div style="background: #f3f4f6; padding: 15px; border-radius: 4px; border-left: 4px solid #6b7280;">
              <p style="margin: 0; color: #666; font-size: 12px;">TICKET MÉDIO</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; color: #6b7280; font-weight: bold;">Kz${reportData.avgTicketValue}</p>
            </div>
          </div>

          ${
            reportData.topProduct
              ? `
          <div style="background: #faf8f3; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #d97706;">
            <p style="margin: 0; color: #666; font-size: 12px; font-weight: bold;">🏆 PRODUTO MAIS VENDIDO</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold;">${reportData.topProduct.name}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">
              ${reportData.topProduct.units} unidades | Kz${reportData.topProduct.revenue.toLocaleString('pt-PT')}
            </p>
          </div>
          `
              : ''
          }

          ${
            reportData.paymentMethods && Object.keys(reportData.paymentMethods).length > 0
              ? `
          <div style="background: #f9fafb; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; color: #666; font-size: 12px; font-weight: bold;">MÉTODOS DE PAGAMENTO</p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
              ${Object.entries(reportData.paymentMethods)
                .map(
                  ([method, count]) =>
                    `<li style="margin: 5px 0;">${method}: ${count} transações</li>`
                )
                .join('')}
            </ul>
          </div>
          `
              : ''
          }

          <p style="color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
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
