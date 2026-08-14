/**
 * Contexto para gerenciar a loja/estabelecimento atual
 * Fase 6: Sistema Multi-Loja
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Store, StoreContext as IStoreContext, User, UserSession } from '../types/store';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface StoreContextType {
  currentStore: IStoreContext | null;
  currentUser: UserSession | null;
  userStores: Store[];
  loading: boolean;
  error: string | null;
  setCurrentStore: (store: IStoreContext) => Promise<void>;
  switchStore: (storeId: string) => Promise<void>;
  refreshStoreData: () => Promise<void>;
}

const StoreContextProvider = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentStore, setCurrentStore] = useState<IStoreContext | null>(null);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [userStores, setUserStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carrega dados do utilizador e suas lojas
   */
  const loadUserAndStores = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = auth.currentUser;
      if (!user) {
        setCurrentUser(null);
        setUserStores([]);
        setCurrentStore(null);
        return;
      }

      // Obter documento do utilizador
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        throw new Error('Utilizador não encontrado no Firestore');
      }

      const userData = userDoc.data() as User;

      // Obter lojas do utilizador
      const storesData: Store[] = [];
      for (const storeId of userData.lojas) {
        const storeDoc = await getDoc(doc(db, 'stores', storeId));
        if (storeDoc.exists()) {
          storesData.push({ id: storeDoc.id, ...storeDoc.data() } as Store);
        }
      }

      setUserStores(storesData);

      // Definir primeira loja como padrão (ou recuperar última usada)
      const lastUsedStoreId = localStorage.getItem('lastUsedStoreId');
      const defaultStore = storesData.find(s => s.id === lastUsedStoreId) || storesData[0];

      if (defaultStore) {
        const storeContext: IStoreContext = {
          storeId: defaultStore.id,
          storeName: defaultStore.nome,
          storeType: defaultStore.tipo,
        };

        setCurrentStore(storeContext);

        // Criar objeto UserSession
        const userSession: UserSession = {
          ...userData,
          currentStore: storeContext,
          stores: storesData,
        };

        setCurrentUser(userSession);
        localStorage.setItem('lastUsedStoreId', defaultStore.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados da loja';
      setError(message);
      console.error('Erro no StoreProvider:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Muda a loja atual
   */
  const switchStore = async (storeId: string) => {
    try {
      setLoading(true);
      const store = userStores.find(s => s.id === storeId);

      if (!store) {
        throw new Error('Loja não encontrada');
      }

      const storeContext: IStoreContext = {
        storeId: store.id,
        storeName: store.nome,
        storeType: store.tipo,
      };

      setCurrentStore(storeContext);

      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          currentStore: storeContext,
        });
      }

      localStorage.setItem('lastUsedStoreId', storeId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao mudar de loja';
      setError(message);
      console.error('Erro ao mudar de loja:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Atualiza contexto da loja (não recomendado - usar switchStore)
   */
  const handleSetCurrentStore = async (store: IStoreContext) => {
    setCurrentStore(store);
    localStorage.setItem('lastUsedStoreId', store.storeId);
  };

  /**
   * Recarrega dados da loja
   */
  const refreshStoreData = async () => {
    await loadUserAndStores();
  };

  /**
   * Carrega dados quando componente monta ou utilizador muda
   */
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(() => {
      loadUserAndStores();
    });

    return unsubscribe;
  }, []);

  const value: StoreContextType = {
    currentStore,
    currentUser,
    userStores,
    loading,
    error,
    setCurrentStore: handleSetCurrentStore,
    switchStore,
    refreshStoreData,
  };

  return (
    <StoreContextProvider.Provider value={value}>
      {children}
    </StoreContextProvider.Provider>
  );
}

/**
 * Hook para usar o contexto de loja
 */
export function useStore() {
  const context = useContext(StoreContextProvider);
  if (!context) {
    throw new Error('useStore deve ser usado dentro de StoreProvider');
  }
  return context;
}
