/**
 * useCategories Hook
 * Hook para gerir categorias com real-time updates
 * NOVO (Fase 12): Categorias isoladas por loja
 */

import { useEffect, useState } from 'react';
import { CategoryMarginConfig } from '../types/category';
import {
  getStoreCategories,
  subscribeToStoreCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,
} from '../services/categoryService';

interface UseCategoriesProps {
  storeId: string;
}

export function useCategories({ storeId }: UseCategoriesProps) {
  const [categories, setCategories] = useState<CategoryMarginConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`📦 Subscrevendo a categorias da loja: ${storeId}`);
      const unsubscribe = subscribeToStoreCategories(storeId, (updatedCategories) => {
        setCategories(updatedCategories);
        setLoading(false);
      });

      return unsubscribe;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      setLoading(false);
    }
  }, [storeId]);

  // Operations
  const handleCreateCategory = async (
    categoryData: Omit<
      CategoryMarginConfig,
      'id' | 'storeId' | 'createdAt' | 'updatedAt'
    >
  ) => {
    if (!storeId) throw new Error('Store ID não fornecido');
    return createCategory(storeId, categoryData);
  };

  const handleUpdateCategory = async (
    categoryId: string,
    updates: Partial<CategoryMarginConfig>
  ) => {
    if (!storeId) throw new Error('Store ID não fornecido');
    return updateCategory(storeId, categoryId, updates);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!storeId) throw new Error('Store ID não fornecido');
    return deleteCategory(storeId, categoryId);
  };

  const handleGetCategory = async (categoryId: string) => {
    if (!storeId) throw new Error('Store ID não fornecido');
    return getCategoryById(storeId, categoryId);
  };

  return {
    categories,
    loading,
    error,
    createCategory: handleCreateCategory,
    updateCategory: handleUpdateCategory,
    deleteCategory: handleDeleteCategory,
    getCategory: handleGetCategory,
    getCategoryById: (id: string) => categories.find((c) => c.id === id),
  };
}
