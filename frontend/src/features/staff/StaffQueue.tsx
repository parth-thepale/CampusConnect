import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import {
  Ticket,
  PaginatedResult,
  TICKET_STATUSES,
  STATUS_LABELS,
  SUPPORTED_CATEGORIES,
  CATEGORY_LABELS,
} from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CategoryBadge } from '../../components/ui/CategoryBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Alert } from '../../components/ui/Alert';
import { ShieldAlert, RefreshCw, ArrowRight, ArrowLeft } from 'lucide-react';

export const StaffQueue: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Filter parameters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaffQueue = async (currentOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<PaginatedResult<Ticket>>('/api/staff/tickets', {
        params: {
          limit,
          offset: currentOffset,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
        },
      });
      setTickets(res.items || []);
      setTotal(res.pagination?.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load staff operations queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOffset(0);
    fetchStaffQueue(0);
  }, [statusFilter, categoryFilter]);

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    fetchStaffQueue(newOffset);
  };

  // Filter visible records by search query
  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.ticketNumber.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q) ||
      (t.assignedToUid && t.assignedToUid.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <ShieldAlert size={22} color="var(--color-primary)" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Campus Operations Queue
            </h1>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginTop: 'var(--space-1)' }}>
            Triage incoming facility reports, dispatch technicians, and manage resolution lifecycles.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => fetchStaffQueue(offset)} isLoading={loading}>
          <RefreshCw size={14} /> Refresh Queue
        </Button>
      </div>

      {/* Filter and Query Bar */}
      <Card padding="md">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
          <Input
            placeholder="Search visible tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            helperText={searchQuery ? 'Searching loaded queue records' : undefined}
          />

          <Select
            placeholder="All Statuses"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={TICKET_STATUSES.map((st) => ({
              value: st,
              label: STATUS_LABELS[st],
            }))}
          />

          <Select
            placeholder="All Categories"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={SUPPORTED_CATEGORIES.map((cat) => ({
              value: cat,
              label: CATEGORY_LABELS[cat],
            }))}
          />
        </div>
      </Card>

      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Operations Queue Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Skeleton height="60px" />
          <Skeleton height="60px" />
          <Skeleton height="60px" />
          <Skeleton height="60px" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No operational tickets found"
          description={
            statusFilter || categoryFilter
              ? 'No tickets match the selected status or category filters.'
              : 'The facilities queue is currently clear! Check back when new reports are submitted.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Found <strong>{total}</strong> campus tickets in queue
          </div>

          {filteredTickets.map((t) => (
            <Card key={t.ticketId} padding="md">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <Link
                      to={`/staff/tickets/${t.ticketId}`}
                      style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.05rem' }}
                    >
                      {t.ticketNumber}
                    </Link>
                    <StatusBadge status={t.status} size="sm" />
                    <CategoryBadge category={t.category} size="sm" />
                  </div>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    Created: {new Date(t.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>

                <p style={{ fontSize: '0.925rem', color: 'var(--color-text)', lineHeight: 1.5 }}>
                  {t.description}
                </p>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 'var(--space-3)',
                    borderTop: '1px solid var(--color-border-subtle)',
                    paddingTop: 'var(--space-2)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: '0.85rem', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                    <span>Location: <strong>{t.location}</strong></span>
                    <span>Assignee: <strong>{t.assignedToUid || 'Unassigned'}</strong></span>
                  </div>

                  <Link to={`/staff/tickets/${t.ticketId}`}>
                    <Button variant="primary" size="sm">
                      Inspect &amp; Triage
                      <ArrowRight size={14} />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}

          {/* Pagination */}
          {total > limit && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3) 0' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.max(0, offset - limit))}
                disabled={offset === 0}
              >
                <ArrowLeft size={14} />
                Previous Page
              </Button>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)} ({total} total)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(offset + limit)}
                disabled={offset + limit >= total}
              >
                Next Page
                <ArrowRight size={14} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
