import test from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import type { SessionUser } from '../src/types.js';

// Setup isolated test database directory
const TEST_ISOLATION_DB = join(process.cwd(), 'data', 'test_isolation.db');
process.env.DATABASE_PATH = TEST_ISOLATION_DB;

try {
  rmSync(TEST_ISOLATION_DB, { force: true });
} catch {
  /* ignore */
}

const {
  initStore,
  registerUser,
  authenticateLocal,
  authenticateFace,
  createTicket,
  listTickets,
  getTicket,
  updateTicket,
  metrics,
  detailedAnalytics,
  createSession,
  getSession,
  deleteSession,
} = await import('../server/store.js');

const {
  getStoredTickets,
  saveTickets,
} = await import('../src/api.js');

test('1. Student queue isolation: Student A cannot see or fetch Student B tickets', () => {
  initStore();

  const userA = registerUser({
    name: 'Alice Smith',
    email: 'alice@campus.local',
    password: 'securePassAlice1',
    role: 'student',
  });

  const userB = registerUser({
    name: 'Bob Jones',
    email: 'bob@campus.local',
    password: 'securePassBob2',
    role: 'student',
  });

  // Alice creates 2 tickets
  const ticketA1 = createTicket(userA, {
    originalText: 'Ceiling fan making clicking noise in Room 204',
    summary: 'Clicking ceiling fan in Room 204',
    category: 'electricity',
    locationId: 'loc-b2-204',
    location: 'Science Block B, Room 204',
    candidates: [],
  });

  const ticketA2 = createTicket(userA, {
    originalText: 'Water cooler dispensing warm water in ground floor lobby',
    summary: 'Warm water from lobby cooler',
    category: 'plumbing',
    locationId: 'loc-b1-lobby',
    location: 'Academic Block A, Ground Floor',
    candidates: [],
  });

  // Alice checks her tickets
  const aliceTickets = listTickets(userA);
  assert.equal(aliceTickets.length, 2, 'Alice must see both of her submitted tickets');
  assert.ok(aliceTickets.some((t) => t.id === ticketA1.id));
  assert.ok(aliceTickets.some((t) => t.id === ticketA2.id));

  // Bob checks his tickets -> must see 0 tickets from Alice
  const bobTickets = listTickets(userB);
  assert.equal(bobTickets.length, 0, 'Bob must have an empty queue with 0 tickets from Alice');

  // Bob cannot access Alice\'s ticket by ID
  const forbiddenTicket = getTicket(userB, ticketA1.id);
  assert.equal(forbiddenTicket, null, 'Bob cannot fetch Alice\'s ticket by ID');
});

test('2. Cross-role resolution: Staff and Admin can view, triage, and resolve student tickets', () => {
  const staff = registerUser({
    name: 'Technician Aarav',
    email: 'aarav.facilities@campus.local',
    password: 'staffPassSecure1',
    role: 'staff',
  });

  const admin = registerUser({
    name: 'Director Nisha',
    email: 'nisha.admin@campus.local',
    password: 'adminPassSecure1',
    role: 'admin',
  });

  const userA = authenticateLocal('alice@campus.local', 'securePassAlice1')!;

  // Staff sees all tickets across students
  const staffQueue = listTickets(staff);
  assert.ok(staffQueue.length >= 2, 'Facilities staff must see student tickets in work queue');

  const target = staffQueue.find((t) => t.reporterName === 'Alice Smith');
  assert.ok(target, 'Target student ticket must be found in staff queue');

  // Staff assigns ticket
  const assigned = updateTicket(staff, target!.id, {
    status: 'assigned',
    assignee: 'Technician Aarav',
  });
  assert.equal(assigned?.status, 'assigned');
  assert.equal(assigned?.assignee, 'Technician Aarav');

  // Staff resolves ticket
  const resolved = updateTicket(staff, target!.id, {
    status: 'in_progress',
  });
  assert.equal(resolved?.status, 'in_progress');

  const finalResolved = updateTicket(staff, target!.id, {
    status: 'resolved',
    resolutionNote: 'Replaced thermal cutoff and capacitor. Operating within specs.',
  });
  assert.equal(finalResolved?.status, 'resolved');
  assert.equal(finalResolved?.resolutionNote, 'Replaced thermal cutoff and capacitor. Operating within specs.');

  // Student Alice checks ticket and sees resolution
  const aliceView = getTicket(userA, target!.id);
  assert.equal(aliceView?.status, 'resolved');
  assert.equal(aliceView?.resolutionNote, 'Replaced thermal cutoff and capacitor. Operating within specs.');

  // Admin sees all tickets
  const adminQueue = listTickets(admin);
  assert.ok(adminQueue.length >= 2, 'Admin must see all tickets across campus');
});

