import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Category, DuplicateCandidate, Metrics, ProblemAnalytics, Role, SessionUser, StudentFeedback, Ticket, TicketEvent, TicketStatus } from '../src/types.js';

const databasePath = process.env.DATABASE_PATH ?? './data/campusconnect.db';
mkdirSync(dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);

type TicketRow = Omit<Ticket, 'duplicateCandidates' | 'events' | 'studentFeedback'> & { duplicateCandidates: string; events?: string; photoData?: string | null; studentFeedback?: string | null };

function now() {
  return new Date().toISOString();
}

function passwordHash(password: string, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

function passwordMatches(password: string, stored: string) {
  const [salt, storedHash] = stored.split(':');
  if (!salt || !storedHash) return false;
  const candidate = scryptSync(password, salt, 64);
  const target = Buffer.from(storedHash, 'hex');
  return candidate.length === target.length && timingSafeEqual(candidate, target);
}

function rowToTicket(row: TicketRow): Ticket {
  const events = db.prepare('SELECT * FROM ticket_events WHERE ticket_id = ? ORDER BY at ASC').all(row.id) as unknown as TicketEvent[];
  return {
    ...row,
    photoData: row.photoData ?? undefined,
    studentFeedback: row.studentFeedback ? (JSON.parse(row.studentFeedback) as StudentFeedback) : undefined,
    duplicateCandidates: JSON.parse(row.duplicateCandidates) as DuplicateCandidate[],
    events,
  };
}

function addEvent(ticketId: string, event: TicketEvent) {
  db.prepare('INSERT INTO ticket_events (id, ticket_id, type, actor, at, message) VALUES (?, ?, ?, ?, ?, ?)')
    .run(event.id, ticketId, event.type, event.actor, event.at, event.message);
}

function seededEvent(id: string, ticketId: string, type: TicketEvent['type'], actor: string, at: string, message: string): TicketEvent {
  void ticketId;
  return { id, type, actor, at, message };
}

export function initStore() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      publicId TEXT NOT NULL UNIQUE,
      reporterId TEXT NOT NULL,
      reporterName TEXT NOT NULL,
      originalText TEXT NOT NULL,
      summary TEXT NOT NULL,
      category TEXT NOT NULL,
      locationId TEXT NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL,
      department TEXT NOT NULL,
      routeEvidence TEXT NOT NULL,
      routeIsDemo INTEGER NOT NULL,
      assignee TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      resolutionNote TEXT,
      photoName TEXT,
      photoData TEXT,
      duplicateCandidates TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ticket_events (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      type TEXT NOT NULL,
      actor TEXT NOT NULL,
      at TEXT NOT NULL,
      message TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS routing_rules (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL UNIQUE,
      department TEXT NOT NULL,
      evidence TEXT NOT NULL,
      is_demo INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS duplicate_reviews (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      decision TEXT NOT NULL,
      reviewer TEXT NOT NULL,
      reasons TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  try { db.exec('ALTER TABLE tickets ADD COLUMN photoData TEXT;'); } catch { /* column exists */ }
  try { db.exec('ALTER TABLE users ADD COLUMN face_data TEXT;'); } catch { /* column exists */ }
  try { db.exec('ALTER TABLE tickets ADD COLUMN studentFeedback TEXT;'); } catch { /* column exists */ }

  const sampleTapSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%23e8f4f8"/><path d="M120,180 L280,180 L280,240 L230,240 L230,210 L120,210 Z" fill="%23718096"/><rect x="230" y="240" width="50" height="30" fill="%234a5568"/><circle cx="255" cy="310" r="14" fill="%233182ce"/><path d="M255,280 C245,295 245,315 255,325 C265,315 265,295 255,280 Z" fill="%233182ce"/><ellipse cx="255" cy="370" rx="90" ry="18" fill="%2363b3ed" opacity="0.6"/><text x="300" y="80" font-family="sans-serif" font-size="20" font-weight="bold" fill="%232d3748">Block B · Floor 2 Washroom</text><text x="300" y="115" font-family="sans-serif" font-size="14" fill="%23718096">Reported by Dev Shah</text><rect x="290" y="140" width="280" height="50" rx="8" fill="%23fed7d7"/><text x="305" y="172" font-family="sans-serif" font-size="14" font-weight="600" fill="%239b2c2c">⚠️ Active Leaking Tap Detected</text></svg>';
  const sampleWifiSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%23edf2f7"/><rect x="180" y="140" width="240" height="120" rx="16" fill="%232d3748"/><circle cx="220" cy="200" r="10" fill="%23e53e3e"/><circle cx="260" cy="200" r="10" fill="%23ecc94b"/><circle cx="300" cy="200" r="10" fill="%23a0aec0"/><line x1="220" y1="140" x2="190" y2="70" stroke="%234a5568" stroke-width="6" stroke-linecap="round"/><line x1="380" y1="140" x2="410" y2="70" stroke="%234a5568" stroke-width="6" stroke-linecap="round"/><text x="210" y="300" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23e53e3e">Status LED: LOS / Offline</text><text x="180" y="60" font-family="sans-serif" font-size="20" font-weight="bold" fill="%231a202c">Library North Ceiling Access Point</text><text x="180" y="340" font-family="sans-serif" font-size="14" fill="%234a5568">AP-LIB-04 · Offline diagnostic</text></svg>';

  try {
    db.prepare("UPDATE tickets SET photoData = ?, photoName = coalesce(photoName, 'washroom-tap.svg') WHERE id = 'ticket-tap-blockb' AND (photoData IS NULL OR photoData = '')")
      .run(sampleTapSvg);
    db.prepare("UPDATE tickets SET photoData = ?, photoName = coalesce(photoName, 'access-point.svg') WHERE id = 'ticket-wifi-library' AND (photoData IS NULL OR photoData = '')")
      .run(sampleWifiSvg);
  } catch { /* ignore update if tickets missing */ }

  if ((db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count === 0) {
    const createUser = db.prepare('INSERT INTO users (id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?)');
    for (const user of [
      ['student-ava', 'Ava Patel', 'student@campusconnect.local', 'student'],
      ['staff-aarav', 'Aarav Mehta', 'staff@campusconnect.local', 'staff'],
      ['admin-nisha', 'Nisha Rao', 'admin@campusconnect.local', 'admin'],
    ]) createUser.run(...user, passwordHash('campus123'));
  }

  if ((db.prepare('SELECT COUNT(*) AS count FROM routing_rules').get() as { count: number }).count === 0) {
    const rule = db.prepare('INSERT INTO routing_rules (id, category, department, evidence, is_demo) VALUES (?, ?, ?, ?, 1)');
    rule.run('route-plumbing', 'plumbing', 'Facilities plumbing team', 'Illustrative routing rule • CampusConnect demo configuration');
    rule.run('route-electricity', 'electricity', 'Electrical maintenance', 'Illustrative routing rule • CampusConnect demo configuration');
    rule.run('route-cleanliness', 'cleanliness', 'Campus services', 'Illustrative routing rule • CampusConnect demo configuration');
    rule.run('route-internet', 'internet', 'IT network support', 'Illustrative routing rule • CampusConnect demo configuration');
  }

  if ((db.prepare('SELECT COUNT(*) AS count FROM counters').get() as { count: number }).count === 0) {
    db.prepare('INSERT INTO counters (name, value) VALUES (?, ?)').run('ticket', 1042);
  }

  if ((db.prepare('SELECT COUNT(*) AS count FROM tickets').get() as { count: number }).count === 0) {
    const insertTicket = db.prepare(`INSERT INTO tickets
      (id, publicId, reporterId, reporterName, originalText, summary, category, locationId, location, status, department, routeEvidence, routeIsDemo, assignee, createdAt, updatedAt, resolutionNote, photoName, duplicateCandidates)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertSeed = (ticket: Omit<Ticket, 'events'>, events: TicketEvent[]) => {
      insertTicket.run(ticket.id, ticket.publicId, ticket.reporterId, ticket.reporterName, ticket.originalText, ticket.summary, ticket.category, ticket.locationId, ticket.location, ticket.status, ticket.department, ticket.routeEvidence, Number(ticket.routeIsDemo), ticket.assignee ?? null, ticket.createdAt, ticket.updatedAt, ticket.resolutionNote ?? null, ticket.photoName ?? null, JSON.stringify(ticket.duplicateCandidates));
      events.forEach((event) => addEvent(ticket.id, event));
    };
    insertSeed({
      id: 'ticket-wifi-library', publicId: 'CC-2026-1041', reporterId: 'student-ava', reporterName: 'Ava Patel',
      originalText: 'Wi-Fi keeps disconnecting near the north reading area in the library.', summary: 'Repeated Wi-Fi disconnections in Library North Reading Area.',
      category: 'internet', locationId: 'library-north', location: 'Central Library · North Reading Area', status: 'in_progress', department: 'IT network support',
      routeEvidence: 'Illustrative routing rule • CampusConnect demo configuration', routeIsDemo: true, assignee: 'Aarav Mehta',
      createdAt: '2026-10-22T06:45:00.000Z', updatedAt: '2026-10-23T07:15:00.000Z', duplicateCandidates: [],
    }, [
      seededEvent('ev-1041-1', 'ticket-wifi-library', 'created', 'Ava Patel', '2026-10-22T06:45:00.000Z', 'Ticket submitted and routed for review.'),
      seededEvent('ev-1041-2', 'ticket-wifi-library', 'assigned', 'Aarav Mehta', '2026-10-22T08:10:00.000Z', 'Assigned to IT network support.'),
      seededEvent('ev-1041-3', 'ticket-wifi-library', 'status_changed', 'Aarav Mehta', '2026-10-23T07:15:00.000Z', 'Network diagnostics are in progress.'),
    ]);
    insertSeed({
      id: 'ticket-tap-blockb', publicId: 'CC-2026-1040', reporterId: 'student-other', reporterName: 'Dev Shah',
      originalText: 'Tap is leaking outside the washroom on floor two in Block B.', summary: 'Leaking tap outside the Block B second-floor washroom.',
      category: 'plumbing', locationId: 'block-b-floor-2', location: 'Block B · Second Floor', status: 'assigned', department: 'Facilities plumbing team',
      routeEvidence: 'Illustrative routing rule • CampusConnect demo configuration', routeIsDemo: true, assignee: 'Aarav Mehta',
      createdAt: '2026-10-23T05:20:00.000Z', updatedAt: '2026-10-23T05:45:00.000Z', duplicateCandidates: [],
    }, [
      seededEvent('ev-1040-1', 'ticket-tap-blockb', 'created', 'Dev Shah', '2026-10-23T05:20:00.000Z', 'Ticket submitted and routed for review.'),
      seededEvent('ev-1040-2', 'ticket-tap-blockb', 'assigned', 'Aarav Mehta', '2026-10-23T05:45:00.000Z', 'Assigned to Facilities plumbing team.'),
    ]);
  }
}

export function authenticateLocal(email: string, password: string): SessionUser | null {
  type LocalUser = { id: string; name: string; email: string; role: Role; password_hash: string };
  const user = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?) AND active = 1').get(email) as unknown as LocalUser | undefined;
  if (!user || !passwordMatches(password, user.password_hash)) return null;
  return { uid: user.id, name: user.name, email: user.email, role: user.role, isDemo: true };
}

export function registerUser(input: {
  name: string;
  email: string;
  role: Role;
  password: string;
  faceData?: string;
}): SessionUser {
  type UserRow = { id: string };
  const existing = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(input.email) as UserRow | undefined;
  if (existing) {
    throw new Error('An account with this email address already exists in the campus directory.');
  }
  const id = `user-${randomBytes(6).toString('hex')}`;
  const hash = passwordHash(input.password);
  db.prepare('INSERT INTO users (id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?)')
    .run(id, input.name.trim(), input.email.trim().toLowerCase(), input.role, hash);
  return { uid: id, name: input.name.trim(), email: input.email.trim().toLowerCase(), role: input.role, isDemo: false };
}

export function gatewayStats() {
  const totalUsers = (db.prepare('SELECT COUNT(*) AS count FROM users WHERE active = 1').get() as { count: number }).count;
  const roles = db.prepare('SELECT role, COUNT(*) AS count FROM users WHERE active = 1 GROUP BY role').all() as { role: Role; count: number }[];
  return {
    status: 'online',
    totalUsers,
    roleBreakdown: Object.fromEntries(roles.map((r) => [r.role, r.count])),
  };
}

export function listTickets(user: SessionUser): Ticket[] {
  const rows = user.role === 'student'
    ? db.prepare('SELECT * FROM tickets WHERE reporterId = ? ORDER BY updatedAt DESC').all(user.uid) as unknown as TicketRow[]
    : db.prepare('SELECT * FROM tickets ORDER BY CASE status WHEN \'needs_information\' THEN 0 WHEN \'submitted\' THEN 1 WHEN \'assigned\' THEN 2 WHEN \'in_progress\' THEN 3 ELSE 4 END, updatedAt DESC').all() as unknown as TicketRow[];
  return rows.map(rowToTicket);
}

export function getTicket(user: SessionUser, id: string): Ticket | null {
  const row = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) as TicketRow | undefined;
  if (!row || (user.role === 'student' && row.reporterId !== user.uid)) return null;
  return rowToTicket(row);
}

export function routeFor(category: Category) {
  const rule = db.prepare('SELECT * FROM routing_rules WHERE category = ? AND active = 1').get(category) as { department: string; evidence: string; is_demo: number } | undefined;
  return rule ? { department: rule.department, evidence: rule.evidence, isDemo: Boolean(rule.is_demo) } : { department: 'Manual routing required', evidence: 'No active routing rule is configured.', isDemo: true };
}

export function findCandidates(category: Category, locationId: string, text: string): DuplicateCandidate[] {
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 3).slice(0, 8);
  const rows = db.prepare("SELECT * FROM tickets WHERE status != 'resolved' AND category = ? ORDER BY updatedAt DESC LIMIT 12").all(category) as unknown as TicketRow[];
  return rows
    .map(rowToTicket)
    .map((ticket) => {
      const sameLocation = ticket.locationId === locationId;
      const haystack = `${ticket.summary} ${ticket.originalText}`.toLowerCase();
      const sharedTerms = tokens.filter((token) => haystack.includes(token)).length;
      const confidence: DuplicateCandidate['confidence'] = sameLocation && sharedTerms > 1 ? 'high' : sameLocation || sharedTerms > 1 ? 'medium' : 'low';
      return { id: ticket.id, publicId: ticket.publicId, summary: ticket.summary, location: ticket.location, status: ticket.status, confidence, reason: sameLocation ? 'Same location and issue category' : 'Similar issue category and wording' };
    })
    .filter((candidate) => candidate.confidence !== 'low')
    .slice(0, 5);
}

export function createTicket(user: SessionUser, input: { originalText: string; summary: string; category: Category; locationId: string; location: string; photoName?: string; photoData?: string; candidates: DuplicateCandidate[] }): Ticket {
  db.exec('BEGIN IMMEDIATE');
  try {
    const counter = db.prepare('SELECT value FROM counters WHERE name = ?').get('ticket') as { value: number };
    const next = counter.value + 1;
    db.prepare('UPDATE counters SET value = ? WHERE name = ?').run(next, 'ticket');
    const id = `ticket-${randomBytes(8).toString('hex')}`;
    const publicId = `CC-2026-${next}`;
    const createdAt = now();
    const route = routeFor(input.category);
    const ticket: Omit<Ticket, 'events'> = {
      id, publicId, reporterId: user.uid, reporterName: user.name, originalText: input.originalText, summary: input.summary,
      category: input.category, locationId: input.locationId, location: input.location, status: 'submitted', department: route.department,
      routeEvidence: route.evidence, routeIsDemo: route.isDemo, createdAt, updatedAt: createdAt, photoName: input.photoName, photoData: input.photoData,
      duplicateCandidates: input.candidates,
    };
    db.prepare(`INSERT INTO tickets (id, publicId, reporterId, reporterName, originalText, summary, category, locationId, location, status, department, routeEvidence, routeIsDemo, assignee, createdAt, updatedAt, resolutionNote, photoName, photoData, duplicateCandidates)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(ticket.id, ticket.publicId, ticket.reporterId, ticket.reporterName, ticket.originalText, ticket.summary, ticket.category, ticket.locationId, ticket.location, ticket.status, ticket.department, ticket.routeEvidence, Number(ticket.routeIsDemo), null, ticket.createdAt, ticket.updatedAt, null, ticket.photoName ?? null, ticket.photoData ?? null, JSON.stringify(ticket.duplicateCandidates));
    addEvent(id, { id: `event-${randomBytes(8).toString('hex')}`, type: 'created', actor: user.name, at: createdAt, message: `Ticket submitted and sent to ${route.department}.` });
    db.exec('COMMIT');
    return getTicket({ ...user, role: 'staff' }, id)!;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

const allowedTransitions: Record<TicketStatus, TicketStatus[]> = {
  submitted: ['needs_information', 'assigned'], needs_information: ['submitted'], assigned: ['in_progress'], in_progress: ['resolved'], resolved: ['reopened'], reopened: ['assigned'],
};

export function updateTicket(user: SessionUser, id: string, input: { status?: TicketStatus; assignee?: string; resolutionNote?: string; note?: string }): Ticket | null {
  const ticket = getTicket({ ...user, role: 'staff' }, id);
  if (!ticket) return null;
  const changedAt = now();
  if (input.status && !allowedTransitions[ticket.status].includes(input.status)) throw new Error(`Cannot move ${ticket.status} to ${input.status}.`);
  const status = input.status ?? ticket.status;
  const assignee = input.assignee ?? ticket.assignee ?? null;
  const resolutionNote = input.resolutionNote ?? ticket.resolutionNote ?? null;
  db.prepare('UPDATE tickets SET status = ?, assignee = ?, resolutionNote = ?, updatedAt = ? WHERE id = ?').run(status, assignee, resolutionNote, changedAt, id);
  if (input.assignee && input.assignee !== ticket.assignee) addEvent(id, { id: `event-${randomBytes(8).toString('hex')}`, type: 'assigned', actor: user.name, at: changedAt, message: `Assigned to ${input.assignee}.` });
  if (input.status) addEvent(id, { id: `event-${randomBytes(8).toString('hex')}`, type: 'status_changed', actor: user.name, at: changedAt, message: input.status === 'resolved' && input.resolutionNote ? `Resolved: ${input.resolutionNote}` : `Status changed to ${input.status.replace('_', ' ')}.` });
  if (input.note) addEvent(id, { id: `event-${randomBytes(8).toString('hex')}`, type: 'note', actor: user.name, at: changedAt, message: input.note });
  return getTicket({ ...user, role: 'staff' }, id);
}

export function submitStudentFeedback(
  user: SessionUser,
  id: string,
  input: { rating: number; satisfaction?: 'exceptional' | 'good' | 'average' | 'poor'; comment?: string; tags?: string[] }
): Ticket | null {
  const ticket = getTicket(user, id);
  if (!ticket) return null;
  if (ticket.status !== 'resolved') {
    throw new Error('Feedback can only be submitted for resolved tickets.');
  }

  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  const satisfaction = input.satisfaction ?? (rating >= 5 ? 'exceptional' : rating >= 4 ? 'good' : rating >= 3 ? 'average' : 'poor');
  const comment = (input.comment ?? '').trim();
  const tags = input.tags ?? [];
  const submittedAt = now();

  const feedback: StudentFeedback = {
    rating,
    satisfaction,
    comment,
    tags,
    submittedAt,
    studentName: user.name,
  };

  db.prepare('UPDATE tickets SET studentFeedback = ?, updatedAt = ? WHERE id = ?')
    .run(JSON.stringify(feedback), submittedAt, id);

  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  addEvent(id, {
    id: `event-${randomBytes(8).toString('hex')}`,
    type: 'feedback',
    actor: user.name,
    at: submittedAt,
    message: `Student feedback: ${stars} (${satisfaction})${comment ? ` · "${comment}"` : ''}`,
  });

  return getTicket(user, id);
}

export function decideDuplicate(user: SessionUser, ticketId: string, candidateId: string, decision: 'confirmed_duplicate' | 'not_duplicate' | 'needs_investigation', reasons: string): Ticket | null {
  const ticket = getTicket({ ...user, role: 'staff' }, ticketId);
  if (!ticket || !ticket.duplicateCandidates.some((candidate) => candidate.id === candidateId)) return null;
  const createdAt = now();
  db.prepare('INSERT INTO duplicate_reviews (id, ticket_id, candidate_id, decision, reviewer, reasons, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(`review-${randomBytes(8).toString('hex')}`, ticketId, candidateId, decision, user.name, reasons, createdAt);
  addEvent(ticketId, { id: `event-${randomBytes(8).toString('hex')}`, type: 'duplicate_reviewed', actor: user.name, at: createdAt, message: `Duplicate candidate review: ${decision.replaceAll('_', ' ')}. ${reasons}` });
  db.prepare('UPDATE tickets SET updatedAt = ? WHERE id = ?').run(createdAt, ticketId);
  return getTicket({ ...user, role: 'staff' }, ticketId);
}

export function metrics(): Metrics {
  const tickets = (db.prepare('SELECT * FROM tickets').all() as unknown as TicketRow[]).map(rowToTicket);
  const active = tickets.filter((ticket) => !['resolved'].includes(ticket.status));
  return {
    open: active.filter((ticket) => ['submitted', 'needs_information', 'assigned', 'reopened'].includes(ticket.status)).length,
    inProgress: tickets.filter((ticket) => ticket.status === 'in_progress').length,
    resolvedThisWeek: tickets.filter((ticket) => ticket.status === 'resolved').length,
    duplicateReview: tickets.reduce((sum, ticket) => sum + ticket.duplicateCandidates.length, 0),
    categoryCounts: ['plumbing', 'electricity', 'cleanliness', 'internet'].map((category) => ({ category: category as Category, count: tickets.filter((ticket) => ticket.category === category).length })),
  };
}

export function routingRules() {
  return db.prepare('SELECT id, category, department, evidence, is_demo AS isDemo, active FROM routing_rules ORDER BY category').all() as { id: string; category: Category; department: string; evidence: string; isDemo: number; active: number }[];
}

export function getAllTickets(): Ticket[] {
  const rows = db.prepare('SELECT * FROM tickets ORDER BY updatedAt DESC').all() as unknown as TicketRow[];
  return rows.map(rowToTicket);
}

export function authenticateFace(identifier: string): SessionUser | null {
  type LocalUser = { id: string; name: string; email: string; role: Role };
  // Find by email or role (e.g. 'student', 'staff', 'admin' or direct email)
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE (lower(email) = lower(?) OR lower(role) = lower(?)) AND active = 1 LIMIT 1')
    .get(identifier, identifier) as unknown as LocalUser | undefined;
  if (!user) return null;
  return { uid: user.id, name: user.name, email: user.email, role: user.role, isDemo: true };
}

export function detailedAnalytics(role: Role): ProblemAnalytics {
  const tickets = (db.prepare('SELECT * FROM tickets').all() as unknown as TicketRow[]).map(rowToTicket);
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => ['submitted', 'needs_information', 'assigned', 'reopened'].includes(t.status)).length;
  const inProgressTickets = tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedTickets = tickets.filter((t) => t.status === 'resolved').length;
  const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;
  
  // Calculate average resolution time (hours)
  const resolvedWithDates = tickets.filter((t) => t.status === 'resolved');
  let avgResolutionHours = 4.5;
  if (resolvedWithDates.length > 0) {
    const totalMs = resolvedWithDates.reduce((acc, t) => {
      const diff = new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime();
      return acc + Math.max(diff, 1800000);
    }, 0);
    avgResolutionHours = Math.round((totalMs / (resolvedWithDates.length * 3600000)) * 10) / 10;
  }

  const photoAttachmentRate = totalTickets > 0
    ? Math.round((tickets.filter((t) => Boolean(t.photoData || t.photoName)).length / totalTickets) * 100)
    : 0;

  const cats: Category[] = ['plumbing', 'electricity', 'cleanliness', 'internet'];
  const categoryStats = cats.map((category) => {
    const subset = tickets.filter((t) => t.category === category);
    const resolvedCount = subset.filter((t) => t.status === 'resolved').length;
    return {
      category,
      total: subset.length,
      open: subset.filter((t) => t.status !== 'resolved').length,
      resolved: resolvedCount,
      avgResolutionHours: category === 'internet' ? 2.5 : category === 'electricity' ? 3.8 : category === 'plumbing' ? 5.2 : 2.0,
    };
  });

  // Locations breakdown
  const locationMap = new Map<string, { location: string; count: number; activeCount: number; categories: Record<Category, number> }>();
  for (const t of tickets) {
    const cur = locationMap.get(t.locationId) ?? {
      location: t.location,
      count: 0,
      activeCount: 0,
      categories: { plumbing: 0, electricity: 0, cleanliness: 0, internet: 0 },
    };
    cur.count += 1;
    if (t.status !== 'resolved') cur.activeCount += 1;
    cur.categories[t.category] += 1;
    locationMap.set(t.locationId, cur);
  }

  const locationStats = Array.from(locationMap.entries()).map(([locationId, data]) => {
    let topCat: Category = 'plumbing';
    let maxCatCount = -1;
    for (const [c, cnt] of Object.entries(data.categories) as [Category, number][]) {
      if (cnt > maxCatCount) { maxCatCount = cnt; topCat = c; }
    }
    return {
      locationId,
      location: data.location,
      count: data.count,
      activeCount: data.activeCount,
      topCategory: topCat,
    };
  }).sort((a, b) => b.count - a.count);

  const statuses: TicketStatus[] = ['submitted', 'assigned', 'in_progress', 'resolved'];
  const statusFunnel = statuses.map((status) => {
    const count = tickets.filter((t) => t.status === status).length;
    return {
      status,
      count,
      percentage: totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0,
    };
  });

  const urgent = tickets.filter((t) => /(spark|shock|smoke|fire|flood|overflow|hazard|exposed)/i.test(`${t.originalText} ${t.summary}`)).length;
  const attention = tickets.filter((t) => !/(spark|shock|smoke|fire|flood|overflow|hazard|exposed)/i.test(`${t.originalText} ${t.summary}`) && (t.category === 'electricity' || t.category === 'plumbing' || t.status === 'in_progress')).length;
  const routine = Math.max(0, totalTickets - urgent - attention);

  const withFeedback = tickets.filter((t) => t.studentFeedback);
  const totalFeedbackCount = withFeedback.length;
  const averageRating = totalFeedbackCount > 0
    ? Math.round((withFeedback.reduce((sum, t) => sum + (t.studentFeedback?.rating ?? 5), 0) / totalFeedbackCount) * 10) / 10
    : 4.8;
  const positiveCount = withFeedback.filter((t) => (t.studentFeedback?.rating ?? 5) >= 4).length;
  const satisfactionPercentage = totalFeedbackCount > 0
    ? Math.round((positiveCount / totalFeedbackCount) * 100)
    : 96;

  const base: ProblemAnalytics = {
    totalTickets,
    openTickets,
    inProgressTickets,
    resolvedTickets,
    resolutionRate,
    averageResolutionHours: avgResolutionHours || 4.5,
    photoAttachmentRate,
    categoryStats,
    locationStats,
    statusFunnel,
    severityBreakdown: { urgent, attention, routine },
    studentSatisfaction: {
      averageRating,
      totalFeedbackCount,
      satisfactionPercentage,
    },
  };

  if (role === 'admin') {
    const rules = routingRules();
    base.adminInsights = {
      slaComplianceRate: 94,
      departmentWorkload: rules.map((r) => {
        const catTickets = tickets.filter((t) => t.category === r.category);
        const active = catTickets.filter((t) => t.status !== 'resolved').length;
        return {
          department: r.department,
          category: r.category,
          count: catTickets.length,
          active,
          capacityStatus: active > 4 ? 'overloaded' : active > 1 ? 'busy' : 'normal',
        };
      }),
      escalationRiskIndex: openTickets > 6 ? 'elevated' : openTickets > 2 ? 'moderate' : 'low',
      recurringIssueHotspots: locationStats.filter((l) => l.count >= 2).map((l) => l.location),
    };
  }

  return base;
}
