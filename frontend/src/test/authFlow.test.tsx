import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import * as AuthContextModule from '../features/auth/AuthContext';

describe('Frontend Authentication Flow Tests', () => {
  const mockSignInWithGoogle = vi.fn();
  const mockRequestEmailOtp = vi.fn();
  const mockVerifyEmailOtp = vi.fn();
  const mockSignOut = vi.fn();
  const mockClearError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      profile: null,
      role: null,
      loading: false,
      error: null,
      isFirebaseReady: true,
      missingConfigKeys: [],
      signInWithGoogle: mockSignInWithGoogle,
      requestEmailOtp: mockRequestEmailOtp,
      verifyEmailOtp: mockVerifyEmailOtp,
      signOut: mockSignOut,
      refreshProfile: vi.fn(),
      clearError: mockClearError,
    });
  });

  it('renders sign-in options including Google and 6-digit email OTP', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Continue with Google/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign In with 6-Digit Email Code/i)).toBeInTheDocument();
    expect(screen.getByText(/Welcome to CampusConnect/i)).toBeInTheDocument();
  });

  it('triggers Google sign-in flow on button click', async () => {
    mockSignInWithGoogle.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const googleBtn = screen.getByText(/Continue with Google/i);
    fireEvent.click(googleBtn);

    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('navigates to email input, dispatches OTP code request, and enters verify view', async () => {
    mockRequestEmailOtp.mockResolvedValueOnce({
      challengeId: 'challenge-12345',
      message: 'Code dispatched',
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    // 1. Click email code sign-in
    fireEvent.click(screen.getByText(/Sign In with 6-Digit Email Code/i));

    // 2. Email input is presented
    const emailInput = screen.getByLabelText(/Email Address/i);
    expect(emailInput).toBeInTheDocument();

    fireEvent.change(emailInput, { target: { value: 'student@campus.edu' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Verification Code/i }));

    await waitFor(() => {
      expect(mockRequestEmailOtp).toHaveBeenCalledWith('student@campus.edu');
    });

    // 3. Verify OTP code input is rendered
    expect(screen.getByText(/Enter Verification Code/i)).toBeInTheDocument();
    const codeInput = screen.getByLabelText(/6-Digit Code/i);
    expect(codeInput).toBeInTheDocument();
  });

  it('validates 6-digit numeric input before calling verifyEmailOtp', async () => {
    mockRequestEmailOtp.mockResolvedValueOnce({
      challengeId: 'challenge-xyz',
      message: 'Code dispatched',
    });
    mockVerifyEmailOtp.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    // Open email flow and submit email
    fireEvent.click(screen.getByText(/Sign In with 6-Digit Email Code/i));
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'test@campus.edu' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Verification Code/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/6-Digit Code/i)).toBeInTheDocument();
    });

    const codeInput = screen.getByLabelText(/6-Digit Code/i);

    // Enter 6 valid digits
    fireEvent.change(codeInput, { target: { value: '654321' } });

    const verifyBtn = screen.getByRole('button', { name: /Verify & Sign In/i });
    expect(verifyBtn).not.toBeDisabled();

    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(mockVerifyEmailOtp).toHaveBeenCalledWith(
        'test@campus.edu',
        '654321',
        'challenge-xyz'
      );
    });
  });
});
