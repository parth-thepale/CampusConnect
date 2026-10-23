import { Router, Request, Response } from 'express';
import { isFirebaseConfigured } from '../repositories/firestore/client';
import { env } from '../config/env';

export function createHealthRoutes(): Router {
  const router = Router();

  /**
   * GET /api/health
   * Confirms the server process is operational without leaking system internals.
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        service: 'campusconnect-backend',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  });

  router.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'campusconnect-backend' });
  });

  router.get('/readyz', (_req: Request, res: Response) => {
    if (env.NODE_ENV === 'production' && !env.USE_IN_MEMORY_REPO) {
      if (!isFirebaseConfigured()) {
        res.status(503).json({
          status: 'not_ready',
          service: 'campusconnect-backend',
          reason: 'Database connection not initialized',
        });
        return;
      }
    }
    res.status(200).json({ status: 'ready', service: 'campusconnect-backend' });
  });

  return router;
}
