/**
 * Tipos para Sistema de Notificações Inteligentes
 * Fase: Notificações de Validade + Integração Multicanal
 *
 * Define interfaces para:
 * - Alertas de Validade (Expiração de Produtos)
 * - Configuração de Alertas por Produto/Categoria
 * - Canais de Entrega (In-app, Email, WhatsApp)
 */

export type NotificationChannel = 'in-app' | 'email' | 'whatsapp' | 'sms' | 'telegram';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * Alerta de Expiração de Produto
 * Criado automaticamente por cron job diário
 */
export interface ExpiryAlert {
  id: string;
  storeId: string;
  productId: string;
  productName: string;

  // Informações de Validade
  expiryDate: string; // ISO 8601
  daysUntilExpiry: number;
  severity: AlertSeverity; // INFO: 60+ dias, WARNING: 30-59 dias, CRITICAL: <30 dias

  // Status do Alerta
  createdAt: string; // ISO 8601
  triggeredAt?: string; // ISO 8601 - Quando foi enviado
  acknowledgedAt?: string; // ISO 8601 - Quando foi marcado como lido/resolvido
  resolvedAt?: string; // ISO 8601 - Quando o problema foi resolvido (produto removido, vendido, etc)

  // Canais de Notificação
  channels: NotificationChannel[];
  notificationIds?: Record<NotificationChannel, string>; // IDs das notificações por canal

  // Metadados
  quantity?: number; // Quantidade de unidades afetadas
  batchNumber?: string; // Para farmácias/alimentos com lote
  notes?: string;
}

/**
 * Configuração de Alertas por Produto ou Categoria
 */
export interface StockAlertConfig {
  id: string;
  storeId: string;

  // Escopo (Produto OU Categoria)
  productId?: string;
  categoryId?: string;

  // Limiares
  minQuantity: number; // Quantidade mínima de stock
  reorderQuantity?: number; // Quantidade sugerida para reabastecimento

  // Comportamento
  enableAutoAlert: boolean;
  alertChannels: NotificationChannel[];
  alertThreshold?: number; // Quantos dias antes do vencimento começar a alertar (padrão: 30)

  // Configuração
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Histórico de Alertas (para auditoria e análise)
 */
export interface AlertHistory {
  id: string;
  storeId: string;
  alertId: string;
  productId: string;

  action: 'created' | 'triggered' | 'acknowledged' | 'resolved' | 'escalated';
  severity: AlertSeverity;

  timestamp: string;
  userId?: string; // Quem confirmou/resolveu

  details?: {
    channelsSent?: NotificationChannel[];
    reason?: string;
    nextAction?: string;
    daysUntilExpiry?: number;
  };
}

/**
 * Preferência de Notificação por Utilizador
 * Extensão de NotificationPreferences existente
 */
export interface NotificationPreferencesExtended {
  expiryAlerts?: {
    enabled: boolean;
    channels: NotificationChannel[];
    severity: 'ALL' | 'WARNING_CRITICAL' | 'CRITICAL_ONLY';
    quietHours?: {
      enabled: boolean;
      start: string; // HH:MM
      end: string; // HH:MM
    };
  };

  stockAlerts?: {
    enabled: boolean;
    channels: NotificationChannel[];
    notifyOnLowStock: boolean;
    notifyOnReorder: boolean;
  };

  salesAlerts?: {
    enabled: boolean;
    channels: NotificationChannel[];
    notifyAnomalies: boolean; // Venda com margin negativa, etc
    dailySummary: boolean;
  };

  // Frequência de Resumo
  digestFrequency?: 'instant' | 'daily' | 'weekly' | 'never';
  digestTime?: string; // HH:MM para enviar resumo
}

/**
 * Template de Notificação Multicanal
 */
export interface NotificationTemplate {
  id: string;
  type: 'expiry' | 'stock' | 'sale' | 'anomaly';
  channel: NotificationChannel;
  language: 'pt' | 'en';

  subject?: string; // Para email
  title: string;
  body: string;
  action?: {
    label: string;
    url: string;
  };

  variables: Record<string, string>; // {{productName}}, {{daysLeft}}, etc
}

/**
 * Resposta de Envio de Notificação
 */
export interface NotificationSendResponse {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
  timestamp: string;
  retryCount?: number;
}

/**
 * Batch de Alertas para Processamento
 */
export interface AlertBatch {
  id: string;
  storeId: string;
  type: 'expiry' | 'stock' | 'sales';

  alertIds: string[];
  totalAlerts: number;
  processedAt: string;

  results: {
    successful: number;
    failed: number;
    failureReasons?: Record<string, string>;
  };
}
