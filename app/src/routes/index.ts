import { Router } from 'express';
import { IRepositoryRegistry } from '../repositories/interfaces';
import { AuthService } from '../services/authService';
import { OtpAuthService } from '../services/otpAuthService';
import { IEmailDeliveryService } from '../services/emailService';
import { ITokenService, JwtTokenService } from '../services/tokenService';
import { IntakeService } from '../services/intakeService';
import { TicketService } from '../services/ticketService';
import { IAiService } from '../types/ai';
import { GeminiService } from '../services/geminiService';
import { createAuthMiddleware } from '../middleware/auth';
import { createHealthRoutes } from './healthRoutes';
import { createAuthRoutes } from './authRoutes';
import { createIntakeRoutes } from './intakeRoutes';
import { createTicketRoutes } from './ticketRoutes';
import { createStaffRoutes } from './staffRoutes';

export function createApiRouter(
  repositories: IRepositoryRegistry,
  aiService?: IAiService,
  customEmailService?: IEmailDeliveryService,
  customTokenService?: ITokenService
): Router {
  const router = Router();
  const activeAiService = aiService || new GeminiService();
  const tokenService = customTokenService || new JwtTokenService();

  const authService = new AuthService(repositories.users);
  const otpAuthService = new OtpAuthService(
    repositories.otps,
    authService,
    customEmailService,
    tokenService
  );
  const ticketService = new TicketService(
    repositories.tickets,
    repositories.events,
    activeAiService
  );
  const intakeService = new IntakeService(
    repositories.intakes,
    ticketService,
    activeAiService
  );

  const authMiddleware = createAuthMiddleware(authService, tokenService);

  // Mount routes under /api
  router.use(createHealthRoutes());
  router.use('/auth', createAuthRoutes(otpAuthService, authMiddleware, authService, tokenService));
  router.use('/intakes', createIntakeRoutes(intakeService, authMiddleware));
  router.use('/tickets', createTicketRoutes(ticketService, authMiddleware));
  router.use('/staff', createStaffRoutes(ticketService, authMiddleware));

  return router;
}
