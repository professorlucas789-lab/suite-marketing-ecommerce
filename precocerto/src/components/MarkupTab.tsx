/**
 * MarkupTab Component
 * Tab para gerenciar tabelas de markup
 * Integra MarkupTable + useMarkupTable hook
 * Para adicionar em CategoriesTab
 */

import React from 'react';
import { useStore } from '../contexts/StoreContext';
import { useMarkupTable } from '../hooks/useMarkupTable';
import { MarkupTable } from './MarkupTable';
import { AlertCircle, Building2 } from 'lucide-react';
import { motion } from 'motion/react';

export const MarkupTab: React.FC = () => {
  const { currentStore, userStores } = useStore();

  // Usar storeId atual, ou primeira loja se não houver
  const storeId = currentStore?.storeId || userStores[0]?.id;

  const { markups, loading, error, actions } = useMarkupTable({
    storeId: storeId || '',
  });

  if (!storeId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6"
      >
        <div className="flex gap-3">
          <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-200">
              Loja não selecionada
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Por favor selecione uma loja para gerenciar markups
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const storeName = userStores.find(s => s.id === storeId)?.nome || currentStore?.storeName || 'Desconhecida';

  const handleCreate = async (data: any) => {
    try {
      await actions.create(data);
    } catch (err) {
      console.error('Erro ao criar markup:', err);
    }
  };

  const handleUpdate = async (markupId: string, updates: any) => {
    try {
      // Extrair apenas os campos de atualização (remover id e storeId)
      const { id, storeId, criadoEm, atualizadoEm, ...updateData } = updates;
      await actions.update(markupId, updateData);
    } catch (err) {
      console.error('Erro ao atualizar markup:', err);
    }
  };

  const handleDelete = async (markupId: string) => {
    try {
      await actions.delete(markupId);
    } catch (err) {
      console.error('Erro ao deletar markup:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header da Loja */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-6 border border-emerald-200 dark:border-emerald-800"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-600 text-white rounded-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {storeName}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configuração de Margens de Lucro
            </p>
          </div>
        </div>
      </motion.div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
      >
        <p className="text-sm text-blue-900 dark:text-blue-200">
          <strong>💡 Dica:</strong> Configure as margens de lucro desejadas para cada categoria de produtos.
          Os valores são aplicados automaticamente ao criar novos produtos. Você pode ter configurações
          diferentes para cada loja (Zango, Viana, etc).
        </p>
      </motion.div>

      {/* Tabela */}
      <MarkupTable
        markups={markups}
        loading={loading}
        error={error}
        onUpdate={handleUpdate}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />
    </div>
  );
};
