/**
 * Daily Report Service
 * Gera e envia relatórios diários de negócio
 * Fase: Integrações Avançadas
 */

import { db } from '../firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { NotificationService } from './notificationService';
import { Sale } from '../types/sales';

export interface DailyReport {
  date: string;
  storeId: string;
  storeName: string;

  // KPIs
  totalSales: number; // Número de transações
  totalRevenue: number;
  totalUnits: number;
  totalProfit: number;
  avgMargin: number;

  // Tops
  topProduct?: {
    name: string;
    units: number;
    revenue: number;
  };
  topCategory?: {
    name: string;
    units: number;
    revenue: number;
  };

  // Alertas do dia
  stockCriticalCount: number;
  expiryAlertsCount: number;
  negativeMarginsCount: number;

  // Insights
  highlights: string[];
  recommendations: string[];

  // Gerado em
  generatedAt: string;
}

class DailyReportServiceImpl {
  /**
   * Gerar relatório do dia anterior
   */
  async generateYesterdayReport(storeId: string): Promise<DailyReport | null> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const dateStr = yesterday.toISOString().split('T')[0];

      return await this.generateReportForDate(storeId, dateStr);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      return null;
    }
  }

  /**
   * Gerar relatório para uma data específica
   */
  async generateReportForDate(storeId: string, dateStr: string): Promise<DailyReport | null> {
    try {
      // Obter todas as vendas do dia
      const startOfDay = new Date(`${dateStr}T00:00:00Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59Z`);

      const salesQuery = query(
        collection(db, 'sales'),
        where('storeId', '==', storeId),
        where('date', '==', dateStr)
      );

      const salesSnapshot = await getDocs(salesQuery);
      const sales = salesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Sale));

      // Calcular KPIs
      const totalSales = sales.length;
      const totalRevenue = sales.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
      const totalUnits = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
      const totalCost = sales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
      const totalProfit = totalRevenue - totalCost;
      const avgMargin =
        totalSales > 0 ? sales.reduce((sum, s) => sum + (s.profitMargin || 0), 0) / totalSales : 0;

      // Encontrar top produto
      const productsSales = new Map<string, { name: string; units: number; revenue: number }>();
      sales.forEach((sale) => {
        const key = sale.productName || 'Unknown';
        const current = productsSales.get(key) || { name: key, units: 0, revenue: 0 };
        current.units += sale.quantity || 0;
        current.revenue += sale.totalPrice || 0;
        productsSales.set(key, current);
      });

      const topProduct = Array.from(productsSales.values()).sort(
        (a, b) => b.revenue - a.revenue
      )[0];

      // Contar alertas
      const alertsQuery = query(
        collection(db, `stores/${storeId}/notifications`),
        where('createdAt', '>=', startOfDay.toISOString()),
        where('createdAt', '<=', endOfDay.toISOString()),
        where('type', 'in', ['stock_critical', 'expiry_soon', 'expiry_today'])
      );

      const alertsSnapshot = await getDocs(alertsQuery);

      const stockCriticalCount = alertsSnapshot.docs.filter(
        (doc) => doc.data().type === 'stock_critical'
      ).length;
      const expiryAlertsCount = alertsSnapshot.docs.filter(
        (doc) => doc.data().type === 'expiry_soon' || doc.data().type === 'expiry_today'
      ).length;
      const negativeMarginsCount = sales.filter((s) => (s.profitMargin || 0) < 0).length;

      // Gerar insights
      const highlights: string[] = [];
      const recommendations: string[] = [];

      if (totalSales > 0) {
        highlights.push(`📊 ${totalSales} transações realizadas`);
        highlights.push(`💰 Receita total: ${totalRevenue.toFixed(2)} Kz`);
        highlights.push(`📦 ${totalUnits} unidades vendidas`);

        if (avgMargin > 30) {
          highlights.push(`✅ Margem excelente: ${avgMargin.toFixed(1)}%`);
        } else if (avgMargin > 20) {
          recommendations.push(`📈 Considere revisar margens (atual: ${avgMargin.toFixed(1)}%)`);
        } else {
          recommendations.push(`⚠️ Margens baixas: ${avgMargin.toFixed(1)}% - revisar pricing`);
        }
      } else {
        recommendations.push('⚠️ Nenhuma venda registada no dia');
      }

      if (stockCriticalCount > 0) {
        recommendations.push(`🔴 ${stockCriticalCount} produto(s) com stock crítico`);
      }

      if (negativeMarginsCount > 0) {
        recommendations.push(`⚠️ ${negativeMarginsCount} venda(s) com margem negativa`);
      }

      // Obter nome da loja
      const storeDoc = await getDocs(query(collection(db, 'stores'), where('id', '==', storeId)));
      const storeName = storeDoc.docs[0]?.data()?.storeName || storeId;

      return {
        date: dateStr,
        storeId,
        storeName,
        totalSales,
        totalRevenue,
        totalUnits,
        totalProfit,
        avgMargin,
        topProduct,
        stockCriticalCount,
        expiryAlertsCount,
        negativeMarginsCount,
        highlights,
        recommendations,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      return null;
    }
  }

  /**
   * Formatar relatório para email/WhatsApp
   */
  formatReportAsText(report: DailyReport): string {
    const line = '━'.repeat(40);

    let text = `${line}\n`;
    text += `📊 RELATÓRIO DIÁRIO - ${report.date}\n`;
    text += `Loja: ${report.storeName}\n`;
    text += `${line}\n\n`;

    // KPIs
    text += `💼 KPIs DO DIA:\n`;
    text += `├ Transações: ${report.totalSales}\n`;
    text += `├ Receita: ${report.totalRevenue.toFixed(2)} Kz\n`;
    text += `├ Unidades: ${report.totalUnits}\n`;
    text += `├ Lucro: ${report.totalProfit.toFixed(2)} Kz\n`;
    text += `└ Margem Média: ${report.avgMargin.toFixed(1)}%\n\n`;

    // Top Produto
    if (report.topProduct) {
      text += `⭐ TOP PRODUTO:\n`;
      text += `├ ${report.topProduct.name}\n`;
      text += `├ ${report.topProduct.units} unidades\n`;
      text += `└ ${report.topProduct.revenue.toFixed(2)} Kz\n\n`;
    }

    // Highlights
    if (report.highlights.length > 0) {
      text += `✅ DESTAQUES:\n`;
      report.highlights.forEach((h) => {
        text += `├ ${h}\n`;
      });
      text += '\n';
    }

    // Recomendações
    if (report.recommendations.length > 0) {
      text += `💡 RECOMENDAÇÕES:\n`;
      report.recommendations.forEach((r) => {
        text += `├ ${r}\n`;
      });
      text += '\n';
    }

    // Alertas
    if (report.stockCriticalCount > 0 || report.expiryAlertsCount > 0 || report.negativeMarginsCount > 0) {
      text += `⚠️ ALERTAS:\n`;
      if (report.stockCriticalCount > 0) {
        text += `├ Stock crítico: ${report.stockCriticalCount}\n`;
      }
      if (report.expiryAlertsCount > 0) {
        text += `├ Vencimentos: ${report.expiryAlertsCount}\n`;
      }
      if (report.negativeMarginsCount > 0) {
        text += `└ Margens negativas: ${report.negativeMarginsCount}\n`;
      }
      text += '\n';
    }

    text += `${line}\n`;
    text += `Gerado em: ${new Date(report.generatedAt).toLocaleString('pt-PT')}\n`;

    return text;
  }

  /**
   * Enviar relatório diário aos managers
   */
  async sendDailyReportToManagers(storeId: string): Promise<boolean> {
    try {
      const report = await this.generateYesterdayReport(storeId);

      if (!report) {
        console.log('Nenhum relatório gerado para:', storeId);
        return false;
      }

      // Obter managers da loja
      const managersSnapshot = await getDocs(
        query(
          collection(db, `stores/${storeId}/users`),
          where('role', '==', 'loja-manager')
        )
      );

      if (managersSnapshot.docs.length === 0) {
        console.warn(`Nenhum manager encontrado para loja ${storeId}`);
        return false;
      }

      // Enviar relatório para cada manager
      const reportText = this.formatReportAsText(report);

      for (const managerDoc of managersSnapshot.docs) {
        const managerId = managerDoc.id;

        await NotificationService.sendNotification({
          storeId,
          userId: managerId,
          type: 'daily_report',
          title: `📊 Relatório Diário - ${report.date}`,
          message: reportText,
          priority: report.recommendations.length > 0 ? 'high' : 'normal',
          channels: ['in-app', 'email', 'whatsapp'],
          data: report,
        });
      }

      return true;
    } catch (error) {
      console.error('Erro ao enviar relatório diário:', error);
      return false;
    }
  }

  /**
   * Agendar envio de relatório diário (via Cloud Scheduler)
   * Este método seria chamado por uma Cloud Function diariamente às 8h da manhã
   */
  async scheduleAndSendDailyReports(): Promise<{ processed: number; succeeded: number }> {
    try {
      // Obter todas as lojas
      const storesSnapshot = await getDocs(collection(db, 'stores'));
      let succeeded = 0;

      for (const storeDoc of storesSnapshot.docs) {
        const storeId = storeDoc.id;
        const success = await this.sendDailyReportToManagers(storeId);
        if (success) {
          succeeded++;
        }
      }

      return {
        processed: storesSnapshot.docs.length,
        succeeded,
      };
    } catch (error) {
      console.error('Erro ao agendar relatórios:', error);
      return {
        processed: 0,
        succeeded: 0,
      };
    }
  }
}

export const DailyReportService = new DailyReportServiceImpl();
