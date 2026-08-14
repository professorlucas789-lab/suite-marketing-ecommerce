/**
 * Tipos para sistema multi-loja
 * Fase 6: Sistema Multi-Loja
 */

export type StoreType = 'farmacia' | 'informatica' | 'ortopedico' | 'generico';
export type UserRole = 'admin' | 'loja-manager' | 'funcionario';

/**
 * Permissões de utilizador
 */
export interface UserPermissions {
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
  deletar: boolean;
  relatorios: boolean;
}

/**
 * Loja/Estabelecimento
 */
export interface Store {
  id: string;
  nome: string;
  tipo: StoreType;
  endereco: string;
  telefone: string;
  email: string;
  nif?: string;
  ativo: boolean;
  dataCriacao: string; // ISO 8601
  dataAtualizacao: string;
  criadoPor: string; // ID do admin

  // Estatísticas desnormalizadas para performance
  totalProdutos?: number;
  totalUtilizadores?: number;
  ultimaAtualizacao?: string;
}

/**
 * Utilizador do sistema
 */
export interface User {
  id: string; // UID do Firebase Auth
  nome: string;
  email: string;
  papel: UserRole;

  // Lojas a que tem acesso
  lojas: string[]; // IDs das stores

  // Permissões
  permissoes: UserPermissions;

  ativo: boolean;
  dataCriacao: string; // ISO 8601
  ultimoLogin?: string;
  criadoPor: string; // ID de quem criou
}

/**
 * Log de auditoria
 */
export interface AuditLog {
  id: string;
  storeId: string;
  userId: string;
  userName: string;
  acao: 'criar' | 'atualizar' | 'deletar' | 'visualizar' | 'login' | 'logout';
  entityType: 'product' | 'user' | 'store';
  entityId: string;
  entityName: string;

  // Mudanças (para updates)
  mudancas?: {
    [campo: string]: {
      anterior: any;
      novo: any;
    };
  };

  timestamp: string; // ISO 8601
  ip?: string;
  userAgent?: string;
}

/**
 * Stream de atividades (feed em tempo real)
 */
export interface ActivityStream {
  id: string;
  storeId: string;
  userId: string;
  userName: string;

  tipo:
    | 'produto_adicionado'
    | 'produto_editado'
    | 'produto_deletado'
    | 'utilizador_login'
    | 'utilizador_criado'
    | 'preco_alterado';

  descricao: string;
  dados: Record<string, any>;
  timestamp: string; // ISO 8601

  // Quem pode ver
  visivel_para: 'loja' | 'admin';

  // Ícone e cor para UI
  icone?: string;
  cor?: 'azul' | 'verde' | 'vermelho' | 'amarelo' | 'roxo';
}

/**
 * Contexto da loja atual do utilizador
 */
export interface StoreContext {
  storeId: string;
  storeName: string;
  storeType: StoreType;
}

/**
 * Sessão do utilizador com informações de lojas
 */
export interface UserSession extends User {
  currentStore: StoreContext;
  stores: Store[];
}

/**
 * Resposta de autenticação
 */
export interface AuthResponse {
  user: UserSession;
  token: string;
  expiresAt: number;
}

/**
 * Estatísticas da loja
 */
export interface StoreStats {
  storeId: string;
  storeName: string;
  totalProdutos: number;
  produtosAtivos: number;
  precoMedio: number;
  margemMedia: number;
  valorTotalStock: number;
  utilizadoresOnline: number;
  produtosAdicionadosSemana: number;
  produtosAlteradosSemana: number;
  ultimaAtualizacao: string;
}

/**
 * Preferências de notificação do utilizador
 * Fase 13: Notificações
 */
export interface NotificationPreferences {
  userId: string;

  // Canais de notificação
  canais: {
    email: boolean;          // Receber notificações por email
    push: boolean;           // Notificações push no browser
    inApp: boolean;          // Notificações dentro da aplicação (sempre ativo)
  };

  // Categorias de eventos
  eventos: {
    produtoAdicionado: boolean;
    produtoEditado: boolean;
    produtoDeletado: boolean;
    utilizadorCriado: boolean;
    utilizadorAlterado: boolean;
    precoAlterado: boolean;
    relatoriosGerados: boolean;
    alertasSeguranca: boolean;
    manutencaoSistema: boolean;
  };

  // Frequência de resumo
  frequenciaResumo: 'nunca' | 'diaria' | 'semanal' | 'mensal';

  // Horas do dia para não receber notificações
  horarioNaoPerturbar: {
    ativo: boolean;
    horaInicio: string;      // "22:00"
    horaFim: string;         // "08:00"
  };

  // Timestamps
  dataCriacao: string;       // ISO 8601
  dataAtualizacao: string;   // ISO 8601
}

/**
 * Dashboard admin - visão consolidada
 */
export interface AdminDashboard {
  totalLojas: number;
  totalUtilizadores: number;
  totalProdutos: number;
  storesStats: StoreStats[];
  atividadeUltimas24h: ActivityStream[];
  alertas: string[];
  ultimaAtualizacao: string;
}
