import { describe, it, expect, vi } from 'vitest';
import {
  PostgresUserRepository,
  PostgresIntakeRepository,
  PostgresTicketRepository,
  PostgresEventRepository,
  PostgresOtpRepository,
  createPostgresRepositories,
} from '../../src/repositories/postgres/repositories';
import { Pool } from 'pg';

describe('PostgresRepositories Unit Tests & SQL Mappings', () => {
  it('initializes repository registry successfully with PostgreSQL pool', () => {
    const mockPool = {} as Pool;
    const registry = createPostgresRepositories(mockPool);

    expect(registry.users).toBeInstanceOf(PostgresUserRepository);
    expect(registry.intakes).toBeInstanceOf(PostgresIntakeRepository);
    expect(registry.tickets).toBeInstanceOf(PostgresTicketRepository);
    expect(registry.events).toBeInstanceOf(PostgresEventRepository);
    expect(registry.otps).toBeInstanceOf(PostgresOtpRepository);
  });

  describe('PostgresUserRepository', () => {
    it('findByUid queries user by uid and maps columns correctly', async () => {
      const mockPool = {
        query: vi.fn(async (sql: string, params: any[]) => {
          expect(sql).toContain('SELECT * FROM users WHERE uid = $1');
          expect(params).toEqual(['user_123']);
          return {
            rows: [
              {
                uid: 'user_123',
                email: 'test@campus.edu',
                display_name: 'Test Student',
                role: 'student',
                department: null,
                created_at: new Date('2026-01-01T00:00:00Z'),
                updated_at: new Date('2026-01-01T00:00:00Z'),
              },
            ],
          };
        }),
      } as unknown as Pool;

      const repo = new PostgresUserRepository(mockPool);
      const user = await repo.findByUid('user_123');

      expect(user).toBeDefined();
      expect(user?.uid).toBe('user_123');
      expect(user?.email).toBe('test@campus.edu');
      expect(user?.displayName).toBe('Test Student');
      expect(user?.role).toBe('student');
    });

    it('findByUid returns null when no rows match', async () => {
      const mockPool = {
        query: vi.fn(async () => ({ rows: [] })),
      } as unknown as Pool;

      const repo = new PostgresUserRepository(mockPool);
      const user = await repo.findByUid('nonexistent');
      expect(user).toBeNull();
    });
  });

  describe('PostgresTicketRepository', () => {
    it('getNextTicketNumber fetches next sequence value and formats CC- prefix', async () => {
      const mockPool = {
        query: vi.fn(async (sql: string) => {
          expect(sql).toContain("nextval('ticket_seq')");
          return { rows: [{ ticket_number: 'CC-1005' }] };
        }),
      } as unknown as Pool;

      const repo = new PostgresTicketRepository(mockPool);
      const ticketNum = await repo.getNextTicketNumber();
      expect(ticketNum).toBe('CC-1005');
    });

    it('create executes transaction inserting ticket and initial event atomically', async () => {
      const mockClient = {
        query: vi.fn(async (sql: string) => {
          if (sql === 'BEGIN' || sql === 'COMMIT') return;
          return { rows: [] };
        }),
        release: vi.fn(),
      };

      const mockPool = {
        connect: vi.fn(async () => mockClient),
      } as unknown as Pool;

      const repo = new PostgresTicketRepository(mockPool);

      const ticket = {
        ticketId: 't-123',
        ticketNumber: 'CC-1001',
        createdByUid: 'u-1',
        description: 'Broken water tap',
        location: 'Hostel A',
        category: 'plumbing' as const,
        status: 'submitted' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const initialEvent = {
        eventId: 'e-1',
        ticketId: 't-123',
        eventType: 'ticket_created' as const,
        actorUid: 'u-1',
        timestamp: new Date().toISOString(),
      };

      const created = await repo.create(ticket, initialEvent);
      expect(created.ticketId).toBe('t-123');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
