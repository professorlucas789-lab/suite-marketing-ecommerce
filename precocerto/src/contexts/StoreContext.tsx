/**
 * Contexto para gerenciar a loja/estabelecimento atual
 * Fase 6: Sistema Multi-Loja
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Store, StoreContext as IStoreContext, User, UserSession } from '../types/store';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

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
    console.log('📂 [StoreProvider] loadUserAndStores iniciado...');
    try {
      setLoading(true);
      setError(null);

      const user = auth.currentUser;
      console.log('🔍 [StoreProvider] auth.currentUser:', user?.uid, user?.email);

      if (!user) {
        console.log('❌ [StoreProvider] Nenhum utilizador autenticado');
        setCurrentUser(null);
        setUserStores([]);
        setCurrentStore(null);
        return;
      }

      // Obter documento do utilizador
      console.log('📄 [StoreProvider] Buscando documento do utilizador:', user.uid);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        throw new Error('Utilizador não encontrado no Firestore');
      }

      const userData = userDoc.data() as User;

      // DEBUG: Verificar papel e lojas
      console.log('👤 [StoreProvider] Utilizador autenticado:', {
        uid: user.uid,
        email: user.email,
        papel: userData.papel,
        lojas: userData.lojas,
        lojas_length: userData.lojas?.length || 0,
      });

      // FIX: Se admin não tem lojas atribuídas, atribuir automaticamente todas as lojas existentes
      let userLojas = userData.lojas || [];
      console.log('🔍 [StoreProvider] Verificando se precisa auto-atribuir lojas:', {
        papel: userData.papel,
        tem_lojas: userLojas.length > 0,
        devia_atribuir: userData.papel === 'admin' && userLojas.length === 0,
      });

      if (userData.papel === 'admin' && userLojas.length === 0) {
        console.log('🔧 [StoreProvider] Admin sem lojas atribuídas. Buscando lojas existentes...');

        try {
          const allStoresSnap = await getDocs(collection(db, 'stores'));
          console.log('📦 [StoreProvider] Documentos de loja encontrados:', allStoresSnap.size);

          const allStoreIds = allStoresSnap.docs
            .filter(doc => {
              const ativo = doc.data().ativo !== false;
              console.log(`    - ${doc.id}: ativo=${doc.data().ativo}, incluída=${ativo}`);
              return ativo;
            })
            .map(doc => doc.id);

          console.log('✅ [StoreProvider] Lojas ativas para atribuir:', allStoreIds);

          if (allStoreIds.length > 0) {
            console.log(`🔄 [StoreProvider] Atribuindo ${allStoreIds.length} loja(s) ao admin...`);
            // Atribuir lojas ao admin
            await updateDoc(doc(db, 'users', user.uid), {
              lojas: allStoreIds
            });
            userLojas = allStoreIds;
            console.log('✅ [StoreProvider] Lojas atribuídas com sucesso!');
          } else {
            console.log('⚠️ [StoreProvider] Nenhuma loja ativa encontrada para atribuir');
          }
        } catch (err) {
          console.error('❌ [StoreProvider] Erro ao atribuir lojas automaticamente:', err);
          // Continuar mesmo se falhar
        }
      }

      // Obter lojas do utilizador
      console.log('🏢 [StoreProvider] Carregando lojas:', userLojas);
      const storesData: Store[] = [];
      for (const storeId of userLojas) {
        const storeDoc = await getDoc(doc(db, 'stores', storeId));
        if (storeDoc.exists()) {
          storesData.push({ id: storeDoc.id, ...storeDoc.data() } as Store);
          console.log(`  ✓ Loja carregada: ${storeId}`);
        } else {
          console.log(`  ✗ Loja não encontrada: ${storeId}`);
        }
      }

      console.log('📊 [StoreProvider] Total de lojas carregadas:', storesData.length);
      setUserStores(storesData);

      // Definir primeira loja como padrão (ou recuperar última usada)
      const lastUsedStoreId = localStorage.getItem('lastUsedStoreId');
      const defaultStore = storesData.find(s => s.id === lastUsedStoreId) || storesData[0];

      console.log('🎯 [StoreProvider] Loja padrão selecionada:', defaultStore?.id, defaultStore?.nome);

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
        console.log('✅ [StoreProvider] Contexto de loja definido com sucesso');
      } else {
        console.log('⚠️ [StoreProvider] Nenhuma loja padrão disponível');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados da loja';
      setError(message);
      console.error('❌ [StoreProvider] Erro completo:', err);
      console.error('❌ [StoreProvider] Mensagem:', message);
      if (err instanceof Error) {
        console.error('❌ [StoreProvider] Stack:', err.stack);
      }
    } finally {
      console.log('🏁 [StoreProvider] loadUserAndStores finalizado');
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
    console.log('🔌 [StoreProvider] useEffect montado - a aguardar mudanças de autenticação...');
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log('🔐 [StoreProvider] Auth state changed:', user?.uid, user?.email);
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
