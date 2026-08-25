/**
 * Alert Types
 * Definições de tipos para sistema de alertas e notificações
 * NOVO (Fase 13): Sistema inteligente de alertas
 */

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertChannel = 'in-app' | 'email' | 'whatsapp';
export type AlertType = 'EXPIRY' | 'LOW_STOCK' | 'PRICE_CHANGE' | 'SYSTEM';

/**
 * ExpiryAlert
 * Alerta de produto vencendo em breve
 */
export interface ExpiryAlert {
  id: string;
  storeId: string;
  productId: string;
  productName: string;

  // Data de validade
  dataValidade: string; // YYYY-MM-DD
  daysUntilExpiry: number; // Dias até vencer

  // Severidade baseada em dias
  severity: AlertSeverity; // CRITICAL: <7 dias, WARNING: <30 dias, INFO: <60 dias

  // Notificação
  channels: AlertChannel[];
  notificadoEm?: string; // ISO timestamp quando foi notificado

  // Status do alerta
  resolvido: boolean;
  resolvidoEm?: string; // ISO timestamp
  resolvidoPor?: string; // userId
  resolvidoMotivo?: string; // ex: "Produto descartado", "Vendido", "Devolvido"

  // Auditoria
  criadoEm: string; // ISO timestamp
  atualizadoEm: string; // ISO timestamp
}

/**
 * LowStockAlert
 * Alerta de stock abaixo do mínimo
 */
export interface LowStockAlert {
  id: string;
  storeId: string;
  productId: string;
  productName: string;

  // Quantidade
  quantidadeAtual: number;
  quantidadeMinima: number;

  // Severidade
  severity: AlertSeverity; // CRITICAL: 0 unidades, WARNING: <min, INFO: alertado

  // Notificação
  channels: AlertChannel[];
  notificadoEm?: string;

  // Status
  resolvido: boolean;
  resolvidoEm?: string;
  resolvidoPor?: string; // userId que reabasteceu

  // Auditoria
  criadoEm: string;
  atualizadoEm: string;
}

/**
 * AlertPreferences
 * Preferências de notificação do utilizador
 */
export interface AlertPreferences {
  storeId: string;
  userId: string;

  // Canais habilitados
  emailHabilitado: boolean;
  whatsappHabilitado: boolean;
  inAppHabilitado: boolean;

  // Contatos
  email?: string;
  whatsapp?: string; // Número com código país: +244923456789

  // Frequência
  frequenciaEmailHoras: number; // 0 = imediato, 24 = diário
  frequenciaWhatsappHoras: number;

  // Tipos de alerta
  alertarValidade: boolean;
  alertarStock: boolean;
  alertarMudancasPreco: boolean;

  // Threshold de dias para alertas
  diasCritico: number; // Padrão: 7
  diasAviso: number; // Padrão: 30
  diasInfo: number; // Padrão: 60

  // Auditoria
  criadoEm: string;
  atualizadoEm: string;
}

/**
 * AlertHistory
 * Histórico completo de alertas (auditoria)
 */
export interface AlertHistory {
  id: string;
  storeId: string;
  alertId: string; // Referência ao alerta original
  alertType: AlertType; // EXPIRY, LOW_STOCK, etc

  // Dados do alerta
  productId: string;
  productName: string;
  severity: AlertSeverity;

  // Ação tomada
  acao: 'CRIADO' | 'NOTIFICADO' | 'RESOLVIDO' | 'REABERTO';
  acaoPor?: string; // userId
  motivo?: string;

  // Timestamp
  timestamp: string; // ISO
}

/**
 * NotificationLog
 * Log de tentativas de envio de notificações
 */
export interface NotificationLog {
  id: string;
  storeId: string;
  alertId: string;

  // Destino
  canal: AlertChannel;
  destino: string; // email, número whatsapp, userId

  // Status
  status: 'ENVIADO' | 'FALHOU' | 'PENDENTE';
  tentativas: number;
  proximaTentativa?: string; // ISO

  // Erro (se houver)
  erro?: string;

  // Auditoria
  criadoEm: string;
  atualizadoEm: string;
}
