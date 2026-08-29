/**
 * Tipos para Sistema de Alertas de Validade
 * Fase 1: Notificações Inteligentes
 */

export type AlertSeverity = "CRITICAL" | "WARNING" | "INFO";
export type AlertChannel = "in-app" | "email" | "whatsapp";
export type AlertStatus = "active" | "acknowledged" | "resolved";

/**
 * Alerta de expiração de produto
 */
export interface ExpiryAlert {
  id: string;
  storeId: string;
  storeName?: string;
  productId: string;
  productName: string;
  productCategory?: string;

  // Dados de validade
  expiryDate: string; // YYYY-MM-DD
  daysUntilExpiry: number; // Calculado dinamicamente

  // Severidade e status
  severity: AlertSeverity; // CRITICAL: <7 days, WARNING: <30 days, INFO: <60 days
  status: AlertStatus;

  // Canais de notificação
  channels: AlertChannel[];

  // Timestamps
  createdAt: string; // ISO 8601
  triggeredAt?: string; // Quando alerta foi enviado
  acknowledgedAt?: string; // Quando utilizador reconheceu
  resolvedAt?: string; // Quando problema foi resolvido

  // Metadata
  notificationsSent: number; // Quantas vezes alerta foi enviado
  lastNotificationAt?: string; // Última notificação enviada
  userId?: string; // Quem criou o alerta
  notes?: string; // Notas adicionais (ex: produto já removido do stock)
}

/**
 * Configuração de alertas por loja
 */
export interface ExpiryAlertConfig {
  id: string;
  storeId: string;
  storeName?: string;

  // Thresholds para severidade
  criticalThresholdDays: number; // Padrão: 7 dias
  warningThresholdDays: number; // Padrão: 30 dias
  infoThresholdDays: number; // Padrão: 60 dias

  // Canais de notificação
  enabledChannels: AlertChannel[];

  // Configurações de replicação
  enableAutoReplication: boolean; // Notificação diária?
  replicationIntervalHours: number; // A cada quantas horas?

  // Notificação
  notifyManagers: boolean;
  notifyProductManagers: boolean;

  // Ativo?
  enabled: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Histórico de notificações
 */
export interface AlertNotificationLog {
  id: string;
  alertId: string;
  storeId: string;
  productId: string;

  channel: AlertChannel;
  status: "pending" | "sent" | "failed"; // Status do envio

  recipientCount: number;
  recipients: string[]; // Email/Phone dos destinatários

  message: string;
  error?: string; // Se failed, qual foi o erro?

  sentAt?: string; // ISO 8601
  deliveredAt?: string;

  metadata?: Record<string, any>;
}

/**
 * Relatório de alertas
 */
export interface ExpiryAlertReport {
  period: { from: string; to: string };
  storeId: string;
  storeName?: string;

  // Contadores por severidade
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  totalAlerts: number;

  // Contadores por status
  activeCount: number;
  acknowledgedCount: number;
  resolvedCount: number;

  // Produtos afetados
  affectedProducts: number;
  affectedCategories: string[];

  // Notificações
  notificationsSent: number;
  notificationsDelivered: number;
  notificationsFailed: number;

  // Timeline
  criticalAlertsByDay: { date: string; count: number }[];
  warningAlertsByDay: { date: string; count: number }[];

  // Top produtos vencendo
  topExpiringProducts: {
    productId: string;
    productName: string;
    expiryDate: string;
    daysLeft: number;
    quantity: number;
  }[];
}
