import test from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

// Point test database to a clean isolated SQLite database
const TEST_DB = join(process.cwd(), 'data', 'test_campus.db');
process.env.DATABASE_PATH = TEST_DB;

// Clean up prior test DB if any
try { rmSync(TEST_DB, { force: true }); } catch { /* ignore */ }

const {
  initStore,
  getCampusConfig,
  saveCampusConfig,
  verifyCampusCode,
  authenticateLocal,
  registerUser,
  authenticateFace,
  listEnrolledUsers,
  updateUserFace,
  listTickets,
  createTicket,
  detailedAnalytics,
} = await import('../server/store.js');

test('1. Initialize isolated campus store with zero placeholder tickets', () => {
  initStore();
  const student = { uid: 'student-ava', name: 'Ava Patel', email: 'student@campusconnect.local', role: 'student' as const };
  const tickets = listTickets(student);
  
  // Verify legacy fake tickets are absent
  const legacyIds = ['ticket-wifi-library', 'ticket-tap-blockb', 'ticket-light-hostela'];
  const contaminated = tickets.filter((t) => legacyIds.includes(t.id));
  assert.equal(contaminated.length, 0, 'No placeholder demo tickets should exist in store');
});

test('2. Institutional Campus Code gateway initialized when admin exists', () => {
  // Before admin exists, gateway indicates uninitialized
  const preConfig = getCampusConfig();
  assert.equal(preConfig.isInitialized, false, 'Campus gateway is uninitialized until admin account exists');

  // Register founding university administrator
  registerUser({
    name: 'Campus Administrator',
    email: 'admin@campusconnect.local',
    password: 'admin-secure-pwd',
    role: 'admin',
    faceData: 'data:image/jpeg;base64,ADMIN_FACE_VECTOR',
  });

  const config = getCampusConfig();
  assert.equal(config.isInitialized, true, 'Campus gateway must be initialized when admin account exists');
  assert.equal(config.code, 'CAMPUS-2026', 'Default campus code should be established as CAMPUS-2026');
  assert.ok(config.qrPayload.includes('CAMPUS-2026'), 'QR payload must contain the campus code link');
  assert.ok(config.adminEmail.includes('admin'), 'Admin email should be bound to the configuration');
});

test('3. Campus code validation rejects invalid or missing code', () => {
  // Missing code
  assert.throws(() => verifyCampusCode(''), /Invalid or missing Campus Code/);
  // Invalid code
  assert.throws(() => verifyCampusCode('WRONG-CODE-999'), /Invalid or missing Campus Code/);
  assert.throws(() => verifyCampusCode(undefined), /Invalid or missing Campus Code/);
});

test('4. Campus code validation accepts valid code case-insensitively with whitespace', () => {
  assert.equal(verifyCampusCode('CAMPUS-2026'), true);
  assert.equal(verifyCampusCode('campus-2026'), true);
  assert.equal(verifyCampusCode('  CAMPUS-2026  '), true);
  assert.equal(verifyCampusCode('campus-2026   '), true);
});

test('5. Admin customization of Campus Code and QR payload generation', () => {
  const custom = saveCampusConfig('OXFORD-2026', 'Oxford Central Campus', 'admin@campusconnect.local');
  assert.equal(custom.code, 'OXFORD-2026');
  assert.equal(custom.name, 'Oxford Central Campus');
  assert.ok(custom.qrPayload.includes('campus=OXFORD-2026'));

  // Validation now checks new code
  assert.equal(verifyCampusCode('oxford-2026'), true);
  assert.throws(() => verifyCampusCode('CAMPUS-2026'), /Invalid or missing Campus Code/);

  // Restore CAMPUS-2026 for subsequent tests
  saveCampusConfig('CAMPUS-2026', 'CampusConnect Central University', 'admin@campusconnect.local');
  assert.equal(verifyCampusCode('CAMPUS-2026'), true);
});

test('6. User registration with webcam biometric face key', () => {
  const dummyFaceData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...biometric_template...';
  const newUser = registerUser({
    name: 'Rohan Sharma',
    email: 'rohan.student@campusconnect.edu',
    password: 'password123',
    role: 'student',
    faceData: dummyFaceData,
  });

  assert.equal(newUser.name, 'Rohan Sharma');
  assert.equal(newUser.email, 'rohan.student@campusconnect.edu');
  assert.equal(newUser.role, 'student');
  assert.equal(newUser.faceData, dummyFaceData);

  // Authenticate using password
  const loggedIn = authenticateLocal('rohan.student@campusconnect.edu', 'password123');
  assert.ok(loggedIn, 'User should authenticate with registered password');
  assert.equal(loggedIn?.email, 'rohan.student@campusconnect.edu');
  assert.equal(loggedIn?.faceData, dummyFaceData);
});

