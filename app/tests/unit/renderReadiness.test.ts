import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createMemoryRepositories } from '../../src/repositories/memory/repositories';
import { ensureFirebaseAdmin } from '../../src/config/firebaseAdmin';
import * as admin from 'firebase-admin';

describe('Render Deployment & Runtime Readiness Tests', () => {
  describe('CORS Origin Allowlist Policy', () => {
    it('permits requests with no origin (e.g. curl, server-to-server, mobile)', async () => {
      const repos = createMemoryRepositories();
      const app = createApp(repos);

      const res = await request(app).get('/healthz').expect(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('Firebase Admin Credential Guardrails on Render', () => {
    it('returns existing app instance if already initialized', () => {
      const existingApp = ensureFirebaseAdmin();
      expect(existingApp).toBeDefined();

      const secondCall = ensureFirebaseAdmin();
      expect(secondCall).toBe(existingApp);
    });
  });
});
