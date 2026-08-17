/**
 * Hook para autenticação com dados completos do utilizador (incluindo papel)
 * Carrega dados do Firestore com papel e permissões
 * Fase 10: User Management
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserRole } from '../types/store';
import { logLogin } from '../utils/activityLogger'; // NOVO (Fase 11)

export interface AuthUserData {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  papel: UserRole | null;
  isAdmin: boolean;
  isLojaManager: boolean;
  isFuncionario: boolean;
  isAuthenticated: boolean;
}

export function useUserAuth(): AuthUserData {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (fbUser) => {
        try {
          setLoading(true);
          setError(null);

          if (fbUser) {
            setFirebaseUser(fbUser);

            // Carregar dados do utilizador do Firestore
            const userRef = doc(db, 'users', fbUser.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
              const userData = userSnap.data() as User;
              setUser(userData);

              // NOVO (Fase 11): Registar login na auditoria
              try {
                await logLogin();
              } catch (logError) {
                console.warn('Aviso ao registar login:', logError);
                // Não interromper se o registo falhar
              }
            } else {
              // NOVO (Fase 11): Se o documento não existir, tenta criar um padrão
              console.warn('Utilizador não encontrado no Firestore. Criando documento padrão...');

              try {
                const defaultUser: User = {
                  id: fbUser.uid,
                  nome: fbUser.displayName || fbUser.email?.split('@')[0] || 'Utilizador',
                  email: fbUser.email || '',
                  papel: 'funcionario', // Papel padrão
                  lojas: [],
                  permissoes: {
                    visualizar: true,
                    criar: false,
                    editar: false,
                    deletar: false,
                    relatorios: false,
                  },
                  ativo: true,
                  dataCriacao: new Date().toISOString(),
                };

                await setDoc(doc(db, 'users', fbUser.uid), defaultUser);
                setUser(defaultUser);

                console.warn('⚠️ Documento padrão criado. Admin deve definir papel correto!');
                setError('Utilizador criado com dados padrão. Contacte o administrador para definir suas permissões.');
              } catch (createError) {
                console.error('Erro ao criar documento padrão:', createError);
                setUser(null);
                setError('Utilizador não encontrado e não foi possível criar documento padrão');
              }
            }
          } else {
            setFirebaseUser(null);
            setUser(null);
          }
        } catch (err) {
          console.error('Erro ao carregar dados do utilizador:', err);
          setError(err instanceof Error ? err.message : 'Erro ao carregar dados do utilizador');
          setFirebaseUser(null);
          setUser(null);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Erro de autenticação:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return {
    firebaseUser,
    user,
    loading,
    error,
    papel: user?.papel || null,
    isAdmin: user?.papel === 'admin',
    isLojaManager: user?.papel === 'loja-manager',
    isFuncionario: user?.papel === 'funcionario',
    isAuthenticated: !!firebaseUser && !!user,
  };
}
