import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 600,
      borderRadius: 'var(--radius-md)',
      transition: 'all var(--transition-fast)',
      border: '1px solid transparent',
      gap: 'var(--space-2)',
      cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
      opacity: disabled || isLoading ? 0.65 : 1,
      fontSize: size === 'sm' ? '0.875rem' : size === 'lg' ? '1.125rem' : '0.95rem',
      padding:
        size === 'sm'
          ? '0.375rem 0.75rem'
          : size === 'lg'
          ? '0.75rem 1.5rem'
          : '0.5rem 1.125rem',
    };

    let variantStyle: React.CSSProperties = {};
    if (variant === 'primary') {
      variantStyle = {
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-text-inverted)',
      };
    } else if (variant === 'secondary') {
      variantStyle = {
        backgroundColor: 'var(--color-surface-hover)',
        color: 'var(--color-text)',
        borderColor: 'var(--color-border)',
      };
    } else if (variant === 'outline') {
      variantStyle = {
        backgroundColor: 'transparent',
        color: 'var(--color-primary)',
        borderColor: 'var(--color-primary-border)',
      };
    } else if (variant === 'ghost') {
      variantStyle = {
        backgroundColor: 'transparent',
        color: 'var(--color-text-secondary)',
      };
    } else if (variant === 'danger') {
      variantStyle = {
        backgroundColor: 'var(--color-error)',
        color: 'var(--color-text-inverted)',
      };
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        style={{ ...baseStyle, ...variantStyle }}
        className={`cc-btn cc-btn-${variant} ${className}`}
        {...props}
      >
        {isLoading && (
          <span
            style={{
              display: 'inline-block',
              width: '1em',
              height: '1em',
              border: '2px solid currentColor',
              borderRightColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }}
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
