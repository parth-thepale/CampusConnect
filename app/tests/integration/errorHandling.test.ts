import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createMemoryRepositories } from '../../src/repositories/memory/repositories';

describe('Error Handling, Fail-Safe Boundaries, & Privacy', () => {
  const studentUser = {
    'x-dev-user-id': 'student_eve',
    'x-dev-user-role': 'student',
  };

  it('returns 400 with structured JSON on malformed JSON payload', async () => {
    const repos = createMemoryRepositories();
    const app = createApp(repos);

    const res = await request(app)
      .post('/api/intakes')
      .set(studentUser)
      .set('Content-Type', 'application/json')
      .send('{ "description": "unclosed string json ...');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('MALFORMED_JSON');
    expect(res.body.error.message).toBeDefined();
  });

  it('returns 404 with structured JSON on non-existent endpoints', async () => {
    const repos = createMemoryRepositories();
    const app = createApp(repos);

    const res = await request(app).get('/api/unsupported-endpoint');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('produces controlled 500 response on repository/database errors without leaking stack traces or credentials', async () => {
    const repos = createMemoryRepositories();
    // Simulate a database failure on intake creation
    repos.intakes.create = async () => {
      throw new Error('Cloud Firestore connection timeout: secret_token_xyz_123');
    };

    const app = createApp(repos);

    const res = await request(app)
      .post('/api/intakes')
      .set(studentUser)
      .send({
        description: 'Water leaking in 2nd floor restroom',
        location: 'Restroom B',
        category: 'plumbing',
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(res.body.error.message).toContain('An unexpected internal server error occurred');

    // CRITICAL: Ensure stack trace and simulated credential/secret was NOT leaked in HTTP response
    const jsonStr = JSON.stringify(res.body);
    expect(jsonStr).not.toContain('secret_token_xyz_123');
    expect(jsonStr).not.toContain('stack');
    expect(jsonStr).not.toContain('node_modules');
    expect(jsonStr).not.toContain('Firestore connection timeout');
  });
});
