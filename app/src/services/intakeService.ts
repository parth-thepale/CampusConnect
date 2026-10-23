import crypto from 'crypto';
import { Intake, Role, Category } from '../types/domain';
import { IIntakeRepository } from '../repositories/interfaces';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '../errors/AppError';
import { TicketService } from './ticketService';

export class IntakeService {
  constructor(
    private intakeRepo: IIntakeRepository,
    private ticketService: TicketService
  ) {}

  async createIntake(
    createdByUid: string,
    data: {
      description: string;
      location?: string;
      category?: Category;
      additionalDetails?: Record<string, unknown>;
      attachments?: string[];
    }
  ): Promise<Intake> {
    const now = new Date().toISOString();
    const intakeId = `intake_${crypto.randomUUID()}`;

    const intake: Intake = {
      intakeId,
      createdByUid,
      description: data.description,
      location: data.location,
      category: data.category,
      additionalDetails: data.additionalDetails,
      attachments: data.attachments,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };

    return await this.intakeRepo.create(intake);
  }

  async getIntake(
    intakeId: string,
    requesterUid: string,
    requesterRole: Role
  ): Promise<Intake> {
    const intake = await this.intakeRepo.findById(intakeId);
    if (!intake) {
      throw new NotFoundError('Complaint intake');
    }

    const isStaffOrAdmin = requesterRole === 'staff' || requesterRole === 'admin';
    if (!isStaffOrAdmin && intake.createdByUid !== requesterUid) {
      throw new ForbiddenError('You do not have permission to view this complaint intake');
    }

    return intake;
  }

  async updateIntake(
    intakeId: string,
    requesterUid: string,
    data: {
      description?: string;
      location?: string;
      category?: Category;
      additionalDetails?: Record<string, unknown>;
      attachments?: string[];
    }
  ): Promise<Intake> {
    const intake = await this.intakeRepo.findById(intakeId);
    if (!intake) {
      throw new NotFoundError('Complaint intake');
    }

    if (intake.createdByUid !== requesterUid) {
      throw new ForbiddenError('You do not have permission to modify this complaint intake');
    }

    if (intake.status === 'confirmed') {
      throw new ConflictError('Cannot modify a complaint intake that has already been confirmed');
    }

    const updatePayload: Partial<Intake> = {};
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.location !== undefined) updatePayload.location = data.location;
    if (data.category !== undefined) updatePayload.category = data.category;
    if (data.additionalDetails !== undefined) updatePayload.additionalDetails = data.additionalDetails;
    if (data.attachments !== undefined) updatePayload.attachments = data.attachments;

    return await this.intakeRepo.update(intakeId, updatePayload);
  }

  async confirmIntake(
    intakeId: string,
    requesterUid: string
  ): Promise<{ ticketId: string; ticketNumber: string; isNew: boolean }> {
    const intake = await this.intakeRepo.findById(intakeId);
    if (!intake) {
      throw new NotFoundError('Complaint intake');
    }

    if (intake.createdByUid !== requesterUid) {
      throw new ForbiddenError('You do not have permission to confirm this complaint intake');
    }

    // Idempotency check: if already confirmed and linked to a ticket, return the existing ticket
    if (intake.status === 'confirmed' && intake.ticketId) {
      const existingTicket = await this.ticketService.getTicketByIdDirect(intake.ticketId);
      if (existingTicket) {
        return {
          ticketId: existingTicket.ticketId,
          ticketNumber: existingTicket.ticketNumber,
          isNew: false,
        };
      }
    }

    // Deterministic completeness validation
    const missingFields: string[] = [];
    if (!intake.description || intake.description.trim().length < 10) {
      missingFields.push('description (at least 10 characters)');
    }
    if (!intake.location || intake.location.trim().length < 3) {
      missingFields.push('location (at least 3 characters)');
    }
    if (!intake.category) {
      missingFields.push('category');
    }

    if (missingFields.length > 0) {
      throw new ValidationError(
        `Complaint intake cannot be confirmed. Required information is missing: ${missingFields.join(', ')}`,
        { missingFields }
      );
    }

    // Create persistent ticket
    const ticket = await this.ticketService.createFromIntake({
      intakeId: intake.intakeId,
      createdByUid: intake.createdByUid,
      description: intake.description,
      location: intake.location!,
      category: intake.category!,
    });

    // Update intake state
    await this.intakeRepo.update(intakeId, {
      status: 'confirmed',
      ticketId: ticket.ticketId,
    });

    return {
      ticketId: ticket.ticketId,
      ticketNumber: ticket.ticketNumber,
      isNew: true,
    };
  }
}
