import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OtpAuthService } from '../../src/services/otpAuthService';
import { MemoryOtpRepository, MemoryUserRepository } from '../../src/repositories/memory/repositories';
import { AuthService } from '../../src/services/authService';
import { IEmailDeliveryService } from '../../src/services/emailService';
import { IFirebaseAuthClient } from '../../src/services/firebaseAuthClient';
import {
  ValidationError,
  RateLimitError,
  EmailServiceUnavailableError,
} from '../../src/errors/AppError';

describe('OtpAuthService Unit Tests & Security Guardrails', () => {
  let otpRepo: MemoryOtpRepository;
  let userRepo: MemoryUserRepository;
  let authService: AuthService;
  let mockEmailService: IEmailDeliveryService;
  let mockFirebaseAuth: IFirebaseAuthClient;
  let service: OtpAuthService;

  let capturedEmail: string | null = null;
  let capturedOtp: string | null = null;

  beforeEach(() => {
    otpRepo = new MemoryOtpRepository();
    userRepo = new MemoryUserRepository();
    authService = new AuthService(userRepo);

    capturedEmail = null;
    capturedOtp = null;

    mockEmailService = {
      isConfigured: () => true,
      sendOtpEmail: vi.fn(async (toEmail: string, otpCode: string) => {
        capturedEmail = toEmail;
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
        uid: 'uid-new-456',
        email,
      })),
      createCustomToken: vi.fn(async (uid: string, claims?: Record<string, unknown>) => {
        return `mock-custom-token-for-${uid}-role-${claims?.role || 'none'}`;
      }),
      verifyIdToken: vi.fn(async (token: string) => ({
        uid: token.replace('mock-id-token-', ''),
        aud: 'campusconnect',
        iss: 'firebase',
        sub: token.replace('mock-id-token-', ''),
        auth_time: Math.floor(Date.now() / 1000),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        firebase: { identities: {}, sign_in_provider: 'custom' },
      })),
    };

    service = new OtpAuthService(
      otpRepo,
      authService,
      mockEmailService,
      mockFirebaseAuth
    );
  });

  it('rejects malformed email format', async () => {
    await expect(service.requestCode('not-an-email')).rejects.toThrow(ValidationError);
    await expect(service.requestCode('')).rejects.toThrow(ValidationError);
    await expect(service.requestCode('test@')).rejects.toThrow(ValidationError);
  });

  it('generates 6-digit code, delivers via email service, and does not leak code in response', async () => {
    const result = await service.requestCode('Student@Campus.EDU');

    expect(result.challengeId).toBeDefined();
    expect(result.message).toContain('verification code has been sent');
    // Ensure raw code is not returned
    expect((result as any).code).toBeUndefined();

    // Verify email delivery received normalized email and 6-digit numeric code
    expect(capturedEmail).toBe('student@campus.edu');
    expect(capturedOtp).toMatch(/^\d{6}$/);

    // Verify code is hashed in repository, not stored in plaintext
    const stored = await otpRepo.findById(result.challengeId);
    expect(stored).toBeDefined();
    expect(stored?.codeHash).not.toBe(capturedOtp);
    expect(stored?.codeHash).toMatch(/^[a-f0-9]{64}$/); // HMAC SHA-256
  });

  it('enforces 60-second resend throttling for active challenges', async () => {
    await service.requestCode('student@campus.edu');

    // Attempt immediately again
    await expect(service.requestCode('student@campus.edu')).rejects.toThrow(RateLimitError);
    await expect(service.requestCode('student@campus.edu')).rejects.toThrow(/wait \d+ second/);
  });

  it('enforces maximum 5 code requests per hour', async () => {
    // Mock countRecentRequests returning 5
    vi.spyOn(otpRepo, 'countRecentRequests').mockResolvedValue(5);

    await expect(service.requestCode('spammer@campus.edu')).rejects.toThrow(RateLimitError);
    await expect(service.requestCode('spammer@campus.edu')).rejects.toThrow(/Too many verification code requests/);
  });

  it('leaves no saved challenge if email delivery fails', async () => {
    vi.spyOn(mockEmailService, 'sendOtpEmail').mockRejectedValue(
      new EmailServiceUnavailableError('SMTP connection refused')
    );

    await expect(service.requestCode('fail@campus.edu')).rejects.toThrow(
      EmailServiceUnavailableError
    );

    // Ensure challenge was not persisted
    const stored = await otpRepo.findLatestByEmail('fail@campus.edu');
    expect(stored).toBeNull();
  });

  it('rejects malformed verification code format (non-6 digits)', async () => {
    await expect(service.verifyCode('user@campus.edu', '12345')).rejects.toThrow(ValidationError);
    await expect(service.verifyCode('user@campus.edu', 'abcdef')).rejects.toThrow(ValidationError);
    await expect(service.verifyCode('user@campus.edu', '1234567')).rejects.toThrow(ValidationError);
  });

  it('rejects invalid code and decrements remaining attempts', async () => {
    const { challengeId } = await service.requestCode('student@campus.edu');
    expect(capturedOtp).toBeDefined();

    // Wrong code attempt 1
    await expect(
      service.verifyCode('student@campus.edu', '000000', challengeId)
    ).rejects.toThrow(/Attempts remaining: 2/);

    // Wrong code attempt 2
    await expect(
      service.verifyCode('student@campus.edu', '000000', challengeId)
    ).rejects.toThrow(/Attempts remaining: 1/);

    // Wrong code attempt 3 -> blocks further attempts
    await expect(
      service.verifyCode('student@campus.edu', '000000', challengeId)
    ).rejects.toThrow(RateLimitError);
  });

  it('rejects expired code', async () => {
    const { challengeId } = await service.requestCode('student@campus.edu');
    const challenge = await otpRepo.findById(challengeId);
    if (challenge) {
      // Simulate expired challenge 15 minutes ago
      challenge.expiresAt = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      await otpRepo.createChallenge(challenge);
    }

    await expect(
      service.verifyCode('student@campus.edu', capturedOtp!, challengeId)
    ).rejects.toThrow(/expired/);
  });

  it('rejects reused / already consumed code', async () => {
    const { challengeId } = await service.requestCode('student@campus.edu');

    // First verification succeeds
    const verifyResult = await service.verifyCode(
      'student@campus.edu',
      capturedOtp!,
      challengeId
    );
    expect(verifyResult.customToken).toBeDefined();

    // Replay / reuse attempt must fail
    await expect(
      service.verifyCode('student@campus.edu', capturedOtp!, challengeId)
    ).rejects.toThrow(/already been used/);
  });

  it('creates new Firebase user and provisions default student role upon successful verification', async () => {
    const { challengeId } = await service.requestCode('newstudent@campus.edu');

    const result = await service.verifyCode(
      'newstudent@campus.edu',
      capturedOtp!,
      challengeId
    );

    expect(result.customToken).toContain('mock-custom-token-for-uid-new-456');
    expect(result.user.uid).toBe('uid-new-456');
    expect(result.user.email).toBe('newstudent@campus.edu');
    expect(result.user.role).toBe('student'); // Default role invariant

    // Verify stored profile in repository has student role
    const storedUser = await userRepo.findByUid('uid-new-456');
    expect(storedUser).toBeDefined();
    expect(storedUser?.role).toBe('student');
  });

  it('preserves existing user role (e.g. staff) and existing Firebase UID upon verification', async () => {
    // Pre-seed user with staff role
    await userRepo.createOrUpdate({
      uid: 'uid-existing-123',
      email: 'existing@campus.edu',
      role: 'staff',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const { challengeId } = await service.requestCode('existing@campus.edu');

    const result = await service.verifyCode(
      'existing@campus.edu',
      capturedOtp!,
      challengeId
    );

    expect(result.user.uid).toBe('uid-existing-123');
    expect(result.user.role).toBe('staff'); // Preserves staff role

    const storedUser = await userRepo.findByUid('uid-existing-123');
    expect(storedUser?.role).toBe('staff');
  });
});
