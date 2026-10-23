import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../../lib/api-client';
import {
  Ticket,
  TicketEvent,
  TicketStatus,
  ALLOWED_STATUS_TRANSITIONS,
  STATUS_LABELS,
  DuplicateCandidate,
} from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CategoryBadge } from '../../components/ui/CategoryBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Alert } from '../../components/ui/Alert';
import {
  ArrowLeft,
  UserCheck,
  Clock,
  Sparkles,
  Building,
  RefreshCw,
  ExternalLink,
  Send,
} from 'lucide-react';

export const StaffTicketDetail: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Status transition form state
  const [nextStatus, setNextStatus] = useState<string>('');
  const [statusNote, setStatusNote] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Assignment form state
  const [assigneeUid, setAssigneeUid] = useState('');
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);

  // Staff note form state
  const [staffNote, setStaffNote] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(true);
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // AI Duplicate candidate review state
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateCandidate[] | null>(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const fetchTicketAndEvents = async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const [ticketData, eventData] = await Promise.all([
        apiClient.get<Ticket>(`/api/tickets/${ticketId}`),
        apiClient.get<TicketEvent[]>(`/api/tickets/${ticketId}/events`),
      ]);
      setTicket(ticketData);
      setEvents(eventData || []);
      if (ticketData.assignedToUid) {
        setAssigneeUid(ticketData.assignedToUid);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketAndEvents();
  }, [ticketId]);

  // Handle Status Update (Section 15)
  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !nextStatus) return;

    if (nextStatus === 'resolved' && statusNote.trim().length < 5) {
      setError('A meaningful resolution note (at least 5 characters) is required when marking a ticket as resolved.');
      return;
    }

    setStatusSubmitting(true);
    setError(null);
    setActionSuccess(null);
    try {
      const updated = await apiClient.patch<Ticket>(`/api/staff/tickets/${ticket.ticketId}/status`, {
        status: nextStatus as TicketStatus,
        note: statusNote.trim() || undefined,
      });

      setTicket(updated);
      setNextStatus('');
      setStatusNote('');
      setActionSuccess(`Ticket status updated to ${STATUS_LABELS[updated.status]}.`);

      // Refresh event timeline
      const freshEvents = await apiClient.get<TicketEvent[]>(`/api/tickets/${ticket.ticketId}/events`);
      setEvents(freshEvents);
    } catch (err: any) {
      setError(err?.message || 'Failed to update ticket status.');
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Handle Assignment (Section 14)
  const handleAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !assigneeUid.trim()) return;

    setAssignmentSubmitting(true);
    setError(null);
    setActionSuccess(null);
    try {
      const updated = await apiClient.patch<Ticket>(
        `/api/staff/tickets/${ticket.ticketId}/assignment`,
        { assignedToUid: assigneeUid.trim() }
      );

      setTicket(updated);
      setActionSuccess(`Ticket successfully assigned to ${assigneeUid.trim()}.`);

      // Refresh event timeline
      const freshEvents = await apiClient.get<TicketEvent[]>(`/api/tickets/${ticket.ticketId}/events`);
      setEvents(freshEvents);
    } catch (err: any) {
      setError(err?.message || 'Failed to assign ticket.');
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  // Handle Staff Note (Section 16)
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !staffNote.trim()) return;

    setNoteSubmitting(true);
    setError(null);
    setActionSuccess(null);
    try {
      await apiClient.post(`/api/staff/tickets/${ticket.ticketId}/notes`, {
        note: staffNote.trim(),
        isInternal: isInternalNote,
      });

      setStaffNote('');
      setActionSuccess('Operational note added to ticket history.');

      // Refresh event timeline
      const freshEvents = await apiClient.get<TicketEvent[]>(`/api/tickets/${ticket.ticketId}/events`);
      setEvents(freshEvents);
    } catch (err: any) {
      setError(err?.message || 'Failed to add note.');
    } finally {
      setNoteSubmitting(false);
    }
  };

  // Handle AI Duplicate Check on Demand (Section 17)
  const handleCheckDuplicates = async () => {
    if (!ticket) return;
    setDuplicateLoading(true);
    setDuplicateError(null);
    try {
      const res = await apiClient.get<{
        ticketId: string;
        candidateCount: number;
        candidates: DuplicateCandidate[];
      }>(`/api/staff/tickets/${ticket.ticketId}/duplicates`);

      setDuplicateCandidates(res.candidates || []);
    } catch (err: any) {
      setDuplicateError(err?.message || 'AI duplicate candidate analysis failed or is temporarily unavailable.');
    } finally {
      setDuplicateLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Skeleton height="36px" width="240px" />
        <Skeleton height="200px" />
        <Skeleton height="260px" />
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Link to="/staff" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: '0.9rem', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Staff Queue
        </Link>
        <Alert type="error" title="Ticket Error">
          {error}
        </Alert>
      </div>
    );
  }

  if (!ticket) return null;

  const validNextStatuses = ALLOWED_STATUS_TRANSITIONS[ticket.status] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Navigation Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          to="/staff"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: '0.9rem', fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Back to Operations Queue
        </Link>
        <Button variant="ghost" size="sm" onClick={fetchTicketAndEvents}>
          <RefreshCw size={14} /> Refresh Ticket
        </Button>
      </div>

      {actionSuccess && (
        <Alert type="success" onClose={() => setActionSuccess(null)}>
          {actionSuccess}
        </Alert>
      )}

      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Primary Details Card */}
      <Card padding="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                Operational Ticket Record
              </span>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)', marginTop: 'var(--space-1)' }}>
                {ticket.ticketNumber}
              </h1>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <StatusBadge status={ticket.status} size="md" />
              <CategoryBadge category={ticket.category} size="md" />
            </div>
          </div>

          <div
            style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface-hover)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
              Reported Problem Description
            </div>
            <p style={{ fontSize: '0.95rem', color: 'var(--color-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {ticket.description}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
            <div>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', display: 'block' }}>Campus Location</span>
              <strong style={{ fontSize: '0.95rem' }}>{ticket.location}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', display: 'block' }}>Current Assignee</span>
              <strong style={{ fontSize: '0.95rem' }}>{ticket.assignedToUid || 'Unassigned'}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', display: 'block' }}>Reported On</span>
              <span style={{ fontSize: '0.95rem' }}>{new Date(ticket.createdAt).toLocaleString()}</span>
            </div>

            <div>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', display: 'block' }}>Last Updated</span>
              <span style={{ fontSize: '0.95rem' }}>{new Date(ticket.updatedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Department Routing Provenance (Section 18) */}
          {ticket.departmentSuggestion && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface-hover)',
                fontSize: '0.85rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Building size={16} />
              <span>
                Department Routing Suggestion: <strong>{ticket.departmentSuggestion}</strong>
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                (Demo routing rule — not yet verified as official campus policy)
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Operational Actions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
        {/* 1. Status Transition Panel (Section 15) */}
        <Card padding="md">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
            Update Ticket Status
          </h2>

          {validNextStatuses.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              No further transitions are permitted from <strong>{STATUS_LABELS[ticket.status]}</strong>.
            </p>
          ) : (
            <form onSubmit={handleStatusTransition} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Select
                label="Target Status"
                required
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value)}
                options={validNextStatuses.map((st) => ({
                  value: st,
                  label: STATUS_LABELS[st],
                }))}
                placeholder="-- Select Valid Next State --"
              />

              <Input
                label={nextStatus === 'resolved' ? 'Resolution Note (Required, min 5 chars)' : 'Transition Note (Optional)'}
                required={nextStatus === 'resolved'}
                placeholder={nextStatus === 'resolved' ? 'e.g., Replaced washer and verified no further leaks.' : 'Optional explanation...'}
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={statusSubmitting}
                disabled={!nextStatus}
                style={{ width: '100%' }}
              >
                Execute Transition
              </Button>
            </form>
          )}
        </Card>

        {/* 2. Assignment Panel (Section 14) */}
        <Card padding="md">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
            Ticket Assignment
          </h2>

          <form onSubmit={handleAssignment} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Input
              label="Assignee Staff UID"
              required
              placeholder="e.g., staff_plumber_01"
              value={assigneeUid}
              onChange={(e) => setAssigneeUid(e.target.value)}
              helperText="Enter the authorized staff technician UID"
            />

            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {user && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAssigneeUid(user.uid)}
                >
                  <UserCheck size={14} />
                  Assign to Me
                </Button>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={assignmentSubmitting}
              disabled={!assigneeUid.trim()}
              style={{ width: '100%' }}
            >
              Update Assignee
            </Button>
          </form>
        </Card>
      </div>

      {/* Staff Notes & AI Duplicate Candidates */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
        {/* 3. Add Operational Staff Note (Section 16) */}
        <Card padding="md">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
            Add Operational Note
          </h2>

          <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Textarea
              label="Staff Note"
              required
              rows={3}
              placeholder="Record observations, parts ordered, or team communications..."
              value={staffNote}
              onChange={(e) => setStaffNote(e.target.value)}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isInternalNote}
                onChange={(e) => setIsInternalNote(e.target.checked)}
              />
              <span style={{ fontWeight: 500 }}>
                Internal Staff Note (Redacted from student views)
              </span>
            </label>

            <Button
              type="submit"
              variant="secondary"
              size="md"
              isLoading={noteSubmitting}
              disabled={!staffNote.trim()}
            >
              <Send size={14} />
              Add Note
            </Button>
          </form>
        </Card>

        {/* 4. AI Duplicate Candidate Assessment (Section 17) */}
        <Card padding="md">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Sparkles size={18} color="var(--color-primary)" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                Duplicate Candidate Review
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckDuplicates}
              isLoading={duplicateLoading}
            >
              Check for Related Reports
            </Button>
          </div>

          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
            Advisory Gemini evaluation of recent tickets in this category. Possible matches aid staff triage; tickets are never automatically merged or closed.
          </p>

          {duplicateError && (
            <Alert type="warning" onClose={() => setDuplicateError(null)}>
              {duplicateError}
            </Alert>
          )}

          {duplicateCandidates === null ? (
            <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Press &ldquo;Check for Related Reports&rdquo; to analyze duplicate candidates with Gemini AI.
            </div>
          ) : duplicateCandidates.length === 0 ? (
            <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              No related reports found for this ticket.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {duplicateCandidates.map((c) => (
                <div
                  key={c.ticketId}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface-hover)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link
                      to={`/staff/tickets/${c.ticketId}`}
                      style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}
                    >
                      {c.ticketNumber} <ExternalLink size={12} />
                    </Link>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {Math.round(c.similarityScore * 100)}% match
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                    {c.matchReason}
                  </p>

                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', alignItems: 'center' }}>
                    <StatusBadge status={c.status} size="sm" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Location: {c.location}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Full Chronological Operational History */}
      <Card padding="lg">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-4)' }}>
          Complete Operational Event History
        </h2>

        {events.length === 0 ? (
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            No event logs available.
          </p>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div
              style={{
                position: 'absolute',
                top: '10px',
                bottom: '10px',
                left: '11px',
                width: '2px',
                backgroundColor: 'var(--color-border)',
                zIndex: 0,
              }}
            />

            {events.map((evt) => {
              const isInternal = !!evt.metadata?.isInternal;

              return (
                <div key={evt.eventId} style={{ position: 'relative', zIndex: 1 }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-24px',
                      top: '2px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-surface)',
                      border: `2px solid ${isInternal ? 'var(--color-warning)' : 'var(--color-primary)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Clock size={12} />
                  </div>

                  <div
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isInternal ? 'var(--color-warning-bg)' : 'transparent',
                      border: isInternal ? '1px dashed var(--color-warning-border)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                          {evt.eventType.replace(/_/g, ' ')}
                        </span>
                        {isInternal && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: 'var(--color-warning)',
                              color: 'var(--color-text-inverted)',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                            }}
                          >
                            Internal Staff Note
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {new Date(evt.timestamp).toLocaleString()} &bull; Actor: {evt.actorUid}
                      </span>
                    </div>

                    {evt.metadata?.note && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                        {evt.metadata.note as string}
                      </p>
                    )}

                    {evt.metadata?.fromStatus && evt.metadata?.toStatus && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                        Transition: {(STATUS_LABELS as Record<string, string>)[evt.metadata.fromStatus as string] || evt.metadata.fromStatus} &rarr;{' '}
                        <strong>{(STATUS_LABELS as Record<string, string>)[evt.metadata.toStatus as string] || evt.metadata.toStatus}</strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
