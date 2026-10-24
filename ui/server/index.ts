import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { analyzeComplaint, autoWriteText, chatWithAi, compareCandidates, detectProblemFromImage, operationsPulse, triageTicket } from './ai.js';
import { authenticateFace, authenticateLocal, createTicket, decideDuplicate, detailedAnalytics, findCandidates, gatewayStats, getAllTickets, getCampusConfig, getTicket, initStore, listEnrolledUsers, listTickets, metrics, registerUser, routingRules, saveCampusConfig, submitStudentFeedback, updateTicket, updateUserFace, verifyCampusCode } from './store.js';
import { categories, statuses, type Category, type SessionUser, type TicketStatus } from '../src/types.js';

initStore();

const app = express();
const port = Number(process.env.PORT ?? 3001);
const sessions = new Map<string, SessionUser>();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

declare module 'express-serve-static-core' { interface Request { user?: SessionUser } }

function sessionFromRequest(req: Request) {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  return token ? sessions.get(token) : undefined;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = sessionFromRequest(req);
  if (!user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' } });
  req.user = user;
  next();
}

function requireRole(...allowed: SessionUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowed.includes(req.user.role)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission for this action.' } });
    next();
  };
}

function valid<T>(schema: z.ZodType<T>, body: unknown, res: Response): T | null {
  const result = schema.safeParse(body);
  if (!result.success) { res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Please check the fields and try again.' } }); return null; }
  return result.data;
}

function routeId(req: Request) {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : value ?? '';
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  campusCode: z.string().optional(),
});
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['student', 'staff', 'admin']),
  faceData: z.string().optional(),
  campusCode: z.string().optional(),
});
const faceLoginSchema = z.object({ identifier: z.string().min(1), faceData: z.string().optional() });
const campusGenSchema = z.object({
  code: z.string().min(2).max(24).optional(),
  name: z.string().min(2).max(100).optional(),
});
const enrollFaceSchema = z.object({
  faceData: z.string().min(10),
});
const analyzeSchema = z.object({ description: z.string().min(4).max(1600), locationId: z.string().max(100).optional(), photo: z.object({ data: z.string().max(8_000_000), mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']) }).optional() });
const imageDetectSchema = z.object({
  photo: z.object({
    data: z.string().max(8_000_000),
    mimeType: z.string(),
    name: z.string().max(300).optional(),
    hint: z.string().max(500).optional(),
  }),
});
const autoWriteSchema = z.object({ type: z.enum(['issue', 'resolution', 'note', 'general', 'feedback']), text: z.string().max(1600).optional(), category: z.string().optional(), location: z.string().optional(), summary: z.string().optional() });
const feedbackSchema = z.object({ rating: z.number().int().min(1).max(5), satisfaction: z.enum(['exceptional', 'good', 'average', 'poor']).optional(), comment: z.string().max(800).default(''), tags: z.array(z.string().max(50)).max(6).optional() });
const chatSchema = z.object({ message: z.string().min(1).max(2000), history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string() })).max(20) });
const duplicatePreviewSchema = z.object({ description: z.string().min(4).max(1600), category: z.enum(categories), locationId: z.string().min(2).max(100) });
const createTicketSchema = z.object({ originalText: z.string().min(4).max(1600), summary: z.string().min(4).max(220), category: z.enum(categories), locationId: z.string().min(2).max(100), location: z.string().min(2).max(120), photoName: z.string().max(200).optional(), photoData: z.string().max(8_000_000).optional(), candidates: z.array(z.object({ id: z.string(), publicId: z.string(), summary: z.string(), location: z.string(), status: z.enum(statuses), reason: z.string(), confidence: z.enum(['low', 'medium', 'high']) })).max(5) });
const updateTicketSchema = z.object({ status: z.enum(statuses).optional(), assignee: z.string().min(2).max(80).optional(), resolutionNote: z.string().min(3).max(400).optional(), note: z.string().min(3).max(400).optional() });
const duplicateDecisionSchema = z.object({ candidateId: z.string().min(1), decision: z.enum(['confirmed_duplicate', 'not_duplicate', 'needs_investigation']), reasons: z.string().min(3).max(400) });

app.get('/api/health', (_req, res) => res.json({ ok: true, mode: 'local-sqlite', aiConfigured: Boolean(process.env.GEMINI_API_KEY) }));

// Unified Authentication & Gateway Status
app.get('/api/auth/gateway-status', (_req, res) => {
  res.json({
    gateway: 'CampusConnect IAM Gateway',
    status: 'ONLINE',
    protocol: 'Bearer Token / TLS 1.3 / SHA-256 Biometrics',
    activeSessions: sessions.size,
    stats: gatewayStats(),
  });
});

// Campus Configuration & QR Gateway
app.get('/api/campus/config', (_req, res) => {
  res.json({ config: getCampusConfig() });
});

app.post('/api/campus/generate-code', requireAuth, requireRole('admin'), (req, res) => {
  const input = valid(campusGenSchema, req.body, res);
  if (!input) return;
  const config = saveCampusConfig(input.code, input.name, req.user!.email);
  res.json({ config, message: `Campus gateway bound to code ${config.code}.` });
});

app.get('/api/auth/enrolled-users', (_req, res) => {
  res.json({ users: listEnrolledUsers() });
});

app.post('/api/auth/enroll-face', requireAuth, (req, res) => {
  const input = valid(enrollFaceSchema, req.body, res);
  if (!input) return;
  const updated = updateUserFace(req.user!, input.faceData);
  req.user = updated;
  for (const [token, user] of sessions.entries()) {
    if (user.uid === updated.uid) {
      sessions.set(token, updated);
    }
  }
  res.json({ user: updated, message: 'Webcam biometric face key successfully registered in campus gateway.' });
});

app.post('/api/auth/signup', (req, res) => {
  const input = valid(signupSchema, req.body, res);
  if (!input) return;
  try {
    // Admin registration never requires a campus code; student and staff do!
    if (input.role !== 'admin') {
      verifyCampusCode(input.campusCode);
    }
    const user = registerUser(input);
    const token = randomBytes(32).toString('hex');
    sessions.set(token, user);
    res.status(201).json({ token, user, message: 'Account successfully registered in campus gateway.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed.';
    res.status(400).json({ error: { code: 'REGISTRATION_FAILED', message } });
  }
});

app.post('/api/auth/login', (req, res) => {
  const input = valid(loginSchema, req.body, res); if (!input) return;
  const user = authenticateLocal(input.email, input.password);
  if (!user) {
    return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } });
  }
  // Admin login never requires a campus code; student and staff do!
  if (user.role !== 'admin') {
    try {
      verifyCampusCode(input.campusCode);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid campus code.';
      return res.status(400).json({ error: { code: 'INVALID_CAMPUS_CODE', message } });
    }
  }
  const token = randomBytes(32).toString('hex'); sessions.set(token, user);
  res.json({ token, user });
});

