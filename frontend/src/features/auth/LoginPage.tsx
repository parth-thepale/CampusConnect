import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Building2, Mail, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const {
    signInWithGoogle,
    requestEmailOtp,
    verifyEmailOtp,
    isFirebaseReady,
    missingConfigKeys,
    user,
    role,
    error: authError,
    clearError,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [authMode, setAuthMode] = useState<'options' | 'otp_request' | 'otp_verify'>('options');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // If user is already authenticated, redirect
  React.useEffect(() => {
    if (user && role) {
      const from = (location.state as any)?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else if (role === 'staff' || role === 'admin') {
        navigate('/staff', { replace: true });
      } else {
        navigate('/student', { replace: true });
      }
    }
  }, [user, role, navigate, location]);

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    clearError();
    setLoading(true);
    try {
      await signInWithGoogle();
      // Navigation is triggered by the useEffect observing user & role
    } catch (err: any) {
      setLocalError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setLocalError('Please enter a valid campus or personal email address.');
      return;
    }

    setLocalError(null);
    clearError();
    setLoading(true);
    try {
      const res = await requestEmailOtp(email.trim().toLowerCase());
      setChallengeId(res.challengeId);
      setSuccessNotice('A 6-digit verification code has been dispatched to your email.');
      setAuthMode('otp_verify');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setLocalError('Please enter the complete 6-digit numeric verification code.');
      return;
    }

    setLocalError(null);
    clearError();
    setLoading(true);
    try {
      await verifyEmailOtp(email.trim().toLowerCase(), cleanCode, challengeId);
      // Navigation is handled once user & role are established
    } catch (err: any) {
      setLocalError(err.message || 'Verification failed. Please check the code or request a new one.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    const digitsOnly = pasted.replace(/\D/g, '').slice(0, 6);
    if (digitsOnly) {
      setOtpCode(digitsOnly);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6) 0',
        minHeight: '75vh',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-text-inverted)',
              marginBottom: 'var(--space-3)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <Building2 size={30} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text)' }}>
            Welcome to CampusConnect
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.925rem', marginTop: 'var(--space-1)' }}>
            Sign in to submit complaints, track repairs, or manage campus operations.
          </p>
        </div>

        {/* Configuration Notice if Firebase Config is Incomplete */}
        {!isFirebaseReady && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Alert type="warning" title="Firebase Public Configuration Required">
              Google Sign-In and Custom-Token auth require public Vite credentials in <code>frontend/.env</code>.
              Missing: {missingConfigKeys.join(', ')}
            </Alert>
          </div>
        )}

        {/* Dynamic Alerts */}
        {(localError || authError) && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Alert
              type="error"
              onClose={() => {
                setLocalError(null);
                clearError();
              }}
            >
              {localError || authError}
            </Alert>
          </div>
        )}

        {successNotice && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Alert type="success" onClose={() => setSuccessNotice(null)}>
              {successNotice}
            </Alert>
          </div>
        )}

        <Card padding="lg">
          {authMode === 'options' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Google Sign-In */}
              <Button
                variant="outline"
                size="lg"
                onClick={handleGoogleSignIn}
                isLoading={loading}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                  backgroundColor: 'var(--color-surface)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: 'var(--space-2)' }}>
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
                  />
                </svg>
                Continue with Google
              </Button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  margin: 'var(--space-2) 0',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.8125rem',
                }}
              >
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
                <span style={{ padding: '0 var(--space-3)' }}>or</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
              </div>

              {/* Passwordless Email OTP Option */}
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  setLocalError(null);
                  setAuthMode('otp_request');
                }}
                style={{ width: '100%' }}
              >
                <Mail size={18} />
                Sign In with 6-Digit Email Code
              </Button>
            </div>
          )}

          {authMode === 'otp_request' && (
            <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ marginBottom: 'var(--space-1)' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                  Passwordless Sign-In
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                  Enter your email to receive a secure six-digit verification code.
                </p>
              </div>

              <Input
                label="Email Address"
                type="email"
                required
                autoComplete="email"
                placeholder="student@campus.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />

              <Button type="submit" variant="primary" size="lg" isLoading={loading} style={{ width: '100%' }}>
                Send Verification Code
                <ArrowRight size={16} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLocalError(null);
                  setAuthMode('options');
                }}
                style={{ width: '100%' }}
              >
                Back to all sign-in options
              </Button>
            </form>
          )}

          {authMode === 'otp_verify' && (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                  Enter Verification Code
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                  Enter the 6-digit code sent to <strong>{email}</strong>.
                </p>
              </div>

              <div>
                <label
                  htmlFor="otp-input"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    display: 'block',
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  6-Digit Code
                </label>
                <input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onPaste={handleOtpPaste}
                  required
                  disabled={loading}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1.5rem',
                    letterSpacing: '0.4em',
                    textAlign: 'center',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    outline: 'none',
                    backgroundColor: 'var(--color-surface)',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginTop: 'var(--space-1)' }}>
                  Tip: You can paste the complete 6-digit code directly into the box.
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                disabled={otpCode.length !== 6}
                style={{ width: '100%' }}
              >
                Verify &amp; Sign In
              </Button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLocalError(null);
                    setAuthMode('otp_request');
                  }}
                >
                  Change Email
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRequestOtp}
                  disabled={loading}
                >
                  <RefreshCw size={14} />
                  Resend Code
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Security & Provenance Note */}
        <div
          style={{
            marginTop: 'var(--space-6)',
            textAlign: 'center',
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <ShieldCheck size={16} color="var(--color-primary)" />
          <span>Protected by CampusConnect Authentication &amp; Role-Based Authorization</span>
        </div>
      </div>
    </div>
  );
};
