import { describe, it, expect, vi } from 'vitest';
import { JwtTokenService } from '../../src/services/tokenService';
import { UnauthorizedError } from '../../src/errors/AppError';

describe('JwtTokenService Unit Tests', () => {
  const service = new JwtTokenService();

  it('generates and successfully verifies a valid backend session JWT', () => {
    const payload = {
      uid: 'user_123',
      email: 'student@campus.edu',
      role: 'student' as const,
      displayName: 'Alice Student',
    };

    const token = service.generateToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // Standard header.payload.signature

    const verified = service.verifyToken(token);
    expect(verified.uid).toBe('user_123');
    expect(verified.email).toBe('student@campus.edu');
    expect(verified.role).toBe('student');
    expect(verified.displayName).toBe('Alice Student');
  });

  it('rejects tampered or forged JWT tokens with UnauthorizedError', () => {
    const validToken = service.generateToken({
      uid: 'user_tamper',
      role: 'student',
    });

    // Tamper payload segment
    const parts = validToken.split('.');
    parts[1] = Buffer.from(JSON.stringify({ uid: 'admin', role: 'admin' })).toString('base64url');
    const tampered = parts.join('.');

    expect(() => service.verifyToken(tampered)).toThrow(UnauthorizedError);
  });

  it('rejects garbage token strings with UnauthorizedError', () => {
    expect(() => service.verifyToken('not-a-jwt')).toThrow(UnauthorizedError);
    expect(() => service.verifyToken('')).toThrow(UnauthorizedError);
  });

  it('verifies Google ID token when Google returns valid claims', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sub: 'google_sub_999',
        email: 'googlestudent@campus.edu',
        name: 'Google User',
      }),
    }));

    vi.stubGlobal('fetch', mockFetch);

    const result = await service.verifyGoogleIdToken('mock-google-id-token');
    expect(result.uid).toBe('google_google_sub_999');
    expect(result.email).toBe('googlestudent@campus.edu');
    expect(result.displayName).toBe('Google User');

    vi.unstubAllGlobals();
  });

  it('rejects invalid Google ID token when Google returns 400', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error_description: 'Invalid Value' }),
    }));

    vi.stubGlobal('fetch', mockFetch);

    await expect(service.verifyGoogleIdToken('invalid-token')).rejects.toThrow(UnauthorizedError);

    vi.unstubAllGlobals();
  });
});
