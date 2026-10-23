import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, setApiTokenGetter } from '../lib/api-client';
import { ApiError } from '../lib/api-errors';

describe('Centralized API Client Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setApiTokenGetter(null);
  });

  it('attaches Authorization Bearer token from global token getter', async () => {
    setApiTokenGetter(async () => 'mock-id-token-xyz');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true, data: { status: 'healthy' } }),
    });
    global.fetch = mockFetch;

    const data = await apiClient.get<{ status: string }>('/api/health');

    expect(data.status).toBe('healthy');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-id-token-xyz',
          Accept: 'application/json',
        }),
      })
    );
  });

  it('detects unexpected HTML response and throws integration error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      text: async () => '<html><body>App SPA fallback</body></html>',
    });

    await expect(apiClient.get('/api/tickets')).rejects.toThrow(ApiError);
    await expect(apiClient.get('/api/tickets')).rejects.toThrow(
      /returned HTML instead of JSON/
    );
  });

  it('normalizes server error envelope into ApiError with status and code', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access restricted to authorized staff',
        },
      }),
    });

    try {
      await apiClient.get('/api/staff/tickets');
      expect.fail('Should have thrown an error');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
      expect(err.message).toBe('Access restricted to authorized staff');
    }
  });

  it('supports URL search parameters safely', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true, data: [] }),
    });
    global.fetch = mockFetch;

    await apiClient.get('/api/staff/tickets', {
      params: { status: 'in_progress', limit: 10, offset: 0 },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/staff/tickets?status=in_progress&limit=10&offset=0',
      expect.anything()
    );
  });
});
