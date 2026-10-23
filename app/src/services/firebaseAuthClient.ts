import * as admin from 'firebase-admin';
import { ensureFirebaseAdmin } from '../config/firebaseAdmin';

export interface IFirebaseAuthClient {
  getUserByEmail(email: string): Promise<{ uid: string; email?: string } | null>;
  createUser(data: { email: string; emailVerified: boolean }): Promise<{ uid: string; email?: string }>;
  createCustomToken(uid: string, developerClaims?: Record<string, unknown>): Promise<string>;
  verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken>;
}

export class DefaultFirebaseAuthClient implements IFirebaseAuthClient {
  constructor() {
    ensureFirebaseAdmin();
  }

  async getUserByEmail(email: string): Promise<{ uid: string; email?: string } | null> {
    try {
      const record = await admin.auth().getUserByEmail(email);
      return { uid: record.uid, email: record.email };
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        return null;
      }
      throw err;
    }
  }

  async createUser(data: { email: string; emailVerified: boolean }): Promise<{ uid: string; email?: string }> {
    const record = await admin.auth().createUser(data);
    return { uid: record.uid, email: record.email };
  }

  async createCustomToken(uid: string, developerClaims?: Record<string, unknown>): Promise<string> {
    return await admin.auth().createCustomToken(uid, developerClaims);
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    return await admin.auth().verifyIdToken(idToken);
  }
}
