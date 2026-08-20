import React, { ReactNode } from 'react';

interface TouchFriendlyButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

/**
 * Touch-friendly button optimized for mobile devices
 * Minimum touch target size: 44x44px per accessibility standards
 * Fase 5A Item 4: Mobile Responsiveness
 */
export function TouchFriendlyButton({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}: TouchFriendlyButtonProps) {
  const sizeClasses = {
    sm: 'px-2 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm min-h-11', // 44px height for touch accessibility
    lg: 'px-6 py-3 text-base min-h-12' // 48px height
  };

  const variantClasses = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };

  return (
    <button
      className={`
        rounded-lg font-medium transition-colors
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        active:scale-95 transition-transform
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}

interface MobileMenuItemProps {
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: string | number;
}

/**
 * Mobile-optimized menu item with touch-friendly sizing
 * Minimum 44px height for accessibility
 */
export function MobileMenuItem({
  icon,
  label,
  onClick,
  active = false,
  badge
}: MobileMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full px-4 py-3 min-h-11
        flex items-center gap-3
        text-left text-sm
        rounded-lg
        transition-colors
        ${active
          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
        }
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Mobile-optimized drawer/side panel
 * Slides in from the side on mobile devices
 */
export function MobileDrawer({
  isOpen,
  onClose,
  title,
  children
}: MobileDrawerProps) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 bottom-0 w-full max-w-sm
          bg-white dark:bg-slate-900
          z-50 lg:hidden
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col
          shadow-lg
        `}
      >
        {/* Header */}
        {title && (
          <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>
      </div>
    </>
  );
}

interface MobileCardProps {
  children: ReactNode;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Mobile-optimized card component
 * Provides proper spacing and touch targets for mobile interaction
 */
export function MobileCard({
  children,
  interactive = false,
  onClick,
  className = ''
}: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-slate-900
        rounded-lg border border-slate-100 dark:border-slate-800
        p-4 sm:p-6
        transition-all
        ${interactive ? 'active:scale-95 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface ResponsiveImageProps {
  src: string;
  alt: string;
  sizes?: {
    mobile?: string;
    sm?: string;
    lg?: string;
  };
  className?: string;
}

/**
 * Responsive image component with optimized sizes for mobile
 */
export function ResponsiveImage({
  src,
  alt,
  sizes,
  className = ''
}: ResponsiveImageProps) {
  const defaultSizes = sizes || {
    mobile: '100vw',
    sm: '(min-width: 640px) 50vw',
    lg: '(min-width: 1024px) 33vw'
  };

  const sizesAttr = `
    ${defaultSizes.mobile},
    ${defaultSizes.sm},
    ${defaultSizes.lg}
  `;

  return (
    <img
      src={src}
      alt={alt}
      sizes={sizesAttr}
      className={`
        w-full h-auto
        object-cover
        ${className}
      `}
    />
  );
}
