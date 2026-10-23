import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ShieldX, ArrowLeft } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  const { role, user } = useAuth();

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
      <Card padding="lg" style={{ maxWidth: '500px', width: '100%' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-error-bg)',
            color: 'var(--color-error)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-3)',
          }}
        >
          <ShieldX size={32} />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
          Access Restricted
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.925rem', marginTop: 'var(--space-2)', lineHeight: 1.6 }}>
          The requested page is reserved for authorized campus operations staff and administrators.
          Your authenticated account (<code>{user?.email}</code>) currently has the role of <strong>{role || 'student'}</strong>.
        </p>

        <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'center' }}>
          <Link to="/student">
            <Button variant="primary" size="md">
              <ArrowLeft size={16} />
              Return to Student Portal
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
