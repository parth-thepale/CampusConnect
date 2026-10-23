import { Router } from 'express';
import { IRepositoryRegistry } from '../repositories/interfaces';
import { AuthService } from '../services/authService';
import { IntakeService } from '../services/intakeService';
import { TicketService } from '../services/ticketService';
import { createAuthMiddleware } from '../middleware/auth';
import { createHealthRoutes } from './healthRoutes';
import { createIntakeRoutes } from './intakeRoutes';
import { createTicketRoutes } from './ticketRoutes';
import { createStaffRoutes } from './staffRoutes';

export function createApiRouter(repositories: IRepositoryRegistry): Router {
  const router = Router();

  const authService = new AuthService(repositories.users);
  const ticketService = new TicketService(repositories.tickets, repositories.events);
  const intakeService = new IntakeService(repositories.intakes, ticketService);

  const authMiddleware = createAuthMiddleware(authService);

  // Mount routes under /api
  router.use(createHealthRoutes());
  router.use('/intakes', createIntakeRoutes(intakeService, authMiddleware));
  router.use('/tickets', createTicketRoutes(ticketService, authMiddleware));
  router.use('/staff', createStaffRoutes(ticketService, authMiddleware));

  return router;
}
