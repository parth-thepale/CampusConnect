import React, { useId } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCount?: boolean;
  maxLength?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, showCount, maxLength, id, value, className = '', required, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {label && (
            <label
              htmlFor={inputId}
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
              }}
            >
              {label}
              {required && <span style={{ color: 'var(--color-error)' }} aria-hidden="true">*</span>}
            </label>
          )}
          {showCount && maxLength && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {currentLength} / {maxLength}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          id={inputId}
          value={value}
          maxLength={maxLength}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          style={{
            padding: '0.625rem 0.875rem',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: '0.95rem',
            outline: 'none',
            minHeight: '110px',
            resize: 'vertical',
            width: '100%',
          }}
          className={`cc-textarea ${className}`}
          {...props}
        />
        {error && (
          <span id={errorId} style={{ fontSize: '0.8125rem', color: 'var(--color-error)', fontWeight: 500 }}>
            {error}
          </span>
        )}
        {!error && helperText && (
          <span id={helperId} style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
