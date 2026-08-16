/**
 * Lazy imports for performance optimization
 * Enables code splitting for large dependencies
 * Fase 5C: Performance Optimization
 */

import { lazy } from 'react';

/**
 * Lazy load heavy export libraries only when needed
 * This reduces the initial bundle size significantly
 */
export const lazyLoadXLSX = () => import('xlsx');
export const lazyLoadJsPDF = () => import('jspdf');
export const lazyLoadAutoTable = () => import('jspdf-autotable');

/**
 * Lazy load components that are not immediately visible
 * These components are typically shown in modals or secondary views
 */
export const LazyReportBuilder = lazy(() =>
  import('../components/ReportBuilder').then(module => ({
    default: module.ReportBuilder
  }))
);

export const LazyBatchProductForm = lazy(() =>
  import('../components/BatchProductForm')
);

export const LazyImportCSVModal = lazy(() =>
  import('../components/ImportCSVModal').then(module => ({
    default: module.ImportCSVModal
  }))
);

export const LazyBusinessSettingsView = lazy(() =>
  import('../components/BusinessSettingsView')
);

export const LazyProductComparison = lazy(() =>
  import('../components/ProductComparison').then(module => ({
    default: module.ProductComparison
  }))
);

/**
 * Helper to safely load dynamic modules with error handling
 */
export async function loadModule<T>(
  loader: () => Promise<T>,
  onError?: (error: Error) => void
): Promise<T | null> {
  try {
    return await loader();
  } catch (error) {
    console.error('Failed to load module:', error);
    if (onError) {
      onError(error as Error);
    }
    return null;
  }
}
