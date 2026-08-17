/**
 * Markup Service
 * Operações CRUD para Markup Categories no Firestore
 * Tabela de Aplicação de Markup em Produtos Farmacêuticos
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
import { MarkupCategory, MarkupCategoryDTO, calcularMargemReal, CATEGORIAS_PADRAO } from '../types/markup';

/**
 * ============================================================================
 * CREATE
 * ============================================================================
 */

/**
 * Criar nova categoria de markup para uma loja
 * @param storeId ID da loja
 * @param markupData Dados do markup (sem id, storeId, timestamps)
 * @returns ID do markup criado
 */
export async function createMarkupCategory(
  storeId: string,
  markupData: MarkupCategoryDTO
): Promise<string> {
  try {
    const markupId = doc(collection(db, 'lojas', storeId, 'markups')).id;
    const now = new Date().toISOString();

    // Calcular margem real automaticamente
    const margemRealPadrao = calcularMargemReal(markupData.markupPadrao === 'minimo'
      ? markupData.markupMinimo
      : markupData.markupPadrao === 'alto'
      ? markupData.markupAlto
      : markupData.markupMedio);

    const newMarkup: MarkupCategory = {
      id: markupId,
      storeId,
      ...markupData,
      margemRealPadrao,
      criadoEm: now,
      atualizadoEm: now,
    };

    await setDoc(doc(db, 'lojas', storeId, 'markups', markupId), newMarkup);
    console.log(`✅ Markup criado: ${markupData.name} (${markupId}) para loja: ${storeId}`);
    return markupId;
  } catch (error) {
    console.error('❌ Erro ao criar markup:', error);
    handleFirestoreError(error, OperationType.CREATE, `markups/${markupData.name}`);
    throw error;
  }
}

/**
 * ============================================================================
 * READ
 * ============================================================================
 */

/**
 * Obter markup por ID
 */
export async function getMarkupCategoryById(
  storeId: string,
  markupId: string
): Promise<MarkupCategory | null> {
  try {
    const docSnap = await getDoc(
      doc(db, 'lojas', storeId, 'markups', markupId)
    );

    if (!docSnap.exists()) {
      return null;
    }

    return docSnap.data() as MarkupCategory;
  } catch (error) {
    console.error('❌ Erro ao obter markup:', error);
    handleFirestoreError(error, OperationType.GET, `markups/${markupId}`);
    return null;
  }
}

/**
 * Obter todas as categorias de markup de uma loja
 */
export async function getStoreMarkupCategories(storeId: string): Promise<MarkupCategory[]> {
  try {
    const q = query(
      collection(db, 'lojas', storeId, 'markups'),
      where('storeId', '==', storeId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map((doc) => doc.data() as MarkupCategory)
      .sort((a, b) => a.name.localeCompare(b.name)); // Ordenar alfabeticamente
  } catch (error) {
    console.error('❌ Erro ao obter markups da loja:', error);
    handleFirestoreError(error, OperationType.GET, `markups`);
    return [];
  }
}

/**
 * Obter markup por nome (para verificar duplicatas)
 */
export async function getMarkupCategoryByName(
  storeId: string,
  name: string
): Promise<MarkupCategory | null> {
  try {
    const q = query(
      collection(db, 'lojas', storeId, 'markups'),
      where('name', '==', name)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    return querySnapshot.docs[0].data() as MarkupCategory;
  } catch (error) {
    console.error('❌ Erro ao obter markup por nome:', error);
    return null;
  }
}

/**
 * ============================================================================
 * UPDATE
 * ============================================================================
 */

/**
 * Atualizar uma categoria de markup
 */
export async function updateMarkupCategory(
  storeId: string,
  markupId: string,
  updates: Partial<MarkupCategoryDTO>
): Promise<void> {
  try {
    const now = new Date().toISOString();

    // Se margens foram alteradas, recalcular margem real
    let updateData: any = {
      ...updates,
      atualizadoEm: now,
    };

    if (updates.markupPadrao || updates.markupMinimo || updates.markupMedio || updates.markupAlto) {
      // Buscar dados atuais primeiro
      const current = await getMarkupCategoryById(storeId, markupId);
      if (current) {
        const markupValue = updates.markupPadrao === 'minimo'
          ? (updates.markupMinimo ?? current.markupMinimo)
          : updates.markupPadrao === 'alto'
          ? (updates.markupAlto ?? current.markupAlto)
          : (updates.markupMedio ?? current.markupMedio);

        updateData.margemRealPadrao = calcularMargemReal(markupValue);
      }
    }

    await updateDoc(doc(db, 'lojas', storeId, 'markups', markupId), updateData);
    console.log(`✅ Markup atualizado: ${markupId} para loja: ${storeId}`);
  } catch (error) {
    console.error('❌ Erro ao atualizar markup:', error);
    handleFirestoreError(error, OperationType.UPDATE, `markups/${markupId}`);
    throw error;
  }
}

/**
 * ============================================================================
 * DELETE
 * ============================================================================
 */

/**
 * Deletar uma categoria de markup (soft delete - marca como inativo)
 */
export async function softDeleteMarkupCategory(
  storeId: string,
  markupId: string
): Promise<void> {
  try {
    await updateMarkupCategory(storeId, markupId, {
      ativo: false,
    });
    console.log(`✅ Markup deletado (soft): ${markupId} para loja: ${storeId}`);
  } catch (error) {
    console.error('❌ Erro ao deletar markup:', error);
    handleFirestoreError(error, OperationType.DELETE, `markups/${markupId}`);
    throw error;
  }
}

/**
 * Deletar permanentemente uma categoria de markup (hard delete)
 */
export async function hardDeleteMarkupCategory(
  storeId: string,
  markupId: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'lojas', storeId, 'markups', markupId));
    console.log(`✅ Markup deletado (permanente): ${markupId} para loja: ${storeId}`);
  } catch (error) {
    console.error('❌ Erro ao deletar permanentemente markup:', error);
    handleFirestoreError(error, OperationType.DELETE, `markups/${markupId}`);
    throw error;
  }
}

