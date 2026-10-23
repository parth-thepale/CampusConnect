import { Router, Request, Response, NextFunction } from 'express';
import { TicketService } from '../services/ticketService';
import { requireStaff } from '../middleware/role';
import { validateRequest } from '../middleware/validate';
import {
  assignTicketSchema,
  updateTicketStatusSchema,
  addStaffNoteSchema,
  paginationQuerySchema,
} from '../schemas/validation';

export function createStaffRoutes(
  ticketService: TicketService,
  authMiddleware: any
): Router {
  const router = Router();

  // All staff routes require verified authentication and staff/admin role
  router.use(authMiddleware);
  router.use(requireStaff);

  /**
   * GET /api/staff/tickets
   * Operational queue for campus staff to triage, filter, and inspect tickets.
   */
  router.get(
    '/tickets',
    validateRequest({ query: paginationQuerySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const limit = Number(req.query.limit) || 20;
        const offset = Number(req.query.offset) || 0;
        const status = req.query.status as any;
        const category = req.query.category as any;
        const assignedToUid = req.query.assignedToUid as string | undefined;

        const result = await ticketService.listStaffTickets({
          status,
          category,
          assignedToUid,
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
   * PATCH /api/staff/tickets/:ticketId/assignment
   * Allow authorized staff to assign ticket to an operational staff member.
   */
  router.patch(
    '/tickets/:ticketId/assignment',
    validateRequest({ body: assignTicketSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { assignedToUid } = req.body;
        const actorUid = req.user!.uid;

        const updated = await ticketService.assignTicket(
          req.params.ticketId,
          assignedToUid,
          actorUid
        );

        res.status(200).json({
          success: true,
          data: updated,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * PATCH /api/staff/tickets/:ticketId/status
   * Allow authorized staff to transition ticket lifecycle state.
   */
  router.patch(
    '/tickets/:ticketId/status',
    validateRequest({ body: updateTicketStatusSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { status, note } = req.body;
        const actorUid = req.user!.uid;

        const updated = await ticketService.updateStatus(
          req.params.ticketId,
          status,
          actorUid,
          note
        );

        res.status(200).json({
          success: true,
          data: updated,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * POST /api/staff/tickets/:ticketId/notes
   * Allow authorized staff to add an operational note to ticket history.
   */
  router.post(
    '/tickets/:ticketId/notes',
    validateRequest({ body: addStaffNoteSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { note, isInternal } = req.body;
        const actorUid = req.user!.uid;

        const event = await ticketService.addStaffNote(
          req.params.ticketId,
          actorUid,
          note,
          isInternal
        );

        res.status(201).json({
          success: true,
          data: event,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
