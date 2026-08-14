import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook to manage favorite products
 * Persists favorites to localStorage
 * Fase 5B Item 1: Favorite Products
 */
export function useFavorites(userId?: string) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Storage key includes userId to keep favorites per user
  const storageKey = `precocerto_favorites_${userId || 'default'}`;

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFavorites(new Set(parsed));
      }
    } catch (error) {
      console.error('Error loading favorites from localStorage:', error);
    }
    setIsLoaded(true);
  }, [storageKey]);

  // Save favorites to localStorage whenever they change
  const saveFavorites = useCallback((newFavorites: Set<string>) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(newFavorites)));
    } catch (error) {
      console.error('Error saving favorites to localStorage:', error);
    }
  }, [storageKey]);

  // Toggle favorite status for a product
  const toggleFavorite = useCallback((productId: string) => {
    setFavorites((prev) => {
      const updated = new Set(prev);
      if (updated.has(productId)) {
        updated.delete(productId);
      } else {
        updated.add(productId);
      }
      saveFavorites(updated);
      return updated;
    });
  }, [saveFavorites]);

  // Add a product to favorites
  const addFavorite = useCallback((productId: string) => {
    setFavorites((prev) => {
      if (prev.has(productId)) return prev;
      const updated = new Set(prev);
      updated.add(productId);
      saveFavorites(updated);
      return updated;
    });
  }, [saveFavorites]);

  // Remove a product from favorites
  const removeFavorite = useCallback((productId: string) => {
    setFavorites((prev) => {
      if (!prev.has(productId)) return prev;
      const updated = new Set(prev);
      updated.delete(productId);
      saveFavorites(updated);
      return updated;
    });
  }, [saveFavorites]);

  // Check if a product is favorited
  const isFavorite = useCallback((productId: string) => {
    return favorites.has(productId);
  }, [favorites]);

  // Get all favorite product IDs
  const getFavoriteIds = useCallback(() => {
    return Array.from(favorites);
  }, [favorites]);

  // Get favorite count
  const getFavoriteCount = useCallback(() => {
    return favorites.size;
  }, [favorites]);

  // Clear all favorites
  const clearFavorites = useCallback(() => {
    setFavorites(new Set());
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error clearing favorites:', error);
    }
  }, [storageKey]);

  return {
    favorites,
    isLoaded,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    isFavorite,
    getFavoriteIds,
    getFavoriteCount,
    clearFavorites
  };
}
