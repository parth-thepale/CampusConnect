import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  const icons = {
    info: <Info size={18} color="var(--color-info)" />,
    success: <CheckCircle size={18} color="var(--color-success)" />,
    warning: <AlertTriangle size={18} color="var(--color-warning)" />,
    error: <AlertCircle size={18} color="var(--color-error)" />,
  };

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: `var(--color-${type}-bg)`,
        border: `1px solid var(--color-${type}-border)`,
        color: 'var(--color-text)',
        fontSize: '0.9rem',
      }}
      className={`cc-alert cc-alert-${type} ${className}`}
    >
      <div style={{ flexShrink: 0, marginTop: '2px' }}>{icons[type]}</div>
      <div style={{ flex: 1 }}>
        {title && (
          <div style={{ fontWeight: 600, marginBottom: 'var(--space-1)', color: `var(--color-${type})` }}>
            {title}
          </div>
        )}
        <div style={{ lineHeight: 1.5 }}>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss alert"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: '2px',
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
