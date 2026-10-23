import { Request, Response, NextFunction } from 'express';
import { Role } from '../types/domain';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError';

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Required role: [${allowedRoles.join(', ')}], current role: '${req.user.role}'`
        )
      );
    }

    next();
  };
}

export const requireStaff = requireRole(['staff', 'admin']);
export const requireAdmin = requireRole(['admin']);
