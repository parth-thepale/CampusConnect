import {
  User,
  Intake,
  Ticket,
  TicketEvent,
  TicketStatus,
  Category,
} from '../../types/domain';
import {
  IUserRepository,
  IIntakeRepository,
  ITicketRepository,
  IEventRepository,
  IOtpRepository,
  IRepositoryRegistry,
  TicketFilter,
  OtpChallenge,
} from '../interfaces';

export class MemoryUserRepository implements IUserRepository {
  private users = new Map<string, User>();

  async findByUid(uid: string): Promise<User | null> {
    const user = this.users.get(uid);
    return user ? JSON.parse(JSON.stringify(user)) : null;
  }

  async createOrUpdate(user: User): Promise<User> {
    const copy = JSON.parse(JSON.stringify(user));
    this.users.set(user.uid, copy);
    return JSON.parse(JSON.stringify(copy));
  }

  clear(): void {
    this.users.clear();
  }
}

export class MemoryIntakeRepository implements IIntakeRepository {
  private intakes = new Map<string, Intake>();

  async findById(intakeId: string): Promise<Intake | null> {
    const intake = this.intakes.get(intakeId);
    return intake ? JSON.parse(JSON.stringify(intake)) : null;
  }

  async create(intake: Intake): Promise<Intake> {
    const copy = JSON.parse(JSON.stringify(intake));
    this.intakes.set(intake.intakeId, copy);
    return JSON.parse(JSON.stringify(copy));
  }

  async update(intakeId: string, data: Partial<Intake>): Promise<Intake> {
    const existing = this.intakes.get(intakeId);
    if (!existing) {
      throw new Error(`Intake with id ${intakeId} not found`);
    }
    const updated: Intake = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.intakes.set(intakeId, updated);
    return JSON.parse(JSON.stringify(updated));
  }

  async listByCreatedByUid(uid: string): Promise<Intake[]> {
    const results: Intake[] = [];
    for (const intake of this.intakes.values()) {
      if (intake.createdByUid === uid) {
        results.push(JSON.parse(JSON.stringify(intake)));
      }
    }
    return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  clear(): void {
    this.intakes.clear();
  }
}

export class MemoryTicketRepository implements ITicketRepository {
  private tickets = new Map<string, Ticket>();
  private ticketCounter = 1000;
  private eventRepo: MemoryEventRepository;

  constructor(eventRepo: MemoryEventRepository) {
    this.eventRepo = eventRepo;
  }

  async getNextTicketNumber(): Promise<string> {
    this.ticketCounter += 1;
    return `CC-${this.ticketCounter}`;
  }

  async findById(ticketId: string): Promise<Ticket | null> {
    const ticket = this.tickets.get(ticketId);
    return ticket ? JSON.parse(JSON.stringify(ticket)) : null;
  }

  async findByTicketNumber(ticketNumber: string): Promise<Ticket | null> {
    for (const ticket of this.tickets.values()) {
      if (ticket.ticketNumber === ticketNumber) {
        return JSON.parse(JSON.stringify(ticket));
      }
    }
    return null;
  }

  async create(ticket: Ticket, initialEvent: TicketEvent): Promise<Ticket> {
    const copy = JSON.parse(JSON.stringify(ticket));
    this.tickets.set(ticket.ticketId, copy);
    await this.eventRepo.create(initialEvent);
    return JSON.parse(JSON.stringify(copy));
  }

  async update(ticketId: string, data: Partial<Ticket>, event?: TicketEvent): Promise<Ticket> {
    const existing = this.tickets.get(ticketId);
    if (!existing) {
      throw new Error(`Ticket with id ${ticketId} not found`);
    }
    const updated: Ticket = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.tickets.set(ticketId, updated);
    if (event) {
      await this.eventRepo.create(event);
    }
    return JSON.parse(JSON.stringify(updated));
  }

