import crypto from 'crypto';
import {
  Ticket,
  TicketEvent,
  TicketEventType,
  TicketStatus,
  Category,
  Role,
  isValidStatusTransition,
} from '../types/domain';
import {
  ITicketRepository,
  IEventRepository,
  TicketFilter,
} from '../repositories/interfaces';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  InvalidTransitionError,
  AiServiceUnavailableError,
} from '../errors/AppError';
import { IAiService, DuplicateCandidate } from '../types/ai';

export class TicketService {
  constructor(
    private ticketRepo: ITicketRepository,
    private eventRepo: IEventRepository,
    private aiService?: IAiService
  ) {}

  async createFromIntake(data: {
    intakeId: string;
    createdByUid: string;
    description: string;
    location: string;
    category: Category;
    departmentSuggestion?: string;
  }): Promise<Ticket> {
    const now = new Date().toISOString();
    const ticketId = `ticket_${crypto.randomUUID()}`;
    const ticketNumber = await this.ticketRepo.getNextTicketNumber();

    const ticket: Ticket = {
      ticketId,
      ticketNumber,
      createdByUid: data.createdByUid,
      intakeId: data.intakeId,
      description: data.description,
      location: data.location,
      category: data.category,
      departmentSuggestion: data.departmentSuggestion,
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    };

    const initialEvent: TicketEvent = {
      eventId: `evt_${crypto.randomUUID()}`,
      ticketId,
      eventType: 'ticket_created',
      actorUid: data.createdByUid,
      timestamp: now,
      metadata: {
        initialStatus: 'submitted',
        category: data.category,
        location: data.location,
      },
    };

    return await this.ticketRepo.create(ticket, initialEvent);
  }

