/**
 * CategoriesTab Component
 * Tab principal para gerenciar categorias
 */

import React, { useState } from 'react';
import { CategoryList } from './categories/CategoryList';
import { CategoryForm } from './categories/CategoryForm';
import { useCategories } from '../hooks/useCategories';
import { CategoryMarginConfig } from '../types/category';

interface CategoriesTabProps {
  businessType: string;
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({ businessType }) => {
  const { categories, loading, createCategory, updateCategory, deleteCategory } =
    useCategories();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<
    CategoryMarginConfig | undefined
  >();

  const handleCreate = async (data: any) => {
    try {
      await createCategory({
        ...data,
        businessType,
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingCategory) return;

    try {
      await updateCategory(editingCategory.id, {
        ...editingCategory,
        ...data,
      });
      setEditingCategory(undefined);
      setShowForm(false);
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const handleDelete = async (categoryId: string) => {
    try {
      await deleteCategory(categoryId);
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  return (
    <div className="categories-tab">
      {showForm ? (
        <CategoryForm
          category={editingCategory}
          onSubmit={editingCategory ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingCategory(undefined);
          }}
          businessType={businessType}
          loading={loading}
        />
      ) : (
        <CategoryList
          categories={categories}
          onEdit={(cat) => {
            setEditingCategory(cat);
            setShowForm(true);
          }}
          onDelete={handleDelete}
          onAdd={() => setShowForm(true)}
          loading={loading}
        />
      )}
    </div>
  );
};
