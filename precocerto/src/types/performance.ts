/**
 * Tipos e Interfaces para Performance e Otimização
 * Fase 9: Performance e Otimização
 */

/**
 * Configuração de Cache
 */
export interface CacheConfig {
  id: string;
  name: string;
  type: 'MEMORY' | 'INDEXED' | 'HYBRID';
  ttl: number;                                       // Segundos
  maxSize: number;                                   // Bytes
  maxItems: number;
  strategy: 'LRU' | 'LFU' | 'FIFO';                 // Estratégia de evicção
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Entrada de Cache
 */
export interface CacheEntry {
  id: string;
  key: string;
  value: any;
  timestamp: number;                                 // Data de criação
  lastAccess: number;                                // Último acesso
  accessCount: number;                               // Contagem de acessos
  size: number;                                      // Tamanho em bytes
  expiresAt: number;                                 // Timestamp expiração
  priority: number;                                  // 0-100
}

/**
 * Estatísticas de Cache
 */
export interface CacheStats {
  id: string;
  cacheName: string;
  hitRate: number;                                   // 0-100%
  missRate: number;                                  // 0-100%
  totalHits: number;
  totalMisses: number;
  totalRequests: number;
  avgAccessTime: number;                             // Milliseconds
  currentSize: number;                               // Bytes
  maxSize: number;
  itemCount: number;
  maxItems: number;
  evictionCount: number;
  lastReset: string;
  efficiency: number;                                // 0-100%
}

/**
 * Índice para Query Otimizado
 */
export interface DataIndex {
  id: string;
  name: string;
  type: 'BTREE' | 'HASH' | 'BITMAP' | 'FULL_TEXT';
  column: string;                                    // Coluna indexada
  targetTable: string;
  isUnique: boolean;
  cardinality: number;                               // Valores únicos
  size: number;                                      // Bytes
  created: string;
  lastUpdated: string;
  usageCount: number;
  efficiency: number;                                // 0-100%
}

/**
 * Batch de Processamento
 */
export interface BatchJob {
  id: string;
  name: string;
  type: 'TRAINING' | 'PREDICTION' | 'ANOMALY_DETECTION' | 'EXPORT' | 'AGGREGATION';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  priority: number;                                  // 1-100
  itemCount: number;                                 // Total de itens
  processedItems: number;
  progress: number;                                  // 0-100%
  startTime: string;
  endTime?: string;
  estimatedDuration: number;                         // Segundos
  actualDuration?: number;
  resultCount: number;
  errorCount: number;
  errorMessage?: string;
  createdAt: string;
  createdBy: string;
}

/**
 * Métrica de Performance
 */
export interface PerformanceMetric {
  id: string;
  timestamp: string;
  operation: string;                                 // e.g., "trainModel", "generatePrediction"
  duration: number;                                  // Milliseconds
  memoryUsed: number;                                // Bytes
  cpuUsage: number;                                  // 0-100%
  cacheHit: boolean;
  itemsProcessed: number;
  throughput: number;                                // Items/second
  errorOccurred: boolean;
  errorType?: string;
}

/**
 * Relatório de Performance
 */
export interface PerformanceReport {
  id: string;
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    avgResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
  cacheMetrics: CacheStats[];
  batchMetrics: {
    totalBatches: number;
    completedBatches: number;
    failedBatches: number;
    totalItems: number;
    totalErrors: number;
  };
  indexMetrics: {
    totalIndexes: number;
    avgIndexEfficiency: number;
    mostUsedIndex: string;
  };
  recommendations: string[];
}

/**
 * Configuração de Query Otimizada
 */
export interface QueryOptimization {
  id: string;
  queryName: string;
  originalDuration: number;                          // Milliseconds
  optimizedDuration: number;
  improvement: number;                               // Percentual
  optimization: string;                              // e.g., "Added index on store_id"
  applied: boolean;
  appliedAt?: string;
  createdAt: string;
}

/**
 * Pool de Conexão
 */
export interface ConnectionPool {
  id: string;
  name: string;
  maxConnections: number;
  activeConnections: number;
  idleConnections: number;
  queuedRequests: number;
  totalRequests: number;
  averageWaitTime: number;                           // Milliseconds
  createdAt: string;
  lastActivityAt: string;
}

/**
 * Compressão de Dados
 */
export interface DataCompression {
  id: string;
  algorithm: 'GZIP' | 'BROTLI' | 'LZ4' | 'SNAPPY';
  originalSize: number;                              // Bytes
  compressedSize: number;
  ratio: number;                                     // 0-100%
  compressionTime: number;                           // Milliseconds
  decompressionTime: number;
  applicableTo: string[];                            // e.g., ["prediction", "export"]
  enabled: boolean;
}

/**
 * Limite de Recurso
 */
export interface ResourceLimit {
  id: string;
  type: 'MEMORY' | 'CPU' | 'STORAGE' | 'CONNECTIONS' | 'REQUESTS';
  value: number;
  unit: string;                                      // e.g., "MB", "percent", "seconds"
  threshold: number;                                 // Percentual de quando alertar
  currentUsage: number;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  lastChecked: string;
}

/**
 * Configuração de Pré-Cálculo
 */
export interface PreCalculationConfig {
  id: string;
  name: string;
  type: 'AGGREGATION' | 'STATISTIC' | 'FORECAST' | 'CORRELATION';
  schedule: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'ON_DEMAND';
  lastRun: string;
  nextRun: string;
  duration: number;                                  // Segundos
  enabled: boolean;
  cacheResults: boolean;
  createdAt: string;
}

/**
 * Dashboard de Performance
 */
export interface PerformanceDashboard {
  id: string;
  generatedAt: string;
  kpis: {
    avgResponseTime: number;
    p95ResponseTime: number;
    cacheHitRate: number;
    batchSuccessRate: number;
    resourceUtilization: number;
  };
  topSlowestOperations: Array<{
    operation: string;
    avgTime: number;
    count: number;
  }>;
  topCacheConsumers: Array<{
    cache: string;
    size: number;
    hitRate: number;
  }>;
  alerts: string[];
  recommendations: string[];
}

/**
 * Dados de Escalabilidade
 */
export interface ScalabilityMetrics {
  id: string;
  timestamp: string;
  dataVolumeGB: number;
  numberOfRecords: number;
  numberOfLojas: number;
  numberOfModels: number;
  queryTimeMs: number;
  scalingFactor: number;                             // Crescimento vs baseline
  estimatedMaxCapacity: number;
}

/**
 * Configuração de Load Balancing
 */
export interface LoadBalancingConfig {
  id: string;
  enabled: boolean;
  strategy: 'ROUND_ROBIN' | 'LEAST_CONNECTIONS' | 'WEIGHTED' | 'RESPONSE_TIME';
  workers: number;
  maxLoad: number;
  currentLoad: number;
  loadFactor: number;                                // 0-100%
  createdAt: string;
}

/**
 * Métricas de Memória
 */
export interface MemoryMetrics {
  timestamp: string;
  heapUsed: number;                                  // Bytes
  heapTotal: number;
  heapMax: number;
  external: number;
  rss: number;                                       // Resident set size
  arrayBuffers: number;
  usagePercent: number;                              // 0-100%
}
