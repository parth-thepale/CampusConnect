export const categories = ['plumbing', 'electricity', 'cleanliness', 'internet'] as const;
export const statuses = ['submitted', 'needs_information', 'assigned', 'in_progress', 'resolved', 'reopened'] as const;
export const roles = ['student', 'staff', 'admin'] as const;

export type Category = (typeof categories)[number];
export type TicketStatus = (typeof statuses)[number];
export type Role = (typeof roles)[number];

export interface CampusConfig {
  code: string;
  name: string;
  qrPayload: string;
  adminEmail: string;
  createdAt: string;
  isInitialized: boolean;
}

export interface CampusIdRecord {
  id: string;
  code: string;
  name: string;
  active: boolean;
  createdAt: string;
  createdBy?: string;
}

export interface SessionUser {
  uid: string;
  name: string;
  email: string;
  role: Role;
  isDemo?: boolean;
  faceData?: string;
  memberId?: string;
  hasFaceEnrolled?: boolean;
}

export interface TicketEvent {
  id: string;
  type: 'created' | 'clarified' | 'assigned' | 'status_changed' | 'note' | 'duplicate_reviewed' | 'feedback';
  actor: string;
  at: string;
  message: string;
}

export interface StudentFeedback {
  rating: number; // 1 to 5
  satisfaction: 'exceptional' | 'good' | 'average' | 'poor';
  comment: string;
  tags?: string[];
  submittedAt: string;
  studentName?: string;
}

export interface DuplicateCandidate {
  id: string;
  publicId: string;
  summary: string;
  location: string;
  status: TicketStatus;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface Ticket {
  id: string;
  publicId: string;
  reporterId: string;
  reporterName: string;
  originalText: string;
  summary: string;
  category: Category;
  locationId: string;
  location: string;
  status: TicketStatus;
  department: string;
  routeEvidence: string;
  routeIsDemo: boolean;
  assignee?: string;
  createdAt: string;
  updatedAt: string;
  resolutionNote?: string;
  studentFeedback?: StudentFeedback;
  photoName?: string;
  photoData?: string;
  duplicateCandidates: DuplicateCandidate[];
  events: TicketEvent[];
}

export interface ImageProblemDetection {
  category: Category;
  summary: string;
  description: string;
  confidence: 'low' | 'medium' | 'high';
  severity: 'routine' | 'attention' | 'urgent';
  detectedObjects: string[];
  suggestedAction?: string;
  safetyRisk?: string;
}

export interface CampusBuilding {
  id: string;
  name: string;
  code: string;
  type: 'hostel' | 'academic' | 'library' | 'dining' | 'hub';
  coordinates: { x: number; y: number; z: number };
  mapPosition: { x: number; y: number };
  floors: string[];
}

export interface TechnicianTrack {
  id: string;
  name: string;
  role: string;
  assignedBuildingId: string;
  assignedBuildingName: string;
  status: 'on_site' | 'en_route' | 'diagnostics' | 'available';
  etaMinutes?: number;
  activeTicketId?: string;
  activeProblem?: string;
  activeCategory?: Category;
  phone?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  accessLevel?: 'staff' | 'admin';
}

export interface ProblemAnalytics {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  resolutionRate: number;
  averageResolutionHours: number;
  photoAttachmentRate: number;
  categoryStats: {
    category: Category;
    total: number;
    open: number;
    resolved: number;
    avgResolutionHours: number;
  }[];
  locationStats: {
    locationId: string;
    location: string;
    count: number;
    activeCount: number;
    topCategory: Category;
  }[];
  statusFunnel: {
    status: TicketStatus;
    count: number;
    percentage: number;
  }[];
  severityBreakdown: {
    urgent: number;
    attention: number;
    routine: number;
  };
  studentSatisfaction?: {
    averageRating: number;
    totalFeedbackCount: number;
    satisfactionPercentage: number;
  };
  adminInsights?: {
    slaComplianceRate: number;
    departmentWorkload: {
      department: string;
      category: Category;
      count: number;
      active: number;
      capacityStatus: 'normal' | 'busy' | 'overloaded';
    }[];
    escalationRiskIndex: 'low' | 'moderate' | 'elevated';
    recurringIssueHotspots: string[];
  };
}

export interface AiDraft {
  summary: string;
  category: Category;
  confidence: 'low' | 'medium' | 'high';
  clarityScore: number;
  reviewChecks: string[];
  missingFields: ('location' | 'details')[];
  clarificationQuestion?: string;
  photoObservation?: string;
  safetyNote: string;
}

export interface AiTriage {
  priority: 'routine' | 'attention' | 'urgent';
  confidence: 'low' | 'medium' | 'high';
  staffBrief: string;
  suggestedChecks: string[];
  riskFlags: string[];
  reporterUpdate: string;
}

export interface OpsPulse {
  headline: string;
  summary: string;
  suggestedActions: string[];
  watchItem: string;
}

export interface Metrics {
  open: number;
  inProgress: number;
  resolvedThisWeek: number;
  duplicateReview: number;
  categoryCounts: { category: Category; count: number }[];
}
