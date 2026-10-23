import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-10) var(--space-4)',
        minHeight: '60vh',
        textAlign: 'center',
      }}
    >
      <Card padding="lg" style={{ maxWidth: '480px', width: '100%' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary-subtle)',
            color: 'var(--color-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-3)',
          }}
        >
          <HelpCircle size={32} />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
          Page Not Found (404)
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.925rem', marginTop: 'var(--space-2)' }}>
          The requested page or resource could not be found. Please check the URL or navigate back home.
        </p>

        <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'center' }}>
          <Link to="/">
            <Button variant="primary" size="md">
              <ArrowLeft size={16} />
              Return Home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
