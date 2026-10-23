import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Known Application Error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // 2. Direct Zod Error (if uncaught by validation middleware)
  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request payload validation failed',
        details: issues,
      },
    });
    return;
  }

  // 3. Malformed JSON Body
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MALFORMED_JSON',
        message: 'The request body contains invalid JSON syntax',
      },
    });
    return;
  }

  // 4. Catch-all Unexpected Errors
  // Log safely on the server without leaking sensitive request payloads or tokens
  const safeLog = {
    method: req.method,
    path: req.originalUrl || req.url,
    error: err?.message || 'Unknown error',
    timestamp: new Date().toISOString(),
  };
  console.error('Unhandled internal server error:', JSON.stringify(safeLog));

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred. Please try again later.',
    },
  });
}
