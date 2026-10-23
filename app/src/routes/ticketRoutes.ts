import { Router, Request, Response, NextFunction } from 'express';
import { TicketService } from '../services/ticketService';
import { validateRequest } from '../middleware/validate';
import { paginationQuerySchema } from '../schemas/validation';

export function createTicketRoutes(
  ticketService: TicketService,
  authMiddleware: any
): Router {
  const router = Router();

  router.use(authMiddleware);

  /**
   * GET /api/tickets
   * Return only the authenticated student's tickets with pagination.
   */
  router.get(
    '/',
    validateRequest({ query: paginationQuerySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const studentUid = req.user!.uid;
        const limit = Number(req.query.limit) || 20;
        const offset = Number(req.query.offset) || 0;

        const result = await ticketService.listStudentTickets(studentUid, {
          limit,
          offset,
        });

        res.status(200).json({
          success: true,
          data: {
            items: result.items,
            pagination: {
              limit,
              offset,
              total: result.total,
            },
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * GET /api/tickets/:ticketId
   * Return an individual ticket only to its owner or authorized staff.
   */
  router.get(
    '/:ticketId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ticket = await ticketService.getTicket(
          req.params.ticketId,
          req.user!.uid,
          req.user!.role
        );

        res.status(200).json({
          success: true,
          data: ticket,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * GET /api/tickets/:ticketId/events
   * Return permitted chronological event history.
   */
  router.get(
    '/:ticketId/events',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const events = await ticketService.getTicketEvents(
          req.params.ticketId,
          req.user!.uid,
          req.user!.role
        );

        res.status(200).json({
          success: true,
          data: events,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
