import React from 'react';
import { TicketStatus, STATUS_LABELS } from '../../types';

export interface StatusBadgeProps {
  status: TicketStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      className={`cc-badge cc-badge-${status}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: size === 'sm' ? '0.125rem 0.5rem' : '0.25rem 0.75rem',
        borderRadius: 'var(--radius-full)',
        fontSize: size === 'sm' ? '0.75rem' : '0.8125rem',
        fontWeight: 600,
        textTransform: 'capitalize',
        backgroundColor: `var(--status-${status}-bg, #f1f5f9)`,
        color: `var(--status-${status}-text, #334155)`,
        border: `1px solid var(--status-${status}-border, #cbd5e1)`,
        lineHeight: 1.4,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
        }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
};
