import crypto from 'crypto';
import { z } from 'zod';
import { env } from '../config/env';
import { IOtpRepository, OtpChallenge } from '../repositories/interfaces';
import { AuthService } from './authService';
import { IEmailDeliveryService, SmtpEmailService } from './emailService';
import { ITokenService, JwtTokenService } from './tokenService';
import {
  ValidationError,
  RateLimitError,
} from '../errors/AppError';
import { User } from '../types/domain';

const emailSchema = z.string().trim().email('Invalid email address');
const codeSchema = z.string().trim().regex(/^\d{6}$/, 'Code must be exactly 6 digits');

export interface RequestOtpResult {
  challengeId: string;
  message: string;
}

export interface VerifyOtpResult {
  token: string;
  customToken: string;
  user: {
    uid: string;
    email?: string;
    role: string;
    displayName?: string;
  };
}

export class OtpAuthService {
  private emailService: IEmailDeliveryService;
  private tokenService: ITokenService;

  constructor(
    private otpRepo: IOtpRepository,
    private authService: AuthService,
    customEmailService?: IEmailDeliveryService,
    customTokenService?: ITokenService
  ) {
    this.emailService = customEmailService || new SmtpEmailService();
    this.tokenService = customTokenService || new JwtTokenService();
  }

  private hashCode(email: string, code: string): string {
    const secret = env.AUTH_EMAIL_OTP_SECRET || 'campusconnect-secret-salt-2026';
    return crypto
      .createHmac('sha256', secret)
      .update(`${email}:${code}`)
      .digest('hex');
  }

  async requestCode(rawEmail: string): Promise<RequestOtpResult> {
    const parseResult = emailSchema.safeParse(rawEmail);
    if (!parseResult.success) {
      throw new ValidationError('Invalid email address format');
    }
    const email = parseResult.data.toLowerCase();

    // 1. Resend Cooldown Check (60 seconds)
    const latest = await this.otpRepo.findLatestByEmail(email);
    if (latest && !latest.consumed) {
      const lastResentMs = new Date(latest.lastResentAt || latest.createdAt).getTime();
      const elapsedMs = Date.now() - lastResentMs;
      if (elapsedMs < 60000) {
        const waitSec = Math.ceil((60000 - elapsedMs) / 1000);
        throw new RateLimitError(
          `Please wait ${waitSec} second${waitSec === 1 ? '' : 's'} before requesting another code.`
        );
      }
    }

    // 2. Hourly Abuse Limit Check (Max 5 code requests per hour per email)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const recentRequestsCount = await this.otpRepo.countRecentRequests(email, oneHourAgo);
    if (recentRequestsCount >= 5) {
      throw new RateLimitError(
        'Too many verification code requests for this email. Please try again after an hour.'
      );
    }

    // 3. Cryptographically Random 6-digit Code Generation
    const numericCode = crypto.randomInt(100000, 1000000).toString();
    const codeHash = this.hashCode(email, numericCode);
    const challengeId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // 4. Send Email via Configured Provider FIRST
    // If delivery fails, do NOT leave an active challenge
    await this.emailService.sendOtpEmail(email, numericCode);

    // 5. Store Protected Challenge (Only HMAC hash is stored; raw code is discarded)
    const challenge: OtpChallenge = {
      challengeId,
      email,
      codeHash,
      expiresAt,
      attempts: 0,
      maxAttempts: 3,
      consumed: false,
      createdAt: now.toISOString(),
      lastResentAt: now.toISOString(),
    };

    await this.otpRepo.createChallenge(challenge);

    // Return generic safe response without leaking existence or code
    return {
      challengeId,
      message: 'If this email is valid, a verification code has been sent.',
    };
  }

  async verifyCode(
    rawEmail: string,
    rawCode: string,
    challengeId?: string
  ): Promise<VerifyOtpResult> {
    const emailResult = emailSchema.safeParse(rawEmail);
    if (!emailResult.success) {
      throw new ValidationError('Invalid email address format');
    }
    const email = emailResult.data.toLowerCase();

    const codeResult = codeSchema.safeParse(rawCode);
    if (!codeResult.success) {
      throw new ValidationError('Verification code must be exactly 6 digits');
    }
    const code = codeResult.data;

    // 1. Retrieve Challenge
    let challenge: OtpChallenge | null = null;
    if (challengeId) {
      challenge = await this.otpRepo.findById(challengeId);
    } else {
      challenge = await this.otpRepo.findLatestByEmail(email);
    }

    if (!challenge) {
      throw new ValidationError('Invalid, expired, or already used verification code');
    }

    if (challenge.email !== email) {
      throw new ValidationError('Invalid verification code');
    }

    // 2. State & Expiry Checks
    if (challenge.consumed) {
      throw new ValidationError('This verification code has already been used. Please request a new code.');
    }

    if (new Date(challenge.expiresAt).getTime() < Date.now()) {
      throw new ValidationError('Verification code has expired. Please request a new code.');
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      throw new RateLimitError('Maximum verification attempts exceeded. Please request a new code.');
    }

    // 3. Atomically Increment Attempts
    const newAttempts = await this.otpRepo.incrementAttempts(challenge.challengeId);

    // 4. Constant-Time Hash Comparison
    const inputHash = this.hashCode(email, code);
    const bufferExpected = Buffer.from(challenge.codeHash, 'hex');
    const bufferInput = Buffer.from(inputHash, 'hex');

    const isMatch =
      bufferExpected.length === bufferInput.length &&
      crypto.timingSafeEqual(bufferExpected, bufferInput);

    if (!isMatch) {
      const remaining = Math.max(0, challenge.maxAttempts - newAttempts);
      if (remaining === 0) {
        throw new RateLimitError('Invalid verification code. Maximum attempts exceeded. Please request a new code.');
      }
      throw new ValidationError(`Invalid verification code. Attempts remaining: ${remaining}`);
    }

    // 5. Consume Challenge (Prevent Concurrent Reuse)
    await this.otpRepo.markConsumed(challenge.challengeId);

    // 6. Find or Resolve User
    const sanitizedEmailUid = `user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const appUser: User = await this.authService.resolveUser(sanitizedEmailUid, {
      email,
    });

    // 7. Generate Signed Session JWT Token
    const token = this.tokenService.generateToken({
      uid: appUser.uid,
      email: appUser.email,
      role: appUser.role,
      displayName: appUser.displayName,
    });

    return {
      token,
      customToken: token, // Backward compatibility alias
      user: {
        uid: appUser.uid,
        email: appUser.email,
        role: appUser.role,
        displayName: appUser.displayName,
      },
    };
  }
}
