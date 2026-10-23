import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { User, Role } from '../types/domain';
import { AuthService } from '../services/authService';
import { ITokenService, JwtTokenService } from '../services/tokenService';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function createAuthMiddleware(
  authService: AuthService,
  customTokenService?: ITokenService
) {
  const tokenService = customTokenService || new JwtTokenService();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      // 1. Dev Auth Override Check (STRICTLY FORBIDDEN IN PRODUCTION)
      if (env.ALLOW_DEV_AUTH && env.NODE_ENV !== 'production') {
        const devUid = req.headers['x-dev-user-id'] as string | undefined;
        const devRole = req.headers['x-dev-user-role'] as Role | undefined;

        if (devUid) {
          // Resolve or provision dev user
          const user = await authService.resolveUser(devUid, {
            email: `${devUid}@campus.dev`,
            displayName: `Dev User (${devUid})`,
          });

          // In dev mode, if an explicit role header was passed, apply it for this request context only
          if (devRole && user.role !== devRole) {
            req.user = { ...user, role: devRole };
          } else {
            req.user = user;
          }
          return next();
        }
      }

      // 2. Production Security Path: Verify Bearer JWT
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Missing or malformed Authorization header. Expected Bearer token.');
      }

      const token = authHeader.split('Bearer ')[1].trim();
      if (!token) {
        throw new UnauthorizedError('Bearer token is empty');
      }

      let decodedToken;
      try {
        decodedToken = tokenService.verifyToken(token);
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : 'Unknown auth verification error';
        console.warn(`Token verification failed: ${errMessage}`);
        throw new UnauthorizedError('Invalid or expired authentication token');
      }

      // Resolve user profile & role from authoritative data store
      const user = await authService.resolveUser(decodedToken.uid, {
        email: decodedToken.email,
        displayName: decodedToken.displayName,
      });

      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}
