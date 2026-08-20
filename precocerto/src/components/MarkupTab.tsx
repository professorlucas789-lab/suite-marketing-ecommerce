/**
 * MarkupTab Component
 * Tab para gerenciar tabelas de markup
 * Integra MarkupTable + useMarkupTable hook
 * Para adicionar em CategoriesTab
 */

import React from 'react';
import { useStore } from '../contexts/StoreContext';
import { useMarkupTable } from '../hooks/useMarkupTable';
import { upsertMarkupCategoryForPharmacies } from '../services/markupService';
import { MarkupTable } from './MarkupTable';
import { AlertCircle, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import {
  canApplyMarkupToAllPharmacies,
  PHARMACY_BUSINESS_TYPE,
} from '../utils/pharmacyMarkupScope';

export const MarkupTab: React.FC = () => {
  const { currentStore, currentUser, userStores } = useStore();

  // Usar storeId atual, ou primeira loja se não houver
  const storeId = currentStore?.storeId || userStores[0]?.id;
  const selectedStore = userStores.find(s => s.id === storeId);
  const storeType = currentStore?.storeType || selectedStore?.tipo;
  const isPharmacyStore = storeType === PHARMACY_BUSINESS_TYPE;
  const enableScopeSelection = canApplyMarkupToAllPharmacies({
    role: currentUser?.papel,
    currentStoreType: storeType,
    stores: userStores,
  });

  const { markups, loading, error, actions } = useMarkupTable({
    storeId: isPharmacyStore ? storeId || '' : '',
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

  const storeName = selectedStore?.nome || currentStore?.storeName || 'Desconhecida';

  if (!isPharmacyStore) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-lg p-6"
      >
        <div className="flex gap-3">
          <AlertCircle className="w-6 h-6 text-slate-600 dark:text-slate-400 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Markups farmacêuticos indisponíveis
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
              Esta configuração é exclusiva para lojas do tipo farmácia. Selecione uma farmácia para gerir margens farmacêuticas.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const handleCreate = async (data: any) => {
    try {
      const { applyScope, ...markupData } = data;

      if (applyScope === 'all-pharmacies' && enableScopeSelection) {
        const results = await upsertMarkupCategoryForPharmacies(storeId, markupData);
        const failed = results.filter(result => result.action === 'failed');

        if (failed.length > 0) {
          throw new Error(`Categoria aplicada parcialmente. Falhou em ${failed.length} farmácia(s).`);
        }

        return;
      }

      await actions.create({
        ...markupData,
        businessType: PHARMACY_BUSINESS_TYPE,
        scope: 'store',
        source: 'local',
      });
    } catch (err) {
      console.error('Erro ao criar markup:', err);
      throw err;
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
          <strong>Nota:</strong> Esta tabela é exclusiva para farmácias. Ao criar uma categoria, o admin pode aplicar apenas nesta farmácia
          ou em todas as farmácias ativas; outros tipos de negócio não são afetados.
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
        enableScopeSelection={enableScopeSelection}
        currentStoreName={storeName}
      />
    </div>
  );
};