/**
 * ============================================================================
 * LISTENERS (Real-time)
 * ============================================================================
 */

/**
 * Listener em tempo real para markups de uma loja
 * @param storeId ID da loja
 * @param callback Função chamada com os markups atualizados
 * @returns Função para desinscrever o listener
 */
export function listenToStoreMarkupCategories(
  storeId: string,
  callback: (markups: MarkupCategory[]) => void
): Unsubscribe {
  try {
    const q = query(
      collection(db, 'lojas', storeId, 'markups'),
      where('storeId', '==', storeId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const markups = snapshot.docs
          .map((doc) => doc.data() as MarkupCategory)
          .sort((a, b) => a.name.localeCompare(b.name));
        callback(markups);
      },
      (error) => {
        console.error('❌ Erro no listener de markups:', error);
        handleFirestoreError(error, OperationType.GET, 'markups-listener');
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('❌ Erro ao configurar listener de markups:', error);
    return () => {}; // Retornar função vazia
  }
}

/**
 * ============================================================================
 * SEED DATA
 * ============================================================================
 */

/**
 * Carregar dados pré-definidos (11 categorias) para uma loja
 * Verifica se já existem para evitar duplicatas
 */
export async function seedMarkupCategories(storeId: string): Promise<void> {
  try {
    console.log(`🌱 Iniciando seed de markups para loja: ${storeId}`);

    // Obter categorias existentes
    const existentes = await getStoreMarkupCategories(storeId);

    if (existentes.length > 0) {
      console.log(`⏭️  Markups já existem (${existentes.length}). Pulando seed.`);
      return;
    }

    // Determinar qual conjunto usar (Zango ou Viana)
    // TODO: Usar nome da loja ou campo de configuração
    const storeDoc = await getDoc(doc(db, 'lojas', storeId));
    const storeName = storeDoc.exists() ? (storeDoc.data() as any).nome || '' : '';

    const isViana = storeName.toLowerCase().includes('viana');
    const categoriasPadrao = isViana ? CATEGORIAS_PADRAO.viana : CATEGORIAS_PADRAO.zango;

    console.log(`📦 Inserindo ${categoriasPadrao.length} categorias de markup...`);

    let criadas = 0;
    for (const categoria of categoriasPadrao) {
      try {
        await createMarkupCategory(storeId, {
          ...categoria,
          ativo: true,
        });
        criadas++;
      } catch (error) {
        console.error(`⚠️  Erro ao criar categoria ${categoria.name}:`, error);
      }
    }

    console.log(`✅ Seed concluído: ${criadas}/${categoriasPadrao.length} categorias criadas`);
  } catch (error) {
    console.error('❌ Erro ao fazer seed de markups:', error);
    handleFirestoreError(error, OperationType.CREATE, 'seed-markups');
  }
}

/**
 * ============================================================================
 * UTILITIES
 * ============================================================================
 */

/**
 * Validar dados de markup antes de salvar
 */
export function validateMarkupCategory(data: Partial<MarkupCategoryDTO>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Nome é obrigatório');
  }

  if (data.markupMinimo === undefined || data.markupMinimo < 0) {
    errors.push('Markup Mínimo deve ser >= 0');
  }

  if (data.markupMedio === undefined || data.markupMedio < 0) {
    errors.push('Markup Médio deve ser >= 0');
  }

  if (data.markupAlto === undefined || data.markupAlto < 0) {
    errors.push('Markup Alto deve ser >= 0');
  }

  // Validar ordem: Mínimo <= Médio <= Alto
  if (
    data.markupMinimo !== undefined &&
    data.markupMedio !== undefined &&
    data.markupAlto !== undefined
  ) {
    if (data.markupMinimo > data.markupMedio) {
      errors.push('Markup Mínimo não pode ser maior que Médio');
    }
    if (data.markupMedio > data.markupAlto) {
      errors.push('Markup Médio não pode ser maior que Alto');
    }
  }

  if (!data.markupPadrao || !['minimo', 'medio', 'alto'].includes(data.markupPadrao)) {
    errors.push('Markup Padrão é obrigatório (minimo, medio ou alto)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
