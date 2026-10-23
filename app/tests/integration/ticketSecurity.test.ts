import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createMemoryRepositories } from '../../src/repositories/memory/repositories';

describe('Ticket Access Control & Privacy Enforcement', () => {
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

  const staffUser = {
    'x-dev-user-id': 'staff_charlie',
    'x-dev-user-role': 'staff',
  };

  let aliceTicketId: string;

  beforeEach(async () => {
    repos = createMemoryRepositories();
    app = createApp(repos);

    // Seed Alice's intake and confirmed ticket
    const intakeRes = await request(app)
      .post('/api/intakes')
      .set(studentA)
      .send({
        description: 'Leaking pipe under chemistry lab sink 4',
        location: 'Science Building, Chemistry Lab 2',
        category: 'plumbing',
      });

    const confirmRes = await request(app)
      .post(`/api/intakes/${intakeRes.body.data.intakeId}/confirm`)
      .set(studentA);

    aliceTicketId = confirmRes.body.data.ticketId;
  });

  it('allows owner to read their own ticket (200)', async () => {
    const res = await request(app)
      .get(`/api/tickets/${aliceTicketId}`)
      .set(studentA);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ticketId).toBe(aliceTicketId);
    expect(res.body.data.createdByUid).toBe('student_alice');
  });

  it('strictly denies another student from reading Alice ticket (403)', async () => {
    const res = await request(app)
      .get(`/api/tickets/${aliceTicketId}`)
      .set(studentB);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows staff to view any student ticket (200)', async () => {
    const res = await request(app)
      .get(`/api/tickets/${aliceTicketId}`)
      .set(staffUser);

    expect(res.status).toBe(200);
    expect(res.body.data.ticketId).toBe(aliceTicketId);
  });

  it('student ticket queue returns only tickets belonging to the authenticated student', async () => {
    // Seed Bob's ticket
    const bobIntake = await request(app)
      .post('/api/intakes')
      .set(studentB)
      .send({
        description: 'Broken Ethernet wall port in library desk 12',
        location: 'Central Library, 2nd Floor',
        category: 'internet_connectivity',
      });
    await request(app)
      .post(`/api/intakes/${bobIntake.body.data.intakeId}/confirm`)
      .set(studentB);

    // Alice queries /api/tickets -> should only see 1 ticket (her own)
    const aliceList = await request(app).get('/api/tickets').set(studentA);
    expect(aliceList.status).toBe(200);
    expect(aliceList.body.data.items.length).toBe(1);
    expect(aliceList.body.data.items[0].ticketId).toBe(aliceTicketId);
    expect(aliceList.body.data.items[0].createdByUid).toBe('student_alice');

    // Bob queries /api/tickets -> should only see 1 ticket (his own)
    const bobList = await request(app).get('/api/tickets').set(studentB);
    expect(bobList.status).toBe(200);
    expect(bobList.body.data.items.length).toBe(1);
    expect(bobList.body.data.items[0].createdByUid).toBe('student_bob');
  });

  it('prohibits ordinary students from accessing staff endpoints (403)', async () => {
    // Attempt staff queue read
    const queueRes = await request(app)
      .get('/api/staff/tickets')
      .set(studentA);
    expect(queueRes.status).toBe(403);
    expect(queueRes.body.error.code).toBe('FORBIDDEN');

    // Attempt staff status update
    const statusRes = await request(app)
      .patch(`/api/staff/tickets/${aliceTicketId}/status`)
      .set(studentA)
      .send({ status: 'in_progress' });
    expect(statusRes.status).toBe(403);

    // Attempt staff assignment
    const assignRes = await request(app)
      .patch(`/api/staff/tickets/${aliceTicketId}/assignment`)
      .set(studentA)
      .send({ assignedToUid: 'some_staff' });
    expect(assignRes.status).toBe(403);

    // Attempt staff note creation
    const noteRes = await request(app)
      .post(`/api/staff/tickets/${aliceTicketId}/notes`)
      .set(studentA)
      .send({ note: 'Unauthorized note' });
    expect(noteRes.status).toBe(403);
  });

  it('redacts internal staff notes from student timeline, but shows them to staff', async () => {
    // Staff adds a public note and an internal note
    await request(app)
      .post(`/api/staff/tickets/${aliceTicketId}/notes`)
      .set(staffUser)
      .send({
        note: 'Plumber dispatched with replacement connector valve',
        isInternal: false,
      });

    await request(app)
      .post(`/api/staff/tickets/${aliceTicketId}/notes`)
      .set(staffUser)
      .send({
        note: 'Internal note: Contractor XYZ called to invoice under PO-9921',
        isInternal: true,
      });

    // Student inspects event history
    const studentEvents = await request(app)
      .get(`/api/tickets/${aliceTicketId}/events`)
      .set(studentA);

    expect(studentEvents.status).toBe(200);
    const eventTexts = studentEvents.body.data.map(
      (e: any) => e.metadata?.note || ''
    );
    expect(eventTexts).toContain('Plumber dispatched with replacement connector valve');
    expect(eventTexts).not.toContain('Internal note: Contractor XYZ called to invoice under PO-9921');

    // Staff inspects event history -> sees all events including internal
    const staffEvents = await request(app)
      .get(`/api/tickets/${aliceTicketId}/events`)
      .set(staffUser);

    expect(staffEvents.status).toBe(200);
    const staffNotes = staffEvents.body.data.map(
      (e: any) => e.metadata?.note || ''
    );
    expect(staffNotes).toContain('Internal note: Contractor XYZ called to invoice under PO-9921');
  });
});
