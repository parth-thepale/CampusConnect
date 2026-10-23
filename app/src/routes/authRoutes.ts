import { Router, Request, Response, NextFunction } from 'express';
import { OtpAuthService } from '../services/otpAuthService';
import { env } from '../config/env';
import { NotFoundError, UnauthorizedError } from '../errors/AppError';

export function createAuthRoutes(
  otpAuthService: OtpAuthService,
  authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>
): Router {
  const router = Router();

  /**
   * GET /api/auth/me
   * Returns current authenticated user's profile and effective role.
   * STRICTLY PROTECTED by authMiddleware (Firebase ID Token or Dev Auth in dev mode).
   */
  router.get('/me', authMiddleware, (req: Request, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('User session could not be established');
    }

    res.status(200).json({
      success: true,
      data: {
        uid: req.user.uid,
        email: req.user.email,
        role: req.user.role,
        displayName: req.user.displayName,
        createdAt: req.user.createdAt,
      },
    });
  });

  /**
   * POST /api/auth/email/request-code
   * Initiates passwordless email OTP verification.
   * Publicly accessible, rate-limited, and protected against account enumeration.
   */
  router.post('/email/request-code', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = req.body?.email;
      const result = await otpAuthService.requestCode(email);
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          challengeId: result.challengeId,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/auth/email/verify-code
   * Verifies the 6-digit numeric OTP and returns a Firebase custom token.
   * Publicly accessible, max-attempt bounded, and atomically consumed.
   */
  router.post('/email/verify-code', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, code, challengeId } = req.body || {};
      const result = await otpAuthService.verifyCode(email, code, challengeId);
      res.status(200).json({
        success: true,
        message: 'Verification successful',
        data: {
          customToken: result.customToken,
          user: result.user,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/auth/config
   * Returns public Firebase client configuration solely for the temporary test page.
   * Guarded by AUTH_TEST_PAGE_ENABLED flag.
   */
  router.get('/config', (_req: Request, res: Response) => {
    if (!env.AUTH_TEST_PAGE_ENABLED && env.NODE_ENV === 'production') {
      throw new NotFoundError('Auth test configuration');
    }

    res.status(200).json({
      success: true,
      data: {
        apiKey: env.FIREBASE_CLIENT_API_KEY || '',
        authDomain: env.FIREBASE_CLIENT_AUTH_DOMAIN || '',
        projectId:
          env.FIREBASE_CLIENT_PROJECT_ID ||
          env.FIREBASE_PROJECT_ID ||
          env.GOOGLE_CLOUD_PROJECT ||
          '',
        storageBucket: env.FIREBASE_CLIENT_STORAGE_BUCKET || '',
        messagingSenderId: env.FIREBASE_CLIENT_MESSAGING_SENDER_ID || '',
        appId: env.FIREBASE_CLIENT_APP_ID || '',
      },
    });
  });

  return router;
}
