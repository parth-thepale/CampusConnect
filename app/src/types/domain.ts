/**
 * CampusConnect Domain Types & State Machine
 */

export type Role = 'student' | 'staff' | 'admin';

export const SUPPORTED_CATEGORIES = [
  'plumbing',
  'electricity',
  'cleanliness',
  'internet_connectivity',
] as const;

export type Category = typeof SUPPORTED_CATEGORIES[number];

/**
 * Normalizes input string to supported Category enum or returns null if invalid.
 * Handles space vs underscore variants (e.g. "internet connectivity" -> "internet_connectivity").
 */
export function normalizeCategory(input: unknown): Category | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (SUPPORTED_CATEGORIES.includes(cleaned as Category)) {
    return cleaned as Category;
  }
  return null;
}

export const TICKET_STATUSES = [
  'submitted',
  'acknowledged',
  'assigned',
  'in_progress',
  'blocked',
  'resolved',
  'reopened',
] as const;

export type TicketStatus = typeof TICKET_STATUSES[number];

export const INTAKE_STATUSES = [
  'draft',
  'ready_for_confirmation',
  'confirmed',
] as const;

export type IntakeStatus = typeof INTAKE_STATUSES[number];

/**
 * Deterministic status transitions matrix.
 * Enforces valid lifecycle progression per project specification.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  submitted: ['acknowledged', 'assigned', 'in_progress'],
  acknowledged: ['assigned', 'in_progress', 'resolved'],
  assigned: ['in_progress', 'blocked', 'resolved'],
  in_progress: ['blocked', 'resolved'],
  blocked: ['assigned', 'in_progress', 'resolved'],
  resolved: ['reopened'],
  reopened: ['assigned', 'in_progress', 'resolved'],
};

export function isValidStatusTransition(from: TicketStatus, to: TicketStatus): boolean {
  if (from === to) return false;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export type TicketEventType =
  | 'ticket_created'
  | 'ticket_acknowledged'
  | 'ticket_assigned'
  | 'status_changed'
  | 'staff_note_added'
  | 'ticket_resolved'
  | 'ticket_reopened';

export interface User {
  uid: string;
  email?: string;
  displayName?: string;
  role: Role;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Intake {
  intakeId: string;
  createdByUid: string;
  description: string;
  location?: string;
  category?: Category;
  additionalDetails?: Record<string, unknown>;
  attachments?: string[];
  status: IntakeStatus;
  ticketId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  ticketId: string;
  ticketNumber: string;
  createdByUid: string;
  intakeId?: string;
  description: string;
  location: string;
  category: Category;
  departmentSuggestion?: string;
  assignedToUid?: string;
  status: TicketStatus;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface TicketEvent {
  eventId: string;
  ticketId: string;
  eventType: TicketEventType;
  actorUid: string;
  timestamp: string;
  metadata?: {
    fromStatus?: TicketStatus;
    toStatus?: TicketStatus;
    assignedToUid?: string;
    note?: string;
    isInternal?: boolean;
    [key: string]: unknown;
  };
}
