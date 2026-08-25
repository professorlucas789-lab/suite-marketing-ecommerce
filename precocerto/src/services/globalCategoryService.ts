/**
 * Global Category Service
 * Operações para categorias globais compartilhadas entre todas as lojas
 * NOVO (Fase 14): Categorias sincronizadas globalmente
 *
 * Problema resolvido: Quando um utilizador altera uma categoria (ex: Margem de Lucro)
 * numa loja, essa mudança agora se reflete automaticamente em TODAS as lojas do utilizador
 */

import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { CategoryMarginConfig } from '../types/category';

/**
 * ============================================================================
 * CREATE
 * ============================================================================
 */

/**
 * Criar nova categoria global (compartilhada entre todas as lojas do utilizador)
 * @param userId ID do utilizador proprietário
 * @param categoryData Dados da categoria
 * @returns ID da categoria criada
 */
export async function createGlobalCategory(
  userId: string,
  categoryData: Omit<CategoryMarginConfig, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const categoryId = doc(collection(db, 'users', userId, 'globalCategories')).id;
    const now = new Date().toISOString();

    const newCategory: CategoryMarginConfig = {
      id: categoryId,
      storeId: 'global', // Indicador de categoria global
      ...categoryData,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'users', userId, 'globalCategories', categoryId), newCategory);
    console.log(`✅ Categoria global criada: ${categoryData.name} (${categoryId}) para utilizador: ${userId}`);
    return categoryId;
  } catch (error) {
    console.error('❌ Erro ao criar categoria global:', error);
    handleFirestoreError(error, OperationType.CREATE, `globalCategories/${categoryData.name}`);
    throw error;
  }
}

/**
 * ============================================================================
 * READ
 * ============================================================================
 */

/**
 * Obter categoria global por ID
 */
export async function getGlobalCategoryById(
  userId: string,
  categoryId: string
): Promise<CategoryMarginConfig | null> {
  try {
    const docSnap = await getDoc(
      doc(db, 'users', userId, 'globalCategories', categoryId)
    );

    if (!docSnap.exists()) {
      return null;
    }

    return docSnap.data() as CategoryMarginConfig;
  } catch (error) {
    console.error('❌ Erro ao obter categoria global:', error);
    handleFirestoreError(error, OperationType.GET, `globalCategories/${categoryId}`);
    return null;
  }
}

/**
 * Obter todas as categorias globais de um utilizador
 * Estas categorias são compartilhadas entre todas as lojas do utilizador
 */
export async function getUserGlobalCategories(userId: string): Promise<CategoryMarginConfig[]> {
  try {
    const q = query(
      collection(db, 'users', userId, 'globalCategories')
    );

    const querySnapshot = await getDocs(q);
    const categories = querySnapshot.docs.map((doc) => doc.data() as CategoryMarginConfig);

    console.log(`✅ ${categories.length} categorias globais carregadas para utilizador: ${userId}`);
    return categories;
  } catch (error) {
    console.error('❌ Erro ao obter categorias globais:', error);
    handleFirestoreError(error, OperationType.LIST, 'globalCategories');
    return [];
  }
}

/**
 * Listener real-time para categorias globais de um utilizador
 * Qualquer mudança é imediatamente propagada para TODAS as lojas
 */
export function subscribeToUserGlobalCategories(
  userId: string,
  onUpdate: (categories: CategoryMarginConfig[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'users', userId, 'globalCategories')
  );

  return onSnapshot(q, (snapshot) => {
    const categories = snapshot.docs.map((doc) => doc.data() as CategoryMarginConfig);
    console.log(`🔄 Categorias globais atualizadas em tempo real: ${categories.length} categorias`);
    onUpdate(categories);
  });
}

/**
 * ============================================================================
 * UPDATE
 * ============================================================================
 */

/**
 * Atualizar categoria global
 * Mudança é imediatamente visível em TODAS as lojas do utilizador
 */
