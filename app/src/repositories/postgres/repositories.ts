import { Pool } from 'pg';
import {
  User,
  Intake,
  Ticket,
  TicketEvent,
  TicketStatus,
  Category,
  Role,
  IntakeStatus,
  TicketEventType,
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

function toIsoString(val: any): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  return new Date(val).toISOString();
}

function mapUser(row: any): User {
  return {
    uid: row.uid,
    email: row.email || undefined,
    displayName: row.display_name || undefined,
    role: row.role as Role,
    department: row.department || undefined,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapIntake(row: any): Intake {
  return {
    intakeId: row.intake_id,
    createdByUid: row.created_by_uid,
    description: row.description,
    location: row.location || undefined,
    category: row.category as Category | undefined,
    additionalDetails: row.additional_details || undefined,
    attachments: Array.isArray(row.attachments) ? row.attachments : undefined,
    status: row.status as IntakeStatus,
    ticketId: row.ticket_id || undefined,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapTicket(row: any): Ticket {
  return {
    ticketId: row.ticket_id,
    ticketNumber: row.ticket_number,
    createdByUid: row.created_by_uid,
    intakeId: row.intake_id || undefined,
    description: row.description,
    location: row.location,
    category: row.category as Category,
    departmentSuggestion: row.department_suggestion || undefined,
    assignedToUid: row.assigned_to_uid || undefined,
    status: row.status as TicketStatus,
    resolutionNote: row.resolution_note || undefined,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    resolvedAt: row.resolved_at ? toIsoString(row.resolved_at) : undefined,
  };
}

function mapEvent(row: any): TicketEvent {
  return {
    eventId: row.event_id,
    ticketId: row.ticket_id,
    eventType: row.event_type as TicketEventType,
    actorUid: row.actor_uid,
    timestamp: toIsoString(row.timestamp),
    metadata: row.metadata || undefined,
  };
}

function mapOtp(row: any): OtpChallenge {
  return {
    challengeId: row.challenge_id,
    email: row.email,
    codeHash: row.code_hash,
    expiresAt: toIsoString(row.expires_at),
    attempts: Number(row.attempts) || 0,
    maxAttempts: Number(row.max_attempts) || 3,
    consumed: Boolean(row.consumed),
    consumedAt: row.consumed_at ? toIsoString(row.consumed_at) : undefined,
    createdAt: toIsoString(row.created_at),
    lastResentAt: toIsoString(row.last_resent_at),
  };
}

export class PostgresUserRepository implements IUserRepository {
  constructor(private pool: Pool) {}

  async findByUid(uid: string): Promise<User | null> {
    const res = await this.pool.query('SELECT * FROM users WHERE uid = $1', [uid]);
    if (res.rows.length === 0) return null;
    return mapUser(res.rows[0]);
  }

  async createOrUpdate(user: User): Promise<User> {
    const query = `
      INSERT INTO users (uid, email, display_name, role, department, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (uid) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, users.email),
        display_name = COALESCE(EXCLUDED.display_name, users.display_name),
        role = EXCLUDED.role,
        department = COALESCE(EXCLUDED.department, users.department),
        updated_at = EXCLUDED.updated_at
      RETURNING *;
    `;
    const values = [
      user.uid,
      user.email || null,
      user.displayName || null,
      user.role,
      user.department || null,
      user.createdAt,
      user.updatedAt,
    ];
    const res = await this.pool.query(query, values);
    return mapUser(res.rows[0]);
  }
}

export class PostgresIntakeRepository implements IIntakeRepository {
  constructor(private pool: Pool) {}

  async findById(intakeId: string): Promise<Intake | null> {
    const res = await this.pool.query('SELECT * FROM intakes WHERE intake_id = $1', [intakeId]);
    if (res.rows.length === 0) return null;
    return mapIntake(res.rows[0]);
  }

  async create(intake: Intake): Promise<Intake> {
    const query = `
      INSERT INTO intakes (intake_id, created_by_uid, description, location, category, additional_details, attachments, status, ticket_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const values = [
      intake.intakeId,
      intake.createdByUid,
      intake.description,
      intake.location || null,
      intake.category || null,
      intake.additionalDetails ? JSON.stringify(intake.additionalDetails) : null,
      intake.attachments ? JSON.stringify(intake.attachments) : JSON.stringify([]),
      intake.status,
      intake.ticketId || null,
      intake.createdAt,
      intake.updatedAt,
    ];
    const res = await this.pool.query(query, values);
    return mapIntake(res.rows[0]);
  }

  async update(intakeId: string, data: Partial<Intake>): Promise<Intake> {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.location !== undefined) {
      updates.push(`location = $${idx++}`);
      values.push(data.location || null);
    }
    if (data.category !== undefined) {
      updates.push(`category = $${idx++}`);
      values.push(data.category || null);
    }
    if (data.additionalDetails !== undefined) {
      updates.push(`additional_details = $${idx++}`);
      values.push(data.additionalDetails ? JSON.stringify(data.additionalDetails) : null);
    }
    if (data.attachments !== undefined) {
      updates.push(`attachments = $${idx++}`);
      values.push(data.attachments ? JSON.stringify(data.attachments) : JSON.stringify([]));
    }
    if (data.status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(data.status);
    }
    if (data.ticketId !== undefined) {
      updates.push(`ticket_id = $${idx++}`);
      values.push(data.ticketId || null);
    }

    const updatedAt = new Date().toISOString();
    updates.push(`updated_at = $${idx++}`);
    values.push(updatedAt);

    values.push(intakeId);
    const query = `
      UPDATE intakes
      SET ${updates.join(', ')}
      WHERE intake_id = $${idx}
      RETURNING *;
    `;

    const res = await this.pool.query(query, values);
    if (res.rows.length === 0) {
      throw new Error(`Intake ${intakeId} not found`);
    }
    return mapIntake(res.rows[0]);
  }

  async listByCreatedByUid(uid: string): Promise<Intake[]> {
    const res = await this.pool.query(
      'SELECT * FROM intakes WHERE created_by_uid = $1 ORDER BY created_at DESC',
      [uid]
    );
    return res.rows.map(mapIntake);
  }
}

export class PostgresTicketRepository implements ITicketRepository {
  constructor(private pool: Pool) {}

  async getNextTicketNumber(): Promise<string> {
    const res = await this.pool.query("SELECT 'CC-' || nextval('ticket_seq')::text AS ticket_number");
    return res.rows[0].ticket_number;
  }

  async findById(ticketId: string): Promise<Ticket | null> {
    const res = await this.pool.query('SELECT * FROM tickets WHERE ticket_id = $1', [ticketId]);
    if (res.rows.length === 0) return null;
    return mapTicket(res.rows[0]);
  }

  async findByTicketNumber(ticketNumber: string): Promise<Ticket | null> {
    const res = await this.pool.query('SELECT * FROM tickets WHERE ticket_number = $1', [ticketNumber]);
    if (res.rows.length === 0) return null;
    return mapTicket(res.rows[0]);
  }

  async create(ticket: Ticket, initialEvent: TicketEvent): Promise<Ticket> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const ticketQuery = `
        INSERT INTO tickets (ticket_id, ticket_number, created_by_uid, intake_id, description, location, category, department_suggestion, assigned_to_uid, status, resolution_note, created_at, updated_at, resolved_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *;
      `;
      const ticketValues = [
        ticket.ticketId,
        ticket.ticketNumber,
        ticket.createdByUid,
        ticket.intakeId || null,
        ticket.description,
        ticket.location,
        ticket.category,
        ticket.departmentSuggestion || null,
        ticket.assignedToUid || null,
        ticket.status,
        ticket.resolutionNote || null,
        ticket.createdAt,
        ticket.updatedAt,
        ticket.resolvedAt || null,
      ];
      await client.query(ticketQuery, ticketValues);

      const eventQuery = `
        INSERT INTO ticket_events (event_id, ticket_id, event_type, actor_uid, timestamp, metadata)
        VALUES ($1, $2, $3, $4, $5, $6);
      `;
      const eventValues = [
        initialEvent.eventId,
        initialEvent.ticketId,
        initialEvent.eventType,
        initialEvent.actorUid,
        initialEvent.timestamp,
        initialEvent.metadata ? JSON.stringify(initialEvent.metadata) : JSON.stringify({}),
      ];
      await client.query(eventQuery, eventValues);

      await client.query('COMMIT');
      return ticket;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async update(ticketId: string, data: Partial<Ticket>, event?: TicketEvent): Promise<Ticket> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (data.description !== undefined) {
        updates.push(`description = $${idx++}`);
        values.push(data.description);
      }
      if (data.location !== undefined) {
        updates.push(`location = $${idx++}`);
        values.push(data.location);
      }
      if (data.category !== undefined) {
        updates.push(`category = $${idx++}`);
        values.push(data.category);
      }
      if (data.departmentSuggestion !== undefined) {
        updates.push(`department_suggestion = $${idx++}`);
        values.push(data.departmentSuggestion || null);
      }
      if (data.assignedToUid !== undefined) {
        updates.push(`assigned_to_uid = $${idx++}`);
        values.push(data.assignedToUid || null);
      }
      if (data.status !== undefined) {
        updates.push(`status = $${idx++}`);
        values.push(data.status);
      }
      if (data.resolutionNote !== undefined) {
        updates.push(`resolution_note = $${idx++}`);
        values.push(data.resolutionNote || null);
      }
      if (data.resolvedAt !== undefined) {
        updates.push(`resolved_at = $${idx++}`);
        values.push(data.resolvedAt || null);
      }

      const updatedAt = new Date().toISOString();
      updates.push(`updated_at = $${idx++}`);
      values.push(updatedAt);

      values.push(ticketId);
      const query = `
        UPDATE tickets
        SET ${updates.join(', ')}
        WHERE ticket_id = $${idx}
        RETURNING *;
      `;
      const res = await client.query(query, values);
      if (res.rows.length === 0) {
        throw new Error(`Ticket ${ticketId} not found`);
      }

      if (event) {
        const eventQuery = `
          INSERT INTO ticket_events (event_id, ticket_id, event_type, actor_uid, timestamp, metadata)
          VALUES ($1, $2, $3, $4, $5, $6);
        `;
        const eventValues = [
          event.eventId,
          event.ticketId,
          event.eventType,
          event.actorUid,
          event.timestamp,
          event.metadata ? JSON.stringify(event.metadata) : JSON.stringify({}),
        ];
        await client.query(eventQuery, eventValues);
      }

      await client.query('COMMIT');
      return mapTicket(res.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async list(filter: TicketFilter): Promise<{ items: Ticket[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filter.createdByUid) {
      conditions.push(`created_by_uid = $${idx++}`);
      values.push(filter.createdByUid);
    }
    if (filter.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filter.status);
    }
    if (filter.category) {
      conditions.push(`category = $${idx++}`);
      values.push(filter.category);
    }
    if (filter.assignedToUid) {
      conditions.push(`assigned_to_uid = $${idx++}`);
      values.push(filter.assignedToUid);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countRes = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM tickets ${whereClause}`,
      values
    );
    const total = countRes.rows[0].count;

    // Items query with pagination
    const itemsQuery = `
      SELECT * FROM tickets
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    const itemsValues = [...values, filter.limit, filter.offset];
    const itemsRes = await this.pool.query(itemsQuery, itemsValues);

    return {
      items: itemsRes.rows.map(mapTicket),
      total,
    };
  }

  async findRecentCandidates(options: {
    excludeTicketId: string;
    category?: Category;
    limit: number;
  }): Promise<Ticket[]> {
    const boundedLimit = Math.min(options.limit || 10, 20);
    const conditions: string[] = ['ticket_id != $1'];
    const values: any[] = [options.excludeTicketId];
    let idx = 2;

    if (options.category) {
      conditions.push(`category = $${idx++}`);
      values.push(options.category);
    }

    values.push(boundedLimit);
    const query = `
      SELECT * FROM tickets
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${idx};
    `;
    const res = await this.pool.query(query, values);
    return res.rows.map(mapTicket);
  }
}

export class PostgresEventRepository implements IEventRepository {
  constructor(private pool: Pool) {}

  async create(event: TicketEvent): Promise<TicketEvent> {
    const query = `
      INSERT INTO ticket_events (event_id, ticket_id, event_type, actor_uid, timestamp, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [
      event.eventId,
      event.ticketId,
      event.eventType,
      event.actorUid,
      event.timestamp,
      event.metadata ? JSON.stringify(event.metadata) : JSON.stringify({}),
    ];
    await this.pool.query(query, values);
    return event;
  }

  async listByTicketId(ticketId: string): Promise<TicketEvent[]> {
    const res = await this.pool.query(
      'SELECT * FROM ticket_events WHERE ticket_id = $1 ORDER BY timestamp ASC',
      [ticketId]
    );
    return res.rows.map(mapEvent);
  }
}

export class PostgresOtpRepository implements IOtpRepository {
  constructor(private pool: Pool) {}

  async createChallenge(challenge: OtpChallenge): Promise<OtpChallenge> {
    const query = `
      INSERT INTO otp_challenges (challenge_id, email, code_hash, expires_at, attempts, max_attempts, consumed, consumed_at, created_at, last_resent_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const values = [
      challenge.challengeId,
      challenge.email.toLowerCase().trim(),
      challenge.codeHash,
      challenge.expiresAt,
      challenge.attempts,
      challenge.maxAttempts,
      challenge.consumed,
      challenge.consumedAt || null,
      challenge.createdAt,
      challenge.lastResentAt,
    ];
    await this.pool.query(query, values);
    return challenge;
  }

  async findLatestByEmail(email: string): Promise<OtpChallenge | null> {
    const normalized = email.toLowerCase().trim();
    const res = await this.pool.query(
      'SELECT * FROM otp_challenges WHERE LOWER(email) = $1 ORDER BY created_at DESC LIMIT 1',
      [normalized]
    );
    if (res.rows.length === 0) return null;
    return mapOtp(res.rows[0]);
  }

  async findById(challengeId: string): Promise<OtpChallenge | null> {
    const res = await this.pool.query(
      'SELECT * FROM otp_challenges WHERE challenge_id = $1',
      [challengeId]
    );
    if (res.rows.length === 0) return null;
    return mapOtp(res.rows[0]);
  }

  async incrementAttempts(challengeId: string): Promise<number> {
    const res = await this.pool.query(
      'UPDATE otp_challenges SET attempts = attempts + 1 WHERE challenge_id = $1 RETURNING attempts',
      [challengeId]
    );
    if (res.rows.length === 0) return 0;
    return Number(res.rows[0].attempts);
  }

  async markConsumed(challengeId: string): Promise<void> {
    await this.pool.query(
      'UPDATE otp_challenges SET consumed = true, consumed_at = NOW() WHERE challenge_id = $1',
      [challengeId]
    );
  }

  async countRecentRequests(email: string, sinceIsoString: string): Promise<number> {
    const normalized = email.toLowerCase().trim();
    const res = await this.pool.query(
      'SELECT COUNT(*)::int AS count FROM otp_challenges WHERE LOWER(email) = $1 AND created_at >= $2',
      [normalized, sinceIsoString]
    );
    return Number(res.rows[0]?.count || 0);
  }
}

export function createPostgresRepositories(pool: Pool): IRepositoryRegistry {
  return {
    users: new PostgresUserRepository(pool),
    intakes: new PostgresIntakeRepository(pool),
    tickets: new PostgresTicketRepository(pool),
    events: new PostgresEventRepository(pool),
    otps: new PostgresOtpRepository(pool),
  };
}