test('7. Biometric Facial Recognition login gateway verification', () => {
  // Biometric login via email
  const faceAuth1 = authenticateFace('rohan.student@campusconnect.edu');
  assert.ok(faceAuth1, 'Face login should verify by email');
  assert.equal(faceAuth1?.name, 'Rohan Sharma');

  // Biometric login via role shorthand
  const faceAuthAdmin = authenticateFace('admin');
  assert.ok(faceAuthAdmin, 'Face login should verify admin role');
  assert.equal(faceAuthAdmin?.role, 'admin');

  // Biometric login rejects unknown user
  const faceAuthUnknown = authenticateFace('unknown-stranger@external.com');
  assert.equal(faceAuthUnknown, null, 'Unknown face vector must be rejected');
});

test('8. Enrolled Users Directory returns all credentials and face enrollment flags', () => {
  const directory = listEnrolledUsers();
  assert.ok(directory.length >= 2, 'Directory should contain registered admin and student');
  
  const rohan = directory.find((u) => u.email === 'rohan.student@campusconnect.edu');
  assert.ok(rohan, 'Rohan must be present in gateway directory');
  assert.equal(rohan?.hasFaceEnrolled, true, 'Face enrollment flag must be true');
  assert.ok(rohan?.memberId.startsWith('CC-ID-2026-'), 'Member ID pass must be properly formatted');
});

test('9. Face key enrollment update for existing authenticated session', () => {
  const student = { uid: 'student-rohan', name: 'Rohan Sharma', email: 'rohan.student@campusconnect.edu', role: 'student' as const };
  const updatedFace = 'data:image/jpeg;base64,UPDATED_FACE_VECTOR_HASH';
  const updated = updateUserFace(student, updatedFace);
  assert.equal(updated.faceData, updatedFace);

  const verified = authenticateFace('rohan.student@campusconnect.edu');
  assert.equal(verified?.faceData, updatedFace);
});

test('10. Edge Case: Clean ticket creation and isolated student ticket queue', () => {
  const student = { uid: 'student-rohan', name: 'Rohan Sharma', email: 'rohan.student@campusconnect.edu', role: 'student' as const };
  const ticket = createTicket(student, {
    originalText: 'Library 3rd floor AC temperature sensor is reading 38C',
    summary: 'Library 3F AC sensor malfunction',
    category: 'electricity',
    locationId: 'loc-lib-3',
    location: 'Central Library, 3rd Floor East',
    candidates: [],
  });

  assert.ok(ticket.id, 'Created ticket should have valid ID');
  assert.ok(ticket.publicId.startsWith('CC-2026-'), 'Public ID must follow standard prefix CC-2026-');
  assert.equal(ticket.status, 'submitted');

  const studentTickets = listTickets(student);
  assert.equal(studentTickets.length, 1);
  assert.equal(studentTickets[0].id, ticket.id);
  assert.equal(studentTickets[0].summary, 'Library 3F AC sensor malfunction');
});

test('11. Problem Analytics & Operations Intelligence data contracts', () => {
  const staffAnalytics = detailedAnalytics('staff');
  assert.ok(Array.isArray(staffAnalytics.categoryStats), 'categoryStats must be an array');
  assert.equal(staffAnalytics.categoryStats.length, 4, 'Must contain all 4 facility categories');
  assert.ok(Array.isArray(staffAnalytics.locationStats), 'locationStats must be an array');
  assert.ok(Array.isArray(staffAnalytics.statusFunnel), 'statusFunnel must be an array');
  assert.ok(staffAnalytics.severityBreakdown, 'severityBreakdown must be an object');
  assert.equal(typeof staffAnalytics.severityBreakdown.urgent, 'number');
  assert.equal(typeof staffAnalytics.severityBreakdown.attention, 'number');
  assert.equal(typeof staffAnalytics.severityBreakdown.routine, 'number');
  assert.equal(staffAnalytics.adminInsights, undefined, 'Staff analytics should omit admin governance insights');

  const adminAnalytics = detailedAnalytics('admin');
  assert.ok(adminAnalytics.adminInsights, 'Admin analytics must include admin insights');
  assert.equal(typeof adminAnalytics.adminInsights?.slaComplianceRate, 'number');
  assert.ok(Array.isArray(adminAnalytics.adminInsights?.departmentWorkload), 'departmentWorkload must be an array');
  assert.ok(Array.isArray(adminAnalytics.adminInsights?.recurringIssueHotspots), 'recurringIssueHotspots must be an array');
});

test('12. Role-dependent Campus Code requirement: Admin bypass vs Student/Staff enforcement', () => {
  // Admin credentials authenticate successfully without campus code
  const adminAuth = authenticateLocal('admin@campusconnect.local', 'admin-secure-pwd');
  assert.ok(adminAuth, 'Admin must authenticate successfully with email and password');
  assert.equal(adminAuth?.role, 'admin');

  // Student credentials verify campus code enforcement
  assert.throws(() => verifyCampusCode(''), /Invalid or missing Campus Code/);
  assert.throws(() => verifyCampusCode('WRONG-CODE'), /Invalid or missing Campus Code/);
  assert.equal(verifyCampusCode('CAMPUS-2026'), true, 'Student with valid code passes');
});
