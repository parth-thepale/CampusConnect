import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StudentDashboard } from '../features/student/StudentDashboard';
import { ComplaintReportingWizard } from '../features/complaints/ComplaintReportingWizard';
import { StudentTicketDetail } from '../features/student/StudentTicketDetail';
import { apiClient } from '../lib/api-client';
import * as AuthContextModule from '../features/auth/AuthContext';

describe('Student Portal & Complaint Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { uid: 'student-123', email: 'student@campus.edu' } as any,
      profile: {
        uid: 'student-123',
        email: 'student@campus.edu',
        displayName: 'Alice Student',
        role: 'student',
      },
      role: 'student',
      loading: false,
      error: null,
      isFirebaseReady: true,
      missingConfigKeys: [],
      signInWithGoogle: vi.fn(),
      requestEmailOtp: vi.fn(),
      verifyEmailOtp: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      clearError: vi.fn(),
    });
  });

  it('renders student dashboard with real ticket counts computed from student records', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      items: [
        {
          ticketId: 't-1',
          ticketNumber: 'TICK-0001',
          description: 'Library tap broken',
          location: 'Library 1st floor',
          category: 'plumbing',
          status: 'in_progress',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          ticketId: 't-2',
          ticketNumber: 'TICK-0002',
          description: 'Wi-Fi slow in hostel',
          location: 'Hostel 3 Wing A',
          category: 'internet_connectivity',
          status: 'resolved',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: { total: 2, limit: 10, offset: 0 },
    });

    render(
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Hello, Alice Student/i)).toBeInTheDocument();
    expect(screen.getByText('TICK-0001')).toBeInTheDocument();
    expect(screen.getByText('TICK-0002')).toBeInTheDocument();
  });

  it('executes multi-step intake wizard: draft creation -> AI review -> clarification -> confirmation', async () => {
    const mockPost = vi.spyOn(apiClient, 'post');
    const mockPatch = vi.spyOn(apiClient, 'patch');

    // 1. Initial draft creation
    mockPost.mockResolvedValueOnce({
      intakeId: 'intake-999',
      createdByUid: 'student-123',
      description: 'The tap is leaking heavily near Room 204.',
      location: 'Block B 2nd floor',
      category: 'plumbing',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. AI analysis response with clarification question and demo routing provenance
    mockPost.mockResolvedValueOnce({
      title: 'Plumbing Leak at Block B 2nd Floor',
      summary: 'Report of active water leakage near room 204.',
      suggestedCategory: 'plumbing',
      extractedLocation: { rawMentioned: 'Block B 2nd floor near Room 204' },
      missingFields: [],
      clarifyingQuestion: {
        questionText: 'Is the water leaking onto the main corridor floor?',
        targetField: 'details',
      },
      routingSuggestion: {
        department: 'Campus Plumbing Maintenance',
        reason: 'Water tap fixture repair required',
        ruleProvenance: 'demo_rules_v1',
        isDemoRule: true,
      },
      confidence: 0.92,
    });

    render(
      <MemoryRouter>
        <ComplaintReportingWizard />
      </MemoryRouter>
    );

    // Step 1: Fill description and location
    const descInput = screen.getByLabelText(/Problem Description/i);
    fireEvent.change(descInput, {
      target: { value: 'The tap is leaking heavily near Room 204 in Block B.' },
    });

    const locInput = screen.getByLabelText(/Location on Campus/i);
    fireEvent.change(locInput, { target: { value: 'Block B 2nd floor' } });

    fireEvent.click(screen.getByRole('button', { name: /Analyze with Gemini AI/i }));

    // Verify Step 2 AI Analysis rendered
    expect(
      await screen.findByText('Plumbing Leak at Block B 2nd Floor')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Demo routing rule — not yet verified as official campus policy/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Is the water leaking onto the main corridor floor\?/i)
    ).toBeInTheDocument();

    // Step 2 Clarification: answer the question
    mockPatch.mockResolvedValueOnce({
      intakeId: 'intake-999',
      description: 'The tap is leaking heavily near Room 204 in Block B.\n\n[Additional Details]: Yes, onto the floor.',
      location: 'Block B 2nd floor',
      category: 'plumbing',
      status: 'draft',
    });

    // Mock re-analysis response
    mockPost.mockResolvedValueOnce({
      title: 'Active Corridor Water Leakage at Block B',
      summary: 'Water leaking directly onto corridor floor.',
      suggestedCategory: 'plumbing',
      extractedLocation: { rawMentioned: 'Block B 2nd floor' },
      missingFields: [],
      confidence: 0.98,
    });

    const answerInput = screen.getByPlaceholderText(/Type your answer here/i);
    fireEvent.change(answerInput, { target: { value: 'Yes, onto the floor.' } });
    fireEvent.click(screen.getByRole('button', { name: /Answer/i }));

    // Proceed to Step 3: Review & Confirm
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Review & Confirm/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Review & Confirm/i }));

    // Verify Review step
    expect(await screen.findByText(/Step 3: Review & Confirm Ticket/i)).toBeInTheDocument();

    // Mock confirmation response
    mockPatch.mockResolvedValueOnce({});
    mockPost.mockResolvedValueOnce({
      ticketId: 't-real-123',
      ticketNumber: 'TICK-0042',
      isNew: true,
    });

    fireEvent.click(screen.getByRole('button', { name: /Confirm & Create Ticket/i }));

    // Verify Step 4: Official ticket number rendered
    expect(await screen.findByText('TICK-0042')).toBeInTheDocument();
    expect(screen.getByText(/Ticket Created Successfully!/i)).toBeInTheDocument();
  });

  it('defensively suppresses internal staff notes from student ticket details', async () => {
    vi.spyOn(apiClient, 'get')
      .mockResolvedValueOnce({
        ticketId: 't-10',
        ticketNumber: 'TICK-0010',
        description: 'Broken window in hostel lounge',
        location: 'Hostel 1 Lounge',
        category: 'cleanliness',
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce([
        {
          eventId: 'ev-1',
          ticketId: 't-10',
          eventType: 'ticket_created',
          actorUid: 'student-123',
          timestamp: new Date().toISOString(),
        },
        {
          eventId: 'ev-2',
          ticketId: 't-10',
          eventType: 'staff_note_added',
          actorUid: 'staff-tech-01',
          timestamp: new Date().toISOString(),
          metadata: {
            note: 'Vendor contracted: GlassCo Inc invoice #992',
            isInternal: true, // Internal staff note
          },
        },
        {
          eventId: 'ev-3',
          ticketId: 't-10',
          eventType: 'staff_note_added',
          actorUid: 'staff-tech-01',
          timestamp: new Date().toISOString(),
          metadata: {
            note: 'Technician visited and taped the area for student safety.',
            isInternal: false, // Student-visible note
          },
        },
      ]);

    render(
      <MemoryRouter initialEntries={['/student/tickets/t-10']}>
        <Routes>
          <Route path="/student/tickets/:ticketId" element={<StudentTicketDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Visible student note should be rendered
    expect(
      await screen.findByText(/Technician visited and taped the area/i)
    ).toBeInTheDocument();

    // Internal staff note MUST NOT be rendered
    expect(
      screen.queryByText(/Vendor contracted: GlassCo Inc/i)
    ).not.toBeInTheDocument();
  });
});
