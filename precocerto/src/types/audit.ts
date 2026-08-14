/**
 * Tipos para Sistema de Auditoria
 * Fase 6: Segurança e Auditoria
 */

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  storeId: string;
  storeName: string;
  action: AuditAction;
  actionType: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'PERMISSION_CHANGE';
  entityType: 'PRODUCT' | 'USER' | 'STORE' | 'SETTINGS' | 'REPORT' | 'AUTH';
  entityId: string;
  entityName: string;
  changes: AuditChange[];
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  errorMessage?: string;
  metadata: Record<string, any>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
}

export type AuditAction =
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'USER_ROLE_CHANGED'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_REVOKED'
  | 'STORE_CREATED'
  | 'STORE_UPDATED'
  | 'STORE_DELETED'
  | 'STORE_SETTINGS_CHANGED'
  | 'REPORT_GENERATED'
  | 'REPORT_EXPORTED'
  | 'DATA_EXPORTED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'STORE_ACCESSED'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT';

export interface AuditFilter {
  userId?: string;
  storeId?: string;
  action?: AuditAction;
  actionType?: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'PERMISSION_CHANGE';
  entityType?: 'PRODUCT' | 'USER' | 'STORE' | 'SETTINGS' | 'REPORT' | 'AUTH';
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  startDate?: string;
  endDate?: string;
  status?: 'SUCCESS' | 'FAILURE';
}

export interface AuditStats {
  totalEntries: number;
  totalLogins: number;
  totalFailures: number;
  uniqueUsers: number;
  criticalEvents: number;
  dateRange: {
    start: string;
    end: string;
  };
  actionCounts: Record<AuditAction, number>;
  userActivity: Array<{
    userId: string;
    userName: string;
    actionCount: number;
    lastActivity: string;
  }>;
}

export interface AccessLog {
  id: string;
  userId: string;
  userName: string;
  storeId: string;
  storeName: string;
  accessTime: string;
  exitTime?: string;
  duration: number; // em segundos
  ipAddress: string;
  userAgent: string;
  accessType: 'LOGIN' | 'STORE_ACCESS' | 'REPORT_VIEW' | 'DATA_EXPORT';
  status: 'ACTIVE' | 'CLOSED' | 'TIMEOUT';
}

export interface PermissionChange {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  targetUserId: string;
  targetUserName: string;
  storeId: string;
  storeName: string;
  roleFrom: string;
  roleTo: string;
  changedBy: string;
  reason?: string;
}

export interface SecurityAlert {
  id: string;
  timestamp: string;
  type: 'UNAUTHORIZED_ACCESS' | 'MULTIPLE_FAILURES' | 'UNUSUAL_ACTIVITY' | 'PERMISSION_ABUSE' | 'DATA_ACCESS_VIOLATION';
  severity: 'WARNING' | 'CRITICAL';
  userId?: string;
  userName?: string;
  storeId?: string;
  storeName?: string;
  description: string;
  details: Record<string, any>;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface DataAccessLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  storeId: string;
  storeName: string;
  dataType: 'PRODUCTS' | 'USERS' | 'REPORTS' | 'SETTINGS' | 'AUDIT_LOGS';
  recordCount: number;
  filters?: Record<string, any>;
  exportFormat?: 'JSON' | 'CSV' | 'PDF' | 'XLSX';
  purpose?: string;
  ipAddress: string;
}

export interface ComplianceReport {
  id: string;
  generatedAt: string;
  generatedBy: string;
  period: {
    start: string;
    end: string;
  };
  totalAuditEntries: number;
  totalAccess: number;
  totalDataExports: number;
  securityAlerts: SecurityAlert[];
  permissionChanges: PermissionChange[];
  complianceScore: number; // 0-100
  findings: ComplianceFinding[];
  recommendations: string[];
}

export interface ComplianceFinding {
  id: string;
  type: 'ISSUE' | 'WARNING' | 'INFO';
  category: 'SECURITY' | 'AUDIT' | 'ACCESS_CONTROL' | 'DATA_PROTECTION';
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedRecords?: number;
  recommendation: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
}
