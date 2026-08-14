/**
 * CategoriesTab Component
 * Tab principal para gerenciar categorias
 * NOVO (Fase 12): Isolado por loja + seletor para admin
 */

import React, { useState } from 'react';
import { CategoryList } from './categories/CategoryList';
import { CategoryForm } from './categories/CategoryForm';
import { useCategories } from '../hooks/useCategories';
import { useStore } from '../contexts/StoreContext';
import { useUserAuth } from '../hooks/useUserAuth';
import { CategoryMarginConfig } from '../types/category';
import { motion } from 'motion/react';
import { Building2 } from 'lucide-react';

interface CategoriesTabProps {
  businessType: string;
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({ businessType }) => {
  const { currentStore, userStores, switchStore } = useStore();
  const { papel } = useUserAuth();
  const [selectedStoreId, setSelectedStoreId] = useState<string>(currentStore?.storeId || '');

  const { categories, loading, createCategory, updateCategory, deleteCategory } =
    useCategories({ storeId: selectedStoreId });

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<
    CategoryMarginConfig | undefined
  >();

  const isAdmin = papel === 'admin';
  const displayStoreId = selectedStoreId || currentStore?.storeId;
  const displayStoreName =
    userStores.find(s => s.id === displayStoreId)?.nome ||
    currentStore?.storeName ||
    'Loja Desconhecida';

  const handleCreate = async (data: any) => {
    try {
      await createCategory({
        ...data,
        businessType,
      });
      setShowForm(false);
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
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
      console.error('Erro ao atualizar categoria:', error);
      throw error;
    }
  };

  const handleDelete = async (categoryId: string) => {
    try {
      await deleteCategory(categoryId);
    } catch (error) {
      console.error('Erro ao deletar categoria:', error);
    }
  };

  const handleStoreChange = async (storeId: string) => {
    setSelectedStoreId(storeId);
    await switchStore(storeId);
  };

  return (
    <div className="categories-tab space-y-6">
      {/* Seletor de Loja (apenas para admin) */}
      {isAdmin && userStores.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 rounded-xl border border-slate-200"
        >
          <div className="flex items-center gap-3 mb-4">
            <Building2 size={20} className="text-emerald-600" />
            <h3 className="text-lg font-semibold text-slate-800">Selecionar Loja</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {userStores.map((store) => (
              <button
                key={store.id}
                onClick={() => handleStoreChange(store.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  displayStoreId === store.id
                    ? 'border-emerald-500 bg-emerald-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="font-semibold text-sm text-slate-800">{store.nome}</div>
                <div className="text-xs text-slate-500 mt-1">{store.endereco}</div>
                {displayStoreId === store.id && (
                  <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    ✓ Selecionada
                  </div>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Info da Loja Selecionada */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Loja Atual:</span> {displayStoreName}
        </p>
      </div>

      {/* Formulário ou Lista de Categorias */}
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
