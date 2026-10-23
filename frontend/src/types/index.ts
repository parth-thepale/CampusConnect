/**
 * CampusConnect Frontend Domain & API Type Contracts
 * Synchronized strictly with backend domain types in app/src/types/
 */

export type Role = 'student' | 'staff' | 'admin';

export const SUPPORTED_CATEGORIES = [
  'plumbing',
  'electricity',
  'cleanliness',
  'internet_connectivity',
] as const;

export type Category = typeof SUPPORTED_CATEGORIES[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  plumbing: 'Plumbing & Water',
  electricity: 'Electrical & Power',
  cleanliness: 'Cleanliness & Sanitation',
  internet_connectivity: 'Internet & Connectivity',
};

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

export const STATUS_LABELS: Record<TicketStatus, string> = {
  submitted: 'Submitted',
  acknowledged: 'Acknowledged',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  resolved: 'Resolved',
  reopened: 'Reopened',
};

export const ALLOWED_STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  submitted: ['acknowledged', 'assigned', 'in_progress'],
  acknowledged: ['assigned', 'in_progress', 'resolved'],
  assigned: ['in_progress', 'blocked', 'resolved'],
  in_progress: ['blocked', 'resolved'],
  blocked: ['assigned', 'in_progress', 'resolved'],
  resolved: ['reopened'],
  reopened: ['assigned', 'in_progress', 'resolved'],
};

export type IntakeStatus = 'draft' | 'ready_for_confirmation' | 'confirmed';

export type TicketEventType =
  | 'ticket_created'
  | 'ticket_acknowledged'
  | 'ticket_assigned'
  | 'status_changed'
  | 'staff_note_added'
  | 'ticket_resolved'
  | 'ticket_reopened';

export interface UserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  role: Role;
  createdAt?: string;
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

export interface LocationExtraction {
  building?: string;
  floor?: string;
  room?: string;
  specificArea?: string;
  rawMentioned?: string;
}

export interface MissingInfoIndicator {
  field: 'location' | 'category' | 'details' | 'specific_problem';
  reason: string;
}

export interface ClarificationQuestion {
  questionText: string;
  targetField: string;
}

export interface DepartmentRoutingSuggestion {
  department: string;
  reason: string;
  ruleProvenance: string;
  isDemoRule: boolean;
}

export interface DuplicateCandidate {
  ticketId: string;
  ticketNumber: string;
  category: Category;
  location: string;
  status: TicketStatus;
  similarityScore: number; // 0.0 - 1.0
  matchReason: string;
  createdAt: string;
}

export interface AiDraftAnalysisResult {
  title: string;
  summary: string;
  extractedLocation?: LocationExtraction;
  suggestedCategory?: Category;
  missingFields: MissingInfoIndicator[];
  clarifyingQuestion?: ClarificationQuestion;
  routingSuggestion?: DepartmentRoutingSuggestion;
  confidence: number;
}

export interface Pagination {
  limit: number;
  offset: number;
  total: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: Pagination;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
