/**
 * Tipos para Versão Mobile
 * FASE 9: Dashboard Mobile com Push Notifications
 *
 * Define interfaces para notificações push, configuração mobile
 * e sincronização offline
 */

/**
 * Configuração de Push Notifications
 * Gerencia preferências de notificações por utilizador
 */
export interface PushNotificationConfig {
  id: string;
  userId: string;
  storeId: string;

  // Ativação
  enabled: boolean;
  timestamp: string; // Quando foi ativada

  // Tipos de Notificação
  enabledTypes: {
    criticalAlert: boolean;        // 🚨 Anomalias críticas
    urgentRestock: boolean;         // ⚡ Reabastecimento urgente
    lowStock: boolean;              // 📦 Estoque baixo
    expiryAlert: boolean;           // ⏰ Validade crítica
    dailyReport: boolean;           // 📊 Relatório diário
    weeklyReport: boolean;          // 📈 Relatório semanal
  };

  // Preferências de Horário
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm (ex: "22:00")
    endTime: string;   // HH:mm (ex: "08:00")
  };

  // Dispositivos Registados
  registeredDevices: {
    fcmToken: string;              // Firebase Cloud Messaging token
    deviceId: string;               // ID do dispositivo
    deviceType: 'ios' | 'android';
    deviceName?: string;            // Nome amigável do dispositivo
    registeredAt: string;
    lastUsedAt?: string;
  }[];

  // Estatísticas
  totalNotificationsSent?: number;
  totalNotificationsClicked?: number;
  lastNotificationAt?: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * Push Notification a Enviar
 * Criada automaticamente ou manualmente
 */
export interface PushNotification {
  id: string;
  userId: string;
  storeId: string;

  // Conteúdo
  title: string;
  body: string;
  icon?: string; // URL ou data URI
  badge?: string;
  sound?: string;

  // Dados
  data: {
    type: 'critical_alert' | 'urgent_restock' | 'low_stock' | 'expiry_alert' | 'daily_report' | 'weekly_report';
    actionUrl?: string; // Deep link para app
    priority?: number;
    anomalyId?: string;
    productId?: string;
    storeId?: string;
  };

  // Entrega
  targetDevices: string[]; // Array de FCM tokens
  status: 'pending' | 'sent' | 'failed' | 'partial';

  // Timing
  createdAt: string;
  scheduledFor?: string; // Para notificações agendadas
  sentAt?: string;

  // Análise
  clicks?: number;
  conversions?: number;
}

/**
 * Evento de Interação com Push Notification
 * Para auditoria e analytics
 */
export interface PushNotificationEvent {
  id: string;
  userId: string;
  storeId: string;
  notificationId: string;

  eventType: 'received' | 'clicked' | 'dismissed' | 'failed';
  timestamp: string;

  // Contexto do dispositivo
  deviceId: string;
  deviceType: 'ios' | 'android';
  appVersion?: string;

  // Dados do evento
  actionTaken?: string;
  deepLinkFollowed?: string;
}

/**
 * Sincronização Offline
 * Dados persistidos localmente e sincronizados quando online
 */
export interface OfflineSyncQueue {
  id: string;
  userId: string;
  storeId: string;

  // Dados em fila
  pendingActions: {
    id: string;
    type: 'markReorderImplemented' | 'acknowledgeAnomaly' | 'updateConfig';
    data: Record<string, unknown>;
    createdAt: string;
    attempted: number;
  }[];

  // Status
  isOnline: boolean;
  lastSyncAt?: string;
  nextSyncAt?: string;

  // Estatísticas
  totalPending: number;
  totalFailed: number;

  updatedAt: string;
}

/**
 * Versão Compactada de Dados para Mobile
 * Reduzido para economizar dados/bateria
 */
export interface MobileExecutiveDashboard {
  id: string;
  storeId: string;
  timestamp: string;

  // Health Score (0-100)
  healthScore: number;
  healthStatus: 'excellent' | 'good' | 'warning' | 'critical';

  // KPIs Essenciais
  kpis: {
    todayRevenue: number;
    todayUnits: number;
    weekForecast: number;
    confidence: number; // 0-100
  };

  // Alertas Críticos (máximo 3)
  criticalAlerts: {
    id: string;
    type: string;
    title: string;
    action?: {
      label: string;
      deepLink: string;
    };
  }[];

  // Produtos em Foco (top 3)
  topProducts: {
    id: string;
    name: string;
    trend: 'up' | 'down' | 'stable';
    percentChange: number;
  }[];

  // Reabastecimento Urgente (máximo 3)
  urgentReorders: {
    id: string;
    productId: string;
    productName: string;
    currentStock: number;
    recommendedQuantity: number;
  }[];
}

/**
 * Deep Link para Navegação na App Mobile
 * Estrutura de deep links suportados
 */
export interface DeepLink {
  screen: 'dashboard' | 'alerts' | 'inventory' | 'reorders' | 'product' | 'settings';
  params?: {
    anomalyId?: string;
    productId?: string;
    orderId?: string;
    tabIndex?: number;
  };
}

/**
 * Preferências de Sincronização
 * Como sincronizar dados em background
 */
export interface SyncPreferences {
  userId: string;
  storeId: string;

  // Frequência
  autoSyncEnabled: boolean;
  syncInterval: 5 | 15 | 30 | 60; // Minutos

  // Condições
  syncOnWifiOnly: boolean;
  syncWhileCharging: boolean;

  // Dados
  syncForecastsDaily: boolean;
  syncAnomaliesRealtime: boolean;
  syncStockHourly: boolean;

  // Cache
  maxCacheSize: number; // MB
  cacheRetentionDays: number;

  createdAt: string;
  updatedAt: string;
}

/**
 * Layout Mobile Responsivo
 * Configuração de como renderizar dados em diferentes tamanhos
 */
export interface MobileLayoutConfig {
  screenSize: 'small' | 'medium' | 'large'; // <480px, <768px, >=768px
  orientation: 'portrait' | 'landscape';

  // Componentes visíveis
  showHealthScore: boolean;
  showDetailedKPIs: boolean;
  showChart: boolean;
  maxItemsPerSection: number;

  // Animações
  reduceMotion: boolean;
  animationDuration: number; // ms

  // Fonte
  fontSize: 'small' | 'normal' | 'large';
}

/**
 * Notificação In-App Nativa
 * Notificação tipo toast/alert nativa do SO
 */
export interface NativeNotification {
  id: string;
  title: string;
  body: string;
  action?: {
    label: string;
    id: string;
  };
  actions?: Array<{
    label: string;
    id: string;
  }>;
}
