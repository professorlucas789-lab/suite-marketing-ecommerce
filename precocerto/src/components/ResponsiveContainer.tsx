import React from 'react';
import { ReactNode } from 'react';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Responsive container component that provides consistent responsive behavior
 * Ensures proper padding and margins across all screen sizes
 * Fase 5A Item 4: Mobile Responsiveness
 */
export function ResponsiveContainer({
  children,
  className = ''
}: ResponsiveContainerProps) {
  return (
    <div className={`
      w-full
      px-4 sm:px-6 lg:px-8
      py-4 sm:py-6 lg:py-8
      max-w-7xl mx-auto
      ${className}
    `}>
      {children}
    </div>
  );
}

interface ResponsiveGridProps {
  children: ReactNode;
  columns?: {
    mobile?: number;
    sm?: number;
    lg?: number;
  };
  gap?: 'compact' | 'normal' | 'spacious';
  className?: string;
}

/**
 * Responsive grid component with flexible column configuration
 * Default: 1 column on mobile, 2 on tablet, 3+ on desktop
 */
export function ResponsiveGrid({
  children,
  columns = { mobile: 1, sm: 2, lg: 3 },
  gap = 'normal',
  className = ''
}: ResponsiveGridProps) {
  const gapClasses = {
    compact: 'gap-2 sm:gap-3 lg:gap-4',
    normal: 'gap-4 sm:gap-5 lg:gap-6',
    spacious: 'gap-6 sm:gap-8 lg:gap-10'
  };

  const colsClasses = `
    grid grid-cols-${columns.mobile}
    ${columns.sm ? `sm:grid-cols-${columns.sm}` : ''}
    ${columns.lg ? `lg:grid-cols-${columns.lg}` : ''}
  `.trim();

  return (
    <div className={`
      ${colsClasses}
      ${gapClasses[gap]}
      ${className}
    `}>
      {children}
    </div>
  );
}

interface ResponsiveStackProps {
  children: ReactNode;
  direction?: 'row' | 'col';
  gap?: 'compact' | 'normal' | 'spacious';
  className?: string;
}

/**
 * Responsive stack that switches between row and column layouts
 * Useful for responsive forms and layouts
 */
export function ResponsiveStack({
  children,
  direction = 'col',
  gap = 'normal',
  className = ''
}: ResponsiveStackProps) {
  const gapClasses = {
    compact: 'gap-2 sm:gap-3 lg:gap-4',
    normal: 'gap-4 sm:gap-5 lg:gap-6',
    spacious: 'gap-6 sm:gap-8 lg:gap-10'
  };

  const directionClass = direction === 'row' ? 'flex-row' : 'flex-col';

  return (
    <div className={`
      flex
      ${directionClass}
      flex-wrap
      ${gapClasses[gap]}
      ${className}
    `}>
      {children}
    </div>
  );
}

interface ResponsiveButtonGroupProps {
  children: ReactNode;
  stacked?: boolean;
  className?: string;
}

/**
 * Responsive button group that stacks on mobile and arranges horizontally on desktop
 */
export function ResponsiveButtonGroup({
  children,
  stacked = true,
  className = ''
}: ResponsiveButtonGroupProps) {
  return (
    <div className={`
      flex
      ${stacked ? 'flex-col sm:flex-row' : 'flex-row'}
      gap-2 sm:gap-3
      w-full sm:w-auto
      ${className}
    `}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, {
              className: (child.props.className || '') + ' flex-1 sm:flex-none'
            })
          : child
      )}
    </div>
  );
}
