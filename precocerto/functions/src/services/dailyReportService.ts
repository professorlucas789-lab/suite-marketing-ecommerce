/**
 * Serviço de Relatórios Diários
 * Gera e envia relatórios de desempenho para gerentes de loja
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { NotificationService } from './notificationService';

interface DailyReportResult {
  processed: number;
  succeeded: number;
  failed: string[];
}

interface StoreMetrics {
  totalSales: number;
  totalRevenue: number;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  topCategories: Array<{ name: string; revenue: number }>;
  avgMargin: number;
  alertsTriggered: number;
}

export class DailyReportService {
  private static db = getFirestore();

  /**
   * Agendar e enviar relatórios diários para todas as lojas
   */
  static async scheduleAndSendDailyReports(): Promise<DailyReportResult> {
    const result: DailyReportResult = {
      processed: 0,
      succeeded: 0,
      failed: [],
    };

    try {
      console.log('📊 Iniciando geração de relatórios diários...');

      // Obter todas as lojas
      const storesSnapshot = await this.db.collection('lojas').get();
      console.log(`🏪 Encontradas ${storesSnapshot.docs.length} lojas`);

      for (const storeDoc of storesSnapshot.docs) {
        const storeId = storeDoc.id;
        const storeData = storeDoc.data();

        result.processed++;

        try {
          console.log(`\n  📈 Processando loja: ${storeData.name || storeId}`);

          // Obter métricas do dia
          const metrics = await this.getStoreDailyMetrics(storeId);

          // Gerar relatório em texto
          const reportText = this.generateReportText(storeData.name || storeId, metrics);

          // Enviar notificação para o gerente
          const manager = storeData.managerEmail || storeData.ownerEmail;
          if (manager) {
            await NotificationService.sendDailyReport(storeId, manager, reportText, metrics);
            console.log(`  ✅ Relatório enviado para: ${manager}`);
            result.succeeded++;
          } else {
            console.log(`  ⚠️  Nenhum gerente configurado para enviar relatório`);
          }

          // Log do relatório
          await this.db
            .collection('lojas')
            .doc(storeId)
            .collection('reports')
            .add({
              type: 'daily',
              date: new Date().toISOString().split('T')[0],
              timestamp: Timestamp.now(),
              metrics,
              text: reportText,
            });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
          result.failed.push(`${storeData.name || storeId}: ${errorMsg}`);
          console.error(`  ❌ Erro ao processar loja ${storeId}:`, error);
        }
      }

      console.log(`\n✅ Relatórios diários concluídos: ${result.succeeded}/${result.processed}`);

      return result;
    } catch (error) {
      console.error('❌ Erro crítico ao gerar relatórios diários:', error);
      throw error;
    }
  }

  /**
   * Obter métricas do dia para uma loja
   */
  private static async getStoreDailyMetrics(storeId: string): Promise<StoreMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const metrics: StoreMetrics = {
      totalSales: 0,
      totalRevenue: 0,
      topProducts: [],
      topCategories: [],
      avgMargin: 0,
      alertsTriggered: 0,
    };

    try {
      // 1. Buscar vendas do dia
      const salesSnapshot = await this.db
        .collection('lojas')
        .doc(storeId)
        .collection('sales')
        .where('date', '>=', today.toISOString().split('T')[0])
        .where('date', '<', tomorrow.toISOString().split('T')[0])
        .get();

      metrics.totalSales = salesSnapshot.docs.length;

      // 2. Calcular receita total e produto top
      const productRevenue: Record<string, { name: string; quantity: number; revenue: number }> =
        {};
      const categoryRevenue: Record<string, { name: string; revenue: number }> = {};
      let totalMargin = 0;
      let marginCount = 0;

      for (const saleDoc of salesSnapshot.docs) {
        const sale = saleDoc.data();

        // Acumular receita por produto
        if (!productRevenue[sale.productId]) {
          productRevenue[sale.productId] = {
            name: sale.productName || 'Produto desconhecido',
            quantity: 0,
            revenue: 0,
          };
        }
        productRevenue[sale.productId].quantity += sale.quantity || 1;
        productRevenue[sale.productId].revenue += sale.totalPrice || 0;
        metrics.totalRevenue += sale.totalPrice || 0;

        // Acumular receita por categoria
        if (sale.categoryName) {
          if (!categoryRevenue[sale.categoryName]) {
            categoryRevenue[sale.categoryName] = { name: sale.categoryName, revenue: 0 };
          }
          categoryRevenue[sale.categoryName].revenue += sale.totalPrice || 0;
        }

        // Calcular margem média
        if (sale.margemReal !== undefined) {
          totalMargin += sale.margemReal;
          marginCount++;
        }
      }

      // 3. Top 5 produtos
      metrics.topProducts = Object.values(productRevenue)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // 4. Top categorias
      metrics.topCategories = Object.values(categoryRevenue)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // 5. Margem média
      metrics.avgMargin = marginCount > 0 ? Math.round((totalMargin / marginCount) * 100) / 100 : 0;

      // 6. Alertas disparados hoje
      const alertsSnapshot = await this.db
        .collection('lojas')
        .doc(storeId)
        .collection('automationLogs')
        .where('timestamp', '>=', Timestamp.fromDate(today))
        .where('timestamp', '<', Timestamp.fromDate(tomorrow))
        .where('status', '==', 'success')
        .get();

      for (const alertDoc of alertsSnapshot.docs) {
        const log = alertDoc.data();
        metrics.alertsTriggered += log.totalAlertsTriggered || 0;
      }
    } catch (error) {
      console.error(`  ⚠️  Erro ao buscar métricas para loja ${storeId}:`, error);
    }

    return metrics;
  }

  /**
   * Gerar texto do relatório formatado
   */
  private static generateReportText(storeName: string, metrics: StoreMetrics): string {
    const date = new Date().toLocaleDateString('pt-PT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let report = `
╔═══════════════════════════════════════════════════════════════╗
║                   RELATÓRIO DIÁRIO - PreçoCerto              ║
║                          ${storeName.padEnd(40)} ║
║                          ${date.padEnd(40)} ║
╚═══════════════════════════════════════════════════════════════╝

📊 RESUMO DO DIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Vendas Realizadas:           ${metrics.totalSales.toString().padEnd(10)} transações
  Receita Total:               €${metrics.totalRevenue.toFixed(2).padEnd(10)}
  Margem Média:                ${metrics.avgMargin.toFixed(2).padEnd(10)}%
  Alertas Disparados:          ${metrics.alertsTriggered.toString().padEnd(10)}

`;

    if (metrics.topProducts.length > 0) {
      report += `🏆 TOP 5 PRODUTOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
      metrics.topProducts.forEach((product, index) => {
        report += `  ${index + 1}. ${product.name}
     Quantidade: ${product.quantity} | Receita: €${product.revenue.toFixed(2)}

`;
      });
    }

    if (metrics.topCategories.length > 0) {
      report += `📂 TOP CATEGORIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
      metrics.topCategories.forEach((category, index) => {
        report += `  ${index + 1}. ${category.name}: €${category.revenue.toFixed(2)}

`;
      });
    }

    report += `✅ PRÓXIMOS PASSOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Verificar alertas de validade de produtos
  2. Revisar produtos com margens baixas
  3. Reabastecer produtos com stock crítico
  4. Analisar tendências de vendas

╔═══════════════════════════════════════════════════════════════╗
║                     FIM DO RELATÓRIO                         ║
║         Gerado automaticamente - PreçoCerto v1.0              ║
╚═══════════════════════════════════════════════════════════════╝
`;

    return report;
  }
}
