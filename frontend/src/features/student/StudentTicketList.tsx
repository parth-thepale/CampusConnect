import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Ticket, PaginatedResult, TICKET_STATUSES, STATUS_LABELS } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CategoryBadge } from '../../components/ui/CategoryBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Alert } from '../../components/ui/Alert';
import { PlusCircle, Search, ArrowRight, ArrowLeft } from 'lucide-react';

export const StudentTicketList: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 15;

  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = async (currentOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<PaginatedResult<Ticket>>('/api/tickets', {
        params: {
          limit,
          offset: currentOffset,
        },
      });
      setTickets(res.items || []);
      setTotal(res.pagination?.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve your tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(offset);
  }, [offset]);

  // Client-side search and status filter over loaded records (honestly labelled per Section 11)
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = t.ticketNumber.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchLoc = t.location.toLowerCase().includes(q);
      if (!matchNum && !matchDesc && !matchLoc) return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text)' }}>
            My Complaint History
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginTop: 'var(--space-1)' }}>
            Review all tickets submitted from your account, tracking their progression from intake to resolution.
          </p>
        </div>
        <Link to="/student/report">
          <Button variant="primary">
            <PlusCircle size={18} />
            Report Issue
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <Card padding="sm">
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 240px', minWidth: '200px' }}>
            <Input
              placeholder="Search by ticket #, description, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              helperText={searchQuery ? 'Searching visible loaded page records' : undefined}
            />
          </div>

          <div style={{ width: '200px' }}>
            <Select
              placeholder="All Statuses"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={TICKET_STATUSES.map((st) => ({
                value: st,
                label: STATUS_LABELS[st],
              }))}
            />
          </div>
        </div>
      </Card>

      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Ticket List Table / Cards */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Skeleton height="80px" />
          <Skeleton height="80px" />
          <Skeleton height="80px" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching tickets found"
          description={
            tickets.length === 0
              ? 'You have not submitted any complaints yet. Create your first report to get started.'
              : 'Try clearing your search query or status filter to see other records.'
          }
          actionLabel={tickets.length === 0 ? 'Report Issue' : undefined}
          onAction={tickets.length === 0 ? () => window.location.assign('/student/report') : undefined}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filteredTickets.map((t) => (
            <Card key={t.ticketId} padding="md">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <Link
                      to={`/student/tickets/${t.ticketId}`}
                      style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.05rem' }}
                    >
                      {t.ticketNumber}
                    </Link>
                    <StatusBadge status={t.status} size="sm" />
                    <CategoryBadge category={t.category} size="sm" />
                  </div>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    Created: {new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <p style={{ fontSize: '0.925rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {t.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Location: <strong>{t.location}</strong>
                  </span>
                  <Link
                    to={`/student/tickets/${t.ticketId}`}
                    style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}
                  >
                    View Status &amp; Timeline <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </Card>
          ))}

          {/* Pagination Controls */}
          {total > limit && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3) 0' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
              >
                <ArrowLeft size={14} />
                Previous
              </Button>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Showing {offset + 1} - {Math.min(offset + limit, total)} of {total}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
              >
                Next
                <ArrowRight size={14} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
