/**
 * Cloud Functions - Ponto de Entrada
 * FASE 4: Integrações e Automação
 *
 * Exporta todas as Cloud Functions para Firebase
 */

// Importar funções
export { checkExpiringProducts } from './checkExpiringProducts';
export { checkLowStock } from './checkLowStock';
export { generateDailySalesReport } from './generateDailySalesReport';

// Exports do orquestrador
export { sendNotification, getNotificationPreferences } from './notificationOrchestrator';

console.log('✅ Cloud Functions carregadas com sucesso');
