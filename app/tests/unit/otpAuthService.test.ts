import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OtpAuthService } from '../../src/services/otpAuthService';
import { MemoryOtpRepository, MemoryUserRepository } from '../../src/repositories/memory/repositories';
import { AuthService } from '../../src/services/authService';
import { IEmailDeliveryService } from '../../src/services/emailService';
import { ITokenService } from '../../src/services/tokenService';
import {
  ValidationError,
  RateLimitError,
} from '../../src/errors/AppError';

describe('OtpAuthService Unit Tests & Security Guardrails', () => {
  let otpRepo: MemoryOtpRepository;
  let userRepo: MemoryUserRepository;
  let authService: AuthService;
  let mockEmailService: IEmailDeliveryService;
  let mockTokenService: ITokenService;
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

    mockTokenService = {
      generateToken: vi.fn((payload) => `mock-token-for-${payload.uid}-${payload.role}`),
      verifyToken: vi.fn((token: string) => ({
        uid: token.replace('mock-token-', ''),
        email: 'test@campus.edu',
        role: 'student',
      })),
      verifyGoogleIdToken: vi.fn(async () => ({
        uid: 'google_123',
        email: 'test@campus.edu',
      })),
    };

    service = new OtpAuthService(
      otpRepo,
      authService,
      mockEmailService,
      mockTokenService
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

    // Immediate second request must trigger RateLimitError
    await expect(service.requestCode('student@campus.edu')).rejects.toThrow(RateLimitError);
    await expect(service.requestCode('STUDENT@CAMPUS.EDU')).rejects.toThrow(
      /Please wait \d+ seconds before requesting another code/
    );
  });

  it('enforces max 5 OTP requests per hour rate limit', async () => {
    const email = 'spamcheck@campus.edu';

    // Simulate 5 requests within the hour
    for (let i = 0; i < 5; i++) {
      const challenge = {
        challengeId: `challenge-${i}`,
        email,
        codeHash: 'hash',
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        attempts: 0,
        maxAttempts: 3,
        consumed: true, // mark consumed to bypass 60s cooldown
        createdAt: new Date().toISOString(),
        lastResentAt: new Date(Date.now() - 70000).toISOString(), // > 60s ago
      };
      await otpRepo.createChallenge(challenge);
    }

    await expect(service.requestCode(email)).rejects.toThrow(
      'Too many verification code requests for this email. Please try again after an hour.'
    );
  });

  it('rejects incorrect 6-digit code with remaining attempts warning', async () => {
    const { challengeId } = await service.requestCode('student@campus.edu');

    await expect(
      service.verifyCode('student@campus.edu', '000000', challengeId)
    ).rejects.toThrow(/Invalid verification code\. Attempts remaining: 2/);

    const challenge = await otpRepo.findById(challengeId);
    expect(challenge?.attempts).toBe(1);
  });

  it('locks challenge after 3 incorrect attempts', async () => {
    const { challengeId } = await service.requestCode('student@campus.edu');

    // Attempt 1
    await expect(service.verifyCode('student@campus.edu', '000001', challengeId)).rejects.toThrow();
    // Attempt 2
    await expect(service.verifyCode('student@campus.edu', '000002', challengeId)).rejects.toThrow();
    // Attempt 3: Exceeded limit
    await expect(service.verifyCode('student@campus.edu', '000003', challengeId)).rejects.toThrow(
      RateLimitError
    );

    // Subsequent attempt should fail with rate limit error
    await expect(service.verifyCode('student@campus.edu', '000004', challengeId)).rejects.toThrow(
      RateLimitError
    );
  });

  it('rejects expired OTP challenges', async () => {
    const { challengeId } = await service.requestCode('student@campus.edu');

    // Manually expire challenge in repo
    const challenge = (await otpRepo.findById(challengeId))!;
    await otpRepo.createChallenge({
      ...challenge,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    await expect(
      service.verifyCode('student@campus.edu', capturedOtp!, challengeId)
    ).rejects.toThrow('Verification code has expired. Please request a new code.');
  });

  it('atomically marks challenge consumed and prevents code reuse', async () => {
    const { challengeId } = await service.requestCode('student@campus.edu');

    // First verification succeeds
    const verifyResult = await service.verifyCode(
      'student@campus.edu',
      capturedOtp!,
      challengeId
    );
    expect(verifyResult.token).toBeDefined();

    // Replay / reuse attempt must fail
    await expect(
      service.verifyCode('student@campus.edu', capturedOtp!, challengeId)
    ).rejects.toThrow(/already been used/);
  });

  it('provisions default student role upon successful verification', async () => {
    const { challengeId } = await service.requestCode('newstudent@campus.edu');

    const result = await service.verifyCode(
      'newstudent@campus.edu',
      capturedOtp!,
      challengeId
    );

    expect(result.token).toBeDefined();
    expect(result.user.email).toBe('newstudent@campus.edu');
    expect(result.user.role).toBe('student'); // Default role invariant

    // Verify stored profile in repository has student role
    const storedUser = await userRepo.findByUid(result.user.uid);
    expect(storedUser).toBeDefined();
    expect(storedUser?.role).toBe('student');
  });

  it('preserves existing user role (e.g. staff) upon verification', async () => {
    const email = 'existing@campus.edu';
    const uid = `user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Pre-seed user with staff role
    await userRepo.createOrUpdate({
      uid,
      email,
      role: 'staff',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const { challengeId } = await service.requestCode(email);

    const result = await service.verifyCode(
      email,
      capturedOtp!,
      challengeId
    );

    expect(result.user.uid).toBe(uid);
    expect(result.user.role).toBe('staff'); // Preserves staff role

    const storedUser = await userRepo.findByUid(uid);
    expect(storedUser?.role).toBe('staff');
  });
});
