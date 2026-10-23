import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createMemoryRepositories } from '../../src/repositories/memory/repositories';
import { IAiService, AiDraftAnalysisResult } from '../../src/types/ai';

describe('Intake AI Analysis & Clarification Workflow', () => {
  let repos: ReturnType<typeof createMemoryRepositories>;
  let app: ReturnType<typeof createApp>;

  const studentA = {
    'x-dev-user-id': 'student_alice',
    'x-dev-user-role': 'student',
  };

  const studentB = {
    'x-dev-user-id': 'student_bob',
    'x-dev-user-role': 'student',
  };

  const mockAiService: IAiService = {
    analyzeComplaintDraft: async (text, _photo, context) => {
      // Mock deterministic response for testing workflow
      const isComplete = !!(context?.location && context?.category);
      return {
        title: 'Reported campus issue',
        summary: `Analysis of: ${text.slice(0, 50)}`,
        extractedLocation: context?.location
          ? { rawMentioned: context.location }
          : undefined,
        suggestedCategory: context?.category || 'plumbing',
        missingFields: isComplete
          ? []
          : [
              {
                field: 'location',
                reason: 'Building location is required for maintenance dispatch.',
              },
            ],
        clarifyingQuestion: isComplete
          ? undefined
          : {
              questionText: 'Which campus building and floor is this issue located in?',
              targetField: 'location',
            },
        confidence: 0.9,
      };
    },
    findDuplicateCandidates: async () => [],
  };

  beforeEach(() => {
    repos = createMemoryRepositories();
    app = createApp(repos, mockAiService);
  });

  it('requires authentication to analyze an intake draft (401)', async () => {
    const res = await request(app).post('/api/intakes/intake_fake/analyze');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('prevents an unauthorized student from analyzing another student draft (403)', async () => {
    // Alice creates a draft
    const createRes = await request(app)
      .post('/api/intakes')
      .set(studentA)
      .send({ description: 'The tap in the restroom is leaking non-stop' });

    const intakeId = createRes.body.data.intakeId;

    // Bob tries to trigger analysis on Alice's draft
    const analyzeRes = await request(app)
      .post(`/api/intakes/${intakeId}/analyze`)
      .set(studentB);

    expect(analyzeRes.status).toBe(403);
    expect(analyzeRes.body.error.code).toBe('FORBIDDEN');
  });

  it('executes the full clarification journey: draft -> analyze -> update details -> re-analyze -> confirm -> ticket', async () => {
    // 1. Student creates incomplete draft
    const createRes = await request(app)
      .post('/api/intakes')
      .set(studentA)
      .send({
        description: 'Water is gushing out of the pipe under the sink',
      });

    expect(createRes.status).toBe(201);
    const intakeId = createRes.body.data.intakeId;
    expect(createRes.body.data.status).toBe('draft');

    // 2. Student requests AI analysis on incomplete draft
    const firstAnalysis = await request(app)
      .post(`/api/intakes/${intakeId}/analyze`)
      .set(studentA);

    expect(firstAnalysis.status).toBe(200);
    expect(firstAnalysis.body.success).toBe(true);
    expect(firstAnalysis.body.data.suggestedCategory).toBe('plumbing');
    expect(firstAnalysis.body.data.missingFields.length).toBeGreaterThan(0);
    expect(firstAnalysis.body.data.clarifyingQuestion).toBeDefined();

    // 3. Verify AI analysis did NOT automatically create a ticket or change intake status
    const intakeCheck = await request(app)
      .get(`/api/intakes/${intakeId}`)
      .set(studentA);
    expect(intakeCheck.body.data.status).toBe('draft');
    expect(intakeCheck.body.data.ticketId).toBeUndefined();

    // 4. Student updates draft with missing location based on clarification question
    const updateRes = await request(app)
      .patch(`/api/intakes/${intakeId}`)
      .set(studentA)
      .send({
        location: 'Hostel 3, Ground Floor Common Restroom',
        category: 'plumbing',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.location).toBe('Hostel 3, Ground Floor Common Restroom');

    // 5. Student re-analyzes draft -> now complete
    const secondAnalysis = await request(app)
      .post(`/api/intakes/${intakeId}/analyze`)
      .set(studentA);

    expect(secondAnalysis.status).toBe(200);
    expect(secondAnalysis.body.data.missingFields.length).toBe(0);
    expect(secondAnalysis.body.data.clarifyingQuestion).toBeUndefined();

    // 6. Student explicitly confirms the completed draft -> Creates official ticket
    const confirmRes = await request(app)
      .post(`/api/intakes/${intakeId}/confirm`)
      .set(studentA);

    expect(confirmRes.status).toBe(201);
    expect(confirmRes.body.data.ticketNumber).toBe('CC-1001');
    const createdTicketId = confirmRes.body.data.ticketId;

    // 7. Verify intake is now confirmed
    const finalIntake = await request(app)
      .get(`/api/intakes/${intakeId}`)
      .set(studentA);
    expect(finalIntake.body.data.status).toBe('confirmed');
    expect(finalIntake.body.data.ticketId).toBe(createdTicketId);

    // 8. Attempting to analyze an already confirmed intake returns 409 Conflict
    const reanalyzeConfirmed = await request(app)
      .post(`/api/intakes/${intakeId}/analyze`)
      .set(studentA);

    expect(reanalyzeConfirmed.status).toBe(409);
    expect(reanalyzeConfirmed.body.error.code).toBe('CONFLICT');
  });

  it('repeated analysis calls are safe and never create duplicate tickets', async () => {
    const createRes = await request(app)
      .post('/api/intakes')
      .set(studentA)
      .send({ description: 'Ethernet port 4 is loose in computer lab' });

    const intakeId = createRes.body.data.intakeId;

    // Call analyze 3 times in a row
    await request(app).post(`/api/intakes/${intakeId}/analyze`).set(studentA);
    await request(app).post(`/api/intakes/${intakeId}/analyze`).set(studentA);
    await request(app).post(`/api/intakes/${intakeId}/analyze`).set(studentA);

    // Confirm that 0 tickets exist
    const ticketsRes = await request(app).get('/api/tickets').set(studentA);
    expect(ticketsRes.body.data.items.length).toBe(0);
  });
});
