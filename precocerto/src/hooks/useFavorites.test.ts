import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFavorites } from './useFavorites';

/**
 * Test suite for useFavorites hook
 * Fase 5B Item 1: Favorite Products
 */
describe('useFavorites hook', () => {
  const mockUserId = 'test-user-123';
  const storageKey = `precocerto_favorites_${mockUserId}`;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize with empty favorites', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      expect(result.current.favorites).toEqual(new Set());
      expect(result.current.getFavoriteCount()).toBe(0);
    });

    it('should set isLoaded after loading', async () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
    });

    it('should load favorites from localStorage', async () => {
      // Pre-populate localStorage
      const savedFavorites = ['prod-1', 'prod-2', 'prod-3'];
      localStorage.setItem(storageKey, JSON.stringify(savedFavorites));

      const { result } = renderHook(() => useFavorites(mockUserId));

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.getFavoriteCount()).toBe(3);
      expect(result.current.isFavorite('prod-1')).toBe(true);
      expect(result.current.isFavorite('prod-2')).toBe(true);
      expect(result.current.isFavorite('prod-3')).toBe(true);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem(storageKey, 'invalid json');

      const { result } = renderHook(() => useFavorites(mockUserId));

      expect(result.current.getFavoriteCount()).toBe(0);
    });
  });

  describe('toggleFavorite', () => {
    it('should add product to favorites when not present', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      act(() => {
        result.current.toggleFavorite('prod-1');
      });

      expect(result.current.isFavorite('prod-1')).toBe(true);
      expect(result.current.getFavoriteCount()).toBe(1);
    });

    it('should remove product from favorites when already present', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      act(() => {
        result.current.toggleFavorite('prod-1');
        result.current.toggleFavorite('prod-1');
      });

      expect(result.current.isFavorite('prod-1')).toBe(false);
      expect(result.current.getFavoriteCount()).toBe(0);
    });

    it('should persist toggles to localStorage', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      act(() => {
        result.current.toggleFavorite('prod-1');
      });

      const stored = localStorage.getItem(storageKey);
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toContain('prod-1');
    });

    it('should handle multiple toggles', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      act(() => {
        result.current.toggleFavorite('prod-1');
        result.current.toggleFavorite('prod-2');
        result.current.toggleFavorite('prod-3');
      });

      expect(result.current.getFavoriteCount()).toBe(3);
      expect(result.current.isFavorite('prod-1')).toBe(true);
      expect(result.current.isFavorite('prod-2')).toBe(true);
      expect(result.current.isFavorite('prod-3')).toBe(true);
    });
  });

  describe('addFavorite', () => {
    it('should add product to favorites', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      act(() => {
        result.current.addFavorite('prod-1');
      });

      expect(result.current.isFavorite('prod-1')).toBe(true);
    });

    it('should not add duplicate favorites', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      act(() => {
        result.current.addFavorite('prod-1');
        result.current.addFavorite('prod-1');
      });

      expect(result.current.getFavoriteCount()).toBe(1);
    });

    it('should persist to localStorage', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      act(() => {
        result.current.addFavorite('prod-1');
      });

      const stored = JSON.parse(localStorage.getItem(storageKey)!);
      expect(stored).toContain('prod-1');
    });
  });

  describe('removeFavorite', () => {
    it('should remove product from favorites', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      act(() => {
        result.current.addFavorite('prod-1');
        result.current.removeFavorite('prod-1');
      });

      expect(result.current.isFavorite('prod-1')).toBe(false);
    });

    it('should not fail when removing non-existent favorite', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      act(() => {
        result.current.removeFavorite('prod-non-existent');
      });

      expect(result.current.getFavoriteCount()).toBe(0);
    });

    it('should persist removal to localStorage', () => {
      localStorage.setItem(storageKey, JSON.stringify(['prod-1', 'prod-2']));
      const { result } = renderHook(() => useFavorites(mockUserId));

      act(() => {
        result.current.removeFavorite('prod-1');
      });

      const stored = JSON.parse(localStorage.getItem(storageKey)!);
      expect(stored).not.toContain('prod-1');
      expect(stored).toContain('prod-2');
    });
  });

  describe('isFavorite', () => {
    it('should return true for favorited product', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      act(() => {
        result.current.addFavorite('prod-1');
      });

      expect(result.current.isFavorite('prod-1')).toBe(true);
    });

    it('should return false for non-favorited product', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      expect(result.current.isFavorite('prod-1')).toBe(false);
    });
  });

  describe('getFavoriteIds', () => {
    it('should return array of favorite product IDs', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      act(() => {
        result.current.addFavorite('prod-1');
        result.current.addFavorite('prod-2');
        result.current.addFavorite('prod-3');
      });

      const ids = result.current.getFavoriteIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain('prod-1');
      expect(ids).toContain('prod-2');
      expect(ids).toContain('prod-3');
    });

    it('should return empty array when no favorites', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      const ids = result.current.getFavoriteIds();
      expect(ids).toEqual([]);
    });
  });

  describe('getFavoriteCount', () => {
    it('should return correct count', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      act(() => {
        result.current.addFavorite('prod-1');
        result.current.addFavorite('prod-2');
      });

      expect(result.current.getFavoriteCount()).toBe(2);
    });

    it('should return 0 when no favorites', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      expect(result.current.getFavoriteCount()).toBe(0);
    });

    it('should update count after toggle', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      act(() => {
        result.current.toggleFavorite('prod-1');
      });
      expect(result.current.getFavoriteCount()).toBe(1);

      act(() => {
        result.current.toggleFavorite('prod-1');
      });
      expect(result.current.getFavoriteCount()).toBe(0);
    });
  });

  describe('clearFavorites', () => {
    it('should clear all favorites', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      act(() => {
        result.current.addFavorite('prod-1');
        result.current.addFavorite('prod-2');
        result.current.clearFavorites();
      });

      expect(result.current.getFavoriteCount()).toBe(0);
      expect(result.current.isFavorite('prod-1')).toBe(false);
    });

    it('should remove from localStorage', () => {
      localStorage.setItem(storageKey, JSON.stringify(['prod-1', 'prod-2']));
      const { result } = renderHook(() => useFavorites(mockUserId));

      act(() => {
        result.current.clearFavorites();
      });

      const stored = localStorage.getItem(storageKey);
      expect(stored).toBeNull();
    });
  });

  describe('Multi-user support', () => {
    it('should maintain separate favorites per user', () => {
      const { result: result1 } = renderHook(() => useFavorites('user-1'));
      const { result: result2 } = renderHook(() => useFavorites('user-2'));

      act(() => {
        result1.current.addFavorite('prod-1');
        result2.current.addFavorite('prod-2');
      });

      expect(result1.current.isFavorite('prod-1')).toBe(true);
      expect(result1.current.isFavorite('prod-2')).toBe(false);

      expect(result2.current.isFavorite('prod-1')).toBe(false);
      expect(result2.current.isFavorite('prod-2')).toBe(true);
    });

    it('should use default user when no userId provided', () => {
      const { result } = renderHook(() => useFavorites());

      act(() => {
        result.current.addFavorite('prod-1');
      });

      const stored = localStorage.getItem('precocerto_favorites_default');
      expect(stored).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('should handle very large numbers of favorites', () => {
      const { result } = renderHook(() => useFavorites(mockUserId));

      act(() => {
        for (let i = 0; i < 1000; i++) {
          result.current.addFavorite(`prod-${i}`);
        }
      });

      expect(result.current.getFavoriteCount()).toBe(1000);
      expect(result.current.isFavorite('prod-999')).toBe(true);
    });

    it('should handle localStorage quota exceeded gracefully', () => {
      // Mock localStorage.setItem to throw an error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => useFavorites(mockUserId));

      expect(() => {
        act(() => {
          result.current.addFavorite('prod-1');
        });
      }).not.toThrow();

      // Restore original method
      Storage.prototype.setItem = originalSetItem;
    });

    it('should handle empty localStorage key gracefully', () => {
      localStorage.setItem(storageKey, '');
      const { result } = renderHook(() => useFavorites(mockUserId));

      expect(result.current.getFavoriteCount()).toBe(0);
    });
  });
});
