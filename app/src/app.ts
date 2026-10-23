import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { IRepositoryRegistry } from './repositories/interfaces';
import { getRepositories } from './repositories';
import { createApiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(customRepos?: IRepositoryRegistry): Express {
  const app = express();
  const repositories = customRepos || getRepositories();

  // Basic security and parsing middleware
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Root health fallback for container health probes
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'campusconnect' });
  });

  // Root landing endpoint for browsers & developer ease of use
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      name: 'CampusConnect Backend API',
      version: '1.0.0',
      status: 'operational',
      endpoints: {
        health: '/api/health',
        intakes: '/api/intakes',
        tickets: '/api/tickets',
        staff: '/api/staff/tickets',
      },
    });
  });

  // Mount API router at /api
  app.use('/api', createApiRouter(repositories));

  // 404 handler for unmatched routes
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route '${req.method} ${req.originalUrl}' not found`,
      },
    });
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
}
