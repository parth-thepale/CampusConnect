import type { AiDraft, AiTriage, Category, DuplicateCandidate, ImageProblemDetection, Metrics, OpsPulse, ProblemAnalytics, Role, SessionUser, Ticket, TicketStatus } from './types';

const sessionKey = 'campusconnect-session';
const envBase = (import.meta as unknown as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE;
const API_BASE = envBase ?? (typeof window !== 'undefined' && window.location.hostname.includes('web.app') ? 'https://dry-dingos-bow.loca.lt' : '');

export interface StoredSession { token: string; user: SessionUser }

export function getStoredSession(): StoredSession | null {
  try { return JSON.parse(localStorage.getItem(sessionKey) ?? 'null') as StoredSession | null; } catch { return null; }
}

export function storeSession(session: StoredSession | null) {
  if (session) localStorage.setItem(sessionKey, JSON.stringify(session));
  else localStorage.removeItem(sessionKey);
}

class ApiError extends Error { constructor(message: string) { super(message); this.name = 'ApiError'; } }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getStoredSession();
  const targetUrl = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const response = await fetch(targetUrl, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new ApiError(payload.error?.message ?? 'Something went wrong. Please try again.');
  return payload;
}

export const api = {
  login: (email: string, password: string) => request<StoredSession>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (data: { name: string; email: string; password: string; role: Role; faceData?: string }) => request<StoredSession>('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  gatewayStatus: () => request<{ gateway: string; status: string; protocol: string; activeSessions: number; stats: { status: string; totalUsers: number; roleBreakdown: Record<string, number> } }>('/api/auth/gateway-status'),
  faceLogin: (identifier: string, faceData?: string) => request<StoredSession>('/api/auth/face-login', { method: 'POST', body: JSON.stringify({ identifier, faceData }) }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: SessionUser }>('/api/auth/me'),
  tickets: () => request<{ tickets: Ticket[] }>('/api/tickets'),
  analyze: (description: string, locationId?: string, photo?: { data: string; mimeType: string }) => request<{ draft: AiDraft; source: 'gemini' | 'local' }>('/api/ai/analyze', { method: 'POST', body: JSON.stringify({ description, locationId, photo }) }),
  detectFromImage: (photo: { data: string; mimeType: string; name?: string; hint?: string }) => request<{ detection: ImageProblemDetection; source: 'gemini' | 'local' }>('/api/ai/detect-from-image', { method: 'POST', body: JSON.stringify({ photo }) }),
  autoWrite: (input: { type: 'issue' | 'resolution' | 'note' | 'general' | 'feedback'; text?: string; category?: string; location?: string; summary?: string }) => request<{ text: string; source: 'gemini' | 'local' }>('/api/ai/auto-write', { method: 'POST', body: JSON.stringify(input) }),
  chat: (message: string, history: { role: 'user' | 'assistant'; text: string }[]) => request<{ reply: string; source: 'gemini' | 'local' }>('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message, history }) }),
  duplicatePreview: (description: string, category: Category, locationId: string) => request<{ candidates: DuplicateCandidate[]; comparison: { candidateId: string | null; confidence: 'low' | 'medium' | 'high'; reasons: string[]; source: 'gemini' | 'local' } }>('/api/ai/duplicate-preview', { method: 'POST', body: JSON.stringify({ description, category, locationId }) }),
  createTicket: (input: { originalText: string; summary: string; category: Category; locationId: string; location: string; photoName?: string; photoData?: string; candidates: DuplicateCandidate[] }) => request<{ ticket: Ticket }>('/api/tickets', { method: 'POST', body: JSON.stringify(input) }),
  updateTicket: (id: string, input: { status?: TicketStatus; assignee?: string; resolutionNote?: string; note?: string }) => request<{ ticket: Ticket }>(`/api/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  submitFeedback: (id: string, input: { rating: number; satisfaction?: 'exceptional' | 'good' | 'average' | 'poor'; comment?: string; tags?: string[] }) => request<{ ticket: Ticket }>(`/api/tickets/${id}/feedback`, { method: 'POST', body: JSON.stringify(input) }),
  reviewDuplicate: (id: string, input: { candidateId: string; decision: 'confirmed_duplicate' | 'not_duplicate' | 'needs_investigation'; reasons: string }) => request<{ ticket: Ticket }>(`/api/tickets/${id}/duplicate-review`, { method: 'POST', body: JSON.stringify(input) }),
  triageTicket: (id: string) => request<{ triage: AiTriage; source: 'gemini' | 'local' }>(`/api/tickets/${id}/ai-triage`, { method: 'POST' }),
  metrics: () => request<{ metrics: Metrics }>('/api/metrics'),
  analytics: () => request<{ analytics: ProblemAnalytics }>('/api/analytics'),
  operationsPulse: () => request<{ pulse: OpsPulse; source: 'gemini' | 'local' }>('/api/ai/operations-pulse'),
  routingRules: () => request<{ rules: { id: string; category: Category; department: string; evidence: string; isDemo: number; active: number }[] }>('/api/routing-rules'),
};

export const accountExamples: { label: string; email: string; password: string; role: Role }[] = [
  { label: 'Student', email: 'student@campusconnect.local', password: 'campus123', role: 'student' },
  { label: 'Staff', email: 'staff@campusconnect.local', password: 'campus123', role: 'staff' },
  { label: 'Admin', email: 'admin@campusconnect.local', password: 'campus123', role: 'admin' },
];
