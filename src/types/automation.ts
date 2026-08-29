/**
 * Tipos para Automação e Cloud Functions
 * FASE 8: Cloud Functions Automáticas
 *
 * Define interfaces para configuração de triggers automáticos,
 * agendamentos e notificações multi-canal
 */

/**
 * Configuração de Análise Automática
 * Define quando e como executar análises preditivas
 */
export interface AutomationConfig {
  id: string;
  storeId: string;

  // Análise Preditiva Automática
  enableAutoAnalysis: boolean;
  analysisSchedule: 'daily' | 'twice-daily' | 'weekly'; // Tipo de agendamento
  analysisTime: string; // HH:mm em UTC (ex: '07:00')

  // Geração de Alertas
  enableAutoAlerts: boolean;
  alertThresholds: {
    criticalAnomaly: boolean;      // Gerar alerta ao detectar anomalia crítica
    lowStockWarning: boolean;       // Alerta quando stock < mínimo
    expiryWarning: boolean;         // Alerta quando validade < 7 dias
    highMarginDeviation: boolean;   // Alerta quando margin se desvia >20%
  };

  // Canais de Notificação
  notificationChannels: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
    inApp: boolean;
  };

  // Destinatários
  recipients: {
    email: string[];
    phoneNumber?: string; // WhatsApp/SMS
  };

  // Configurações Avançadas
  maxAnomaliesPerReport: number;      // Máximo de anomalias no relatório
  includeWeeklyReport: boolean;       // Enviar relatório semanal
  weeklyReportDay: 'monday' | 'friday'; // Dia da semana

  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
  nextExecutionAt?: string;
}

/**
 * Resultado da Execução de Cloud Function
 * Rastreia execução automática
 */
export interface AutomationExecutionLog {
  id: string;
  storeId: string;
  functionName: string; // 'predictiveAnalysis', 'alertGeneration', 'notificationSender'

  executedAt: string;
  duration: number; // Tempo em ms
  status: 'success' | 'partial_success' | 'failed';

  // Resultados
  forecastsGenerated?: number;
  anomaliesDetected?: number;
  alertsCreated?: number;
  notificationsSent?: number;

  // Erros
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;

  // Próxima execução
  nextScheduledExecution?: string;
}

/**
 * Notificação Automática a Enviar
 * Criada por Cloud Function
 */
export interface AutomatedNotification {
  id: string;
  storeId: string;

  type: 'daily_report' | 'alert_critical' | 'alert_warning' | 'weekly_summary';
  priority: 'high' | 'medium' | 'low';

  // Conteúdo
  title: string;
  message: string;
  data: {
    anomalyCount?: number;
    criticalCount?: number;
    forecastsGenerated?: number;
    lowStockProducts?: string[];
    urgentReorders?: string[];
  };

  // Canais
  channels: ('email' | 'whatsapp' | 'sms' | 'inApp')[];
  recipient: {
    email?: string;
    phoneNumber?: string;
  };

  // Estado
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  failureReason?: string;

  createdAt: string;
}

/**
 * Agendamento de Execução
 * Define quando Cloud Function deve executar
 */
export interface ScheduleConfig {
  id: string;
  storeId: string;

  // Tipo de Tarefa
  functionName: 'predictiveAnalysis' | 'alertGeneration' | 'notificationSender' | 'dataCleanup';

  // Agendamento Cron
  cronExpression: string; // Ex: '0 7 * * *' (diariamente às 7h UTC)
  timezone: string;       // Ex: 'Europe/Lisbon'

  // Execução
  enabled: boolean;
  retryOnFailure: boolean;
  maxRetries: number;

  // Configuração da Função
  config: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
}

/**
 * Relatório de Anomalias
 * Gerado automaticamente por Cloud Function
 */
export interface AnomalyReport {
  id: string;
  storeId: string;

  period: {
    from: string; // ISO date
    to: string;   // ISO date
  };

  // Resumo
  totalAnomalies: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;

  // Anomalias Agrupadas
  byType: Record<string, number>; // Ex: { 'price_anomaly': 3, 'demand_spike': 5 }
  byProduct: Array<{
    productId: string;
    productName: string;
    anomalyCount: number;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
  }>;

  // Recomendações
  recommendations: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    actionItems: string[];
  }>;

  generatedAt: string;
  generatedBy: 'cloud_function'; // Para auditoria
}

/**
 * Relatório Semanal
 * Resumo completo da semana
 */
export interface WeeklyReport {
  id: string;
  storeId: string;

  week: {
    startDate: string; // ISO date
    endDate: string;   // ISO date
  };

  // KPIs da Semana
  kpis: {
    totalSalesValue: number;
    totalUnits: number;
    avgDailyRevenue: number;
    topProductByRevenue: string;
    topProductByUnits: string;
  };

  // Análises
  predictions: {
    nextWeekForecastedRevenue: number;
    confidenceLevel: number; // 0-100
    trendDirection: 'increasing' | 'decreasing' | 'stable';
  };

  inventory: {
    lowStockProducts: number;
    expiringProducts: number;
    recommendedReorders: number;
  };

  anomalies: {
    detected: number;
    resolved: number;
    unresolved: number;
  };

  // Insights
  insights: string[];
  recommendations: string[];

  generatedAt: string;
}

/**
 * Histórico de Notificações Enviadas
 * Para auditoria e retry
 */
export interface NotificationHistory {
  id: string;
  storeId: string;
  automatedNotificationId: string;

  channel: 'email' | 'whatsapp' | 'sms' | 'inApp';
  recipient: string; // Email ou phone number

  status: 'sent' | 'failed' | 'bounced' | 'unsubscribed';
  sentAt?: string;
  failureReason?: string;

  // Retry
  retryCount: number;
  lastRetryAt?: string;

  createdAt: string;
}

/**
 * Integração com Serviço Externo
 * WhatsApp, Email, SMS
 */
export interface ExternalServiceConfig {
  id: string;
  storeId: string;

  service: 'twilio' | 'sendgrid' | 'mailgun';

  // Credenciais (armazenadas seguramente em Firebase Secrets)
  isConfigured: boolean;
  accountSid?: string;    // Para Twilio
  apiKey?: string;        // Para SendGrid/Mailgun

  // Informações Públicas
  fromNumber?: string;    // Twilio: número WhatsApp/SMS
  fromEmail?: string;     // Email: endereço remetente

  // Limites
  maxMessagesPerDay: number;
  maxEmailsPerDay: number;

  // Testes
  lastTestAt?: string;
  testStatus: 'not_tested' | 'success' | 'failed';

  createdAt: string;
  updatedAt: string;
}
