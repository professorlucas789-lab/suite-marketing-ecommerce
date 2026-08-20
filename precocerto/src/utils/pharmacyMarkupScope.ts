import type { Store, UserRole } from "../types/store";

export const PHARMACY_BUSINESS_TYPE = "farmacia";

export type MarkupApplyScope = "current-store" | "all-pharmacies";

export function isPharmacyStore(store?: Pick<Store, "tipo"> | null): boolean {
  return store?.tipo === PHARMACY_BUSINESS_TYPE;
}

export function getActivePharmacyStores(stores: Store[]): Store[] {
  return stores.filter((store) => store.tipo === PHARMACY_BUSINESS_TYPE && store.ativo !== false);
}

export function canApplyMarkupToAllPharmacies(params: {
  role?: UserRole;
  currentStoreType?: string;
  stores: Store[];
}): boolean {
  return (
    params.role === "admin" &&
    params.currentStoreType === PHARMACY_BUSINESS_TYPE &&
    getActivePharmacyStores(params.stores).length > 1
  );
}
