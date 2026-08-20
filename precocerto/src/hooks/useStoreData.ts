/**
 * Hooks para trabalhar com dados multi-loja
 * Fase 6: Sistema Multi-Loja
 */

import { useEffect, useState, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { useStore } from '../contexts/StoreContext';
import { StoreStats } from '../types/store';

type StoreActivityRecord = {
  id: string;
  timestamp?: string;
  [key: string]: any;
};

/**
 * Hook para obter produtos de uma loja em tempo real
 */
export function useStoreProducts(storeId?: string) {
  const { currentStore } = useStore();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const store = storeId || currentStore?.storeId;

  useEffect(() => {
    if (!store) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const q = query(collection(db, 'products'), where('storeId', '==', store));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setProducts(data);
          setLoading(false);
          setError(null);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar produtos');
      setLoading(false);
    }
  }, [store]);

  return { products, loading, error };
}

/**
 * Hook para obter utilizadores de uma loja
 */
export function useStoreUsers(storeId?: string) {
  const { currentStore } = useStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const store = storeId || currentStore?.storeId;

  useEffect(() => {
    if (!store) {
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const q = query(collection(db, 'users'), where('lojas', 'array-contains', store));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setUsers(data);
          setLoading(false);
          setError(null);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar utilizadores');
      setLoading(false);
    }
  }, [store]);

  return { users, loading, error };
}

/**
 * Hook para monitorizar atividades da loja em tempo real
 */
export function useStoreActivity(storeId?: string, limit: number = 50) {
  const { currentStore } = useStore();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const store = storeId || currentStore?.storeId;

  useEffect(() => {
    if (!store) {
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const q = query(
        collection(db, 'activity_stream'),
        where('storeId', '==', store)
        // Note: orderBy requer um índice no Firestore
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data: StoreActivityRecord[] = snapshot.docs
            .map((doc): StoreActivityRecord => ({
              id: doc.id,
              ...doc.data(),
            }))
            .sort((a, b) => {
              const timeA = new Date(a.timestamp || 0).getTime();
              const timeB = new Date(b.timestamp || 0).getTime();
              return timeB - timeA; // Mais recentes primeiro
            })
            .slice(0, limit);

          setActivities(data);
          setLoading(false);
          setError(null);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar atividades');
      setLoading(false);
    }
  }, [store, limit]);

  return { activities, loading, error };
}

/**
 * Hook para obter estatísticas da loja
 */
export function useStoreStats(storeId?: string) {
  const { currentStore } = useStore();
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const store = storeId || currentStore?.storeId;

  const calculateStats = useCallback(async () => {
    if (!store) {
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Contar produtos
      const productsSnapshot = await getDocs(
        query(collection(db, 'products'), where('storeId', '==', store))
      );
      const totalProdutos = productsSnapshot.size;

      // Contar utilizadores
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), where('lojas', 'array-contains', store))
      );
      const totalUtilizadores = usersSnapshot.size;

      // Calcular estatísticas dos produtos
      let precoMedio = 0;
      let margemMedia = 0;
      let valorTotalStock = 0;

      if (totalProdutos > 0) {
        let somaPrecos = 0;
        let somaMargens = 0;
        let somaValorStock = 0;

        productsSnapshot.docs.forEach((doc) => {
          const produto = doc.data();
          somaPrecos += produto.precoVendaRecomendado || 0;
          somaMargens += produto.margemReal || 0;
          somaValorStock +=
            (produto.precoVendaRecomendado || 0) * (produto.quantidadeDisponivel || 0);
        });

        precoMedio = somaPrecos / totalProdutos;
        margemMedia = somaMargens / totalProdutos;
        valorTotalStock = somaValorStock;
      }

      setStats({
        storeId: store,
        storeName: currentStore?.storeName || '',
        totalProdutos,
        produtosAtivos: totalProdutos,
        totalUtilizadores,
        precoMedio: Math.round(precoMedio * 100) / 100,
        margemMedia: Math.round(margemMedia * 100) / 100,
        valorTotalStock: Math.round(valorTotalStock * 100) / 100,
        utilizadoresOnline: 0,
        produtosAdicionadosSemana: 0,
        produtosAlteradosSemana: 0,
        ultimaAtualizacao: new Date().toISOString(),
      });

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao calcular estatísticas');
    } finally {
      setLoading(false);
    }
  }, [store, currentStore?.storeName]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  return { stats, loading, error, refresh: calculateStats };
}

/**
 * Hook para monitorizar permissões do utilizador
 */
export function usePermissions() {
  const { currentUser } = useStore();

  const can = {
    visualizar: () => currentUser?.permissoes.visualizar ?? false,
    criar: () => currentUser?.permissoes.criar ?? false,
    editar: () => currentUser?.permissoes.editar ?? false,
    deletar: () => currentUser?.permissoes.deletar ?? false,
    relatorios: () => currentUser?.permissoes.relatorios ?? false,
    isAdmin: () => currentUser?.papel === 'admin',
    isLojaManager: () => currentUser?.papel === 'loja-manager',
  };

  return can;
}
