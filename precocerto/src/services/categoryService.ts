/**
 * Category Service
 * Operações CRUD para categorias no Firestore
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
 * Criar nova categoria
 * @param userId ID do utilizador
 * @param categoryData Dados da categoria (sem id, createdAt, updatedAt)
 * @returns ID da categoria criada
 */
export async function createCategory(
  userId: string,
  categoryData: Omit<CategoryMarginConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const categoryId = doc(collection(db, 'users', userId, 'categories')).id;
    const now = new Date().toISOString();

    const newCategory: CategoryMarginConfig = {
      id: categoryId,
      userId,
      ...categoryData,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'users', userId, 'categories', categoryId), newCategory);
    return categoryId;
  } catch (error) {
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
  userId: string,
  categoryId: string
): Promise<CategoryMarginConfig | null> {
  try {
    const docSnap = await getDoc(
      doc(db, 'users', userId, 'categories', categoryId)
    );

    if (!docSnap.exists()) {
      return null;
    }

    return docSnap.data() as CategoryMarginConfig;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `categories/${categoryId}`);
  }
}

/**
 * Obter todas as categorias do utilizador
 */
export async function getUserCategories(userId: string): Promise<CategoryMarginConfig[]> {
  try {
    const q = query(
      collection(db, 'users', userId, 'categories'),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as CategoryMarginConfig);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'categories');
  }
}

/**
 * Listener real-time para categorias
 */
export function subscribeToCategories(
  userId: string,
  onUpdate: (categories: CategoryMarginConfig[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'users', userId, 'categories'),
    where('userId', '==', userId)
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
  userId: string,
  categoryId: string,
  updates: Partial<CategoryMarginConfig>
): Promise<void> {
  try {
    const now = new Date().toISOString();

    await updateDoc(
      doc(db, 'users', userId, 'categories', categoryId),
      {
        ...updates,
        updatedAt: now,
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `categories/${categoryId}`);
  }
}

/**
 * Atualizar apenas regras de margem
 */
export async function updateCategoryMarginRules(
  userId: string,
  categoryId: string,
  marginRules: any
): Promise<void> {
  try {
    const now = new Date().toISOString();

    await updateDoc(
      doc(db, 'users', userId, 'categories', categoryId),
      {
        marginRules,
        updatedAt: now,
      }
    );
  } catch (error) {
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
  userId: string,
  categoryId: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', userId, 'categories', categoryId));
  } catch (error) {
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
export async function getDefaultCategory(userId: string): Promise<CategoryMarginConfig | null> {
  try {
    const categories = await getUserCategories(userId);
    return categories.length > 0 ? categories[0] : null;
  } catch (error) {
    console.error('Error getting default category:', error);
    return null;
  }
}
