import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { FinancialTransaction } from '../types/finance';

export function useFinanceTransactions(userId?: string, storeId?: string) {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const transactionsQuery = query(collection(db, 'financialTransactions'), where('storeId', '==', storeId));
    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const nextTransactions = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as FinancialTransaction))
          .sort((a, b) => new Date(b.occurredAt || b.createdAt).getTime() - new Date(a.occurredAt || a.createdAt).getTime());

        setTransactions(nextTransactions);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar movimentos financeiros.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [storeId]);

  return { transactions, loading, error };
}
