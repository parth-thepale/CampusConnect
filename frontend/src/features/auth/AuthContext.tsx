import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient, setApiTokenGetter } from '../../lib/api-client';
import { UserProfile, Role } from '../../types';

export interface AuthUser {
  uid: string;
  email?: string;
  displayName?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  role: Role | null;
  loading: boolean;
  error: string | null;
  isFirebaseReady: boolean;
  missingConfigKeys: string[];
  signInWithGoogle: () => Promise<void>;
  requestEmailOtp: (email: string) => Promise<{ challengeId: string; message: string }>;
  verifyEmailOtp: (email: string, code: string, challengeId?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const JWT_STORAGE_KEY = 'campusconnect_jwt';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (token: string) => {
    try {
      const userProfile = await apiClient.get<UserProfile>('/api/auth/me', { token });
      setProfile(userProfile);
      setUser({
        uid: userProfile.uid,
        email: userProfile.email,
        displayName: userProfile.displayName,
      });
      return userProfile;
    } catch (err: any) {
      console.error('Failed to load user profile from /api/auth/me:', err);
      setProfile(null);
      setUser(null);
      localStorage.removeItem(JWT_STORAGE_KEY);
      setError(err?.message || 'Failed to establish authorized user profile.');
      return null;
    }
  }, []);

  useEffect(() => {
    // Register token getter for centralized apiClient
    setApiTokenGetter(async () => {
      return localStorage.getItem(JWT_STORAGE_KEY);
    });

    const existingToken = localStorage.getItem(JWT_STORAGE_KEY);
    if (existingToken) {
      fetchProfile(existingToken).finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [fetchProfile]);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      // In web clients, Google Identity Services popup or OAuth redirection can provide the idToken
      // For local testing, prompt for Google token or notify configuration
      const message = 'Google Sign-In is configured via backend Google Identity verification. For campus access, use 6-Digit Email OTP below.';
      setError(message);
      throw new Error(message);
    } catch (err: any) {
      const userFriendlyMessage = err?.message || 'Google Sign-In failed.';
      setError(userFriendlyMessage);
      throw new Error(userFriendlyMessage);
    }
  };

  const requestEmailOtp = async (email: string) => {
    setError(null);
    try {
      const res = await apiClient.post<{ challengeId: string }>(
        '/api/auth/email/request-code',
        { email }
      );
      return {
        challengeId: res.challengeId,
        message: 'A 6-digit verification code has been dispatched to your email address.',
      };
    } catch (err: any) {
      const msg = err?.message || 'Failed to request verification code. Please try again.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const verifyEmailOtp = async (email: string, code: string, challengeId?: string) => {
    setError(null);
    try {
      // Verify 6-digit OTP with backend -> returns backend session JWT
      const res = await apiClient.post<{ token?: string; customToken?: string; user: UserProfile }>(
        '/api/auth/email/verify-code',
        { email, code, challengeId }
      );

      const token = res.token || res.customToken;
      if (!token) {
        throw new Error('Server response did not include a valid session token.');
      }

      localStorage.setItem(JWT_STORAGE_KEY, token);

      setUser({
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName,
      });
      setProfile(res.user);

      // Refresh full profile to verify /api/auth/me authorization
      await fetchProfile(token);
    } catch (err: any) {
      console.error('Email OTP verification failed:', err);
      const msg = err?.message || 'Invalid or expired verification code.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const signOut = async () => {
    setError(null);
    localStorage.removeItem(JWT_STORAGE_KEY);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    const token = localStorage.getItem(JWT_STORAGE_KEY);
    if (token) {
      await fetchProfile(token);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role || null,
        loading,
        error,
        isFirebaseReady: true,
        missingConfigKeys: [],
        signInWithGoogle,
        requestEmailOtp,
        verifyEmailOtp,
        signOut,
        refreshProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
