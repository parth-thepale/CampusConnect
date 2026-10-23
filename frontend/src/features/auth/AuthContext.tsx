import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithCustomToken,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider, checkFirebaseConfig } from '../../lib/firebase';
import { apiClient, setApiTokenGetter } from '../../lib/api-client';
import { UserProfile, Role } from '../../types';

export interface AuthContextType {
  user: FirebaseUser | null;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const configStatus = checkFirebaseConfig();

  const fetchProfile = useCallback(async (firebaseUser: FirebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      const userProfile = await apiClient.get<UserProfile>('/api/auth/me', { token });
      setProfile(userProfile);
      return userProfile;
    } catch (err: any) {
      console.error('Failed to load user profile from /api/auth/me:', err);
      setProfile(null);
      setError(err?.message || 'Failed to establish authorized user profile.');
      return null;
    }
  }, []);

  useEffect(() => {
    // Register token getter for centralized apiClient
    setApiTokenGetter(async () => {
      if (!auth?.currentUser) return null;
      return await auth.currentUser.getIdToken();
    });

    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  const signInWithGoogle = async () => {
    setError(null);
    if (!auth || !googleProvider) {
      throw new Error(
        'Firebase Authentication is not configured. Please supply public VITE_FIREBASE_* credentials.'
      );
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      await fetchProfile(result.user);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      let userFriendlyMessage = err?.message || 'Google Sign-In failed.';
      if (err?.code === 'auth/popup-closed-by-user') {
        userFriendlyMessage = 'Sign-in popup was closed before completing authentication.';
      } else if (err?.code === 'auth/unauthorized-domain') {
        userFriendlyMessage =
          'This domain is not authorized for Google Sign-In. Add it in the Firebase Console -> Authentication -> Settings -> Authorized Domains.';
      } else if (err?.code === 'auth/operation-not-allowed') {
        userFriendlyMessage =
          'Google Sign-In provider is not enabled in Firebase Console -> Authentication -> Sign-in method.';
      }
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
    if (!auth) {
      throw new Error('Firebase client is not initialized');
    }

    try {
      // 1. Verify 6-digit OTP with backend -> returns Firebase custom token
      const res = await apiClient.post<{ customToken: string; user: UserProfile }>(
        '/api/auth/email/verify-code',
        { email, code, challengeId }
      );

      // 2. Exchange custom token through official Firebase Web SDK
      const credential = await signInWithCustomToken(auth, res.customToken);
      setUser(credential.user);

      // 3. Resolve role from authoritative /api/auth/me
      await fetchProfile(credential.user);
    } catch (err: any) {
      console.error('Email OTP verification failed:', err);
      const msg = err?.message || 'Invalid or expired verification code.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const signOut = async () => {
    setError(null);
    if (auth) {
      await firebaseSignOut(auth);
    }
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
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
        isFirebaseReady: configStatus.isConfigured || !!auth,
        missingConfigKeys: configStatus.missingKeys,
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
