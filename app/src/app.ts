import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { IRepositoryRegistry } from './repositories/interfaces';
import { getRepositories } from './repositories';
import { IAiService } from './types/ai';
import { IEmailDeliveryService } from './services/emailService';
import { IFirebaseAuthClient } from './services/firebaseAuthClient';
import { createApiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { renderAuthTestPage } from './views/authTestPage';
import { env } from './config/env';

export function createApp(
  customRepos?: IRepositoryRegistry,
  customAiService?: IAiService,
  customEmailService?: IEmailDeliveryService,
  customFirebaseAuth?: IFirebaseAuthClient
): Express {
  const app = express();
  const repositories = customRepos || getRepositories();

  // Basic security and parsing middleware
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Root health probes for Google Cloud Run / Kubernetes
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'campusconnect-backend' });
  });

  app.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'campusconnect-backend' });
  });

  app.get('/readyz', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ready', service: 'campusconnect-backend' });
  });

  // Root landing endpoint for browsers & developer ease of use
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      name: 'CampusConnect Backend API',
      version: '1.0.0',
      status: 'operational',
      endpoints: {
        health: '/api/health',
        healthz: '/healthz',
        readyz: '/readyz',
        auth: '/api/auth',
        intakes: '/api/intakes',
        tickets: '/api/tickets',
        staff: '/api/staff/tickets',
        authTestHarness: env.AUTH_TEST_PAGE_ENABLED || env.NODE_ENV !== 'production' ? '/auth-test' : undefined,
      },
    });
  });

  // Temporary browser authentication diagnostic test harness
  const serveAuthTest = (_req: Request, res: Response) => {
    if (env.NODE_ENV === 'production' && !env.AUTH_TEST_PAGE_ENABLED) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Auth test page is disabled in production.' },
      });
      return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(renderAuthTestPage());
  };

  app.get('/auth-test', serveAuthTest);
  app.get('/auth-diagnostic', serveAuthTest);

  // Mount API router at /api
  app.use(
    '/api',
    createApiRouter(
      repositories,
      customAiService,
      customEmailService,
      customFirebaseAuth
    )
  );

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
