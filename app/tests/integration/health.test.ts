import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createMemoryRepositories } from '../../src/repositories/memory/repositories';

describe('Health & Readiness Endpoints', () => {
  const repos = createMemoryRepositories();
  const app = createApp(repos);

  it('GET /api/health returns 200 with non-sensitive operational status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.service).toBe('campusconnect-backend');
    expect(res.body.data.timestamp).toBeDefined();

    // Ensure no secrets, stack traces or local paths are leaked
    const jsonStr = JSON.stringify(res.body);
    expect(jsonStr).not.toContain('secret');
    expect(jsonStr).not.toContain('password');
    expect(jsonStr).not.toContain('apiKey');
    expect(jsonStr).not.toContain('Users\\');
  });

  it('GET /health root container probe returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
