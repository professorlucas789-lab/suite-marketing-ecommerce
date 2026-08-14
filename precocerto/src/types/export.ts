/**
 * Tipos para Sistema de Exportação Avançada
 * Fase 7: Exportação Avançada
 */

export type ExportFormat = 'PDF' | 'XLSX' | 'CSV' | 'JSON';

export interface ExportConfig {
  id: string;
  name: string;
  format: ExportFormat;
  title: string;
  description?: string;
  storeIds: string[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
  metrics: ExportMetric[];
  includeCharts: boolean;
  includeTimeline: boolean;
  fileName: string;
  createdAt: string;
  createdBy: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  downloadUrl?: string;
  fileSize?: number;
  errorMessage?: string;
}

export type ExportMetric =
  | 'totalProdutos'
  | 'totalUtilizadores'
  | 'precoMedio'
  | 'margemMedia'
  | 'valorStock'
  | 'tendencia'
  | 'saude'
  | 'alertas';

export interface ExportData {
  title: string;
  generatedAt: string;
  generatedBy: string;
  period: {
    start: string;
    end: string;
  };
  stores: ExportStoreData[];
  summary: ExportSummary;
  charts?: ExportChart[];
  auditLog?: ExportAuditEntry[];
}

export interface ExportStoreData {
  id: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  address: string;
  metrics: Record<string, number>;
  history?: HistoryPoint[];
  alerts?: string[];
  users?: ExportUserInfo[];
}

export interface ExportSummary {
  totalStores: number;
  totalProducts: number;
  totalUsers: number;
  averageMargin: number;
  totalStock: number;
  topPerformingStore: string;
  bottomPerformingStore: string;
  criticalAlerts: number;
  securityIncidents: number;
}

export interface ExportChart {
  type: 'bar' | 'line' | 'pie';
  title: string;
  data: Array<{ label: string; value: number }>;
  base64Image?: string;
}

export interface ExportAuditEntry {
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  storeName: string;
  status: string;
  severity: string;
}

export interface HistoryPoint {
  date: string;
  totalProdutos: number;
  totalUtilizadores: number;
  precoMedio: number;
  margemMedia: number;
  valorStock: number;
}

export interface ExportUserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export interface EmailConfig {
  to: string | string[];
  subject: string;
  body: string;
  attachments: EmailAttachment[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  htmlBody?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

export interface ScheduledExport {
  id: string;
  name: string;
  format: ExportFormat;
  schedule: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  scheduleDay?: number; // 0-6 para weekly, 1-31 para monthly
  scheduleTime: string; // HH:mm
  recipients: string[];
  storeIds: string[];
  metrics: ExportMetric[];
  lastRun?: string;
  nextRun: string;
  active: boolean;
  createdAt: string;
  createdBy: string;
}

export interface ExportJob {
  id: string;
  config: ExportConfig;
  progress: number; // 0-100
  startTime: string;
  endTime?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  errorMessage?: string;
  resultUrl?: string;
  resultSize?: number;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: ExportFormat;
  metrics: ExportMetric[];
  includeCharts: boolean;
  includeAudit: boolean;
  createdAt: string;
  createdBy: string;
  isDefault?: boolean;
}

export interface ExportHistory {
  id: string;
  fileName: string;
  format: ExportFormat;
  fileSize: number;
  downloadCount: number;
  createdAt: string;
  createdBy: string;
  expiresAt: string;
  isExpired: boolean;
}

export interface ExcelWorksheet {
  name: string;
  headers: string[];
  data: any[][];
  freezePane?: number;
  autoFilter?: boolean;
  columnWidths?: number[];
}

export interface PDFLayout {
  pageSize: 'A4' | 'LETTER';
  orientation: 'PORTRAIT' | 'LANDSCAPE';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  headerHeight: number;
  footerHeight: number;
}

export interface ExportNotification {
  id: string;
  exportId: string;
  type: 'EXPORT_COMPLETED' | 'EXPORT_FAILED' | 'EXPORT_READY_FOR_DOWNLOAD';
  recipients: string[];
  message: string;
  actionUrl?: string;
  createdAt: string;
  sentAt?: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
}
