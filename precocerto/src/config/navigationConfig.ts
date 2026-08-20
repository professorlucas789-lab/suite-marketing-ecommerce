/**
 * Configuração de Navegação baseada em Papéis (RBAC)
 * Define quais itens do menu cada papel pode ver
 * Fase 10: User Management
 */

import { UserRole } from '../types/store';

export type NavigationItemId =
  | 'dashboard'
  | 'products'
  | 'batch-products'
  | 'categories'
  | 'reverse-calculator'
  | 'alertas' // NOVO (Fase 4 - Alertas de Validade)
  | 'estoque' // NOVO (Fase 5 - Gestão de Estoque)
  | 'vendas' // NOVO (Fase 6 - Módulo de Vendas)
  | 'clientes' // NOVO (Fase 6 - Clientes e contas correntes)
  | 'multi-loja' // NOVO (Fase 9 - Dashboard Multi-Loja)
  | 'notificacoes' // NOVO (Fase 10 - Configurações de Notificações)
  | 'automacao' // NOVO (Fase 10 - Monitoramento de Automação)
  | 'twilio-config' // NOVO (Fase 11 - Integração Twilio)
  | 'stores'
  | 'history'
  | 'reports'
  | 'users'
  | 'settings'
  | 'backup'
  | 'user-profile' // NOVO (Fase 11 - User Profile)
  | 'diagnostics'; // NOVO: Admin Diagnostics

interface NavigationConfig {
  id: NavigationItemId;
  label: string;
  icon: string; // Nome do ícone
  roles: UserRole[]; // Papéis que podem ver este item
  section?: 'main' | 'management' | 'admin'; // Secção do menu
}

export const navigationConfig: NavigationConfig[] = [
  // SECÇÃO PRINCIPAL - Todos podem ver
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    roles: ['admin', 'loja-manager', 'funcionario'],
    section: 'main',
  },

  // SECÇÃO DE PRODUTOS - Todos podem ver
  {
    id: 'products',
    label: 'Lista de Produtos',
    icon: 'Package',
    roles: ['admin', 'loja-manager', 'funcionario'],
    section: 'main',
  },

  {
    id: 'batch-products',
    label: 'Cadastro em Lote',
    icon: 'Boxes',
    roles: ['admin', 'loja-manager'],
    section: 'main',
  },

  {
    id: 'categories',
    label: 'Categorias',
    icon: 'Folder',
    roles: ['admin'], // FIX (Fase 12): Apenas admin pode criar/editar categorias globalmente
    section: 'main',
  },

  {
    id: 'reverse-calculator',
    label: 'Calculadora Reversa',
    icon: 'Calculator',
    roles: ['admin', 'loja-manager', 'funcionario'],
    section: 'main',
  },

  {
    id: 'alertas',
    label: '🔔 Alertas',
    icon: 'Bell',
    roles: ['admin', 'loja-manager', 'funcionario'],
    section: 'main',
  },

  {
    id: 'estoque',
    label: 'Stock',
    icon: 'PackageCheck',
    roles: ['admin', 'loja-manager'],
    section: 'main',
  },

  // SECÇÃO DE GESTÃO - Apenas Admins
  {
    id: 'stores',
    label: 'Unidades',
    icon: 'Building2',
    roles: ['admin'], // EXCLUSIVO: Apenas admin pode criar/editar unidades
    section: 'management',
  },

  {
    id: 'multi-loja',
    label: '🏪 Análise Multi-Loja',
    icon: 'BarChart3',
    roles: ['admin'], // NOVO (Fase 9): Apenas admin vê comparação consolidada
    section: 'management',
  },

  {
    id: 'history',
    label: 'Histórico',
    icon: 'History',
    roles: ['admin', 'loja-manager'],
    section: 'management',
  },

  {
    id: 'reports',
    label: 'Relatórios',
    icon: 'FileText',
    roles: ['admin', 'loja-manager'],
    section: 'management',
  },

  {
    id: 'vendas',
    label: '💰 Módulo de Vendas',
    icon: 'DollarSign',
    roles: ['admin', 'loja-manager', 'funcionario'], // NOVO (Fase 6): Todos podem registar vendas
    section: 'management',
  },

  {
    id: 'clientes',
    label: 'Clientes',
    icon: 'Users',
    roles: ['admin', 'loja-manager', 'funcionario'],
    section: 'management',
  },

  {
    id: 'users',
    label: 'Utilizadores',
    icon: 'User',
    roles: ['admin'], // FIX (Fase 11): Apenas admin pode gerenciar utilizadores
    section: 'management',
  },

  {
    id: 'user-profile',
    label: 'Meu Perfil',
    icon: 'User',
    roles: ['admin', 'loja-manager', 'funcionario'], // NOVO (Fase 11): Todos podem acessar seu próprio perfil
    section: 'management',
  },

  {
    id: 'notificacoes',
    label: '🔔 Notificações',
    icon: 'Bell',
    roles: ['admin', 'loja-manager', 'funcionario'], // NOVO (Fase 10): Todos podem configurar
    section: 'management',
  },

  {
    id: 'automacao',
    label: '⚙️ Automação de Alertas',
    icon: 'Settings',
    roles: ['admin', 'loja-manager'], // NOVO (Fase 10): Apenas admin e managers
    section: 'admin',
  },

  {
    id: 'twilio-config',
    label: '🔐 Twilio (WhatsApp/SMS)',
    icon: 'Key',
    roles: ['admin'], // NOVO (Fase 11): Apenas admin configura Twilio
    section: 'admin',
  },

  // SECÇÃO ADMINISTRATIVA - Apenas Admins
  {
    id: 'settings',
    label: 'Configurações',
    icon: 'Settings',
    roles: ['admin'],
    section: 'admin',
  },

  {
    id: 'backup',
    label: 'Backup e Dados',
    icon: 'Database',
    roles: ['admin'],
    section: 'admin',
  },

  {
    id: 'diagnostics',
    label: 'Diagnóstico', // NOVO: Debug para admin
    icon: 'Settings',
    roles: ['admin'],
    section: 'admin',
  },
];

/**
 * Obter itens de navegação permitidos para um papel específico
 */
export function getNavItemsForRole(role: UserRole | null): NavigationConfig[] {
  if (!role) return [];
  return navigationConfig.filter((item) => item.roles.includes(role));
}

/**
 * Verificar se um papel pode aceder a um item de navegação
 */
export function canAccessNavItem(role: UserRole | null, itemId: NavigationItemId): boolean {
  if (!role) return false;
  const item = navigationConfig.find((i) => i.id === itemId);
  return item ? item.roles.includes(role) : false;
}

/**
 * Agrupar itens de navegação por secção
 */
export function groupNavItemsBySection(items: NavigationConfig[]): Record<string, NavigationConfig[]> {
  return items.reduce(
    (acc, item) => {
      const section = item.section || 'main';
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(item);
      return acc;
    },
    {} as Record<string, NavigationConfig[]>
  );
}
