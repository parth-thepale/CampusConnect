import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '../types/domain';
import { UnauthorizedError } from '../errors/AppError';

export interface TokenPayload {
  uid: string;
  email?: string;
  role: Role;
  displayName?: string;
}

export interface ITokenService {
  generateToken(payload: TokenPayload, expiresIn?: string): string;
  verifyToken(token: string): TokenPayload;
  verifyGoogleIdToken(idToken: string): Promise<{ uid: string; email: string; displayName?: string }>;
}

export class JwtTokenService implements ITokenService {
  private get secret(): string {
    return env.JWT_SECRET || 'campusconnect-jwt-default-secret-2026';
  }

  generateToken(payload: TokenPayload, expiresIn: string = '7d'): string {
    return jwt.sign(
      {
        uid: payload.uid,
        email: payload.email,
        role: payload.role,
        displayName: payload.displayName,
      },
      this.secret,
      { expiresIn: expiresIn as any }
    );
  }

  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as any;
      if (!decoded || !decoded.uid) {
        throw new UnauthorizedError('Invalid authentication token payload');
      }
      return {
        uid: decoded.uid,
        email: decoded.email,
        role: decoded.role || 'student',
        displayName: decoded.displayName,
      };
    } catch (err: any) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid or expired authentication token');
    }
  }

  async verifyGoogleIdToken(idToken: string): Promise<{ uid: string; email: string; displayName?: string }> {
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (!res.ok) {
        throw new UnauthorizedError('Failed to verify Google ID token with Google identity servers');
      }
      const data = await res.json() as any;
      if (!data.email || !data.sub) {
        throw new UnauthorizedError('Google ID token did not contain required email or sub claims');
      }
      return {
        uid: `google_${data.sub}`,
        email: data.email,
        displayName: data.name || data.given_name || undefined,
      };
    } catch (err: any) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid or expired Google authentication token');
    }
  }
}
