/**
 * Category Service
 * Operações CRUD para categorias no Firestore
 * NOVO (Fase 12): Categorias isoladas por loja
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
 * Criar nova categoria para uma loja específica
 * @param storeId ID da loja
 * @param categoryData Dados da categoria (sem id, storeId, createdAt, updatedAt)
 * @returns ID da categoria criada
 */
export async function createCategory(
  storeId: string,
  categoryData: Omit<CategoryMarginConfig, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const categoryId = doc(collection(db, 'lojas', storeId, 'categories')).id;
    const now = new Date().toISOString();

    const newCategory: CategoryMarginConfig = {
      id: categoryId,
      storeId,
      ...categoryData,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'lojas', storeId, 'categories', categoryId), newCategory);
    console.log(`✅ Categoria criada: ${categoryData.name} (${categoryId}) para loja: ${storeId}`);
    return categoryId;
  } catch (error) {
    console.error('❌ Erro ao criar categoria:', error);
    handleFirestoreError(error, OperationType.CREATE, `categories/${categoryData.name}`);
  }
}

/**
 * ============================================================================
 * READ
 * ============================================================================
 */

/**
 * Obter categoria por ID
 */
export async function getCategoryById(
  storeId: string,
  categoryId: string
): Promise<CategoryMarginConfig | null> {
  try {
    const docSnap = await getDoc(
      doc(db, 'lojas', storeId, 'categories', categoryId)
    );

    if (!docSnap.exists()) {
      return null;
    }

    return docSnap.data() as CategoryMarginConfig;
  } catch (error) {
    console.error('❌ Erro ao obter categoria:', error);
    handleFirestoreError(error, OperationType.GET, `categories/${categoryId}`);
  }
}

/**
 * Obter todas as categorias de uma loja
 */
export async function getStoreCategories(storeId: string): Promise<CategoryMarginConfig[]> {
  try {
    const q = query(
      collection(db, 'lojas', storeId, 'categories'),
      where('storeId', '==', storeId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as CategoryMarginConfig);
  } catch (error) {
    console.error('❌ Erro ao obter categorias da loja:', error);
    handleFirestoreError(error, OperationType.LIST, 'categories');
  }
}

/**
 * Listener real-time para categorias de uma loja
 */
export function subscribeToStoreCategories(
  storeId: string,
  onUpdate: (categories: CategoryMarginConfig[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'lojas', storeId, 'categories'),
    where('storeId', '==', storeId)
  );

  return onSnapshot(q, (snapshot) => {
    const categories = snapshot.docs.map((doc) => doc.data() as CategoryMarginConfig);
    onUpdate(categories);
  });
}

/**
 * ============================================================================
 * UPDATE
 * ============================================================================
 */

/**
 * Atualizar categoria
 */
export async function updateCategory(
  storeId: string,
  categoryId: string,
  updates: Partial<CategoryMarginConfig>
): Promise<void> {
  try {
    const now = new Date().toISOString();

    await updateDoc(
      doc(db, 'lojas', storeId, 'categories', categoryId),
      {
        ...updates,
        updatedAt: now,
      }
    );
    console.log(`✅ Categoria atualizada: ${categoryId} para loja: ${storeId}`);
  } catch (error) {
    console.error('❌ Erro ao atualizar categoria:', error);
    handleFirestoreError(error, OperationType.UPDATE, `categories/${categoryId}`);
  }
}

/**
 * Atualizar apenas regras de margem
 */
export async function updateCategoryMarginRules(
  storeId: string,
  categoryId: string,
  marginRules: any
): Promise<void> {
  try {
    const now = new Date().toISOString();

    await updateDoc(
      doc(db, 'lojas', storeId, 'categories', categoryId),
      {
        marginRules,
        updatedAt: now,
      }
    );
    console.log(`✅ Regras de margem atualizadas: ${categoryId} para loja: ${storeId}`);
  } catch (error) {
    console.error('❌ Erro ao atualizar regras de margem:', error);
    handleFirestoreError(error, OperationType.UPDATE, `categories/${categoryId}`);
  }
}

/**
 * ============================================================================
 * DELETE
 * ============================================================================
 */

/**
 * Deletar categoria
 * NOTA: Não deleta produtos associados (apenas remove referência)
 */
export async function deleteCategory(
  storeId: string,
  categoryId: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'lojas', storeId, 'categories', categoryId));
    console.log(`✅ Categoria deletada: ${categoryId} da loja: ${storeId}`);
  } catch (error) {
    console.error('❌ Erro ao deletar categoria:', error);
    handleFirestoreError(error, OperationType.DELETE, `categories/${categoryId}`);
  }
}

/**
 * ============================================================================
 * BATCH OPERATIONS
 * ============================================================================
 */

/**
 * Obter categoria padrão (primeira categoria criada)
 * Útil para migração de produtos antigos
 */
export async function getDefaultCategory(storeId: string): Promise<CategoryMarginConfig | null> {
  try {
    const categories = await getStoreCategories(storeId);
    return categories.length > 0 ? categories[0] : null;
  } catch (error) {
    console.error('Erro ao obter categoria padrão:', error);
    return null;
  }
}

/**
 * ============================================================================
 * BACKWARDS COMPATIBILITY (Para código legado)
 * ============================================================================
 */

/**
 * DEPRECATED: Use getStoreCategories em seu lugar
 * Função legada para compatibilidade
 */
export async function getUserCategories(userId: string): Promise<CategoryMarginConfig[]> {
  console.warn('⚠️ getUserCategories é deprecated. Use getStoreCategories(storeId) em seu lugar');
  // Tenta buscar pelo storeId com mesmo valor do userId (pode quebrar)
  return getStoreCategories(userId);
}

/**
 * DEPRECATED: Use subscribeToStoreCategories em seu lugar
 */
export function subscribeToCategories(
  userId: string,
  onUpdate: (categories: CategoryMarginConfig[]) => void
): Unsubscribe {
  console.warn('⚠️ subscribeToCategories é deprecated. Use subscribeToStoreCategories(storeId) em seu lugar');
  return subscribeToStoreCategories(userId, onUpdate);
}
