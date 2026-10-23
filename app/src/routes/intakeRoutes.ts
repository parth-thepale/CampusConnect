import { Router, Request, Response, NextFunction } from 'express';
import { IntakeService } from '../services/intakeService';
import { validateRequest } from '../middleware/validate';
import {
  createIntakeSchema,
  updateIntakeSchema,
} from '../schemas/validation';

export function createIntakeRoutes(
  intakeService: IntakeService,
  authMiddleware: any
): Router {
  const router = Router();

  // All intake endpoints require authentication
  router.use(authMiddleware);

  /**
   * POST /api/intakes
   * Create an intake draft belonging to the authenticated student.
   */
  router.post(
    '/',
    validateRequest({ body: createIntakeSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const studentUid = req.user!.uid;
        const intake = await intakeService.createIntake(studentUid, req.body);
        res.status(201).json({
          success: true,
          data: intake,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * GET /api/intakes/:intakeId
   * Retrieve an intake for its owner or authorized staff.
   */
  router.get(
    '/:intakeId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const intake = await intakeService.getIntake(
          req.params.intakeId,
          req.user!.uid,
          req.user!.role
        );
        res.status(200).json({
          success: true,
          data: intake,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * PATCH /api/intakes/:intakeId
   * Update permitted complaint details on an editable intake.
   */
  router.patch(
    '/:intakeId',
    validateRequest({ body: updateIntakeSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const updated = await intakeService.updateIntake(
          req.params.intakeId,
          req.user!.uid,
          req.body
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
   * POST /api/intakes/:intakeId/confirm
   * Validate completeness and confirm intake into an official ticket.
   * Idempotent: returns existing ticket if already confirmed.
   */
  router.post(
    '/:intakeId/confirm',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await intakeService.confirmIntake(
          req.params.intakeId,
          req.user!.uid
        );
        res.status(result.isNew ? 201 : 200).json({
          success: true,
          data: result,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
