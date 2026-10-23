import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StaffQueue } from '../features/staff/StaffQueue';
import { StaffTicketDetail } from '../features/staff/StaffTicketDetail';
import { apiClient } from '../lib/api-client';
import * as AuthContextModule from '../features/auth/AuthContext';

describe('Staff Operations Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { uid: 'staff-999', email: 'staff@campus.edu' } as any,
      profile: {
        uid: 'staff-999',
        email: 'staff@campus.edu',
        displayName: 'John Staff',
        role: 'staff',
      },
      role: 'staff',
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

  it('renders staff operations queue with real ticket records', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      items: [
        {
          ticketId: 't-100',
          ticketNumber: 'TICK-0100',
          description: 'Power trip in Physics Lab',
          location: 'Science Block Lab 3',
          category: 'electricity',
          status: 'submitted',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: { total: 1, limit: 20, offset: 0 },
    });

    render(
      <MemoryRouter>
        <StaffQueue />
      </MemoryRouter>
    );

    expect(await screen.findByText('TICK-0100')).toBeInTheDocument();
    expect(screen.getByText(/Power trip in Physics Lab/i)).toBeInTheDocument();
  });

  it('enforces mandatory resolution note (>= 5 chars) when resolving a ticket', async () => {
    vi.spyOn(apiClient, 'get')
      .mockResolvedValueOnce({
        ticketId: 't-200',
        ticketNumber: 'TICK-0200',
        description: 'AC not cooling in seminar hall',
        location: 'Main Auditorium',
        category: 'electricity',
        status: 'in_progress', // valid transitions: ['blocked', 'resolved']
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce([]); // empty events

    render(
      <MemoryRouter initialEntries={['/staff/tickets/t-200']}>
        <Routes>
          <Route path="/staff/tickets/:ticketId" element={<StaffTicketDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('TICK-0200')).toBeInTheDocument();

    const selectStatus = screen.getByLabelText(/Target Status/i);
    fireEvent.change(selectStatus, { target: { value: 'resolved' } });

    // Try submitting with short note (< 5 characters)
    const noteInput = screen.getByLabelText(/Resolution Note/i);
    fireEvent.change(noteInput, { target: { value: 'fix' } });
    fireEvent.click(screen.getByRole('button', { name: /Execute Transition/i }));

    expect(
      await screen.findByText(/meaningful resolution note \(at least 5 characters\) is required/i)
    ).toBeInTheDocument();

    // Now fill 5+ characters and verify PATCH is called
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      ticketId: 't-200',
      ticketNumber: 'TICK-0200',
      status: 'resolved',
    });
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce([]); // refresh events

    fireEvent.change(noteInput, {
      target: { value: 'Replaced AC compressor capacitor and verified 21C airflow.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Execute Transition/i }));

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith(
        '/api/staff/tickets/t-200/status',
        expect.objectContaining({
          status: 'resolved',
          note: 'Replaced AC compressor capacitor and verified 21C airflow.',
        })
      );
    });
  });

  it('fetches AI duplicate candidates only on explicit user request', async () => {
    vi.spyOn(apiClient, 'get')
      .mockResolvedValueOnce({
        ticketId: 't-300',
        ticketNumber: 'TICK-0300',
        description: 'Washroom water pipe burst',
        location: 'Sports Complex',
        category: 'plumbing',
        status: 'submitted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce([]);

    const getSpy = vi.spyOn(apiClient, 'get');

    render(
      <MemoryRouter initialEntries={['/staff/tickets/t-300']}>
        <Routes>
          <Route path="/staff/tickets/:ticketId" element={<StaffTicketDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('TICK-0300')).toBeInTheDocument();

    // Verify duplicate endpoint has NOT been called automatically
    expect(getSpy).not.toHaveBeenCalledWith('/api/staff/tickets/t-300/duplicates');

    // Mock duplicate check response
    getSpy.mockResolvedValueOnce({
      ticketId: 't-300',
      candidateCount: 1,
      candidates: [
        {
          ticketId: 't-cand-1',
          ticketNumber: 'TICK-0298',
          category: 'plumbing',
          location: 'Sports Complex Restroom',
          status: 'in_progress',
          similarityScore: 0.88,
          matchReason: 'Both report water pipe burst at the sports complex.',
          createdAt: new Date().toISOString(),
        },
      ],
    });

    // Explicitly click "Check for Related Reports"
    const checkBtn = screen.getByRole('button', { name: /Check for Related Reports/i });
    fireEvent.click(checkBtn);

    expect(await screen.findByText('TICK-0298')).toBeInTheDocument();
    expect(screen.getByText('88% match')).toBeInTheDocument();
    expect(
      screen.getByText(/Both report water pipe burst at the sports complex/i)
    ).toBeInTheDocument();
  });
});
