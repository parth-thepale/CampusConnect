import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createMemoryRepositories } from '../../src/repositories/memory/repositories';

describe('Staff Ticket Management & Lifecycle Transitions', () => {
  let repos: ReturnType<typeof createMemoryRepositories>;
  let app: ReturnType<typeof createApp>;

  const studentUser = {
    'x-dev-user-id': 'student_dave',
    'x-dev-user-role': 'student',
  };

  const staffUser = {
    'x-dev-user-id': 'staff_elena',
    'x-dev-user-role': 'staff',
  };

  let testTicketId: string;

  beforeEach(async () => {
    repos = createMemoryRepositories();
    app = createApp(repos);

    const intakeRes = await request(app)
      .post('/api/intakes')
      .set(studentUser)
      .send({
        description: 'Exposed electrical wires behind workbench 3',
        location: 'Electronics Lab, Floor 1',
        category: 'electricity',
      });

    const confirmRes = await request(app)
      .post(`/api/intakes/${intakeRes.body.data.intakeId}/confirm`)
      .set(studentUser);

    testTicketId = confirmRes.body.data.ticketId;
  });

  it('allows authorized staff to assign a ticket and records event', async () => {
    const res = await request(app)
      .patch(`/api/staff/tickets/${testTicketId}/assignment`)
      .set(staffUser)
      .send({ assignedToUid: 'electrician_mike' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.assignedToUid).toBe('electrician_mike');
    expect(res.body.data.status).toBe('assigned');

    // Verify event history
    const eventsRes = await request(app)
      .get(`/api/tickets/${testTicketId}/events`)
      .set(staffUser);

    const assignEvent = eventsRes.body.data.find(
      (e: any) => e.eventType === 'ticket_assigned'
    );
    expect(assignEvent).toBeDefined();
    expect(assignEvent.actorUid).toBe('staff_elena');
    expect(assignEvent.metadata.assignedToUid).toBe('electrician_mike');
  });

  it('rejects invalid status transitions (400)', async () => {
    // Attempting direct jump from 'submitted' to 'resolved'
    const invalidRes = await request(app)
      .patch(`/api/staff/tickets/${testTicketId}/status`)
      .set(staffUser)
      .send({
        status: 'resolved',
        note: 'Fixed everything instantly',
      });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    expect(invalidRes.body.error.message).toContain('Cannot transition ticket status');
  });

  it('rejects resolving a ticket without a meaningful resolution note', async () => {
    // 1. Move ticket to in_progress first
    await request(app)
      .patch(`/api/staff/tickets/${testTicketId}/status`)
      .set(staffUser)
      .send({ status: 'in_progress' });

    // 2. Attempt resolve without note
    const noNoteRes = await request(app)
      .patch(`/api/staff/tickets/${testTicketId}/status`)
      .set(staffUser)
      .send({ status: 'resolved' });

    expect(noNoteRes.status).toBe(400);
    expect(noNoteRes.body.error.code).toBe('VALIDATION_ERROR');

    // 3. Attempt resolve with trivial "Done"
    const trivialNoteRes = await request(app)
      .patch(`/api/staff/tickets/${testTicketId}/status`)
      .set(staffUser)
      .send({ status: 'resolved', note: 'Done' });

    expect(trivialNoteRes.status).toBe(400);
    expect(trivialNoteRes.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('completes a valid ticket lifecycle from submitted to in_progress to resolved', async () => {
    // 1. Start work: submitted -> in_progress
    const progressRes = await request(app)
      .patch(`/api/staff/tickets/${testTicketId}/status`)
      .set(staffUser)
      .send({
        status: 'in_progress',
        note: 'Technician on-site evaluating damaged conduit',
      });

    expect(progressRes.status).toBe(200);
    expect(progressRes.body.data.status).toBe('in_progress');

    // 2. Resolve: in_progress -> resolved
    const resolveRes = await request(app)
      .patch(`/api/staff/tickets/${testTicketId}/status`)
      .set(staffUser)
      .send({
        status: 'resolved',
        note: 'Wires were re-insulated, placed in grounded conduit box, and verified safe.',
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe('resolved');
    expect(resolveRes.body.data.resolutionNote).toBe(
      'Wires were re-insulated, placed in grounded conduit box, and verified safe.'
    );
    expect(resolveRes.body.data.resolvedAt).toBeDefined();

    // 3. Inspect complete chronological audit trail
    const historyRes = await request(app)
      .get(`/api/tickets/${testTicketId}/events`)
      .set(staffUser);

    expect(historyRes.status).toBe(200);
    const eventTypes = historyRes.body.data.map((e: any) => e.eventType);
    expect(eventTypes).toEqual(['ticket_created', 'status_changed', 'ticket_resolved']);
  });

  it('allows staff queue filtering by status and category with pagination', async () => {
    // Seed an extra ticket in cleanliness
    const intake2 = await request(app)
      .post('/api/intakes')
      .set(studentUser)
      .send({
        description: 'Spilled paint in art room corridor',
        location: 'Fine Arts Wing, 1st Floor',
        category: 'cleanliness',
      });
    await request(app)
      .post(`/api/intakes/${intake2.body.data.intakeId}/confirm`)
      .set(studentUser);

    // Query staff queue for electricity category only
    const electricityQueue = await request(app)
      .get('/api/staff/tickets?category=electricity')
      .set(staffUser);

    expect(electricityQueue.status).toBe(200);
    expect(electricityQueue.body.data.items.length).toBe(1);
    expect(electricityQueue.body.data.items[0].category).toBe('electricity');

    // Query staff queue for cleanliness category
    const cleanlinessQueue = await request(app)
      .get('/api/staff/tickets?category=cleanliness')
      .set(staffUser);

    expect(cleanlinessQueue.status).toBe(200);
    expect(cleanlinessQueue.body.data.items.length).toBe(1);
    expect(cleanlinessQueue.body.data.items[0].category).toBe('cleanliness');
  });
});
