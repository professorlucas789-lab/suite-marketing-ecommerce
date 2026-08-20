/**
 * Utilitários para sistema multi-loja
 * Fase 6: Sistema Multi-Loja
 */

import { db, auth } from '../firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { Store, User, AuditLog, ActivityStream } from '../types/store';
import { normalizeStoreBusinessScope } from './businessUnitMapping';

/**
 * Criar nova loja
 */
export async function createStore(storeData: Omit<Store, 'id' | 'dataCriacao' | 'dataAtualizacao' | 'criadoPor'>) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Utilizador não autenticado');

    const now = new Date().toISOString();

    const store: Omit<Store, 'id'> = {
      ...storeData,
      dataCriacao: now,
      dataAtualizacao: now,
      criadoPor: user.uid,
    };

    const docRef = await addDoc(collection(db, 'stores'), store);

    // Registar auditoria
    await logAudit({
      acao: 'criar',
      entityType: 'store',
      entityId: docRef.id,
      entityName: storeData.nome,
      storeId: docRef.id,
      userId: user.uid,
      userName: user.displayName || user.email || 'Desconhecido',
    });

    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar loja:', error);
    throw error;
  }
}

/**
 * Atualizar loja
 */
export async function updateStore(storeId: string, updates: Partial<Store>) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Utilizador não autenticado');

    const storeRef = doc(db, 'stores', storeId);

    const updateData = {
      ...updates,
      dataAtualizacao: new Date().toISOString(),
    };

    await updateDoc(storeRef, updateData);

    // Registar auditoria
    await logAudit({
      acao: 'atualizar',
      entityType: 'store',
      entityId: storeId,
      entityName: updates.nome || 'Desconhecido',
      storeId: storeId,
      userId: user.uid,
      userName: user.displayName || user.email || 'Desconhecido',
      mudancas: updates,
    });
  } catch (error) {
    console.error('Erro ao atualizar loja:', error);
    throw error;
  }
}

/**
 * Deletar loja (soft delete)
 */
export async function deleteStore(storeId: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Utilizador não autenticado');

    await updateDoc(doc(db, 'stores', storeId), {
      ativo: false,
      dataAtualizacao: new Date().toISOString(),
    });

    // Registar auditoria
    await logAudit({
      acao: 'deletar',
      entityType: 'store',
      entityId: storeId,
      entityName: 'Loja Deletada',
      storeId: storeId,
      userId: user.uid,
      userName: user.displayName || user.email || 'Desconhecido',
    });
  } catch (error) {
    console.error('Erro ao deletar loja:', error);
    throw error;
  }
}

/**
 * Registar auditoria
 */
export async function logAudit(data: Omit<AuditLog, 'id' | 'timestamp'>) {
  try {
    const auditLog: Omit<AuditLog, 'id'> = {
      ...data,
      timestamp: new Date().toISOString(),
      // FIX: Garantir que metadata nunca é undefined (previne erro Firestore)
      metadata: {
        action: data.acao,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    };

    await addDoc(collection(db, 'audit_logs'), auditLog);

    // Também registar no activity stream
    await logActivity({
      storeId: data.storeId,
      userId: data.userId,
      userName: data.userName,
      tipo: getTipoAtividadeFromAcao(data.acao, data.entityType),
      descricao: `${data.acao.toUpperCase()}: ${data.entityName}`,
      dados: data.mudancas || {},
      visivel_para: 'loja',
    });
  } catch (error) {
    console.error('Erro ao registar auditoria:', error);
    // Não lançar erro para não interromper operação principal
  }
}

/**
 * Registar atividade no feed
 */
export async function logActivity(data: Omit<ActivityStream, 'id' | 'timestamp'>) {
  try {
    const activity: Omit<ActivityStream, 'id'> = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    await addDoc(collection(db, 'activity_stream'), activity);
  } catch (error) {
    console.error('Erro ao registar atividade:', error);
  }
}

/**
 * Converter ação para tipo de atividade
 */
function getTipoAtividadeFromAcao(acao: string, entityType: string): any {
  if (entityType === 'product') {
    if (acao === 'criar') return 'produto_adicionado';
    if (acao === 'atualizar') return 'produto_editado';
    if (acao === 'deletar') return 'produto_deletado';
  }
  if (entityType === 'user') {
    if (acao === 'criar') return 'utilizador_criado';
  }
  return 'produto_editado';
}

/**
 * Obter todas as lojas (admin)
 */
export async function getAllStores() {
  try {
    const snapshot = await getDocs(query(collection(db, 'stores'), where('ativo', '==', true)));
    return snapshot.docs.map((doc) =>
      normalizeStoreBusinessScope({
        id: doc.id,
        ...doc.data(),
      } as Store)
    );
  } catch (error) {
    console.error('Erro ao obter lojas:', error);
    throw error;
  }
}

/**
 * Obter loja por ID
 */
export async function getStore(storeId: string) {
  try {
    const docSnap = await getDocs(
      query(collection(db, 'stores'), where('id', '==', storeId))
    );

    if (docSnap.empty) return null;

    const doc = docSnap.docs[0];
    return normalizeStoreBusinessScope({ id: doc.id, ...doc.data() } as Store);
  } catch (error) {
    console.error('Erro ao obter loja:', error);
    throw error;
  }
}

/**
 * Obter utilizadores de uma loja
 */
export async function getStoreUsers(storeId: string) {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'users'), where('lojas', 'array-contains', storeId))
    );
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as User[];
  } catch (error) {
    console.error('Erro ao obter utilizadores da loja:', error);
    throw error;
  }
}

/**
 * Adicionar utilizador a uma loja
 */
export async function addUserToStore(userId: string, storeId: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Utilizador não autenticado');

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDocs(query(collection(db, 'users'), where('id', '==', userId)));

    if (userDoc.empty) throw new Error('Utilizador não encontrado');

    const userData = userDoc.docs[0].data() as User;
    const updatedLojas = [...new Set([...userData.lojas, storeId])];

    await updateDoc(userRef, { lojas: updatedLojas });

    // Registar auditoria
    await logAudit({
      acao: 'atualizar',
      entityType: 'user',
      entityId: userId,
      entityName: userData.nome,
      storeId: storeId,
      userId: user.uid,
      userName: user.displayName || user.email || 'Desconhecido',
    });
  } catch (error) {
    console.error('Erro ao adicionar utilizador à loja:', error);
    throw error;
  }
}
