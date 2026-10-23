import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  style,
  className = '',
  ...props
}) => {
  const pStyle =
    padding === 'none'
      ? '0'
      : padding === 'sm'
      ? 'var(--space-3)'
      : padding === 'lg'
      ? 'var(--space-6)'
      : 'var(--space-5)';

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        padding: pStyle,
        ...style,
      }}
      className={`cc-card ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
