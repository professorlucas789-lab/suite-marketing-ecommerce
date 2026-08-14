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
import { Building2, RefreshCw, Loader2 } from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';

interface CategoriesTabProps {
  businessType: string;
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({ businessType }) => {
  const { currentStore, userStores, switchStore, refreshStoreData } = useStore();
  const { papel } = useUserAuth();

  // FIX (Fase 12+): Se não há loja selecionada, usar primeira loja disponível
  const defaultStoreId = currentStore?.storeId || userStores[0]?.id || '';
  const [selectedStoreId, setSelectedStoreId] = useState<string>(defaultStoreId);

  const { categories, loading, createCategory, updateCategory, deleteCategory } =
    useCategories({ storeId: selectedStoreId });

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<
    CategoryMarginConfig | undefined
  >();

  // Estado para atribuição de lojas
  const [atribuindo, setAtribuindo] = useState(false);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

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
    try {
      setSelectedStoreId(storeId);
      await switchStore(storeId);
    } catch (error) {
      console.error('❌ Erro ao mudar loja:', error);
    }
  };

  /**
   * Atribuir automaticamente todas as lojas ao admin
   */
  const handleAtribuirLojas = async () => {
    console.log('🎯 handleAtribuirLojas foi chamado!');
    try {
      setAtribuindo(true);
      setMensagemErro(null);
      const user = auth.currentUser;

      console.log('📱 Utilizador atual:', user?.uid, user?.email);

      if (!user) {
        const msg = 'Utilizador não autenticado';
        console.error('❌', msg);
        setMensagemErro(msg);
        return;
      }

      console.log('🔧 Buscando todas as lojas ativas da coleção "stores"...');
      const allStoresSnap = await getDocs(collection(db, 'stores'));
      console.log('📦 Total de documentos encontrados:', allStoresSnap.size);

      const allStoreIds = allStoresSnap.docs
        .filter(doc => {
          const data = doc.data();
          const ativo = data.ativo !== false;
          console.log(`  - Loja ${doc.id}: ativo=${data.ativo}, incluída=${ativo}`);
          return ativo;
        })
        .map(doc => doc.id);

      console.log('✅ Lojas ativas encontradas:', allStoreIds);

      if (allStoreIds.length === 0) {
        const msg = 'Nenhuma loja ativa encontrada. Crie uma loja primeiro.';
        console.error('❌', msg);
        setMensagemErro(msg);
        return;
      }

      console.log(`🔄 Atualizando documento do utilizador ${user.uid} com lojas:`, allStoreIds);
      await updateDoc(doc(db, 'users', user.uid), {
        lojas: allStoreIds
      });

      console.log('✅ Lojas atribuídas com sucesso no Firestore!');

      // Recarregar dados de loja
      console.log('🔄 Recarregando dados de loja...');
      await refreshStoreData();

      console.log('✅ Dados de loja recarregados com sucesso!');
      setMensagemErro(null);

    } catch (error) {
      console.error('❌ Erro completo:', error);
      console.error('  - Tipo de erro:', error instanceof Error ? 'Error' : typeof error);
      console.error('  - Stack:', error instanceof Error ? error.stack : 'N/A');

      const msg = error instanceof Error ? error.message : 'Erro ao atribuir lojas';
      console.error('❌ Mensagem de erro:', msg);
      setMensagemErro(msg);
    } finally {
      console.log('🏁 handleAtribuirLojas finalizado');
      setAtribuindo(false);
    }
  };

  // FIX: Verificar se há lojas atribuídas
  if (userStores.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <p className="text-2xl">⚠️</p>
            </div>
            <div className="flex-1">
              <p className="text-amber-900 font-semibold mb-2">Nenhuma Loja Atribuída</p>
              <p className="text-amber-700 text-sm mb-4">
                Para gerenciar categorias, você precisa ter pelo menos uma loja atribuída.
              </p>

              {mensagemErro && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  <p className="text-red-700 text-sm">❌ {mensagemErro}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleAtribuirLojas}
                  disabled={atribuindo}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {atribuindo ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Atribuindo...
                    </>
                  ) : (
                    <>
                      <Building2 size={16} />
                      Atribuir Lojas Automaticamente
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <RefreshCw size={16} />
                  Recarregar
                </button>
              </div>

              <p className="text-amber-600 text-xs mt-4 mb-2">
                <strong>O que fazer:</strong>
              </p>
              <ul className="text-amber-600 text-xs space-y-1">
                <li>✓ Clique em "Atribuir Lojas Automaticamente" (recomendado)</li>
                <li>✓ Ou verifique se tem lojas criadas (vá a "Lojas")</li>
                <li>✓ Ou recarregue a página para sincronizar dados</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

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
