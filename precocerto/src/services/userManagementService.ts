/**
 * Serviço de Gerenciamento de Utilizadores
 * Integração com Firebase Auth e Firestore
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { db, auth } from '../firebase';
import { User, UserRole, UserPermissions, AuditLog } from '../types/store';

/**
 * Permissões padrão por papel
 */
const defaultPermissionsByRole: Record<UserRole, UserPermissions> = {
  admin: {
    visualizar: true,
    criar: true,
    editar: true,
    deletar: true,
    relatorios: true,
  },
  'loja-manager': {
    visualizar: true,
    criar: true,
    editar: true,
    deletar: false,
    relatorios: true,
  },
  funcionario: {
    visualizar: true,
    criar: true,
    editar: false,
    deletar: false,
    relatorios: false,
  },
};

export interface CreateUserData {
  email: string;
  nome: string;
  papel: UserRole;
  lojas: string[];
  permissoes?: UserPermissions;
}

export interface UpdateUserData {
  nome?: string;
  papel?: UserRole;
  lojas?: string[];
  permissoes?: UserPermissions;
  ativo?: boolean;
}

export class UserManagementService {
  /**
   * Cria um novo utilizador
   */
  static async createUser(
    data: CreateUserData,
    password: string,
    createdBy: string
  ): Promise<User> {
    let uid: string | null = null;

    try {
      // 1. Validar dados de entrada
      if (!data.email || !data.nome || !data.papel) {
        throw new Error('Email, nome e papel são obrigatórios');
      }

      if (password.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
      }

      console.log(`📝 Criando utilizador: ${data.email} (${data.papel})`);

      // 2. Criar conta no Firebase Auth
      console.log('   1️⃣  Criando conta no Firebase Auth...');
      const authResult = await createUserWithEmailAndPassword(auth, data.email, password);
      uid = authResult.user.uid;
      console.log(`   ✅ Conta criada: ${uid}`);

      // 3. Usar permissões customizadas ou padrão do papel
      const permissoes = data.permissoes || defaultPermissionsByRole[data.papel];

      // 4. Criar documento no Firestore
      console.log('   2️⃣  Criando documento no Firestore...');
      const userData: User = {
        id: uid,
        nome: data.nome,
        email: data.email,
        papel: data.papel,
        lojas: data.lojas,
        permissoes,
        ativo: true,
        dataCriacao: new Date().toISOString(),
        criadoPor: createdBy,
      };

      await setDoc(doc(db, 'users', uid), userData);
      console.log(`   ✅ Documento criado no Firestore`);

      // 5. Registrar na auditoria
      console.log('   3️⃣  Registando na auditoria...');
      try {
        await this.logAudit({
          userId: createdBy,
          acao: 'criar',
          entityType: 'user',
          entityId: uid,
          entityName: data.nome,
          storeId: data.lojas[0] || 'admin',
        });
        console.log(`   ✅ Auditoria registada`);
      } catch (auditError) {
        console.warn('⚠️  Aviso ao registar auditoria:', auditError);
        // Não rejeitar se a auditoria falhar
      }

      console.log(`✅ Utilizador criado com sucesso: ${data.nome} (${uid})`);
      return userData;
    } catch (error: any) {
      console.error('❌ Erro ao criar utilizador:', error);

      // Se a conta foi criada mas o Firestore falhou, informar ao user
      if (uid) {
        console.warn(`⚠️  ATENÇÃO: Conta Firebase criada (${uid}) mas documento Firestore falhou!`);
        console.warn('O utilizador poderá fazer login mas terá permissões padrão.');
      }

      // Traduzir erros Firebase
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Este email já está registado');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Email inválido');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Senha muito fraca');
      }

