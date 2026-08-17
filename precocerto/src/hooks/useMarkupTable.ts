/**
 * useMarkupTable Hook
 * Hook reativo para gerenciar categorias de markup
 * Padrão: [data, loading, error, actions]
 */

import { useState, useEffect, useCallback } from 'react';
import { MarkupCategory, MarkupCategoryDTO } from '../types/markup';
import {
  getStoreMarkupCategories,
  createMarkupCategory,
  updateMarkupCategory,
  softDeleteMarkupCategory,
  listenToStoreMarkupCategories,
  validateMarkupCategory,
  seedMarkupCategories,
} from '../services/markupService';

interface UseMarkupTableOptions {
  storeId: string;
}

export function useMarkupTable({ storeId }: UseMarkupTableOptions) {
  const [markups, setMarkups] = useState<MarkupCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Setup listener em tempo real
  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      setMarkups([]);
      return;
    }

    console.log(`📡 [useMarkupTable] Configurando listener para loja: ${storeId}`);

    try {
      setLoading(true);
      const unsubscribe = listenToStoreMarkupCategories(storeId, (data) => {
        console.log(`✅ [useMarkupTable] Markups atualizados: ${data.length} categorias`);
        setMarkups(data);
        setLoading(false);
        setError(null);
      });

      // Se for primeira vez (sem dados), tentar fazer seed automático
      (async () => {
        try {
          await seedMarkupCategories(storeId);
        } catch (err) {
          console.error('⚠️  Erro ao fazer seed:', err);
        }
      })();

      return unsubscribe;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('❌ [useMarkupTable] Erro ao configurar listener:', err);
      setError(errorMessage);
      setLoading(false);
    }
  }, [storeId]);

  // CREATE
  const create = useCallback(
    async (data: MarkupCategoryDTO) => {
      if (!storeId) throw new Error('storeId é obrigatório');

      try {
        // Validar dados
        const validation = validateMarkupCategory(data);
        if (!validation.valid) {
          throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
        }

        console.log(`🔄 [useMarkupTable] Criando markup: ${data.name}`);
        const id = await createMarkupCategory(storeId, data);
        console.log(`✅ [useMarkupTable] Markup criado com sucesso: ${id}`);
        return id;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao criar';
        console.error('❌ [useMarkupTable] Erro ao criar markup:', err);
        setError(errorMessage);
        throw err;
      }
    },
    [storeId]
  );

  // UPDATE
  const update = useCallback(
    async (markupId: string, updates: Partial<MarkupCategoryDTO>) => {
      if (!storeId) throw new Error('storeId é obrigatório');

      try {
        // Validar dados (apenas os que estão sendo atualizados)
        const validation = validateMarkupCategory(updates);
        if (!validation.valid) {
          throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
        }

        console.log(`🔄 [useMarkupTable] Atualizando markup: ${markupId}`);
        await updateMarkupCategory(storeId, markupId, updates);
        console.log(`✅ [useMarkupTable] Markup atualizado com sucesso`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar';
        console.error('❌ [useMarkupTable] Erro ao atualizar markup:', err);
        setError(errorMessage);
        throw err;
      }
    },
    [storeId]
  );

  // DELETE (soft delete - marca como inativo)
  const delete_ = useCallback(
    async (markupId: string) => {
      if (!storeId) throw new Error('storeId é obrigatório');

      try {
        console.log(`🔄 [useMarkupTable] Deletando markup: ${markupId}`);
        await softDeleteMarkupCategory(storeId, markupId);
        console.log(`✅ [useMarkupTable] Markup deletado com sucesso`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao deletar';
        console.error('❌ [useMarkupTable] Erro ao deletar markup:', err);
        setError(errorMessage);
        throw err;
      }
    },
    [storeId]
  );

  // SEED
  const seed = useCallback(async () => {
    if (!storeId) throw new Error('storeId é obrigatório');

    try {
      console.log(`🌱 [useMarkupTable] Fazendo seed de markups`);
      await seedMarkupCategories(storeId);
      console.log(`✅ [useMarkupTable] Seed concluído`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer seed';
      console.error('❌ [useMarkupTable] Erro ao fazer seed:', err);
      setError(errorMessage);
      throw err;
    }
  }, [storeId]);

  // Retornar padrão: [data, loading, error, actions]
  return {
    markups,
    loading,
    error,
    actions: {
      create,
      update,
      delete: delete_,
      seed,
    },
  };
}
