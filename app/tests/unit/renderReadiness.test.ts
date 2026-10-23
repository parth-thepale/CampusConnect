import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createMemoryRepositories } from '../../src/repositories/memory/repositories';
import { getDbPool } from '../../src/config/database';

describe('Render & Cloud Run Deployment Runtime Readiness Tests', () => {
  describe('CORS Origin Allowlist Policy', () => {
    it('permits requests with no origin (e.g. curl, server-to-server, mobile)', async () => {
      const repos = createMemoryRepositories();
      const app = createApp(repos);

      const res = await request(app).get('/healthz').expect(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('Database Pool & Runtime Health Probes', () => {
    it('initializes in-memory repository cleanly without external database credentials in test mode', () => {
      const repos = createMemoryRepositories();
      expect(repos.users).toBeDefined();
      expect(repos.tickets).toBeDefined();
      expect(repos.intakes).toBeDefined();
      expect(repos.events).toBeDefined();
      expect(repos.otps).toBeDefined();
    });

    it('returns null db pool when DATABASE_URL is not set', () => {
      // In default test runner environment where DATABASE_URL is unset
      if (!process.env.DATABASE_URL) {
        expect(getDbPool()).toBeNull();
      }
    });
  });
});
