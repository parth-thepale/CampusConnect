import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createMemoryRepositories } from '../../src/repositories/memory/repositories';
import { IRepositoryRegistry } from '../../src/repositories/interfaces';
import { IEmailDeliveryService } from '../../src/services/emailService';
import { IFirebaseAuthClient } from '../../src/services/firebaseAuthClient';

describe('Authentication Flow & API Security Integration Tests', () => {
  let app: ReturnType<typeof createApp>;
  let repos: IRepositoryRegistry & { clearAll: () => void };
  let mockEmailService: IEmailDeliveryService;
  let mockFirebaseAuth: IFirebaseAuthClient;

  let capturedOtp: string | null = null;

  beforeEach(() => {
    repos = createMemoryRepositories();
    capturedOtp = null;

    mockEmailService = {
      isConfigured: () => true,
      sendOtpEmail: vi.fn(async (_toEmail: string, otpCode: string) => {
        capturedOtp = otpCode;
      }),
    };

    mockFirebaseAuth = {
      getUserByEmail: vi.fn(async (email: string) => {
        if (email === 'existing@campus.edu') {
          return { uid: 'uid-existing-123', email };
        }
        return null;
      }),
      createUser: vi.fn(async ({ email }) => ({
        uid: 'uid-student-789',
        email,
      })),
      createCustomToken: vi.fn(async (uid: string, claims?: Record<string, unknown>) => {
        return `mock-custom-token-for-${uid}-${claims?.role || 'student'}`;
      }),
      verifyIdToken: vi.fn(async (idToken: string) => {
        if (idToken === 'valid-student-token') {
          return {
            uid: 'uid-student-789',
            email: 'student@campus.edu',
            name: 'Student User',
            aud: 'campusconnect',
            iss: 'firebase',
            sub: 'uid-student-789',
            auth_time: Math.floor(Date.now() / 1000),
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            firebase: { identities: {}, sign_in_provider: 'custom' },
          };
        }
        if (idToken === 'valid-staff-token') {
          return {
            uid: 'uid-staff-456',
            email: 'staff@campus.edu',
            name: 'Staff Reviewer',
            aud: 'campusconnect',
            iss: 'firebase',
            sub: 'uid-staff-456',
            auth_time: Math.floor(Date.now() / 1000),
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            firebase: { identities: {}, sign_in_provider: 'google.com' },
          };
        }
        throw new Error('Firebase ID token is invalid or expired');
      }),
    };

    app = createApp(repos, undefined, mockEmailService, mockFirebaseAuth);
  });

  describe('Passwordless Email OTP Endpoints', () => {
    it('POST /api/auth/email/request-code generates and dispatches OTP safely', async () => {
      const res = await request(app)
        .post('/api/auth/email/request-code')
        .send({ email: 'Student@Campus.EDU' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.challengeId).toBeDefined();
      expect(res.body.message).toContain('verification code has been sent');
      // Must not leak code
      expect(res.body.code).toBeUndefined();
      expect(capturedOtp).toMatch(/^\d{6}$/);
    });

    it('POST /api/auth/email/request-code rejects invalid email format with 400', async () => {
      const res = await request(app)
        .post('/api/auth/email/request-code')
        .send({ email: 'bad-email' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/auth/email/request-code enforces resend throttling with 429', async () => {
      // First request
      await request(app)
        .post('/api/auth/email/request-code')
        .send({ email: 'student@campus.edu' })
        .expect(200);

      // Immediate second request
      const res = await request(app)
        .post('/api/auth/email/request-code')
        .send({ email: 'student@campus.edu' })
        .expect(429);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(res.body.error.message).toContain('wait');
    });

    it('POST /api/auth/email/verify-code verifies valid code and returns custom token', async () => {
      const reqRes = await request(app)
        .post('/api/auth/email/request-code')
        .send({ email: 'student@campus.edu' })
        .expect(200);

      const challengeId = reqRes.body.data.challengeId;
      expect(capturedOtp).toBeDefined();

      const verifyRes = await request(app)
        .post('/api/auth/email/verify-code')
        .send({
          email: 'student@campus.edu',
          code: capturedOtp,
          challengeId,
        })
        .expect(200);

      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.customToken).toContain('mock-custom-token');
      expect(verifyRes.body.data.user.role).toBe('student');
    });

    it('POST /api/auth/email/verify-code rejects invalid code with 400', async () => {
      const reqRes = await request(app)
        .post('/api/auth/email/request-code')
        .send({ email: 'student@campus.edu' })
        .expect(200);

      const challengeId = reqRes.body.data.challengeId;

      const verifyRes = await request(app)
        .post('/api/auth/email/verify-code')
        .send({
          email: 'student@campus.edu',
          code: '000000',
          challengeId,
        })
        .expect(400);

      expect(verifyRes.body.success).toBe(false);
      expect(verifyRes.body.error.message).toContain('Invalid verification code');
    });

    it('POST /api/auth/email/verify-code rejects reused code with 400', async () => {
      const reqRes = await request(app)
        .post('/api/auth/email/request-code')
        .send({ email: 'student@campus.edu' })
        .expect(200);

      const challengeId = reqRes.body.data.challengeId;

      // First verification succeeds
      await request(app)
        .post('/api/auth/email/verify-code')
        .send({ email: 'student@campus.edu', code: capturedOtp, challengeId })
        .expect(200);

      // Replay fails
      const replayRes = await request(app)
        .post('/api/auth/email/verify-code')
        .send({ email: 'student@campus.edu', code: capturedOtp, challengeId })
        .expect(400);

      expect(replayRes.body.error.message).toContain('already been used');
    });
  });

  describe('Profile Resolution & Role-Based Authorization', () => {
    it('GET /api/auth/me returns current user profile for valid Firebase ID token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-student-token')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.uid).toBe('uid-student-789');
      expect(res.body.data.email).toBe('student@campus.edu');
      expect(res.body.data.role).toBe('student');
    });

    it('GET /api/auth/me rejects request without Bearer token with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/auth/me rejects invalid / forged Bearer token with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer forged-invalid-token')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('enforces RBAC: student is forbidden (403) from accessing staff ticket queue', async () => {
      const res = await request(app)
        .get('/api/staff/tickets')
        .set('Authorization', 'Bearer valid-student-token')
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('enforces RBAC: authorized staff user is granted (200) access to staff ticket queue', async () => {
      // Seed staff user in repository
      await repos.users.createOrUpdate({
        uid: 'uid-staff-456',
        email: 'staff@campus.edu',
        displayName: 'Staff Reviewer',
        role: 'staff',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await request(app)
        .get('/api/staff/tickets')
        .set('Authorization', 'Bearer valid-staff-token')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
    });
  });

  describe('Container Probes & Diagnostic Harness Routes', () => {
    it('serves container probes /healthz and /readyz with 200', async () => {
      const healthzRes = await request(app).get('/healthz').expect(200);
      expect(healthzRes.body.status).toBe('ok');

      const readyzRes = await request(app).get('/readyz').expect(200);
      expect(readyzRes.body.status).toBe('ready');
    });

    it('serves /auth-test diagnostic page with 200 HTML content', async () => {
      const res = await request(app).get('/auth-test').expect(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('Authentication Diagnostic Test Harness');
      expect(res.text).toContain('Continue with Google');
      expect(res.text).toContain('Six-Digit Email OTP');
    });

    it('GET /api/auth/config returns safe public config without server secrets', async () => {
      const res = await request(app).get('/api/auth/config').expect(200);
      expect(res.body.success).toBe(true);
      // Ensure private secrets are never leaked
      expect(res.body.data.geminiKey).toBeUndefined();
      expect(res.body.data.otpSecret).toBeUndefined();
      expect(res.body.data.smtpPass).toBeUndefined();
    });
  });
});
