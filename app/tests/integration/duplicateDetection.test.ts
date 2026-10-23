import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createMemoryRepositories } from '../../src/repositories/memory/repositories';
import { IAiService, DuplicateCandidate } from '../../src/types/ai';

describe('Staff Duplicate Candidate Detection', () => {
  let repos: ReturnType<typeof createMemoryRepositories>;
  let app: ReturnType<typeof createApp>;

  const studentUser = {
    'x-dev-user-id': 'student_sam',
    'x-dev-user-role': 'student',
  };

  const staffUser = {
    'x-dev-user-id': 'staff_sarah',
    'x-dev-user-role': 'staff',
  };

  let capturedCandidatesPassedToAi: any[] = [];

  const mockAiService: IAiService = {
    analyzeComplaintDraft: async () => ({
      title: 'Mock Title',
      summary: 'Mock Summary',
      missingFields: [],
      confidence: 1,
    }),
    findDuplicateCandidates: async (_text, _cat, _loc, recentCandidates) => {
      capturedCandidatesPassedToAi = recentCandidates;

      if (recentCandidates.length === 0) return [];

      return [
        {
          ticketId: recentCandidates[0].ticketId,
          ticketNumber: recentCandidates[0].ticketNumber,
          category: recentCandidates[0].category,
          location: recentCandidates[0].location,
          status: recentCandidates[0].status,
          similarityScore: 0.92,
          matchReason: 'Both complaints report the same leaking pipe in Chemistry Lab 2.',
          createdAt: recentCandidates[0].createdAt,
        },
      ];
    },
  };

  let ticket1Id: string;
  let ticket2Id: string;

  beforeEach(async () => {
    repos = createMemoryRepositories();
    app = createApp(repos, mockAiService);
    capturedCandidatesPassedToAi = [];

    // 1. Create Ticket 1 (earlier ticket)
    const intake1 = await request(app)
      .post('/api/intakes')
      .set(studentUser)
      .send({
        description: 'Large water puddle from pipe leak under sink 3',
        location: 'Science Building, Chemistry Lab 2',
        category: 'plumbing',
      });
    const confirm1 = await request(app)
      .post(`/api/intakes/${intake1.body.data.intakeId}/confirm`)
      .set(studentUser);
    ticket1Id = confirm1.body.data.ticketId;

    // 2. Create Ticket 2 (later ticket for same incident)
    const intake2 = await request(app)
      .post('/api/intakes')
      .set(studentUser)
      .send({
        description: 'Flooding in chem lab 2 from broken pipe',
        location: 'Science Building, Chemistry Lab 2',
        category: 'plumbing',
      });
    const confirm2 = await request(app)
      .post(`/api/intakes/${intake2.body.data.intakeId}/confirm`)
      .set(studentUser);
    ticket2Id = confirm2.body.data.ticketId;
  });

  it('prohibits ordinary students from assessing duplicate candidates (403)', async () => {
    const res = await request(app)
      .get(`/api/staff/tickets/${ticket2Id}/duplicates`)
      .set(studentUser);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows authorized staff to retrieve potential duplicate matches', async () => {
    const res = await request(app)
      .get(`/api/staff/tickets/${ticket2Id}/duplicates`)
      .set(staffUser);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ticketId).toBe(ticket2Id);
    expect(res.body.data.candidateCount).toBe(1);
    expect(res.body.data.candidates.length).toBe(1);

    const match = res.body.data.candidates[0];
    expect(match.ticketId).toBe(ticket1Id);
    expect(match.similarityScore).toBe(0.92);
    expect(match.matchReason).toContain('Both complaints report the same leaking pipe');
  });

  it('strictly excludes the target ticket itself from the candidate set', async () => {
    await request(app)
      .get(`/api/staff/tickets/${ticket2Id}/duplicates`)
      .set(staffUser);

    const candidateIds = capturedCandidatesPassedToAi.map((c) => c.ticketId);
    expect(candidateIds).not.toContain(ticket2Id);
    expect(candidateIds).toContain(ticket1Id);
  });

  it('sends only privacy-safe fields to the AI model (no student UIDs, names, or emails)', async () => {
    await request(app)
      .get(`/api/staff/tickets/${ticket2Id}/duplicates`)
      .set(staffUser);

    for (const candidate of capturedCandidatesPassedToAi) {
      expect((candidate as any).createdByUid).toBeUndefined();
      expect((candidate as any).email).toBeUndefined();
      expect((candidate as any).studentName).toBeUndefined();
      expect((candidate as any).internalNotes).toBeUndefined();
    }
  });

  it('does NOT merge tickets or alter ticket status after duplicate review', async () => {
    await request(app)
      .get(`/api/staff/tickets/${ticket2Id}/duplicates`)
      .set(staffUser);

    // Verify ticket 2 status is still 'submitted'
    const checkTicket = await request(app)
      .get(`/api/tickets/${ticket2Id}`)
      .set(staffUser);

    expect(checkTicket.body.data.status).toBe('submitted');
    expect(checkTicket.body.data.assignedToUid).toBeUndefined();

    // Verify ticket 1 still exists independently
    const checkTicket1 = await request(app)
      .get(`/api/tickets/${ticket1Id}`)
      .set(staffUser);
    expect(checkTicket1.body.data.ticketId).toBe(ticket1Id);
  });

  it('handles empty candidate set gracefully without calling AI', async () => {
    // Ticket 1 has no other tickets in electricity category
    const elecIntake = await request(app)
      .post('/api/intakes')
      .set(studentUser)
      .send({
        description: 'Single light out in library study room 5',
        location: 'Library, Room 5',
        category: 'electricity',
      });
    const elecConfirm = await request(app)
      .post(`/api/intakes/${elecIntake.body.data.intakeId}/confirm`)
      .set(studentUser);
    const elecTicketId = elecConfirm.body.data.ticketId;

    const res = await request(app)
      .get(`/api/staff/tickets/${elecTicketId}/duplicates`)
      .set(staffUser);

    expect(res.status).toBe(200);
    expect(res.body.data.candidateCount).toBe(0);
    expect(res.body.data.candidates).toEqual([]);
    expect(capturedCandidatesPassedToAi.length).toBe(0);
  });
});
