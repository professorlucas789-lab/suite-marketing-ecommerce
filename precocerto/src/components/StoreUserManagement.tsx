/**
 * Gestão de utilizadores por loja
 * Fase 6: Sistema Multi-Loja - Fase 2
 */

import React, { useState, useEffect } from 'react';
import { User, UserPermissions } from '../types/store';
import { getStoreUsers, addUserToStore } from '../utils/storeUtils';
import { Loader2, AlertCircle, Trash2, Plus, Check } from 'lucide-react';

interface StoreUserManagementProps {
  storeId: string;
  storeName: string;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  'loja-manager': 'Gestor de Loja',
  funcionario: 'Funcionário',
};

const defaultPermissions: UserPermissions = {
  visualizar: true,
  criar: false,
  editar: false,
  deletar: false,
  relatorios: false,
};

export function StoreUserManagement({ storeId, storeName }: StoreUserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'loja-manager' | 'funcionario'>(
    'funcionario'
  );
  const [permissions, setPermissions] = useState<UserPermissions>(defaultPermissions);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, [storeId]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStoreUsers(storeId);
      setUsers(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar utilizadores';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (role: 'admin' | 'loja-manager' | 'funcionario') => {
    setSelectedRole(role);

    // Auto-set permissions based on role
    if (role === 'admin') {
      setPermissions({
        visualizar: true,
        criar: true,
        editar: true,
        deletar: true,
        relatorios: true,
      });
    } else if (role === 'loja-manager') {
      setPermissions({
        visualizar: true,
        criar: true,
        editar: true,
        deletar: false,
        relatorios: true,
      });
    } else {
      setPermissions({
        visualizar: true,
        criar: true,
        editar: false,
        deletar: false,
        relatorios: false,
      });
    }
  };

  const handlePermissionChange = (permission: keyof UserPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission],
    }));
  };

  const resetForm = () => {
    setShowAddUser(false);
    setSelectedRole('funcionario');
    setPermissions(defaultPermissions);
    setEditingUserId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-emerald-600" />
        <span className="ml-2 text-slate-600 dark:text-slate-400">A carregar utilizadores...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Utilizadores</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Gestão de utilizadores de {storeName}</p>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus size={18} />
          Adicionar Utilizador
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 dark:text-red-200">Erro</p>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Add User Form */}
      {showAddUser && (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Novo Utilizador</h3>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Papel
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['admin', 'loja-manager', 'funcionario'] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    selectedRole === role
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {roleLabels[role]}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Permissões
            </label>
            <div className="space-y-2">
              {(['visualizar', 'criar', 'editar', 'deletar', 'relatorios'] as const).map(
                (perm) => (
                  <label
                    key={perm}
                    className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={permissions[perm]}
                      onChange={() => handlePermissionChange(perm)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                      {perm}
                    </span>
                  </label>
                )
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={resetForm}
              className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              disabled
            >
              <Check size={16} />
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="space-y-2">
        {users.length === 0 ? (
          <div className="text-center py-8 text-slate-600 dark:text-slate-400">
            <p>Nenhum utilizador atribuído a esta loja</p>
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">{user.nome}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-block px-2 py-1 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded">
                      {roleLabels[user.papel]}
                    </span>
                    {!user.ativo && (
                      <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 text-xs font-medium rounded">
                        Inativo
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setEditingUserId(user.id === editingUserId ? null : user.id)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded transition-colors"
                  title="Remover"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Permissions Display */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Permissões:
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(user.permissoes).map(([perm, hasPermission]) => (
                    <span
                      key={perm}
                      className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        hasPermission
                          ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
