import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Ticket, TicketEvent, STATUS_LABELS } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CategoryBadge } from '../../components/ui/CategoryBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Alert } from '../../components/ui/Alert';
import {
  ArrowLeft,
  Clock,
  MapPin,
  CheckCircle2,
  Calendar,
  MessageSquare,
  UserCheck,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';

export const StudentTicketDetail: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err?.message || 'Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketAndEvents();
  }, [ticketId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Skeleton height="36px" width="240px" />
        <Skeleton height="180px" />
        <Skeleton height="260px" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Link to="/student/tickets" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: '0.9rem', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to My Tickets
        </Link>
        <Alert type="error" title="Ticket Not Found or Access Restricted">
          {error || 'The requested ticket could not be found or you do not have permission to view it.'}
        </Alert>
      </div>
    );
  }

  // Defensive check: internal staff notes must never be rendered to students (Section 12)
  const visibleEvents = events.filter((e) => !e.metadata?.isInternal);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Back Link & Refresh Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          to="/student/tickets"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: '0.9rem', fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Back to My Tickets
        </Link>
        <Button variant="ghost" size="sm" onClick={fetchTicketAndEvents}>
          <RefreshCw size={14} /> Refresh Status
        </Button>
      </div>

      {/* Ticket Header Summary Card */}
      <Card padding="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                Campus Ticket Record
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
              Complaint Description
            </div>
            <p style={{ fontSize: '0.95rem', color: 'var(--color-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {ticket.description}
            </p>
          </div>

          {/* Key Ticket Attributes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.875rem' }}>
              <MapPin size={16} color="var(--color-primary)" />
              <span>Location: <strong>{ticket.location}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.875rem' }}>
              <Calendar size={16} color="var(--color-text-muted)" />
              <span>Submitted: {new Date(ticket.createdAt).toLocaleString()}</span>
            </div>

            {ticket.assignedToUid && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.875rem' }}>
                <UserCheck size={16} color="var(--status-assigned-text)" />
                <span>Assigned for repairs</span>
              </div>
            )}
          </div>

          {/* Resolution Card if resolved */}
          {ticket.status === 'resolved' && (
            <div
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-success-bg)',
                border: '1px solid var(--color-success-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-success)', fontWeight: 700 }}>
                <CheckCircle2 size={18} />
                <span>Resolved by Campus Staff</span>
              </div>
              {ticket.resolutionNote && (
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', marginTop: 'var(--space-1)' }}>
                  <strong>Resolution Note:</strong> {ticket.resolutionNote}
                </p>
              )}
              {ticket.resolvedAt && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                  Completed: {new Date(ticket.resolvedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Chronological Event Timeline */}
      <Card padding="lg">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-4)' }}>
          Status &amp; Repair Timeline
        </h2>

        {visibleEvents.length === 0 ? (
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            No status updates have been recorded yet.
          </p>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Timeline Vertical Guide Line */}
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

            {visibleEvents.map((evt) => {
              const dateStr = new Date(evt.timestamp).toLocaleString();

              let icon = <Clock size={14} />;
              let title = 'Ticket Update';
              let description = '';

              if (evt.eventType === 'ticket_created') {
                icon = <CheckCircle2 size={14} color="var(--color-primary)" />;
                title = 'Ticket Created & Registered';
                description = 'The complaint was successfully confirmed into the campus facilities backlog.';
              } else if (evt.eventType === 'ticket_acknowledged') {
                icon = <CheckCircle2 size={14} color="var(--status-acknowledged-text)" />;
                title = 'Acknowledged by Campus Operations';
                description = 'Staff reviewed the ticket and confirmed facility triage.';
              } else if (evt.eventType === 'ticket_assigned') {
                icon = <UserCheck size={14} color="var(--status-assigned-text)" />;
                title = 'Assigned to Maintenance Technician';
                description = 'An operational technician has been assigned to investigate.';
              } else if (evt.eventType === 'status_changed') {
                title = `Status Changed to ${(STATUS_LABELS as Record<string, string>)[evt.metadata?.toStatus as string] || evt.metadata?.toStatus}`;
                if (evt.metadata?.note) {
                  description = evt.metadata.note as string;
                }
              } else if (evt.eventType === 'staff_note_added') {
                icon = <MessageSquare size={14} color="var(--color-info)" />;
                title = 'Operational Update Added';
                description = (evt.metadata?.note as string) || '';
              } else if (evt.eventType === 'ticket_resolved') {
                icon = <CheckCircle2 size={14} color="var(--color-success)" />;
                title = 'Issue Resolved';
                description = (evt.metadata?.note as string) || 'Facility repair has been confirmed completed.';
              } else if (evt.eventType === 'ticket_reopened') {
                icon = <RotateCcw size={14} color="var(--status-reopened-text)" />;
                title = 'Ticket Reopened';
                description = (evt.metadata?.note as string) || 'The issue was reopened for further inspection.';
              }

              return (
                <div key={evt.eventId} style={{ position: 'relative', zIndex: 1 }}>
                  {/* Timeline dot */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-24px',
                      top: '2px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-surface)',
                      border: '2px solid var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {icon}
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--color-text)' }}>
                        {title}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {dateStr}
                      </span>
                    </div>
                    {description && (
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                        {description}
                      </p>
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