      throw error;
    }
  }

  /**
   * Obtém um utilizador pelo ID
   */
  static async getUser(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      return userDoc.exists() ? (userDoc.data() as User) : null;
    } catch (error) {
      console.error('Erro ao obter utilizador:', error);
      throw error;
    }
  }

  /**
   * Obtém utilizadores de uma loja
   */
  static async getStoreUsers(storeId: string): Promise<User[]> {
    try {
      const q = query(collection(db, 'users'), where('lojas', 'array-contains', storeId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data() as User);
    } catch (error) {
      console.error('Erro ao obter utilizadores da loja:', error);
      throw error;
    }
  }

  /**
   * Atualiza um utilizador
   */
  static async updateUser(
    userId: string,
    data: UpdateUserData,
    updatedBy: string,
    storeId: string
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);

      // Preparar dados para atualização
      const updateData: any = {
        ...data,
        ultimoLogin: new Date().toISOString(),
      };

      // Se mudar o papel, atualizar permissões
      if (data.papel && !data.permissoes) {
        updateData.permissoes = defaultPermissionsByRole[data.papel];
      }

      await updateDoc(userRef, updateData);

      // Registrar na auditoria
      await this.logAudit({
        userId: updatedBy,
        acao: 'atualizar',
        entityType: 'user',
        entityId: userId,
        entityName: data.nome || 'Utilizador',
        storeId,
      });
    } catch (error) {
      console.error('Erro ao atualizar utilizador:', error);
      throw error;
    }
  }

  /**
   * Desativa um utilizador (soft delete)
   */
  static async deactivateUser(userId: string, deactivatedBy: string, storeId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const user = await this.getUser(userId);

      await updateDoc(userRef, {
        ativo: false,
      });

      // Registrar na auditoria
      await this.logAudit({
        userId: deactivatedBy,
        acao: 'deletar',
        entityType: 'user',
        entityId: userId,
        entityName: user?.nome || 'Utilizador',
        storeId,
      });
    } catch (error) {
      console.error('Erro ao desativar utilizador:', error);
      throw error;
    }
  }

  /**
   * Atualiza permissões de um utilizador
   */
  static async updatePermissions(
    userId: string,
    permissions: UserPermissions,
    updatedBy: string,
    storeId: string
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        permissoes: permissions,
      });

      // Registrar na auditoria
      await this.logAudit({
        userId: updatedBy,
        acao: 'atualizar',
        entityType: 'user',
        entityId: userId,
        entityName: 'Permissões',
        storeId,
      });
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error);
      throw error;
    }
  }

  /**
   * Verifica se um utilizador tem uma permissão específica
   */
  static async hasPermission(userId: string, permission: keyof UserPermissions): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      return user ? user.permissoes[permission] : false;
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      return false;
    }
  }

  /**
   * Obtém todos os utilizadores (apenas para admin)
   */
  static async getAllUsers(): Promise<User[]> {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map((doc) => doc.data() as User);
    } catch (error) {
      console.error('Erro ao obter utilizadores:', error);
      throw error;
    }
  }

  /**
   * Registra ação na auditoria
   */
  private static async logAudit(auditData: Partial<AuditLog>): Promise<void> {
    try {
      const auditRef = doc(collection(db, 'audit_logs'));
      const audit: AuditLog = {
        id: auditRef.id,
        storeId: auditData.storeId || 'admin',
        userId: auditData.userId || 'system',
        userName: auditData.userId || 'Sistema',
        acao: auditData.acao || 'criar',
        entityType: auditData.entityType || 'user',
        entityId: auditData.entityId || '',
        entityName: auditData.entityName || '',
        mudancas: auditData.mudancas,
        timestamp: new Date().toISOString(),
      };

      await setDoc(auditRef, audit);
    } catch (error) {
      console.error('Erro ao registar auditoria:', error);
      // Não falhar a operação principal por erro na auditoria
    }
  }

  /**
   * Adiciona um utilizador a uma loja
   */
  static async addUserToStore(userId: string, storeId: string, addedBy: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const user = await this.getUser(userId);

      if (user) {
        const updatedLojas = Array.from(new Set([...user.lojas, storeId]));
        await updateDoc(userRef, {
          lojas: updatedLojas,
        });

        // Registrar na auditoria
        await this.logAudit({
          userId: addedBy,
          acao: 'atualizar',
          entityType: 'user',
          entityId: userId,
          entityName: user.nome,
          storeId,
        });
      }
    } catch (error) {
      console.error('Erro ao adicionar utilizador à loja:', error);
      throw error;
    }
  }

  /**
   * Remove um utilizador de uma loja
   */
  static async removeUserFromStore(userId: string, storeId: string, removedBy: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const user = await this.getUser(userId);

      if (user) {
        const updatedLojas = user.lojas.filter((id) => id !== storeId);
        await updateDoc(userRef, {
          lojas: updatedLojas,
        });

        // Registrar na auditoria
        await this.logAudit({
          userId: removedBy,
          acao: 'atualizar',
          entityType: 'user',
          entityId: userId,
          entityName: user.nome,
          storeId,
        });
      }
    } catch (error) {
      console.error('Erro ao remover utilizador da loja:', error);
      throw error;
    }
  }
}

/**
 * Exports para compatibilidade com código existente
 */
export async function getStoreUsers(storeId: string): Promise<User[]> {
  return UserManagementService.getStoreUsers(storeId);
}

export async function addUserToStore(storeId: string, userId: string): Promise<void> {
  await UserManagementService.addUserToStore(userId, storeId, 'system');
}
