/**
 * Botão Primário com Cor Dinâmica
 * Usa a cor primária definida nas configurações
 * NOVO: Garante consistência de cores em toda a app
 */

import React from 'react';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const PrimaryButton = React.forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({
    variant = 'solid',
    size = 'md',
    loading = false,
    className = '',
    disabled,
    children,
    ...props
  }, ref) => {

    // Classes base
    const baseClasses = 'font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed';

    // Classes de tamanho
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-base'
    };

    // Classes de variante usando CSS custom properties
    const variantClasses = {
      solid: 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-700)] text-white shadow-md shadow-[var(--color-primary)]/10 hover:shadow-lg',
      outline: 'border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5',
      ghost: 'text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10'
    };

    const finalClassName = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={finalClassName}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

PrimaryButton.displayName = 'PrimaryButton';

export default PrimaryButton;