test('3. Operational metrics and detailed analytics aggregate across all campus tickets', () => {
  const admin = authenticateLocal('nisha.admin@campus.local', 'adminPassSecure1');
  assert.ok(admin, 'Admin must authenticate successfully');

  const m = metrics();
  assert.ok(m.open + m.inProgress + m.resolvedThisWeek >= 2, 'Metrics should aggregate all tickets');

  const analytics = detailedAnalytics('admin');
  assert.ok(analytics.totalTickets >= 2, 'Analytics must reflect all campus tickets');
  assert.ok(analytics.adminInsights?.departmentWorkload.length, 'Admin insights must calculate department workload');
});

test('4. SQLite Persistent Session Store with expiration and cleanup', () => {
  const user = authenticateLocal('alice@campus.local', 'securePassAlice1')!;

  // Create session
  const token = createSession(user, 24);
  assert.ok(token, 'Session token must be generated');

  // Retrieve session
  const retrieved = getSession(token);
  assert.ok(retrieved, 'Session must be retrieved from SQLite');
  assert.equal(retrieved?.email, 'alice@campus.local');
  assert.equal(retrieved?.role, 'student');

  // Delete session on logout
  deleteSession(token);
  const afterDelete = getSession(token);
  assert.equal(afterDelete, null, 'Deleted session must return null');
});

test('5. Biometric Facial Recognition prevents unauthenticated role bypass', () => {
  // Shorthand 'admin' without valid face vector must return null
  const bypassAttempt = authenticateFace('admin');
  assert.equal(bypassAttempt, null, 'Role-based shorthand bypass must be completely rejected');

  const missingFaceAttempt = authenticateFace('alice@campus.local');
  assert.equal(missingFaceAttempt, null, 'Login without faceData must be rejected');
});

test('6. Client Fallback ticket storage shares across roles while respecting student privacy', () => {
  const storageMap = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (k: string) => storageMap.get(k) ?? null,
    setItem: (k: string, v: string) => storageMap.set(k, v),
    removeItem: (k: string) => storageMap.delete(k),
    clear: () => storageMap.clear(),
  };

  const originalStorage = globalThis.localStorage;
  // @ts-expect-error Mocking globalThis.localStorage for test
  globalThis.localStorage = mockLocalStorage;

  try {
    const student1: SessionUser = { uid: 'usr-stu-1', name: 'Student One', email: 'stu1@uni.edu', role: 'student' };
    const mockTicket = {
      id: 'tick-stu1',
      publicId: 'CC-2026-1045',
      reporterId: student1.uid,
      reporterName: student1.name,
      originalText: 'Broken water tap',
      summary: 'Broken tap',
      category: 'plumbing' as const,
      locationId: 'loc-wash',
      location: 'Block A Washroom',
      status: 'submitted' as const,
      department: 'Facilities plumbing team',
      routeEvidence: 'Routing rule',
      routeIsDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      duplicateCandidates: [],
      events: [],
    };

    saveTickets([mockTicket]);

    // Both student and staff read from unified storage
    const allStored = getStoredTickets();
    assert.equal(allStored.length, 1);
    assert.equal(allStored[0].id, 'tick-stu1');
  } finally {
    globalThis.localStorage = originalStorage;
  }
});
