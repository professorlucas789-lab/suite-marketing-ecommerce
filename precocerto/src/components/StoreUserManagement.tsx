/**
 * Gestão de utilizadores por loja
 * Fase 6: Sistema Multi-Loja - Fase 2
 */

import React, { useState, useEffect } from 'react';
import { User, UserPermissions } from '../types/store';
import { useUserManagement } from '../hooks/useUserManagement';
import { useAuth } from '../hooks/useAuth';
import { Loader2, AlertCircle, Trash2, Plus, Check, Mail } from 'lucide-react';

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
  const { user: currentUser } = useAuth();
  const {
    users,
    loading,
    error,
    createUser,
    deactivateUser,
    updatePermissions,
    clearError,
    loadStoreUsers,
  } = useUserManagement();

  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'loja-manager' | 'funcionario'>(
    'funcionario'
  );
  const [permissions, setPermissions] = useState<UserPermissions>(defaultPermissions);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadStoreUsers(storeId);
  }, [storeId, loadStoreUsers]);

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

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUserEmail || !newUserName || !newUserPassword) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    if (newUserPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsSubmitting(true);
    try {
      await createUser(
        {
          email: newUserEmail,
          nome: newUserName,
          papel: selectedRole,
          lojas: [storeId],
          permissoes: permissions,
        },
        newUserPassword,
        currentUser?.uid || 'system'
      );

      // Limpar formulário
      resetForm();

      // Recarregar utilizadores
      await loadStoreUsers(storeId);

      alert('Utilizador criado com sucesso!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar utilizador';
      alert(`Erro: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Tem a certeza que deseja remover este utilizador?')) {
      return;
    }

    try {
      await deactivateUser(userId, currentUser?.uid || 'system', storeId);
      alert('Utilizador removido com sucesso!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover utilizador';
      alert(`Erro: ${message}`);
    }
  };

  const resetForm = () => {
    setShowAddUser(false);
    setSelectedRole('funcionario');
    setPermissions(defaultPermissions);
    setNewUserEmail('');
    setNewUserName('');
    setNewUserPassword('');
    clearError();
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

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleAddUser} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                placeholder="usuario@example.com"
                required
              />
            </div>

            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                placeholder="João Silva"
                required
              />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Senha (mínimo 6 caracteres)
              </label>
              <input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                placeholder="••••••"
                required
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Papel
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['admin', 'loja-manager', 'funcionario'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
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
                        disabled={isSubmitting}
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
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Adicionar Utilizador
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      <div className="space-y-2">
        {users.filter((u) => u.lojas.includes(storeId)).length === 0 ? (
          <div className="text-center py-8 text-slate-600 dark:text-slate-400">
            <p>Nenhum utilizador atribuído a esta loja</p>
          </div>
        ) : (
          users
            .filter((u) => u.lojas.includes(storeId) && u.ativo)
            .map((user) => (
              <div
                key={user.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 dark:text-white">{user.nome}</h4>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mt-1">
                      <Mail size={14} />
                      {user.email}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-block px-2 py-1 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded">
                        {roleLabels[user.papel]}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveUser(user.id)}
                    disabled={isSubmitting}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 rounded transition-colors disabled:opacity-50"
                    title="Remover utilizador"
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
                        {perm === 'visualizar' ? '👁️ Ver' : perm}
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
