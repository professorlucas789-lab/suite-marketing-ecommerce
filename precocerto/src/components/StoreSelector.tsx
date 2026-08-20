/**
 * Componente seletor de loja
 * Fase 6: Sistema Multi-Loja
 */

import React from 'react';
import { useStore } from '../contexts/StoreContext';
import { getStoreBusinessSegmentLabel, getStoreOperationalUnitLabel } from '../utils/businessUnitMapping';
import { Building2, ChevronDown, Loader2 } from 'lucide-react';

export function StoreSelector() {
  const { currentStore, userStores, switchStore, loading } = useStore();
  const [isOpen, setIsOpen] = React.useState(false);

  if (loading) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
      >
        <Loader2 size={16} className="animate-spin" />
        Carregando...
      </button>
    );
  }

  if (!currentStore) {
    return null;
  }

  if (userStores.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
        <Building2 size={16} />
        <div className="leading-tight">
          <span className="block text-sm font-medium">{currentStore.storeName}</span>
          <span className="block text-xs opacity-70">{currentStore.businessSegmentName}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors"
      >
        <Building2 size={16} />
        <div className="leading-tight text-left">
          <span className="block text-sm font-medium">{currentStore.storeName}</span>
          <span className="block text-xs opacity-70">{currentStore.businessSegmentName}</span>
        </div>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
          <div className="p-1">
            {userStores.map((store) => (
              <button
                key={store.id}
                onClick={async () => {
                  await switchStore(store.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  currentStore.storeId === store.id
                    ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-medium'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 size={14} />
                  <div>
                    <div className="font-medium">{store.nome}</div>
                    <div className="text-xs opacity-70">
                      {getStoreOperationalUnitLabel(store)} · {getStoreBusinessSegmentLabel(store)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