  async list(filter: TicketFilter): Promise<{ items: Ticket[]; total: number }> {
    let all = Array.from(this.tickets.values());

    if (filter.createdByUid) {
      all = all.filter((t) => t.createdByUid === filter.createdByUid);
    }
    if (filter.status) {
      all = all.filter((t) => t.status === filter.status);
    }
    if (filter.category) {
      all = all.filter((t) => t.category === filter.category);
    }
    if (filter.assignedToUid) {
      all = all.filter((t) => t.assignedToUid === filter.assignedToUid);
    }

    // Sort newest first
    all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = all.length;
    const items = all.slice(filter.offset, filter.offset + filter.limit).map((t) => JSON.parse(JSON.stringify(t)));
    return { items, total };
  }

  async findRecentCandidates(options: {
    excludeTicketId: string;
    category?: Category;
    limit: number;
  }): Promise<Ticket[]> {
    let candidates = Array.from(this.tickets.values()).filter(
      (t) => t.ticketId !== options.excludeTicketId
    );

    if (options.category) {
      candidates = candidates.filter((t) => t.category === options.category);
    }

    // Sort newest first
    candidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const boundedLimit = Math.min(options.limit || 10, 20);
    return candidates.slice(0, boundedLimit).map((t) => JSON.parse(JSON.stringify(t)));
  }

  clear(): void {
    this.tickets.clear();
    this.ticketCounter = 1000;
  }
}

export class MemoryEventRepository implements IEventRepository {
  private events = new Map<string, TicketEvent>();

  async create(event: TicketEvent): Promise<TicketEvent> {
    const copy = JSON.parse(JSON.stringify(event));
    this.events.set(event.eventId, copy);
    return JSON.parse(JSON.stringify(copy));
  }

  async listByTicketId(ticketId: string): Promise<TicketEvent[]> {
    const results: TicketEvent[] = [];
    for (const event of this.events.values()) {
      if (event.ticketId === ticketId) {
        results.push(JSON.parse(JSON.stringify(event)));
      }
    }
    // Return chronological order (oldest first)
    return results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  clear(): void {
    this.events.clear();
  }
}

export class MemoryOtpRepository implements IOtpRepository {
  private challenges = new Map<string, OtpChallenge>();

  async createChallenge(challenge: OtpChallenge): Promise<OtpChallenge> {
    const copy = JSON.parse(JSON.stringify(challenge));
    this.challenges.set(challenge.challengeId, copy);
    return JSON.parse(JSON.stringify(copy));
  }

  async findLatestByEmail(email: string): Promise<OtpChallenge | null> {
    const normalized = email.toLowerCase().trim();
    let latest: OtpChallenge | null = null;
    for (const c of this.challenges.values()) {
      if (c.email === normalized) {
        if (!latest || c.createdAt.localeCompare(latest.createdAt) > 0) {
          latest = c;
        }
      }
    }
    return latest ? JSON.parse(JSON.stringify(latest)) : null;
  }

  async findById(challengeId: string): Promise<OtpChallenge | null> {
    const c = this.challenges.get(challengeId);
    return c ? JSON.parse(JSON.stringify(c)) : null;
  }

  async incrementAttempts(challengeId: string): Promise<number> {
    const c = this.challenges.get(challengeId);
    if (!c) return 0;
    c.attempts += 1;
    return c.attempts;
  }

  async markConsumed(challengeId: string): Promise<void> {
    const c = this.challenges.get(challengeId);
    if (c) {
      c.consumed = true;
      c.consumedAt = new Date().toISOString();
    }
  }

  async countRecentRequests(email: string, sinceIsoString: string): Promise<number> {
    const normalized = email.toLowerCase().trim();
    let count = 0;
    for (const c of this.challenges.values()) {
      if (c.email === normalized && c.createdAt >= sinceIsoString) {
        count += 1;
      }
    }
    return count;
  }

  clear(): void {
    this.challenges.clear();
  }
}

export function createMemoryRepositories(): IRepositoryRegistry & {
  clearAll: () => void;
} {
  const users = new MemoryUserRepository();
  const intakes = new MemoryIntakeRepository();
  const events = new MemoryEventRepository();
  const tickets = new MemoryTicketRepository(events);
  const otps = new MemoryOtpRepository();

  return {
    users,
    intakes,
    tickets,
    events,
    otps,
    clearAll: () => {
      users.clear();
      intakes.clear();
      tickets.clear();
      events.clear();
      otps.clear();
    },
  };
}
