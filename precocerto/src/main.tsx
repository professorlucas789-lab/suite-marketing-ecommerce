import './patch-fetch.ts';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { StoreProvider } from './contexts/StoreContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  // 🔴 CRÍTICO: Remover StrictMode que causa double-renders
  // Isto estava fazendo o ProductForm tentar aceder a currentStore
  // antes de StoreContext carregar
  <ErrorBoundary>
    <StoreProvider>
      <App />
    </StoreProvider>
  </ErrorBoundary>,
);
