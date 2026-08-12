/**
 * useCategories Hook
 * Hook para gerir categorias com real-time updates
 */

import { useEffect, useState } from 'react';
import { CategoryMarginConfig } from '../types/category';
import {
  getUserCategories,
  subscribeToCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,
} from '../services/categoryService';
import { auth } from '../firebase';

export function useCategories() {
  const [categories, setCategories] = useState<CategoryMarginConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = auth.currentUser?.uid;

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const unsubscribe = subscribeToCategories(userId, (updatedCategories) => {
        setCategories(updatedCategories);
        setLoading(false);
      });

      return unsubscribe;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, [userId]);

  // Operations
  const handleCreateCategory = async (
    categoryData: Omit<
      CategoryMarginConfig,
      'id' | 'userId' | 'createdAt' | 'updatedAt'
    >
  ) => {
    if (!userId) throw new Error('User not authenticated');
    return createCategory(userId, categoryData);
  };

  const handleUpdateCategory = async (
    categoryId: string,
    updates: Partial<CategoryMarginConfig>
  ) => {
    if (!userId) throw new Error('User not authenticated');
    return updateCategory(userId, categoryId, updates);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!userId) throw new Error('User not authenticated');
    return deleteCategory(userId, categoryId);
  };

  const handleGetCategory = async (categoryId: string) => {
    if (!userId) throw new Error('User not authenticated');
    return getCategoryById(userId, categoryId);
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
