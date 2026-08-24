/**
 * useGlobalCategories Hook
 * Hook para gerenciar categorias globais compartilhadas entre todas as lojas
 * NOVO (Fase 14): Sincronização de categorias entre lojas
 *
 * Uso:
 * const { categories, loading, error, createCategory, updateCategory, deleteCategory } = useGlobalCategories();
 */

import { useState, useEffect, useCallback } from 'react';
import { CategoryMarginConfig } from '../types/category';
import { useAuth } from './useAuth';
import {
  getUserGlobalCategories,
  subscribeToUserGlobalCategories,
  createGlobalCategory,
  updateGlobalCategory,
  updateGlobalCategoryMarginRules,
  deleteGlobalCategory,
} from '../services/globalCategoryService';

interface UseGlobalCategoriesReturn {
  categories: CategoryMarginConfig[];
  loading: boolean;
  error: string | null;
  createCategory: (categoryData: Omit<CategoryMarginConfig, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateCategory: (categoryId: string, updates: Partial<CategoryMarginConfig>) => Promise<void>;
  updateCategoryMarginRules: (categoryId: string, marginRules: any) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  refreshCategories: () => Promise<void>;
}

export function useGlobalCategories(): UseGlobalCategoriesReturn {
  const { user } = useAuth();
  const userId = user?.uid;
  const [categories, setCategories] = useState<CategoryMarginConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar categorias globais ao montar
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Tentar carregar categorias globais
    const loadCategories = async () => {
      try {
        const globalCategories = await getUserGlobalCategories(userId);
        setCategories(globalCategories);
      } catch (err) {
        console.error('Erro ao carregar categorias globais:', err);
        setError('Erro ao carregar categorias');
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();

    // Setup listener real-time para mudanças
    const unsubscribe = subscribeToUserGlobalCategories(userId, (updatedCategories) => {
      setCategories(updatedCategories);
    });

    return () => unsubscribe();
  }, [userId]);

  // Criar nova categoria global
  const createCategory = useCallback(
    async (categoryData: Omit<CategoryMarginConfig, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>) => {
      if (!userId) throw new Error('Utilizador não autenticado');

      try {
        const categoryId = await createGlobalCategory(userId, categoryData);
        console.log('✅ Categoria global criada:', categoryId);
        return categoryId;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao criar categoria';
        setError(errorMsg);
        throw err;
      }
    },
    [userId]
  );

  // Atualizar categoria global
  const updateCategory = useCallback(
    async (categoryId: string, updates: Partial<CategoryMarginConfig>) => {
      if (!userId) throw new Error('Utilizador não autenticado');

      try {
        await updateGlobalCategory(userId, categoryId, updates);
        console.log('✅ Categoria global atualizada:', categoryId);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar categoria';
        setError(errorMsg);
        throw err;
      }
    },
    [userId]
  );

  // Atualizar regras de margem da categoria global
  const updateCategoryMarginRules = useCallback(
    async (categoryId: string, marginRules: any) => {
      if (!userId) throw new Error('Utilizador não autenticado');

      try {
        await updateGlobalCategoryMarginRules(userId, categoryId, marginRules);
        console.log('✅ Regras de margem atualizadas:', categoryId);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar regras de margem';
        setError(errorMsg);
        throw err;
      }
    },
    [userId]
  );

  // Deletar categoria global
  const deleteCategory = useCallback(
    async (categoryId: string) => {
      if (!userId) throw new Error('Utilizador não autenticado');

      try {
        await deleteGlobalCategory(userId, categoryId);
        console.log('✅ Categoria global deletada:', categoryId);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao deletar categoria';
        setError(errorMsg);
        throw err;
      }
    },
    [userId]
  );

  // Atualizar manualmente as categorias
  const refreshCategories = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const freshCategories = await getUserGlobalCategories(userId);
      setCategories(freshCategories);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar categorias';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    updateCategoryMarginRules,
    deleteCategory,
    refreshCategories,
  };
}
