/**
 * Sidebar Dinâmico baseado em Papéis (RBAC)
 * Mostra diferentes itens baseado no papel do utilizador
 * Fase 10: User Management
 */

import React from 'react';
import { useUserAuth } from '../hooks/useUserAuth';
import { getNavItemsForRole, groupNavItemsBySection } from '../config/navigationConfig';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Folder,
  Calculator,
  Building2,
  History,
  FileText,
  User as UserIcon,
  Settings,
  Database,
  LogOut,
  TrendingUp,
} from 'lucide-react';

interface DynamicSidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  companyName: string;
  logoUrl?: string;
  primaryHex: string;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  LayoutDashboard,
  Package,
  Boxes,
  Folder,
  Calculator,
  Building2,
  History,
  FileText,
  User: UserIcon,
  Settings,
  Database,
};

const sectionLabels: Record<string, string> = {
  main: 'Principal',
  management: 'Gestão',
  admin: 'Administrativo',
};

export function DynamicSidebar({
  activeTab,
  onNavigate,
  onLogout,
  companyName,
  logoUrl,
  primaryHex,
}: DynamicSidebarProps) {
  const { papel, isAdmin, isFuncionario, user } = useUserAuth();

  // Obter itens permitidos para o papel do utilizador
  const allowedItems = getNavItemsForRole(papel);

  // Agrupar por secção
  const itemsBySection = groupNavItemsBySection(allowedItems);

  if (!papel) {
    return null; // Utilizador não autenticado
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transition-colors">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="h-8 w-8 rounded-lg object-contain bg-slate-50 border border-slate-100 shrink-0"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              style={{ backgroundColor: primaryHex }}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0"
            >
              <TrendingUp size={16} className="stroke-[2.5]" />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">{companyName}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {isAdmin ? 'Administrador' : isFuncionario ? 'Funcionário' : 'Gerente de Loja'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {Object.entries(itemsBySection).map(([section, items]) => (
          <div key={section}>
            {section !== 'main' && (
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {sectionLabels[section]}
              </div>
            )}
            <div className="space-y-1">
              {items.map((item) => {
                const Icon = iconMap[item.icon];
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                      isActive
                        ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-300'
                    }`}
                  >
                    {Icon && <Icon size={18} className="shrink-0" />}
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-slate-100 dark:border-slate-800/60 p-3 space-y-2">
        <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <p className="text-xs text-slate-500 dark:text-slate-400">Utilizador</p>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user?.nome}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{user?.email}</p>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </div>
  );
}
