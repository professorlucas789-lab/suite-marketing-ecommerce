/**
 * Hook para autenticação com dados completos do utilizador (incluindo papel)
 * Carrega dados do Firestore com papel e permissões
 * Fase 10: User Management
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserRole } from '../types/store';

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
            } else {
              setUser(null);
              setError('Utilizador não encontrado na base de dados');
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
