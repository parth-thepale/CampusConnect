import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: 'var(--space-6) var(--space-4)',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--max-content-width)',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-2)',
          fontSize: '0.8125rem',
          color: 'var(--color-text-muted)',
          textAlign: 'center',
        }}
      >
        <div>
          <strong>CampusConnect</strong> &copy; {new Date().getFullYear()} &bull; Campus Issue Reporting &amp; Accountable Resolution Platform
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <span>Deterministic Ticket Lifecycle</span>
          <span>&bull;</span>
          <span>Advisory Gemini AI</span>
          <span>&bull;</span>
          <span>Cloud Firestore Persistence</span>
        </div>
      </div>
    </footer>
  );
};
