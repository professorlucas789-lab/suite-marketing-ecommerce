/**
 * Hook para Gerenciamento de Utilizadores
 */

import { useState, useCallback } from 'react';
import { UserManagementService, CreateUserData, UpdateUserData } from '../services/userManagementService';
import { User, UserPermissions } from '../types/store';

interface UseUserManagementState {
  users: User[];
  loading: boolean;
  error: string | null;
}

export function useUserManagement() {
  const [state, setState] = useState<UseUserManagementState>({
    users: [],
    loading: false,
    error: null,
  });

  /**
   * Carrega utilizadores de uma loja
   */
  const loadStoreUsers = useCallback(async (storeId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const users = await UserManagementService.getStoreUsers(storeId);
      setState((prev) => ({ ...prev, users, loading: false }));
      return users;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar utilizadores';
      setState((prev) => ({ ...prev, error: message, loading: false }));
      throw error;
    }
  }, []);

  /**
   * Carrega todos os utilizadores (apenas admin)
   */
  const loadAllUsers = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const users = await UserManagementService.getAllUsers();
      setState((prev) => ({ ...prev, users, loading: false }));
      return users;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar utilizadores';
      setState((prev) => ({ ...prev, error: message, loading: false }));
      throw error;
    }
  }, []);

  /**
   * Cria um novo utilizador
   */
  const createUser = useCallback(
    async (data: CreateUserData, password: string, createdBy: string): Promise<User> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const newUser = await UserManagementService.createUser(data, password, createdBy);
        setState((prev) => ({ ...prev, users: [...prev.users, newUser], loading: false }));
        return newUser;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao criar utilizador';
        setState((prev) => ({ ...prev, error: message, loading: false }));
        throw error;
      }
    },
    []
  );

  /**
   * Atualiza um utilizador
   */
  const updateUser = useCallback(
    async (
      userId: string,
      data: UpdateUserData,
      updatedBy: string,
      storeId: string
    ): Promise<void> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        await UserManagementService.updateUser(userId, data, updatedBy, storeId);

        // Atualizar estado local
        setState((prev) => ({
          ...prev,
          users: prev.users.map((u) => (u.id === userId ? { ...u, ...data } : u)),
          loading: false,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao atualizar utilizador';
        setState((prev) => ({ ...prev, error: message, loading: false }));
        throw error;
      }
    },
    []
  );

  /**
   * Desativa um utilizador
   */
  const deactivateUser = useCallback(
    async (userId: string, deactivatedBy: string, storeId: string): Promise<void> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        await UserManagementService.deactivateUser(userId, deactivatedBy, storeId);

        // Atualizar estado local
        setState((prev) => ({
          ...prev,
          users: prev.users.map((u) => (u.id === userId ? { ...u, ativo: false } : u)),
          loading: false,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao desativar utilizador';
        setState((prev) => ({ ...prev, error: message, loading: false }));
        throw error;
      }
    },
    []
  );

  /**
   * Atualiza permissões de um utilizador
   */
  const updatePermissions = useCallback(
    async (
      userId: string,
      permissions: UserPermissions,
      updatedBy: string,
      storeId: string
    ): Promise<void> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        await UserManagementService.updatePermissions(userId, permissions, updatedBy, storeId);

        // Atualizar estado local
        setState((prev) => ({
          ...prev,
          users: prev.users.map((u) =>
            u.id === userId ? { ...u, permissoes: permissions } : u
          ),
          loading: false,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao atualizar permissões';
        setState((prev) => ({ ...prev, error: message, loading: false }));
        throw error;
      }
    },
    []
  );

  /**
   * Verifica se um utilizador tem uma permissão
   */
  const hasPermission = useCallback(async (userId: string, permission: keyof UserPermissions) => {
    try {
      return await UserManagementService.hasPermission(userId, permission);
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      return false;
    }
  }, []);

  /**
   * Adiciona um utilizador a uma loja
   */
  const addUserToStore = useCallback(
    async (userId: string, storeId: string, addedBy: string): Promise<void> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        await UserManagementService.addUserToStore(userId, storeId, addedBy);

        // Atualizar estado local
        setState((prev) => ({
          ...prev,
          users: prev.users.map((u) =>
            u.id === userId
              ? { ...u, lojas: Array.from(new Set([...u.lojas, storeId])) }
              : u
          ),
          loading: false,
        }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erro ao adicionar utilizador à loja';
        setState((prev) => ({ ...prev, error: message, loading: false }));
        throw error;
      }
    },
    []
  );

  /**
   * Remove um utilizador de uma loja
   */
  const removeUserFromStore = useCallback(
    async (userId: string, storeId: string, removedBy: string): Promise<void> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        await UserManagementService.removeUserFromStore(userId, storeId, removedBy);

        // Atualizar estado local
        setState((prev) => ({
          ...prev,
          users: prev.users.map((u) =>
            u.id === userId
              ? { ...u, lojas: u.lojas.filter((id) => id !== storeId) }
              : u
          ),
          loading: false,
        }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erro ao remover utilizador da loja';
        setState((prev) => ({ ...prev, error: message, loading: false }));
        throw error;
      }
    },
    []
  );

  return {
    // State
    users: state.users,
    loading: state.loading,
    error: state.error,

    // Métodos
    loadStoreUsers,
    loadAllUsers,
    createUser,
    updateUser,
    deactivateUser,
    updatePermissions,
    hasPermission,
    addUserToStore,
    removeUserFromStore,

    // Utilitário
    clearError: () => setState((prev) => ({ ...prev, error: null })),
  };
}
