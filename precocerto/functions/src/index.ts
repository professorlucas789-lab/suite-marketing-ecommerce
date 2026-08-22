/**
 * Google Cloud Functions para Automações PreçoCerto
 * Triggered por Cloud Scheduler em horários específicos
 * Fase: Cloud Functions & Automation Scheduling
 */

import * as functions from 'firebase-functions/v2/https';
import * as scheduler from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { AutomatedAlertsService } from '../src/services/automatedAlertsService';
import { DailyReportService } from '../src/services/dailyReportService';
import { NotificationService } from '../src/services/notificationService';

// Inicializar Firebase Admin
initializeApp();

const db = getFirestore();

/**
 * Verificação de Alertas - 6h, 12h, 18h (Luanda Time - UTC+1)
 * Cloud Scheduler Cron: "0 5,11,17 * * *" (UTC)
 */
export const checkAlertsScheduled = scheduler.onSchedule(
  {
    schedule: '0 5,11,17 * * *', // 6h, 12h, 18h UTC+1
    timeZone: 'Africa/Luanda',
    retryConfig: {
      retryCount: 3,
      maxRetryDuration: 3600, // 1 hora
    },
  },
  async (context) => {
    try {
      console.log('🔔 Iniciando verificação de alertas agendada...');
      const startTime = Date.now();

      // Obter todas as lojas
      const storesSnapshot = await db.collection('stores').get();
      let processedStores = 0;
      let totalAlertsTriggered = 0;

      for (const storeDoc of storesSnapshot.docs) {
        const storeId = storeDoc.id;

        try {
          // Executar verificação completa de alertas
          const result = await AutomatedAlertsService.runFullAlertCheck(storeId);
          processedStores++;
          totalAlertsTriggered += result.alertsTriggered;

          console.log(`✅ Loja ${storeId}: ${result.checksRun} verificações, ${result.alertsTriggered} alertas`);
        } catch (error) {
          console.error(`❌ Erro ao verificar alertas da loja ${storeId}:`, error);
        }
      }

      const duration = Date.now() - startTime;

      // Log de sucesso
      const logRef = db.collection('automationLogs').doc();
      await logRef.set({
        type: 'alerts_check',
        timestamp: new Date(),
        processedStores,
        totalAlertsTriggered,
        durationMs: duration,
        status: 'success',
      });

      console.log(
        `✅ Verificação de alertas concluída: ${processedStores} lojas, ${totalAlertsTriggered} alertas, ${duration}ms`
      );

      return {
        success: true,
        processedStores,
        totalAlertsTriggered,
        durationMs: duration,
      };
    } catch (error) {
      console.error('❌ Erro crítico ao executar verificação de alertas:', error);

      // Log de erro
      const logRef = db.collection('automationLogs').doc();
      await logRef.set({
        type: 'alerts_check',
        timestamp: new Date(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }
);

/**
 * Geração de Relatórios Diários - 8h (Luanda Time - UTC+1)
 * Cloud Scheduler Cron: "0 7 * * MON-FRI" (UTC, segunda a sexta)
 */
export const generateDailyReports = scheduler.onSchedule(
  {
    schedule: '0 7 * * MON-FRI', // 8h UTC+1, segunda a sexta
    timeZone: 'Africa/Luanda',
    retryConfig: {
      retryCount: 3,
      maxRetryDuration: 3600,
    },
  },
  async (context) => {
    try {
      console.log('📊 Iniciando geração de relatórios diários agendada...');
      const startTime = Date.now();

      // Usar o serviço de relatórios para processar todas as lojas
      const result = await DailyReportService.scheduleAndSendDailyReports();

      const duration = Date.now() - startTime;

      // Log de sucesso
      const logRef = db.collection('automationLogs').doc();
      await logRef.set({
        type: 'daily_reports',
        timestamp: new Date(),
        processedStores: result.processed,
        succeededReports: result.succeeded,
        durationMs: duration,
        status: 'success',
      });

      console.log(
        `✅ Relatórios diários gerados: ${result.succeeded}/${result.processed} lojas, ${duration}ms`
      );

      return {
        success: true,
        processedStores: result.processed,
        succeededReports: result.succeeded,
        durationMs: duration,
      };
    } catch (error) {
      console.error('❌ Erro crítico ao gerar relatórios diários:', error);

      const logRef = db.collection('automationLogs').doc();
      await logRef.set({
        type: 'daily_reports',
        timestamp: new Date(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }
);

/**
 * Limpeza de Notificações Antigas - 23h (Luanda Time - UTC+1)
 * Cloud Scheduler Cron: "0 22 * * *" (UTC)
 */
export const cleanupOldNotifications = scheduler.onSchedule(
  {
    schedule: '0 22 * * *', // 23h UTC+1
    timeZone: 'Africa/Luanda',
  },
  async (context) => {
    try {
      console.log('🧹 Iniciando limpeza de notificações antigas...');
      const startTime = Date.now();

      const storesSnapshot = await db.collection('stores').get();
      let cleanedStores = 0;

      for (const storeDoc of storesSnapshot.docs) {
        const storeId = storeDoc.id;

        try {
          // Limpar notificações desta loja
          await NotificationService.cleanupOldNotifications(storeId);
          cleanedStores++;
        } catch (error) {
          console.error(`⚠️ Erro ao limpar notificações da loja ${storeId}:`, error);
        }
      }

      const duration = Date.now() - startTime;

      const logRef = db.collection('automationLogs').doc();
      await logRef.set({
        type: 'notification_cleanup',
        timestamp: new Date(),
        cleanedStores,
        durationMs: duration,
        status: 'success',
      });

      console.log(`✅ Limpeza concluída: ${cleanedStores} lojas, ${duration}ms`);

      return { success: true, cleanedStores, durationMs: duration };
    } catch (error) {
      console.error('❌ Erro crítico ao limpar notificações:', error);
      throw error;
    }
  }
);

/**
 * Health Check - Verifica se o sistema de automações está funcionando
 * Endpoint HTTP para monitoramento
 */
export const healthCheck = functions.onRequest(async (request, response) => {
  try {
    const storesSnapshot = await db.collection('stores').get();
    const automationLogsSnapshot = await db
      .collection('automationLogs')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const latestLog = automationLogsSnapshot.docs[0];
    const lastExecution = latestLog?.data().timestamp?.toDate() || null;
    const isHealthy =
      lastExecution && new Date().getTime() - lastExecution.getTime() < 24 * 60 * 60 * 1000; // < 24h

    response.json({
      status: isHealthy ? 'healthy' : 'warning',
      totalStores: storesSnapshot.size,
      lastExecution: lastExecution?.toISOString() || 'never',
      recentLogs: automationLogsSnapshot.docs.map((doc) => ({
        type: doc.data().type,
        status: doc.data().status,
        timestamp: doc.data().timestamp?.toDate(),
        durationMs: doc.data().durationMs,
      })),
    });
  } catch (error) {
    response.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Manual Trigger - Permite disparar verificações manualmente (DEBUG)
 */
export const triggerAlertsManual = functions.onRequest(async (request, response) => {
  // Validação básica (em produção, usar autenticação Firebase)
  const token = request.query.token || request.body.token;
  if (token !== process.env.TRIGGER_TOKEN) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const storeId = request.query.storeId || request.body.storeId;

    if (!storeId) {
      return response.status(400).json({ error: 'storeId required' });
    }

    const result = await AutomatedAlertsService.runFullAlertCheck(storeId);

    response.json({
      success: true,
      storeId,
      checksRun: result.checksRun,
      alertsTriggered: result.alertsTriggered,
    });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
