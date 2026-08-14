/**
 * Contexto de Autenticação e Autorização
 * Gerencia utilizador, papel e permissões
 * Fase 10: User Management
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserRole } from '../types/store';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  papel: UserRole | null;
  isAdmin: boolean;
  isLojaManager: boolean;
  isFuncionario: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        setLoading(true);
        setError(null);

        if (fbUser) {
          setFirebaseUser(fbUser);

          // Obter dados do utilizador do Firestore
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setUser(userData);
          } else {
            // Utilizador no Firebase mas não no Firestore
            setUser(null);
            setError('Utilizador não encontrado na base de dados');
          }
        } else {
          setFirebaseUser(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Erro ao carregarbuser:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados do utilizador');
        setFirebaseUser(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const contextValue: AuthContextType = {
    user,
    firebaseUser,
    loading,
    error,
    papel: user?.papel || null,
    isAdmin: user?.papel === 'admin',
    isLojaManager: user?.papel === 'loja-manager',
    isFuncionario: user?.papel === 'funcionario',
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
