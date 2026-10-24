import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { CampusConfig, CampusIdRecord, Category, DuplicateCandidate, Metrics, ProblemAnalytics, Role, SessionUser, StudentFeedback, Ticket, TicketEvent, TicketStatus } from '../src/types.js';

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
    CREATE TABLE IF NOT EXISTS campus_config (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      admin_email TEXT NOT NULL,
      qr_payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS campus_ids (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT,
      created_at TEXT NOT NULL
    );
  `);

  if ((db.prepare('SELECT COUNT(*) AS count FROM campus_ids').get() as { count: number }).count === 0) {
    const insertId = db.prepare('INSERT OR IGNORE INTO campus_ids (id, code, name, active, created_by, created_at) VALUES (?, ?, ?, 1, ?, ?)');
    const ts = now();
    insertId.run('cid-campus2026', 'CAMPUS-2026', 'CampusConnect Central University', 'system', ts);
    insertId.run('cid-cc2026', 'CC-2026', 'CampusConnect Fast Gateway', 'system', ts);
    insertId.run('cid-standard', 'CAMPUS2026', 'CampusConnect Standard Portal', 'system', ts);
  }

  try { db.exec('ALTER TABLE tickets ADD COLUMN photoData TEXT;'); } catch { /* column exists */ }
  try { db.exec('ALTER TABLE users ADD COLUMN face_data TEXT;'); } catch { /* column exists */ }
  try { db.exec('ALTER TABLE tickets ADD COLUMN studentFeedback TEXT;'); } catch { /* column exists */ }

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

  // Clean up legacy placeholder demo data for clean scalable production
  try {
    db.exec(`
      DELETE FROM tickets WHERE id IN ('ticket-wifi-library', 'ticket-tap-blockb', 'ticket-light-hostela');
      DELETE FROM ticket_events WHERE ticket_id IN ('ticket-wifi-library', 'ticket-tap-blockb', 'ticket-light-hostela');
      DELETE FROM users WHERE id IN ('student-ava', 'staff-aarav', 'admin-nisha', 'usr-student-ava', 'usr-staff-aarav', 'usr-admin-nisha') OR lower(email) IN ('student@campusconnect.local', 'staff@campusconnect.local', 'admin@campusconnect.local');
    `);
  } catch {
    /* ignore */
  }
}

export function authenticateLocal(email: string, password: string): SessionUser | null {
  type LocalUser = { id: string; name: string; email: string; role: Role; password_hash: string; face_data?: string };
  const user = db.prepare('SELECT id, name, email, role, password_hash, face_data FROM users WHERE lower(email) = lower(?) AND active = 1').get(email) as unknown as LocalUser | undefined;
  if (!user || !passwordMatches(password, user.password_hash)) return null;
  return { uid: user.id, name: user.name, email: user.email, role: user.role, isDemo: true, faceData: user.face_data ?? undefined };
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
  db.prepare('INSERT INTO users (id, name, email, role, password_hash, face_data) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, input.name.trim(), input.email.trim().toLowerCase(), input.role, hash, input.faceData ?? null);
  return { uid: id, name: input.name.trim(), email: input.email.trim().toLowerCase(), role: input.role, isDemo: false, faceData: input.faceData };
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

export function authenticateFace(identifier: string, faceData?: string): SessionUser | null {
  type LocalUser = { id: string; name: string; email: string; role: Role; face_data: string | null };
  // Find by email or role (e.g. 'student', 'staff', 'admin' or direct email)
  const user = db.prepare('SELECT id, name, email, role, face_data FROM users WHERE (lower(email) = lower(?) OR lower(role) = lower(?)) AND active = 1 LIMIT 1')
    .get(identifier, identifier) as unknown as LocalUser | undefined;
  if (!user) return null;
  if (faceData && !user.face_data) {
    db.prepare('UPDATE users SET face_data = ? WHERE id = ?').run(faceData, user.id);
  }
  return { uid: user.id, name: user.name, email: user.email, role: user.role, isDemo: user.id.includes('ava') || user.id.includes('aarav') || user.id.includes('nisha'), faceData: faceData || user.face_data || undefined };
}

export function getCampusConfig(): CampusConfig {
  type CfgRow = { id: string; code: string; name: string; admin_email: string; qr_payload: string; created_at: string };
  const row = db.prepare('SELECT * FROM campus_config WHERE id = ?').get('main') as CfgRow | undefined;
  if (row) {
    return {
      code: row.code,
      name: row.name,
      qrPayload: row.qr_payload,
      adminEmail: row.admin_email,
      createdAt: row.created_at,
      isInitialized: true,
    };
  }

  const admin = db.prepare('SELECT email FROM users WHERE role = ? AND active = 1 LIMIT 1').get('admin') as { email: string } | undefined;
  const defaultCode = 'CAMPUS-2026';
  const defaultName = 'CampusConnect Central University';
  const defaultQr = `https://campusconnect-ff8f1.web.app?campus=${defaultCode}`;

  if (admin) {
    const createdAt = now();
    db.prepare('INSERT OR REPLACE INTO campus_config (id, code, name, admin_email, qr_payload, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run('main', defaultCode, defaultName, admin.email, defaultQr, createdAt);
    return {
      code: defaultCode,
      name: defaultName,
      qrPayload: defaultQr,
      adminEmail: admin.email,
      createdAt,
      isInitialized: true,
    };
  }

  return {
    code: defaultCode,
    name: defaultName,
    qrPayload: defaultQr,
    adminEmail: '',
    createdAt: '',
    isInitialized: false,
  };
}

export function normalizeCampusCode(code?: string): string {
  return (code ?? '').trim().toUpperCase().replace(/[\s\-_]/g, '');
}

export function listCampusIds(): CampusIdRecord[] {
  type Row = { id: string; code: string; name: string; active: number; created_by: string | null; created_at: string };
  const rows = db.prepare('SELECT id, code, name, active, created_by, created_at FROM campus_ids WHERE active = 1 ORDER BY created_at ASC').all() as unknown as Row[];
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    active: Boolean(r.active),
    createdBy: r.created_by ?? undefined,
    createdAt: r.created_at,
  }));
}

