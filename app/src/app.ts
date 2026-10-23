import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { IRepositoryRegistry } from './repositories/interfaces';
import { getRepositories } from './repositories';
import { getDbPool, isDatabaseConnected } from './config/database';
import { IAiService } from './types/ai';
import { IEmailDeliveryService } from './services/emailService';
import { ITokenService } from './services/tokenService';
import { createApiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { renderAuthTestPage } from './views/authTestPage';
import { ForbiddenError } from './errors/AppError';
import { env } from './config/env';

export function createApp(
  customRepos?: IRepositoryRegistry,
  customAiService?: IAiService,
  customEmailService?: IEmailDeliveryService,
  customTokenService?: ITokenService
): Express {
  const app = express();
  const repositories = customRepos || getRepositories();

  // Configurable CORS middleware supporting future separated frontend hosting
  const allowedOrigins = env.CORS_ALLOWED_ORIGINS
    ? env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin) {
          return callback(null, true);
        }

        // In non-production (dev/test), allow all origins for developer convenience
        if (env.NODE_ENV !== 'production') {
          return callback(null, true);
        }

        // In production, enforce allowlist if defined
        if (allowedOrigins.length > 0) {
          if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
          }
          return callback(new ForbiddenError(`Origin '${origin}' not permitted by CORS policy`));
        }

        // If no explicit allowlist configured, permit request
        return callback(null, true);
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Root health probes for Cloud Run / Kubernetes / Render
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'campusconnect-backend' });
  });

  app.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'campusconnect-backend' });
  });

  app.get('/readyz', async (_req: Request, res: Response) => {
    // In production mode without in-memory override, verify database connectivity
    if (env.NODE_ENV === 'production' && !env.USE_IN_MEMORY_REPO) {
      const pool = getDbPool();
      if (!pool) {
        res.status(503).json({
          status: 'not_ready',
          service: 'campusconnect-backend',
          reason: 'Database connection not initialized (DATABASE_URL missing)',
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
      customTokenService
    )
  );

  // Unmatched /api handler strictly returning structured 404 JSON (never HTML)
  app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route '${req.method} ${req.originalUrl}' not found`,
      },
    });
  });

  // Static assets & SPA fallback for Cloud Run / Google AI Studio containerized deployments
  const candidatePublicDirs = [
    path.resolve(__dirname, '../../public'),
    path.resolve(process.cwd(), 'public'),
    path.resolve(__dirname, '../public'),
  ];
  const publicDir = candidatePublicDirs.find((dir) => fs.existsSync(path.join(dir, 'index.html')));

  if (publicDir) {
    app.use(express.static(publicDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }

  // 404 handler for any remaining unmatched non-GET routes
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
