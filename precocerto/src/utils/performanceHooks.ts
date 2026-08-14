/**
 * Performance optimization hooks
 * Provides reusable memoization and callback optimizations
 * Fase 5C: Performance Optimization
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';

/**
 * Custom hook for debounced values
 * Useful for search inputs and real-time filtering
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for throttled functions
 * Useful for scroll and resize event handlers
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const lastRun = useRef(Date.now());

  return useCallback(
    (...args: any[]) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = now;
      }
    },
    [callback, delay]
  ) as T;
}

/**
 * Custom hook for memoizing filtered/sorted data
 * Prevents unnecessary recalculations
 */
export function useFilteredAndSorted<T>(
  items: T[],
  filterFn: (item: T) => boolean,
  sortFn?: (a: T, b: T) => number
): T[] {
  return useMemo(() => {
    let result = items.filter(filterFn);
    if (sortFn) {
      result = result.sort(sortFn);
    }
    return result;
  }, [items, filterFn, sortFn]);
}

/**
 * Custom hook for memoizing expensive calculations
 * Compares dependencies using deep equality
 */
export function useDeepMemo<T>(factory: () => T, deps: any[]): T {
  const ref = useRef<{ deps: any[]; value: T }>();

  const deepEqual = useCallback((a: any[], b: any[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) {
        return false;
      }
    }
    return true;
  }, []);

  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = { deps, value: factory() };
  }

  return ref.current.value;
}

/**
 * Custom hook to check if a component has mounted
 * Prevents state updates on unmounted components
 */
export function useIsMounted(): boolean {
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted.current;
}

/**
 * Custom hook for previous value tracking
 * Useful for detecting changes
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
