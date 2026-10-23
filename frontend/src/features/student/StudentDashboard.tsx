import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../../lib/api-client';
import { Ticket, PaginatedResult } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CategoryBadge } from '../../components/ui/CategoryBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Alert } from '../../components/ui/Alert';
import { PlusCircle, ClipboardList, Clock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<PaginatedResult<Ticket>>('/api/tickets', {
        params: { limit: 10, offset: 0 },
      });
      setTickets(res.items || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load your campus tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Compute metrics exclusively from the student's real records
  const totalCount = tickets.length;
  const activeCount = tickets.filter(
    (t) => t.status === 'submitted' || t.status === 'acknowledged' || t.status === 'assigned' || t.status === 'in_progress'
  ).length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;
  const blockedCount = tickets.filter((t) => t.status === 'blocked').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top Banner Greeting */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          backgroundColor: 'var(--color-surface)',
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Student Issue Portal
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text)', marginTop: 'var(--space-1)' }}>
              Hello, {profile?.displayName || user?.email?.split('@')[0] || 'Student'}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginTop: 'var(--space-1)' }}>
              Report facility malfunctions, plumbing issues, electrical faults, or internet outages across campus.
            </p>
          </div>

          <Link to="/student/report">
            <Button variant="primary" size="lg">
              <PlusCircle size={18} />
              Report New Issue
            </Button>
          </Link>
        </div>

        {/* Real Metrics Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
            marginTop: 'var(--space-2)',
          }}
        >
          <Card padding="md">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClipboardList size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                  Your Total Tickets
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
                  {loading ? '...' : totalCount}
                </div>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--status-in_progress-bg)',
                  color: 'var(--status-in_progress-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                  Active &amp; In Progress
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
                  {loading ? '...' : activeCount}
                </div>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--status-resolved-bg)',
                  color: 'var(--status-resolved-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                  Resolved Issues
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
                  {loading ? '...' : resolvedCount}
                </div>
              </div>
            </div>
          </Card>

          {blockedCount > 0 && (
            <Card padding="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--status-blocked-bg)',
                    color: 'var(--status-blocked-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertCircle size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                    Blocked / Awaiting Parts
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
                    {blockedCount}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Recent Tickets Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
            Recent Complaints &amp; Status
          </h2>
          {tickets.length > 0 && (
            <Link to="/student/tickets" style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              View all tickets <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Skeleton height="72px" />
            <Skeleton height="72px" />
            <Skeleton height="72px" />
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No campus issues reported yet"
            description="When you encounter a facility problem like broken taps, power outages, or Wi-Fi drops, report it here to trigger accountable resolution."
            actionLabel="Report Your First Issue"
            onAction={() => window.location.assign('/student/report')}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {tickets.slice(0, 5).map((t) => (
              <Card key={t.ticketId} padding="md">
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <Link
                        to={`/student/tickets/${t.ticketId}`}
                        style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1rem' }}
                      >
                        {t.ticketNumber}
                      </Link>
                      <StatusBadge status={t.status} size="sm" />
                      <CategoryBadge category={t.category} size="sm" />
                    </div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      {new Date(t.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {t.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-1)' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      Location: <strong>{t.location}</strong>
                    </span>
                    <Link
                      to={`/student/tickets/${t.ticketId}`}
                      style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}
                    >
                      View Details &amp; Timeline <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