  async getTicket(
    ticketId: string,
    requesterUid: string,
    requesterRole: Role
  ): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket');
    }

    const isStaffOrAdmin = requesterRole === 'staff' || requesterRole === 'admin';
    if (!isStaffOrAdmin && ticket.createdByUid !== requesterUid) {
      throw new ForbiddenError('You do not have permission to view this ticket');
    }

    return ticket;
  }

  async getTicketByIdDirect(ticketId: string): Promise<Ticket | null> {
    return await this.ticketRepo.findById(ticketId);
  }

  async getTicketEvents(
    ticketId: string,
    requesterUid: string,
    requesterRole: Role
  ): Promise<TicketEvent[]> {
    // Verifies caller has permission to view ticket
    await this.getTicket(ticketId, requesterUid, requesterRole);

    const events = await this.eventRepo.listByTicketId(ticketId);
    const isStaffOrAdmin = requesterRole === 'staff' || requesterRole === 'admin';

    if (isStaffOrAdmin) {
      return events;
    }

    // Filter out internal-only notes from student-visible history
    return events
      .filter((e) => !e.metadata?.isInternal)
      .map((e) => {
        // Redact internal notes if present
        if (e.metadata?.isInternal) {
          const { note, ...rest } = e.metadata;
          return { ...e, metadata: rest };
        }
        return e;
      });
  }

  async listStudentTickets(
    studentUid: string,
    pagination: { limit: number; offset: number }
  ): Promise<{ items: Ticket[]; total: number }> {
    return await this.ticketRepo.list({
      createdByUid: studentUid,
      limit: pagination.limit,
      offset: pagination.offset,
    });
  }

  async listStaffTickets(
    filter: {
      status?: TicketStatus;
      category?: Category;
      assignedToUid?: string;
      limit: number;
      offset: number;
    }
  ): Promise<{ items: Ticket[]; total: number }> {
    return await this.ticketRepo.list(filter);
  }

  async assignTicket(
    ticketId: string,
    assignedToUid: string,
    actorUid: string
  ): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket');
    }

    const now = new Date().toISOString();
    const previousAssignee = ticket.assignedToUid;

    // If ticket was submitted, assigning it also moves status to 'assigned'
    let newStatus = ticket.status;
    if (ticket.status === 'submitted') {
      newStatus = 'assigned';
    }

    const updatePayload: Partial<Ticket> = {
      assignedToUid,
      status: newStatus,
    };

    const event: TicketEvent = {
      eventId: `evt_${crypto.randomUUID()}`,
      ticketId,
      eventType: 'ticket_assigned',
      actorUid,
      timestamp: now,
      metadata: {
        assignedToUid,
        previousAssignee,
        status: newStatus,
      },
    };

    return await this.ticketRepo.update(ticketId, updatePayload, event);
  }

  async updateStatus(
    ticketId: string,
    newStatus: TicketStatus,
    actorUid: string,
    note?: string
  ): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket');
    }

    if (!isValidStatusTransition(ticket.status, newStatus)) {
      throw new InvalidTransitionError(ticket.status, newStatus);
    }

    const now = new Date().toISOString();
    const updatePayload: Partial<Ticket> = {
      status: newStatus,
    };

    if (newStatus === 'resolved') {
      if (!note || note.trim().length < 5) {
        throw new ValidationError('A meaningful resolution note is required when resolving a ticket');
      }
      updatePayload.resolutionNote = note.trim();
      updatePayload.resolvedAt = now;
    }

    let eventType: TicketEventType = 'status_changed';
    if (newStatus === 'resolved') {
      eventType = 'ticket_resolved';
    } else if (newStatus === 'reopened') {
      eventType = 'ticket_reopened';
    } else if (newStatus === 'acknowledged') {
      eventType = 'ticket_acknowledged';
    }

    const event: TicketEvent = {
      eventId: `evt_${crypto.randomUUID()}`,
      ticketId,
      eventType,
      actorUid,
      timestamp: now,
      metadata: {
        fromStatus: ticket.status,
        toStatus: newStatus,
        note,
      },
    };

    return await this.ticketRepo.update(ticketId, updatePayload, event);
  }

  async addStaffNote(
    ticketId: string,
    actorUid: string,
    note: string,
    isInternal = false
  ): Promise<TicketEvent> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket');
    }

    const now = new Date().toISOString();
    const event: TicketEvent = {
      eventId: `evt_${crypto.randomUUID()}`,
      ticketId,
      eventType: 'staff_note_added',
      actorUid,
      timestamp: now,
      metadata: {
        note,
        isInternal,
      },
    };

    return await this.eventRepo.create(event);
  }

  async getDuplicateCandidates(
    ticketId: string,
    actorUid: string,
    actorRole: Role
  ): Promise<{
    ticketId: string;
    ticketNumber: string;
    candidateCount: number;
    candidates: DuplicateCandidate[];
  }> {
    if (actorRole !== 'staff' && actorRole !== 'admin') {
      throw new ForbiddenError('Only authorized staff can review potential duplicate tickets');
    }

    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket');
    }

    if (!this.aiService) {
      throw new AiServiceUnavailableError();
    }

    // Retrieve bounded recent candidate tickets (max 10) in matching category
    const recentCandidates = await this.ticketRepo.findRecentCandidates({
      excludeTicketId: ticket.ticketId,
      category: ticket.category,
      limit: 10,
    });

    if (recentCandidates.length === 0) {
      return {
        ticketId: ticket.ticketId,
        ticketNumber: ticket.ticketNumber,
        candidateCount: 0,
        candidates: [],
      };
    }

    // Map to minimal, privacy-safe fields for model evaluation (no student names, emails, UIDs, or staff notes)
    const safeCandidates = recentCandidates.map((c) => ({
      ticketId: c.ticketId,
      ticketNumber: c.ticketNumber,
      description: c.description,
      location: c.location,
      category: c.category,
      status: c.status,
      createdAt: c.createdAt,
    }));

    const candidates = await this.aiService.findDuplicateCandidates(
      ticket.description,
      ticket.category,
      ticket.location,
      safeCandidates
    );

    return {
      ticketId: ticket.ticketId,
      ticketNumber: ticket.ticketNumber,
      candidateCount: candidates.length,
      candidates,
    };
  }
}
