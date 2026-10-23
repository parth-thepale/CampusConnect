import { Router, Request, Response, NextFunction } from 'express';
import { OtpAuthService } from '../services/otpAuthService';
import { AuthService } from '../services/authService';
import { ITokenService, JwtTokenService } from '../services/tokenService';
import { env } from '../config/env';
import { NotFoundError, UnauthorizedError, ValidationError } from '../errors/AppError';

export function createAuthRoutes(
  otpAuthService: OtpAuthService,
  authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>,
  authService?: AuthService,
  customTokenService?: ITokenService
): Router {
  const router = Router();
  const tokenService = customTokenService || new JwtTokenService();

  /**
   * GET /api/auth/me
   * Returns current authenticated user's profile and effective role.
   * STRICTLY PROTECTED by authMiddleware.
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
   * Verifies the 6-digit numeric OTP and returns a session JWT token.
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
          token: result.token,
          customToken: result.customToken, // Backward compatibility alias
          user: result.user,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/auth/google/verify
   * Verifies Google identity token and establishes backend session JWT.
   */
  router.post('/google/verify', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idToken = req.body?.credential || req.body?.idToken;
      if (!idToken || typeof idToken !== 'string') {
        throw new ValidationError('Google credential or idToken is required');
      }

      if (!authService) {
        throw new Error('Auth service not configured for Google identity verification');
      }

      const googleUser = await tokenService.verifyGoogleIdToken(idToken);
      const appUser = await authService.resolveUser(googleUser.uid, {
        email: googleUser.email,
        displayName: googleUser.displayName,
      });

      const token = tokenService.generateToken({
        uid: appUser.uid,
        email: appUser.email,
        role: appUser.role,
        displayName: appUser.displayName,
      });

      res.status(200).json({
        success: true,
        message: 'Google authentication successful',
        data: {
          token,
          customToken: token,
          user: {
            uid: appUser.uid,
            email: appUser.email,
            role: appUser.role,
            displayName: appUser.displayName,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/auth/config
   * Returns public client auth configuration.
   */
  router.get('/config', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        authMode: 'jwt',
        googleClientId: env.GOOGLE_CLIENT_ID || '',
      },
    });
  });

  return router;
}
