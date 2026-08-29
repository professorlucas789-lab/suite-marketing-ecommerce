/**
 * Serviço de Automação e Cloud Functions
 * FASE 8: Cloud Functions Automáticas
 *
 * Gerencia configuração, agendamento e execução de análises automáticas
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  AutomationConfig,
  AutomationExecutionLog,
  ScheduleConfig,
  AnomalyReport,
  WeeklyReport,
} from '../types/automation';
import { PredictiveAnalyticsFirebaseService } from './predictiveAnalyticsFirebaseService';
import { PredictiveAnalyticsService } from './predictiveAnalyticsService';
import { Product, Sale } from '../types/store';

/**
 * Serviço para gerenciar automação de análises preditivas
 */
export class AutomationService {
  /**
   * Obter configuração de automação da loja
   */
  static async getAutomationConfig(storeId: string): Promise<AutomationConfig | null> {
    try {
      const q = query(
        collection(db, 'stores', storeId, 'automationConfig'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      return snapshot.docs[0].data() as AutomationConfig;
    } catch (error) {
      console.error('Erro ao obter configuração de automação:', error);
      return null;
    }
  }

  /**
   * Atualizar configuração de automação
   */
  static async updateAutomationConfig(
    storeId: string,
    config: Partial<AutomationConfig>
  ): Promise<void> {
    try {
      const q = query(
        collection(db, 'stores', storeId, 'automationConfig'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        await updateDoc(docRef, {
          ...config,
          updatedAt: Timestamp.now(),
        });
      } else {
        // Criar se não existir
        await addDoc(collection(db, 'stores', storeId, 'automationConfig'), {
          storeId,
          ...config,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar configuração de automação:', error);
      throw error;
    }
  }

  /**
   * Executar Análise Preditiva Automática
   * Chamada por Cloud Function diariamente
   */
  static async runAutomaticAnalysis(
    storeId: string,
    products: Product[],
    sales: Sale[]
  ): Promise<AutomationExecutionLog> {
    const startTime = Date.now();
    const log: AutomationExecutionLog = {
      id: `exec_${Date.now()}`,
      storeId,
      functionName: 'predictiveAnalysis',
      executedAt: new Date().toISOString(),
      duration: 0,
      status: 'success',
      forecastsGenerated: 0,
      anomaliesDetected: 0,
    };

    try {
      // Executar análise local
      const aggregateByProduct = new Map<string, Sale[]>();
      sales.forEach((sale) => {
        if (!aggregateByProduct.has(sale.productId)) {
          aggregateByProduct.set(sale.productId, []);
        }
        aggregateByProduct.get(sale.productId)!.push(sale);
      });

      let forecastsGenerated = 0;
      let anomaliesDetected = 0;

      for (const product of products) {
        const productSales = aggregateByProduct.get(product.id) || [];

        if (productSales.length >= 5) {
          try {
            // Gerar previsão
            const forecast = PredictiveAnalyticsService.forecastDemandExponentialSmoothing(
              product.id,
              storeId,
              productSales as any,
              7
            );

            await PredictiveAnalyticsFirebaseService.saveForecast(forecast);
            forecastsGenerated++;

            // Detectar anomalias
            const anomalies = PredictiveAnalyticsService.detectAnomalies(
              product.id,
              storeId,
              product,
              productSales as any
            );

            for (const anomaly of anomalies) {
              await PredictiveAnalyticsFirebaseService.saveAnomaly(anomaly);
              anomaliesDetected++;
            }
          } catch (err) {
            console.warn(`Erro ao analisar produto ${product.nome}:`, err);
            log.status = 'partial_success';
          }
        }
      }

      log.forecastsGenerated = forecastsGenerated;
      log.anomaliesDetected = anomaliesDetected;

      // Salvar log
      await this.saveExecutionLog(log);

      return log;
    } catch (error) {
      log.status = 'failed';
      log.errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.errorDetails = { stack: error instanceof Error ? error.stack : undefined };

      await this.saveExecutionLog(log);
      throw error;
    } finally {
      log.duration = Date.now() - startTime;
    }
  }

  /**
   * Gerar Relatório de Anomalias
   */
  static async generateAnomalyReport(
    storeId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<AnomalyReport> {
    try {
      const anomalies = await PredictiveAnalyticsFirebaseService.getUnacknowledgedAnomalies(
        storeId
      );

      // Filtrar por período
      const filtered = anomalies.filter((a) => {
        const createdAt = new Date(a.createdAt);
        return createdAt >= fromDate && createdAt <= toDate;
      });

      // Agrupar por tipo
      const byType: Record<string, number> = {};
      const byProductMap = new Map<string, any>();

      filtered.forEach((anomaly) => {
        byType[anomaly.type] = (byType[anomaly.type] || 0) + 1;

        if (anomaly.productId) {
          if (!byProductMap.has(anomaly.productId)) {
            byProductMap.set(anomaly.productId, {
              productId: anomaly.productId,
              productName: anomaly.description,
              anomalyCount: 0,
              severity: anomaly.severity,
            });
          }
          const prod = byProductMap.get(anomaly.productId);
          prod.anomalyCount++;
        }
      });

      const report: AnomalyReport = {
        id: `report_${Date.now()}`,
        storeId,
        period: {
          from: fromDate.toISOString().split('T')[0],
          to: toDate.toISOString().split('T')[0],
        },
        totalAnomalies: filtered.length,
        criticalCount: filtered.filter((a) => a.severity === 'CRITICAL').length,
        warningCount: filtered.filter((a) => a.severity === 'WARNING').length,
        infoCount: filtered.filter((a) => a.severity === 'INFO').length,
        byType,
        byProduct: Array.from(byProductMap.values()),
        recommendations: this.generateRecommendations(filtered),
        generatedAt: new Date().toISOString(),
        generatedBy: 'cloud_function',
      };

      // Salvar relatório
      await addDoc(collection(db, 'stores', storeId, 'anomalyReports'), report);

      return report;
    } catch (error) {
      console.error('Erro ao gerar relatório de anomalias:', error);
      throw error;
    }
  }

  /**
   * Gerar Relatório Semanal
   */
  static async generateWeeklyReport(
    storeId: string,
    startDate: Date,
    endDate: Date,
    kpis: any
  ): Promise<WeeklyReport> {
    try {
      const report: WeeklyReport = {
        id: `weekly_${Date.now()}`,
        storeId,
        week: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
        kpis: {
          totalSalesValue: kpis.totalRevenue || 0,
          totalUnits: kpis.totalUnits || 0,
          avgDailyRevenue: (kpis.totalRevenue || 0) / 7,
          topProductByRevenue: kpis.topProductByRevenue?.name || 'N/A',
          topProductByUnits: kpis.topProductByUnits?.name || 'N/A',
        },
        predictions: {
          nextWeekForecastedRevenue: kpis.nextWeekForecast || 0,
          confidenceLevel: kpis.confidenceLevel || 75,
          trendDirection: kpis.trend || 'stable',
        },
        inventory: {
          lowStockProducts: kpis.lowStockCount || 0,
          expiringProducts: kpis.expiringCount || 0,
          recommendedReorders: kpis.reorderCount || 0,
        },
        anomalies: {
          detected: kpis.anomalyCount || 0,
          resolved: kpis.anomalyResolved || 0,
          unresolved: kpis.anomalyUnresolved || 0,
        },
        insights: this.generateInsights(kpis),
        recommendations: this.generateWeeklyRecommendations(kpis),
        generatedAt: new Date().toISOString(),
      };

      // Salvar relatório
      await addDoc(collection(db, 'stores', storeId, 'weeklyReports'), report);

      return report;
    } catch (error) {
      console.error('Erro ao gerar relatório semanal:', error);
      throw error;
    }
  }

  /**
   * Salvar log de execução
   */
  private static async saveExecutionLog(log: AutomationExecutionLog): Promise<void> {
    try {
      const logWithTimestamp = {
        ...log,
        createdAt: Timestamp.now(),
      };

      await addDoc(
        collection(db, 'stores', log.storeId, 'automationLogs'),
        logWithTimestamp
      );
    } catch (error) {
      console.error('Erro ao salvar log de execução:', error);
    }
  }

  /**
   * Gerar recomendações baseadas em anomalias
   */
  private static generateRecommendations(anomalies: any[]): any[] {
    const recommendations: any[] = [];

    const criticalCount = anomalies.filter((a) => a.severity === 'CRITICAL').length;
    if (criticalCount > 0) {
      recommendations.push({
        title: 'Ação Imediata Necessária',
        description: `${criticalCount} anomalia(s) crítica(s) detectada(s)`,
        priority: 'high',
        actionItems: [
          'Revisar anomalias críticas imediatamente',
          'Investigar causas raiz',
          'Implementar correções',
        ],
      });
    }

    const priceAnomalies = anomalies.filter((a) => a.type === 'price_anomaly').length;
    if (priceAnomalies > 0) {
      recommendations.push({
        title: 'Revisar Estratégia de Preços',
        description: `${priceAnomalies} anomalia(s) de preço detectada(s)`,
        priority: 'medium',
        actionItems: [
          'Validar preços tabelados',
          'Verificar descontos aplicados',
          'Atualizar preços no sistema',
        ],
      });
    }

    return recommendations;
  }

  /**
   * Gerar insights da semana
   */
  private static generateInsights(kpis: any): string[] {
    const insights: string[] = [];

    if (kpis.trend === 'increasing') {
      insights.push(`📈 Tendência positiva: Receita aumentando ${kpis.trendPercentage}%`);
    } else if (kpis.trend === 'decreasing') {
      insights.push(`📉 Atenção: Receita em queda ${Math.abs(kpis.trendPercentage)}%`);
    }

    if (kpis.topProductByRevenue) {
      insights.push(`⭐ Produto destaque: ${kpis.topProductByRevenue.name} liderando vendas`);
    }

    if (kpis.lowStockCount > 0) {
      insights.push(`⚠️ ${kpis.lowStockCount} produto(s) com estoque baixo`);
    }

    if (kpis.confidenceLevel < 60) {
      insights.push(`📊 Confiança nas previsões abaixo do ideal (${kpis.confidenceLevel}%)`);
    }

    return insights;
  }

  /**
   * Gerar recomendações semanais
   */
  private static generateWeeklyRecommendations(kpis: any): string[] {
    const recommendations: string[] = [];

    if (kpis.lowStockCount > 0) {
      recommendations.push(
        `Priorizar reabastecimento de ${kpis.lowStockCount} produto(s) em falta`
      );
    }

    if (kpis.expiringCount > 0) {
      recommendations.push(`Revisar ${kpis.expiringCount} produto(s) próximo de vencer`);
    }

    if (kpis.trend === 'decreasing') {
      recommendations.push('Analisar causas da queda de receita e implementar ações corretivas');
    }

    if (kpis.anomalyUnresolved > 0) {
      recommendations.push(
        `Resolver ${kpis.anomalyUnresolved} anomalia(s) em aberto para melhorar qualidade de dados`
      );
    }

    return recommendations;
  }

  /**
   * Obter último log de execução
   */
  static async getLastExecutionLog(
    storeId: string,
    functionName: string
  ): Promise<AutomationExecutionLog | null> {
    try {
      const q = query(
        collection(db, 'stores', storeId, 'automationLogs'),
        where('functionName', '==', functionName),
        orderBy('executedAt', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      return snapshot.docs[0].data() as AutomationExecutionLog;
    } catch (error) {
      console.error('Erro ao obter último log de execução:', error);
      return null;
    }
  }

  /**
   * Validar configuração de automação
   */
  static validateAutomationConfig(config: Partial<AutomationConfig>): boolean {
    if (config.enableAutoAnalysis && !config.analysisTime) {
      throw new Error('Hora de análise obrigatória quando automação está ativada');
    }

    if (config.notificationChannels?.email && (!config.recipients?.email || config.recipients.email.length === 0)) {
      throw new Error('Email obrigatório para notificações por email');
    }

    if ((config.notificationChannels?.whatsapp || config.notificationChannels?.sms) &&
        !config.recipients?.phoneNumber) {
      throw new Error('Número de telefone obrigatório para WhatsApp/SMS');
    }

    return true;
  }
}
