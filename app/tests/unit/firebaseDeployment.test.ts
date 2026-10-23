import { describe, it, expect } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { app, api } from '../../src/index';

describe('Firebase Functions & Hosting Migration Tests', () => {
  const rootDir = path.resolve(__dirname, '../../../');

  describe('Configuration Files Integrity', () => {
    it('.firebaserc correctly specifies project campusconnect-512507', () => {
      const firebasercPath = path.join(rootDir, '.firebaserc');
      expect(fs.existsSync(firebasercPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(firebasercPath, 'utf8'));
      expect(content.projects?.default).toBe('campusconnect-512507');
    });

    it('firebase.json configures 2nd Gen Cloud Functions and Hosting rewrites', () => {
      const firebaseJsonPath = path.join(rootDir, 'firebase.json');
      expect(fs.existsSync(firebaseJsonPath)).toBe(true);

      const config = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
      expect(config.functions).toBeDefined();
      expect(config.functions[0].source).toBe('app');

      expect(config.hosting).toBeDefined();
      expect(config.hosting.public).toBe('public');

      const rewrites = config.hosting.rewrites;
      expect(Array.isArray(rewrites)).toBe(true);

      // Verify /api/** route rewrite to 2nd Gen Cloud Function
      const apiRewrite = rewrites.find((r: any) => r.source === '/api/**');
      expect(apiRewrite).toBeDefined();
      expect(apiRewrite.function?.functionId).toBe('api');
      expect(apiRewrite.function?.region).toBe('us-central1');

      // Verify SPA fallback to index.html is placed last
      const spaRewrite = rewrites.find((r: any) => r.source === '**');
      expect(spaRewrite).toBeDefined();
      expect(spaRewrite.destination).toBe('/index.html');
    });

    it('hosting public placeholder exists for initial deployment', () => {
      const publicIndexPath = path.join(rootDir, 'public', 'index.html');
      expect(fs.existsSync(publicIndexPath)).toBe(true);
    });

    it('app/package.json specifies exact Node.js 22 runtime engine and preserves Render start script', () => {
      const pkgPath = path.join(rootDir, 'app', 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      expect(pkg.engines?.node).toBe('22');
      expect(pkg.scripts?.start).toBe('node dist/server.js');
      expect(pkg.main).toBe('dist/index.js');
    });
  });

  describe('Cloud Functions HTTPS Entrypoint Adapter', () => {
    it('exports a valid Cloud Functions 2nd Gen onRequest handler', () => {
      expect(api).toBeDefined();
      expect(typeof api).toBe('function');
    });

    it('serves Express API endpoints through the Cloud Functions app instance', async () => {
      const res = await request(app).get('/api/health').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.service).toBe('campusconnect-backend');
      expect(res.body.data.status).toBe('healthy');
    });

    it('serves /healthz and /readyz probes through Cloud Functions app instance', async () => {
      const healthz = await request(app).get('/healthz').expect(200);
      expect(healthz.body.status).toBe('ok');

      const readyz = await request(app).get('/readyz').expect(200);
      expect(readyz.body.status).toBe('ready');
    });

    it('returns structured 404 JSON for non-existent API routes (never HTML)', async () => {
      const res = await request(app).get('/api/non-existent-endpoint-xyz').expect(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.headers['content-type']).toContain('application/json');
    });
  });
});
