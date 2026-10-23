import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createMemoryRepositories } from '../../src/repositories/memory/repositories';

describe('Complaint Intake Workflow & Validation', () => {
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

  beforeEach(() => {
    repos = createMemoryRepositories();
    app = createApp(repos);
  });

  it('rejects intake creation without authentication (401)', async () => {
    const res = await request(app)
      .post('/api/intakes')
      .send({ description: 'The washroom tap on the 2nd floor is leaking' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('assigns intake ownership strictly from verified identity and ignores spoofed UIDs', async () => {
    const res = await request(app)
      .post('/api/intakes')
      .set(studentA)
      .send({
        description: 'Water leaking in the ground floor restroom sink',
        location: 'Engineering Block A, Room 101',
        createdByUid: 'spoofed_victim_uid', // Client attempt to spoof ownership
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.createdByUid).toBe('student_alice');
    expect(res.body.data.status).toBe('draft');
  });

  it('rejects malformed intake payloads and invalid categories (400)', async () => {
    // Too short description
    const shortRes = await request(app)
      .post('/api/intakes')
      .set(studentA)
      .send({ description: 'Short' });

    expect(shortRes.status).toBe(400);
    expect(shortRes.body.error.code).toBe('VALIDATION_ERROR');

    // Unsupported category
    const catRes = await request(app)
      .post('/api/intakes')
      .set(studentA)
      .send({
        description: 'Broken vending machine dispenser',
        category: 'cafeteria_food',
      });

    expect(catRes.status).toBe(400);
    expect(catRes.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('permits incomplete drafts for clarification, but blocks confirmation until complete', async () => {
    // 1. Create draft with missing location and category
    const createRes = await request(app)
      .post('/api/intakes')
      .set(studentA)
      .send({
        description: 'The Wi-Fi drops disconnects continuously during class',
      });

    expect(createRes.status).toBe(201);
    const intakeId = createRes.body.data.intakeId;
    expect(createRes.body.data.location).toBeUndefined();
    expect(createRes.body.data.category).toBeUndefined();

    // 2. Attempt to confirm incomplete draft
    const confirmFail = await request(app)
      .post(`/api/intakes/${intakeId}/confirm`)
      .set(studentA);

    expect(confirmFail.status).toBe(400);
    expect(confirmFail.body.error.code).toBe('VALIDATION_ERROR');
    expect(confirmFail.body.error.message).toContain('missing');

    // 3. Update intake with required location and category
    const updateRes = await request(app)
      .patch(`/api/intakes/${intakeId}`)
      .set(studentA)
      .send({
        location: 'Library 3rd Floor Reading Hall',
        category: 'internet_connectivity',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.location).toBe('Library 3rd Floor Reading Hall');
    expect(updateRes.body.data.category).toBe('internet_connectivity');

    // 4. Confirm completed intake -> Creates official ticket
    const confirmSuccess = await request(app)
      .post(`/api/intakes/${intakeId}/confirm`)
      .set(studentA);

    expect(confirmSuccess.status).toBe(201);
    expect(confirmSuccess.body.success).toBe(true);
    expect(confirmSuccess.body.data.ticketId).toBeDefined();
    expect(confirmSuccess.body.data.ticketNumber).toBe('CC-1001');
    expect(confirmSuccess.body.data.isNew).toBe(true);

    // 5. Verify intake status is now confirmed
    const getIntake = await request(app)
      .get(`/api/intakes/${intakeId}`)
      .set(studentA);
    expect(getIntake.body.data.status).toBe('confirmed');
    expect(getIntake.body.data.ticketId).toBe(confirmSuccess.body.data.ticketId);
  });

  it('prevents duplicate tickets on repeated confirmation requests (idempotency)', async () => {
    const createRes = await request(app)
      .post('/api/intakes')
      .set(studentA)
      .send({
        description: 'Overhead light fixture flickering violently',
        location: 'Seminar Hall 2',
        category: 'electricity',
      });

    const intakeId = createRes.body.data.intakeId;

    // First confirmation
    const firstConfirm = await request(app)
      .post(`/api/intakes/${intakeId}/confirm`)
      .set(studentA);
    expect(firstConfirm.status).toBe(201);
    expect(firstConfirm.body.data.isNew).toBe(true);
    const ticketId = firstConfirm.body.data.ticketId;

    // Second confirmation (e.g. student double click or retry)
    const secondConfirm = await request(app)
      .post(`/api/intakes/${intakeId}/confirm`)
      .set(studentA);
    expect(secondConfirm.status).toBe(200);
    expect(secondConfirm.body.data.isNew).toBe(false);
    expect(secondConfirm.body.data.ticketId).toBe(ticketId);

    // Verify only one ticket exists
    const listRes = await request(app).get('/api/tickets').set(studentA);
    expect(listRes.body.data.items.length).toBe(1);
  });

  it('prevents modifying an intake once confirmed (409)', async () => {
    const createRes = await request(app)
      .post('/api/intakes')
      .set(studentA)
      .send({
        description: 'Overflowing dustbin outside cafeteria',
        location: 'Cafeteria Courtyard',
        category: 'cleanliness',
      });

    const intakeId = createRes.body.data.intakeId;
    await request(app).post(`/api/intakes/${intakeId}/confirm`).set(studentA);

    // Attempt modification after confirmation
    const patchRes = await request(app)
      .patch(`/api/intakes/${intakeId}`)
      .set(studentA)
      .send({ location: 'Different courtyard' });

    expect(patchRes.status).toBe(409);
    expect(patchRes.body.error.code).toBe('CONFLICT');
  });

  it('prohibits unauthorized students from reading or modifying another student intake (403)', async () => {
    const createRes = await request(app)
      .post('/api/intakes')
      .set(studentA)
      .send({
        description: 'Broken window latch in room 204',
        location: 'Hostel 1, Room 204',
        category: 'cleanliness',
      });

    const intakeId = createRes.body.data.intakeId;

    // Student B attempts to read Student A's intake
    const readRes = await request(app)
      .get(`/api/intakes/${intakeId}`)
      .set(studentB);
    expect(readRes.status).toBe(403);
    expect(readRes.body.error.code).toBe('FORBIDDEN');

    // Student B attempts to modify Student A's intake
    const modifyRes = await request(app)
      .patch(`/api/intakes/${intakeId}`)
      .set(studentB)
      .send({ description: 'Tampered description by someone else' });
    expect(modifyRes.status).toBe(403);

    // Staff user CAN inspect the intake
    const staffRead = await request(app)
      .get(`/api/intakes/${intakeId}`)
      .set(staffUser);
    expect(staffRead.status).toBe(200);
    expect(staffRead.body.data.intakeId).toBe(intakeId);
  });
});
