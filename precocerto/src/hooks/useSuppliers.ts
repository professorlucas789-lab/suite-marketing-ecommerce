import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { Supplier } from '../types/purchasing';

export function useSuppliers(userId?: string, storeId?: string) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setSuppliers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const suppliersQuery = query(collection(db, 'suppliers'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(
      suppliersQuery,
      (snapshot) => {
        const nextSuppliers = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Supplier))
          .filter((supplier) => !storeId || supplier.storeId === storeId)
          .sort((a, b) => a.name.localeCompare(b.name));

        setSuppliers(nextSuppliers);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar fornecedores.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, storeId]);

  const activeSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.status === 'active'),
    [suppliers]
  );

  return { suppliers, activeSuppliers, loading, error };
}
