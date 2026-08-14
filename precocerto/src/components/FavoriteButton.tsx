import React from 'react';
import { Heart } from 'lucide-react';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Favorite/Like button component
 * Allows users to mark products as favorites for quick access
 * Fase 5B Item 1: Favorite Products
 */
export function FavoriteButton({
  isFavorite,
  onToggle,
  label = 'Adicionar aos favoritos',
  className = '',
  disabled = false
}: FavoriteButtonProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`
        p-2 rounded-lg transition-all
        ${isFavorite
          ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30'
          : 'text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title={isFavorite ? 'Remover de favoritos' : label}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Remover de favoritos' : label}
    >
      <Heart
        size={20}
        className={isFavorite ? 'fill-current' : ''}
      />
    </button>
  );
}

interface FavoriteIndicatorProps {
  count?: number;
  className?: string;
}

/**
 * Favorite indicator badge showing number of favorite products
 */
export function FavoriteIndicator({
  count = 0,
  className = ''
}: FavoriteIndicatorProps) {
  if (!count || count <= 0) return null;

  return (
    <div className={`
      inline-flex items-center gap-1 px-2 py-1
      bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300
      rounded-full text-xs font-semibold
      ${className}
    `}>
      <Heart size={12} className="fill-current" />
      <span>{count}</span>
    </div>
  );
}