app.post('/api/auth/face-login', (req, res) => {
  const input = valid(faceLoginSchema, req.body, res); if (!input) return;
  const user = authenticateFace(input.identifier, input.faceData);
  if (!user) return res.status(401).json({ error: { code: 'BIOMETRIC_FAILED', message: 'Facial identity was not recognized. Please try again or use password.' } });
  const token = randomBytes(32).toString('hex'); sessions.set(token, user);
  res.json({ token, user, method: 'facial_recognition' });
});
app.post('/api/auth/logout', requireAuth, (req, res) => { const token = req.header('authorization')?.replace(/^Bearer\s+/i, ''); if (token) sessions.delete(token); res.status(204).end(); });
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));

app.get('/api/tickets', requireAuth, (req, res) => res.json({ tickets: listTickets(req.user!) }));
app.get('/api/tickets/:id', requireAuth, (req, res) => { const ticket = getTicket(req.user!, routeId(req)); if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found.' } }); res.json({ ticket }); });
app.post('/api/ai/analyze', requireAuth, async (req, res, next) => {
  const input = valid(analyzeSchema, req.body, res); if (!input) return;
  try { res.json(await analyzeComplaint(input)); } catch (error) { next(error); }
});
app.post('/api/ai/detect-from-image', requireAuth, async (req, res, next) => {
  const input = valid(imageDetectSchema, req.body, res); if (!input) return;
  try { res.json(await detectProblemFromImage(input.photo)); } catch (error) { next(error); }
});
app.post('/api/ai/auto-write', requireAuth, async (req, res, next) => {
  const input = valid(autoWriteSchema, req.body, res); if (!input) return;
  try { res.json(await autoWriteText(input)); } catch (error) { next(error); }
});
app.post('/api/ai/chat', requireAuth, requireRole('staff', 'admin'), async (req, res, next) => {
  const input = valid(chatSchema, req.body, res); if (!input) return;
  try {
    const allTicks = getAllTickets();
    const rules = req.user!.role === 'admin' ? routingRules() : undefined;
    const analyticsData = detailedAnalytics(req.user!.role);
    const result = await chatWithAi(req.user!, input.message, input.history, {
      tickets: allTicks,
      rules,
      analytics: analyticsData,
    });
    res.json(result);
  } catch (error) { next(error); }
});
app.get('/api/analytics', requireAuth, (req, res) => {
  res.json({ analytics: detailedAnalytics(req.user!.role) });
});
app.post('/api/ai/duplicate-preview', requireAuth, async (req, res, next) => {
  const input = valid(duplicatePreviewSchema, req.body, res); if (!input) return;
  const candidates = findCandidates(input.category, input.locationId, input.description);
  try { res.json({ candidates, comparison: await compareCandidates(input.description, candidates) }); } catch (error) { next(error); }
});
app.post('/api/tickets', requireAuth, requireRole('student'), (req, res, next) => {
  const input = valid(createTicketSchema, req.body, res); if (!input) return;
  try { res.status(201).json({ ticket: createTicket(req.user!, input) }); } catch (error) { next(error); }
});
app.post('/api/tickets/:id/candidates', requireAuth, requireRole('staff', 'admin'), async (req, res, next) => {
  const ticket = getTicket(req.user!, routeId(req)); if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found.' } });
  const candidates = findCandidates(ticket.category, ticket.locationId, ticket.originalText).filter((candidate) => candidate.id !== ticket.id);
  try { res.json({ candidates, comparison: await compareCandidates(ticket.originalText, candidates) }); } catch (error) { next(error); }
});
app.post('/api/tickets/:id/ai-triage', requireAuth, requireRole('staff', 'admin'), async (req, res, next) => {
  const ticket = getTicket(req.user!, routeId(req)); if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found.' } });
  try { res.json(await triageTicket(ticket)); } catch (error) { next(error); }
});
app.patch('/api/tickets/:id', requireAuth, requireRole('staff', 'admin'), (req, res, next) => {
  const input = valid(updateTicketSchema, req.body, res); if (!input) return;
  try { const ticket = updateTicket(req.user!, routeId(req), input); if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found.' } }); res.json({ ticket }); } catch (error) { next(error); }
});
app.post('/api/tickets/:id/feedback', requireAuth, (req, res, next) => {
  const input = valid(feedbackSchema, req.body, res); if (!input) return;
  try {
    const ticket = submitStudentFeedback(req.user!, routeId(req), input);
    if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found or unauthorized.' } });
    res.json({ ticket });
  } catch (error) {
    next(error);
  }
});
app.post('/api/tickets/:id/duplicate-review', requireAuth, requireRole('staff', 'admin'), (req, res) => {
  const input = valid(duplicateDecisionSchema, req.body, res); if (!input) return;
  const ticket = decideDuplicate(req.user!, routeId(req), input.candidateId, input.decision, input.reasons);
  if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket or candidate not found.' } });
  res.json({ ticket });
});
app.get('/api/metrics', requireAuth, requireRole('staff', 'admin'), (_req, res) => res.json({ metrics: metrics() }));
app.get('/api/ai/operations-pulse', requireAuth, requireRole('staff', 'admin'), async (_req, res, next) => {
  try { res.json(await operationsPulse(metrics())); } catch (error) { next(error); }
});
app.get('/api/routing-rules', requireAuth, requireRole('admin'), (_req, res) => res.json({ rules: routingRules() }));

const agentToolSchema = z.object({
  tool: z.enum(['analyze_complaint', 'detect_image_problem', 'triage_ticket', 'auto_write', 'operations_pulse', 'list_tickets']),
  arguments: z.record(z.string(), z.unknown()).default({}),
});

// Dedicated Google AI Studio Agent tool execution webhook
app.post('/api/ai/agent-tools', async (req, res, next) => {
  const input = valid(agentToolSchema, req.body, res);
  if (!input) return;
  try {
    const { tool, arguments: args } = input;
    if (tool === 'analyze_complaint') {
      const description = String(args.description ?? '');
      const locationId = args.locationId ? String(args.locationId) : undefined;
      const draft = await analyzeComplaint({ description, locationId });
      return res.json({ tool, result: draft });
    }
    if (tool === 'detect_image_problem') {
      const photo = args.photo as { data: string; mimeType: string; name?: string; hint?: string };
      const detection = await detectProblemFromImage(photo);
      return res.json({ tool, result: detection });
    }
    if (tool === 'triage_ticket') {
      const ticketId = String(args.ticketId ?? '');
      const adminUser: SessionUser = { uid: 'agent-bot', email: 'agent@campusconnect.internal', name: 'AI Studio Agent', role: 'admin' };
      const ticket = getTicket(adminUser, ticketId);
      if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      const triage = await triageTicket(ticket);
      return res.json({ tool, result: triage });
    }
    if (tool === 'auto_write') {
      const autoContext = args as Parameters<typeof autoWriteText>[0];
      const result = await autoWriteText(autoContext);
      return res.json({ tool, result });
    }
    if (tool === 'operations_pulse') {
      const pulse = await operationsPulse(metrics());
      return res.json({ tool, result: pulse });
    }
    if (tool === 'list_tickets') {
      const category = args.category ? (String(args.category) as Category) : undefined;
      const status = args.status ? (String(args.status) as TicketStatus) : undefined;
      const all = getAllTickets().filter((t) => (!category || t.category === category) && (!status || t.status === status));
      return res.json({
        tool,
        result: {
          total: all.length,
          tickets: all.slice(0, 15).map((t) => ({ publicId: t.publicId, category: t.category, location: t.location, status: t.status, summary: t.summary })),
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  void next;
  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  res.status(500).json({ error: { code: 'SERVER_ERROR', message } });
});

const serverDir = dirname(fileURLToPath(import.meta.url));
const candidateDistPaths = [
  join(process.cwd(), 'dist'),
  join(process.cwd(), 'ui', 'dist'),
  join(serverDir, '..', 'dist'),
];
const dist = candidateDistPaths.find(existsSync);
if (dist) {
  app.use(express.static(dist));
  app.get('/{*path}', (_req, res) => res.sendFile(join(dist, 'index.html')));
}

app.listen(port, '0.0.0.0', () => console.log(`CampusConnect listening on ${port}`));
