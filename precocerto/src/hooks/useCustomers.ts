import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { Customer } from '../types/customers';

export function useCustomers(userId?: string, storeId?: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const customersQuery = query(collection(db, 'customers'), where('storeId', '==', storeId));
    const unsubscribe = onSnapshot(
      customersQuery,
      (snapshot) => {
        const nextCustomers = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Customer))
          .sort((a, b) => {
            if ((b.currentBalance || 0) !== (a.currentBalance || 0)) {
              return (b.currentBalance || 0) - (a.currentBalance || 0);
            }
            return a.name.localeCompare(b.name);
          });

        setCustomers(nextCustomers);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar clientes.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, storeId]);

  const activeCustomers = useMemo(
    () => customers.filter((customer) => customer.status === 'active'),
    [customers]
  );

  return { customers, activeCustomers, loading, error };
}
