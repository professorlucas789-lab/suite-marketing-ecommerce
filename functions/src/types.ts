/**
 * Tipos Compartilhados para Cloud Functions
 * FASE 4: Integrações e Automação
 */

export interface NotificationPayload {
  storeId: string;
  storeName: string;
  type: 'expiry_alert' | 'low_stock' | 'daily_sales' | 'critical_alert';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  channels: NotificationChannel[];

  // Conteúdo específico
  subject: string;
  message: string;
  htmlContent?: string;
  data: Record<string, any>;

  // Destinatário
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;

  timestamp: string;
}

export type NotificationChannel = 'in-app' | 'email' | 'whatsapp' | 'sms';

export interface ExpiryNotificationData {
  productId: string;
  productName: string;
  daysUntilExpiry: number;
  currentQuantity: number;
  batchNumber?: string;
  expiryDate: string;
}

export interface LowStockNotificationData {
  productId: string;
  productName: string;
  currentQuantity: number;
  minimumQuantity: number;
  daysUntilStockout?: number;
  reorderQuantity: number;
}

export interface DailySalesReportData {
  date: string;
  totalSales: number;
  totalUnits: number;
  totalRevenue: number;
  avgTicketValue: number;
  totalCost?: number;
  totalProfit?: number;
  profitMargin?: number;
  topProduct?: {
    name: string;
    units: number;
    revenue: number;
  };
  paymentMethods?: Record<string, number>;
}

export interface CriticalAlertData {
  alertType: string;
  title: string;
  description: string;
  actionRequired: boolean;
  affectedItems: number;
  details: Record<string, any>;
}

export interface NotificationLog {
  id: string;
  storeId: string;
  type: string;
  channels: NotificationChannel[];
  status: 'sent' | 'failed' | 'pending';
  sentAt?: string;
  error?: string;
  retryCount: number;
  createdAt: string;
}

export interface FunctionConfig {
  isProduction: boolean;
  environment: 'development' | 'staging' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
  notifications: {
    enableEmail: boolean;
    enableWhatsApp: boolean;
    enableSMS: boolean;
    enableInApp: boolean;
  };
}

export interface CronSchedule {
  name: string;
  schedule: string; // Cron expression
  timeZone: string;
  description: string;
  disabled: boolean;
}
