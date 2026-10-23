import { Router, Request, Response } from 'express';
import { getDbPool, isDatabaseConnected } from '../config/database';
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

  router.get('/readyz', async (_req: Request, res: Response) => {
    if (env.NODE_ENV === 'production' && !env.USE_IN_MEMORY_REPO) {
      const pool = getDbPool();
      if (!pool) {
        res.status(503).json({
          status: 'not_ready',
          service: 'campusconnect-backend',
          reason: 'Database pool not configured (DATABASE_URL missing)',
        });
        return;
      }
      const connected = await isDatabaseConnected();
      if (!connected) {
        res.status(503).json({
          status: 'not_ready',
          service: 'campusconnect-backend',
          reason: 'Database connection probe failed',
        });
        return;
      }
    }
    res.status(200).json({ status: 'ready', service: 'campusconnect-backend' });
  });

  return router;
}
