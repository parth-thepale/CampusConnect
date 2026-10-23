import {
  User,
  Intake,
  Ticket,
  TicketEvent,
  TicketStatus,
  Category,
} from '../types/domain';

export interface IUserRepository {
  findByUid(uid: string): Promise<User | null>;
  createOrUpdate(user: User): Promise<User>;
}

export interface IIntakeRepository {
  findById(intakeId: string): Promise<Intake | null>;
  create(intake: Intake): Promise<Intake>;
  update(intakeId: string, data: Partial<Intake>): Promise<Intake>;
  listByCreatedByUid(uid: string): Promise<Intake[]>;
}

export interface TicketFilter {
  createdByUid?: string;
  status?: TicketStatus;
  category?: Category;
  assignedToUid?: string;
  limit: number;
  offset: number;
}

export interface ITicketRepository {
  findById(ticketId: string): Promise<Ticket | null>;
  findByTicketNumber(ticketNumber: string): Promise<Ticket | null>;
  create(ticket: Ticket, initialEvent: TicketEvent): Promise<Ticket>;
  update(ticketId: string, data: Partial<Ticket>, event?: TicketEvent): Promise<Ticket>;
  list(filter: TicketFilter): Promise<{ items: Ticket[]; total: number }>;
  getNextTicketNumber(): Promise<string>;
  findRecentCandidates(options: {
    excludeTicketId: string;
    category?: Category;
    limit: number;
  }): Promise<Ticket[]>;
}

export interface IEventRepository {
  create(event: TicketEvent): Promise<TicketEvent>;
  listByTicketId(ticketId: string): Promise<TicketEvent[]>;
}

export interface OtpChallenge {
  challengeId: string;
  email: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  consumed: boolean;
  consumedAt?: string;
  createdAt: string;
  lastResentAt: string;
}

export interface IOtpRepository {
  createChallenge(challenge: OtpChallenge): Promise<OtpChallenge>;
  findLatestByEmail(email: string): Promise<OtpChallenge | null>;
  findById(challengeId: string): Promise<OtpChallenge | null>;
  incrementAttempts(challengeId: string): Promise<number>;
  markConsumed(challengeId: string): Promise<void>;
  countRecentRequests(email: string, sinceIsoString: string): Promise<number>;
}

export interface IRepositoryRegistry {
  users: IUserRepository;
  intakes: IIntakeRepository;
  tickets: ITicketRepository;
  events: IEventRepository;
  otps: IOtpRepository;
}
