import { Router, Request, Response } from 'express';

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

  return router;
}