export async function updateGlobalCategory(
  userId: string,
  categoryId: string,
  updates: Partial<CategoryMarginConfig>
): Promise<void> {
  try {
    const now = new Date().toISOString();

    await updateDoc(
      doc(db, 'users', userId, 'globalCategories', categoryId),
      {
        ...updates,
        updatedAt: now,
      }
    );
    console.log(`✅ Categoria global atualizada: ${categoryId} (propagada para todas as lojas)`);
  } catch (error) {
    console.error('❌ Erro ao atualizar categoria global:', error);
    handleFirestoreError(error, OperationType.UPDATE, `globalCategories/${categoryId}`);
    throw error;
  }
}

/**
 * Atualizar apenas regras de margem de uma categoria global
 * Mudança é imediatamente visível em TODAS as lojas
 */
export async function updateGlobalCategoryMarginRules(
  userId: string,
  categoryId: string,
  marginRules: any
): Promise<void> {
  try {
    const now = new Date().toISOString();

    await updateDoc(
      doc(db, 'users', userId, 'globalCategories', categoryId),
      {
        marginRules,
        updatedAt: now,
      }
    );
    console.log(`✅ Regras de margem atualizadas (propagadas para todas as lojas): ${categoryId}`);
  } catch (error) {
    console.error('❌ Erro ao atualizar regras de margem global:', error);
    handleFirestoreError(error, OperationType.UPDATE, `globalCategories/${categoryId}`);
    throw error;
  }
}

/**
 * ============================================================================
 * DELETE
 * ============================================================================
 */

/**
 * Deletar categoria global
 * Afeta TODAS as lojas do utilizador
 * NOTA: Não deleta produtos associados (apenas remove referência)
 */
export async function deleteGlobalCategory(
  userId: string,
  categoryId: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', userId, 'globalCategories', categoryId));
    console.log(`✅ Categoria global deletada: ${categoryId} (afeta todas as lojas)`);
  } catch (error) {
    console.error('❌ Erro ao deletar categoria global:', error);
    handleFirestoreError(error, OperationType.DELETE, `globalCategories/${categoryId}`);
    throw error;
  }
}

/**
 * ============================================================================
 * MIGRATION UTILITIES
 * ============================================================================
 */

/**
 * Migrar categorias de uma loja para escopo global
 * Chamado uma única vez durante atualização
 */
export async function migrateStoreCategoriesToGlobal(
  userId: string,
  storeId: string
): Promise<number> {
  try {
    console.log(`🔄 Iniciando migração de categorias da loja ${storeId} para global...`);

    // Obter categorias locais da loja
    const localQ = query(
      collection(db, 'lojas', storeId, 'categories'),
      where('storeId', '==', storeId)
    );

    const localSnapshot = await getDocs(localQ);
    const localCategories = localSnapshot.docs.map((doc) => doc.data() as CategoryMarginConfig);

    // Para cada categoria local
    let migratedCount = 0;
    for (const localCat of localCategories) {
      const globalCategoryId = doc(collection(db, 'users', userId, 'globalCategories')).id;
      const now = new Date().toISOString();

      const globalCategory: CategoryMarginConfig = {
        id: globalCategoryId,
        storeId: 'global', // Marcar como global
        name: localCat.name,
        businessType: localCat.businessType,
        description: localCat.description,
        color: localCat.color,
        icon: localCat.icon,
        marginRules: localCat.marginRules,
        priceStrategy: localCat.priceStrategy,
        regulatoryConstraints: localCat.regulatoryConstraints,
        historicalData: localCat.historicalData,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(
        doc(db, 'users', userId, 'globalCategories', globalCategoryId),
        globalCategory
      );

      migratedCount++;
    }

    console.log(`✅ Migração completa: ${migratedCount} categorias movidas para global`);
    return migratedCount;
  } catch (error) {
    console.error('❌ Erro durante migração de categorias:', error);
    handleFirestoreError(error, OperationType.CREATE, 'globalCategories/migration');
    throw error;
  }
}