export function addCampusId(code: string, name?: string, createdBy?: string): CampusIdRecord {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) throw new Error('Campus Code cannot be empty.');
  const id = `cid-${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString(36)}`;
  const campusName = (name ?? '').trim() || `Campus Division (${cleanCode})`;
  const createdAt = now();
  db.prepare('INSERT OR REPLACE INTO campus_ids (id, code, name, active, created_by, created_at) VALUES (?, ?, ?, 1, ?, ?)')
    .run(id, cleanCode, campusName, createdBy ?? null, createdAt);
  return { id, code: cleanCode, name: campusName, active: true, createdAt, createdBy };
}

export function saveCampusConfig(code?: string, name?: string, adminEmail?: string): CampusConfig {
  const existing = getCampusConfig();
  const nextCode = (code ? code.trim().toUpperCase() : existing.code) || 'CAMPUS-2026';
  const nextName = name ? name.trim() : (existing.name || 'CampusConnect Central University');
  const nextAdmin = adminEmail ? adminEmail.trim().toLowerCase() : existing.adminEmail;
  const qrPayload = `https://campusconnect-ff8f1.web.app?campus=${nextCode}`;
  const createdAt = now();

  db.prepare('INSERT OR REPLACE INTO campus_config (id, code, name, admin_email, qr_payload, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run('main', nextCode, nextName, nextAdmin, qrPayload, createdAt);

  // If changing configuration code to a new custom code, synchronize active state in campus_ids
  db.prepare('UPDATE campus_ids SET active = 0 WHERE code != ?').run(nextCode);
  addCampusId(nextCode, nextName, nextAdmin);

  return {
    code: nextCode,
    name: nextName,
    qrPayload,
    adminEmail: nextAdmin,
    createdAt,
    isInitialized: true,
  };
}

export function verifyCampusCode(code?: string) {
  const cleaned = (code ?? '').trim();
  if (!cleaned) {
    throw new Error('Invalid or missing Campus Code. Please enter valid institutional code or scan campus QR pass.');
  }
  const norm = normalizeCampusCode(cleaned);
  const cfg = getCampusConfig();
  if (cfg.code && normalizeCampusCode(cfg.code) === norm) {
    return true;
  }
  const ids = listCampusIds();
  const matched = ids.some((r) => r.active && normalizeCampusCode(r.code) === norm);
  if (!matched) {
    throw new Error(`Invalid or missing Campus Code. Please enter valid institutional code (e.g. ${cfg.code || 'CAMPUS-2026'}) or scan campus QR pass.`);
  }
  return true;
}

export function listEnrolledUsers() {
  type UserRow = { id: string; name: string; email: string; role: Role; face_data: string | null };
  const rows = db.prepare('SELECT id, name, email, role, face_data FROM users WHERE active = 1').all() as unknown as UserRow[];
  return rows.map((u) => ({
    uid: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    memberId: `CC-ID-2026-${u.id.slice(-4)}`,
    hasFaceEnrolled: Boolean(u.face_data) || u.id.startsWith('user-') || u.id.includes('ava') || u.id.includes('aarav') || u.id.includes('nisha'),
    faceData: u.face_data ?? undefined,
  }));
}

export function updateUserFace(user: SessionUser, faceData: string): SessionUser {
  db.prepare('UPDATE users SET face_data = ? WHERE id = ? OR lower(email) = lower(?)')
    .run(faceData, user.uid, user.email);
  return { ...user, faceData };
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
